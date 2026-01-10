#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <time.h>
#include "secrets.h"

/* =============================
   MODULE CONFIG
   ============================= */
#define MODULE_ID "GS-ESP32-0001"

// Cloud Function endpoint (deploy functions first)
#define INGEST_URL "https://us-central1-greensync-28e23.cloudfunctions.net/ingestReading"

// Device helper endpoints (avoid Firebase RTDB client on ESP32)
#define REGISTER_URL "https://us-central1-greensync-28e23.cloudfunctions.net/registerModuleHttp"
#define STATUS_URL "https://us-central1-greensync-28e23.cloudfunctions.net/getModuleStatusHttp"
#define ACTUATORS_URL "https://us-central1-greensync-28e23.cloudfunctions.net/getActuatorsHttp"

// Optional per-module key (set modules/{MODULE_ID}/ingestKey in RTDB)
#define INGEST_KEY ""

/* =============================
   NTP CONFIG
   ============================= */
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 19800; // GMT +5:30
const int   daylightOffset_sec = 0;

/* =============================
   STATE
   ============================= */
String assignedUID = "";
String farmId = "";
bool moduleAssigned = false;
unsigned long lastAssignmentCheck = 0;
const unsigned long ASSIGNMENT_RECHECK_INTERVAL = 30000; // Recheck every 30 seconds
int failedWriteCount = 0;
const int MAX_FAILED_WRITES = 3; // Recheck assignment after 3 failures

// Poll actuators instead of a long-lived RTDB stream.
// On ESP32, running a Firebase RTDB stream alongside frequent HTTPS POSTs can
// trigger BearSSL errors like "ssl engine closed".
unsigned long lastActuatorPoll = 0;
const unsigned long ACTUATOR_POLL_INTERVAL = 2000; // 2 seconds
String lastIrrigationStatus = "";
String lastFertilizationStatus = "";

// Schedule sensor sends without blocking loop()
unsigned long lastSensorSend = 0;
const unsigned long SENSOR_SEND_INTERVAL = 10000; // 10 seconds

static bool httpPostJson(const char* url, const String& payload, int &httpCodeOut, String &responseOut) {
  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(12000);

  HTTPClient https;
  https.setReuse(false);
  https.setTimeout(12000);

  if (!https.begin(client, url)) {
    httpCodeOut = -1;
    responseOut = "begin() failed";
    return false;
  }

  https.addHeader("Content-Type", "application/json");
  if (String(INGEST_KEY).length() > 0) {
    https.addHeader("x-ingest-key", INGEST_KEY);
  }

  int code = https.POST(payload);
  String resp = https.getString();
  https.end();

  httpCodeOut = code;
  responseOut = resp;
  return code >= 200 && code < 300;
}

/* =============================
   WIFI
   ============================= */
void connectWiFi() {
  Serial.print("📶 Connecting WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected");
}

/* =============================
   TIME
   ============================= */
void syncTime() {
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  time_t now = time(nullptr);
  while (now < 100000) {
    delay(500);
    now = time(nullptr);
  }
  Serial.println("🕒 Time synced");
}

/* =============================
   MODULE REGISTRATION (HTTP)
   ============================= */
void registerModuleHttp() {
  Serial.println("📝 Registering module (HTTP)...");
  int code = 0;
  String resp;
  String payload = String("{\"moduleId\":\"") + String(MODULE_ID) + "\"}";
  bool ok = httpPostJson(REGISTER_URL, payload, code, resp);
  if (!ok) {
    Serial.println("⚠️ registerModuleHttp failed: HTTP " + String(code));
    Serial.println(resp);
  } else {
    Serial.println("✅ registerModuleHttp OK");
    Serial.println(resp);
  }
}

/* =============================
   ACTUATOR POLLING
   ============================= */
void pollActuators() {
  if (!moduleAssigned) return;

  unsigned long now = millis();
  if (now - lastActuatorPoll < ACTUATOR_POLL_INTERVAL) return;
  lastActuatorPoll = now;

  int code = 0;
  String resp;
  String payload = String("{\"moduleId\":\"") + String(MODULE_ID) + "\"}";
  bool ok = httpPostJson(ACTUATORS_URL, payload, code, resp);
  if (!ok) {
    Serial.println("⚠️ Actuator poll failed: HTTP " + String(code));
    Serial.println(resp);
    return;
  }

  // Very small parser (avoid extra dependencies). Function returns flat fields.
  bool irrOn = resp.indexOf("\"irrigationStatus\":\"on\"") >= 0;
  bool fertOn = resp.indexOf("\"fertilizationStatus\":\"on\"") >= 0;

  String irr = irrOn ? "on" : "off";
  if (irr != lastIrrigationStatus) {
    lastIrrigationStatus = irr;
    Serial.println(irrOn ? "💧 Irrigation ON" : "💧 Irrigation OFF");
  }

  String fert = fertOn ? "on" : "off";
  if (fert != lastFertilizationStatus) {
    lastFertilizationStatus = fert;
    Serial.println(fertOn ? "🌿 Fertilization ON" : "🌿 Fertilization OFF");
  }
}

/* =============================
   ASSIGNMENT CHECK
   ============================= */
bool checkAssignment() {
  int code = 0;
  String resp;
  String payload = String("{\"moduleId\":\"") + String(MODULE_ID) + "\"}";
  bool ok = httpPostJson(STATUS_URL, payload, code, resp);

  if (!ok) {
    Serial.println("⚠️ Status check failed: HTTP " + String(code));
    moduleAssigned = false;
    return false;
  }

  bool assigned = resp.indexOf("\"assigned\":true") >= 0;
  if (!assigned) {
    if (moduleAssigned) Serial.println("🔓 Module unassigned");
    moduleAssigned = false;
    return false;
  }

  if (!moduleAssigned) {
    Serial.println("✅ Module Assigned");
    moduleAssigned = true;
    failedWriteCount = 0;
    lastIrrigationStatus = "";
    lastFertilizationStatus = "";
  }

  lastAssignmentCheck = millis();
  return true;
}

/* =============================
   SENSOR DATA - UPDATED FOR ANALYTICS COMPATIBILITY
   ============================= */
bool sendSensorData() {
  // CRITICAL: Verify module is still assigned before writing
  // This prevents recreating deleted module entries
  if (!moduleAssigned) {
    Serial.println("⚠️  Module not assigned - skipping data send");
    return false;
  }
  
  // Get current timestamp in milliseconds (JavaScript compatible)
  uint64_t timestamp = (uint64_t)time(nullptr) * 1000ULL;
  
  // Generate sensor readings
  float temp = random(240, 320) / 10.0;
  float hum = random(60, 90);
  float soil = random(40, 80);
  float phVal = random(55, 75) / 10.0;
  int nitrogen = random(100, 150);
  int phosphorus = random(30, 60);
  int potassium = random(150, 200);
  
  bool allSuccessful = true;

  // Send to Cloud Function so BACKEND enforces sampling interval.
  // The backend will write latestReading/history/sensorReadings only once per bucket.
  String payload = "{";
  payload += "\"moduleId\":\"" + String(MODULE_ID) + "\",";
  payload += "\"temperature\":" + String(temp, 2) + ",";
  payload += "\"humidity\":" + String(hum, 2) + ",";
  payload += "\"soilMoisture\":" + String(soil, 2) + ",";
  payload += "\"ph\":" + String(phVal, 2) + ",";
  payload += "\"nitrogen\":" + String(nitrogen) + ",";
  payload += "\"phosphorus\":" + String(phosphorus) + ",";
  payload += "\"potassium\":" + String(potassium) + ",";
  payload += "\"timestampMs\":" + String((unsigned long long)timestamp);
  payload += "}";

  int httpCode = 0;
  String response;
  bool ok = httpPostJson(INGEST_URL, payload, httpCode, response);

  if (!ok) {
    Serial.println("❌ Ingest HTTP failed");
    allSuccessful = false;
    failedWriteCount++;
  } else {
    Serial.println("✅ Ingest OK: HTTP " + String(httpCode));
    Serial.println(response);
  }
  
  // Print sensor values
  Serial.println("--- Sensor Reading ---");
  Serial.println("🌡️  Temp: " + String(temp) + "°C");
  Serial.println("💧 Humidity: " + String(hum) + "%");
  Serial.println("🌱 Soil: " + String(soil) + "%");
  Serial.println("⚗️  pH: " + String(phVal));
  Serial.println("🧪 N: " + String(nitrogen) + " ppm");
  Serial.println("🧪 P: " + String(phosphorus) + " ppm");
  Serial.println("🧪 K: " + String(potassium) + " ppm");
  Serial.println("⏰ Timestamp: " + String((unsigned long long)timestamp));
  Serial.println("----------------------");
  
  // Reset failure count on success
  if (allSuccessful) {
    failedWriteCount = 0;
  }
  
  // Trigger assignment recheck if too many failures
  if (failedWriteCount >= MAX_FAILED_WRITES) {
    Serial.println("⚠️  Too many failed writes - will recheck assignment");
    moduleAssigned = false;
    failedWriteCount = 0;
  }
  
  return allSuccessful;
}

/* =============================
   CLEANUP OLD DATA (OPTIONAL)
   ============================= */
void cleanupOldData() {
  // Optional: Remove readings older than 7 days to save space
  // This runs once per day
  static unsigned long lastCleanup = 0;
  unsigned long now = millis();
  
  if (now - lastCleanup < 86400000) return; // 24 hours
  lastCleanup = now;
  
  // NOTE: In HTTP-only mode, the device does not talk to RTDB directly.
  // If you need retention, implement cleanup server-side (Cloud Function / scheduled job).
  Serial.println("🧹 Cleanup skipped (HTTP-only mode)");
}

/* =============================
   SETUP & LOOP
   ============================= */
void setup() {
  Serial.begin(115200);
  connectWiFi();
  syncTime();
  registerModuleHttp();
  
  Serial.println("🚀 GreenSync ESP32 Ready");
  Serial.println("📍 Module ID: " + String(MODULE_ID));
  Serial.println("💡 To claim this device, enter the Module ID in the web dashboard");
}

void loop() {
  // Periodically recheck assignment status (even when assigned)
  unsigned long now = millis();
  if (now - lastAssignmentCheck >= ASSIGNMENT_RECHECK_INTERVAL) {
    Serial.println("🔍 Periodic assignment check...");
    checkAssignment();
  }
  
  // If not assigned, check more frequently
  if (!moduleAssigned) {
    if (now - lastAssignmentCheck >= 5000) {
      checkAssignment();
    }
    delay(1000);
    return;
  }

  // Poll actuators frequently without keeping a stream open
  pollActuators();

  // Send sensor data on a schedule
  if (now - lastSensorSend >= SENSOR_SEND_INTERVAL) {
    lastSensorSend = now;
    sendSensorData();
    // Optional: Cleanup old data periodically
    // cleanupOldData();
  }

  delay(50);
}
