#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <time.h>

// --- Wi-Fi credentials ---
const char* ssid = "moto g04s";
const char* password = "Pasindu2001";

// --- Firebase credentials ---
const char* DATABASE_URL = "https://greensyncv1-default-rtdb.asia-southeast1.firebasedatabase.app";
const char* DB_SECRET = "AIzaSyCLVzBUv49X_jhGFs6knmAIk5SH1PKNVOM"; // Use your DB secret

// --- NTP CONFIG ---
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 19800; // GMT +5:30
const int   daylightOffset_sec = 0;

// --- Firebase objects ---
FirebaseData fbdoSend;
FirebaseData fbdoStream;
FirebaseAuth auth;
FirebaseConfig config;

// --- LoRa Pin Definitions (ESP32-S3 Box) ---
#define LORA_SCK   12
#define LORA_MISO  16
#define LORA_MOSI  15
#define LORA_SS    10
#define LORA_RST   9
#define LORA_DIO0  8
#define LORA_BAND  433E6 

const int Device_ID = 0; 
const int MAX_NODES = 10;
int lastSeq[MAX_NODES]; // Array to store last Sequence ID from each node
float snr = 0;
float rssi = 0;

// --- MASTER MODULE CONFIGURATION ---
// The master node itself can be assigned to a farm as a module
#define MASTER_MODULE_ID "GS-ESP32-MASTER" // Master's own module ID

// Master's assignment state
struct MasterState {
  String moduleId;
  String assignedUID;
  String farmId;
  bool assigned;
  unsigned long lastAssignmentCheck;
};

MasterState masterState = {"GS-ESP32-MASTER", "", "", false, 0};

// --- Module assignment and state tracking ---
// Map Node IDs to Module IDs
const char* NODE_TO_MODULE_ID[MAX_NODES] = {
  "GS-ESP32-0001",  // Node 1 -> Module ID
  "GS-ESP32-0002",  // Node 2 -> Module ID
  "GS-ESP32-0003",  // Node 3 -> Module ID
  NULL, NULL, NULL, NULL, NULL, NULL, NULL
};

// Module state tracking
struct ModuleState {
  String moduleId;
  String assignedUID;
  String farmId;
  bool assigned;
  unsigned long lastAssignmentCheck;
};

ModuleState moduleStates[MAX_NODES];

// --- Timestamp helper ---
unsigned long getTimestampMs() {
  return (unsigned long)time(nullptr) * 1000;
}

// --- Wi-Fi Connection ---
void connectWiFi() {
  Serial.print("📶 Connecting WiFi");
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected!");
  } else {
    Serial.println("\n❌ WiFi connection failed!");
  }
}

// --- Time Sync ---
void syncTime() {
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  time_t now = time(nullptr);
  int attempts = 0;
  while (now < 100000 && attempts < 20) {
    delay(500);
    now = time(nullptr);
    attempts++;
  }
  Serial.println("🕒 Time synced");
}

// --- Initialize Firebase ---
void initFirebase() {
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DB_SECRET;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  Serial.println("🔥 Firebase connected (Device mode)");
}

// --- Check Module Assignment ---
void checkModuleAssignment(int nodeId) {
  if (nodeId >= MAX_NODES || NODE_TO_MODULE_ID[nodeId] == NULL) return;
  
  String moduleId = String(NODE_TO_MODULE_ID[nodeId]);
  String path = "modules/" + moduleId;
  
  if (!Firebase.RTDB.getJSON(&fbdoSend, path.c_str())) {
    Serial.println("❌ Failed to read module node: " + moduleId);
    return;
  }
  
  FirebaseJson &json = fbdoSend.jsonObject();
  FirebaseJsonData data;
  
  json.get(data, "assignedTo");
  if (!data.success || String(data.stringValue) == "") {
    Serial.println("⏳ Module not assigned: " + moduleId);
    moduleStates[nodeId].assigned = false;
    return;
  }
  
  moduleStates[nodeId].assignedUID = String(data.stringValue);
  
  json.get(data, "farmId");
  moduleStates[nodeId].farmId = String(data.stringValue);
  
  moduleStates[nodeId].assigned = true;
  moduleStates[nodeId].moduleId = moduleId;
  
  Serial.println("✅ Module Assigned: " + moduleId);
  Serial.println("👤 User: " + moduleStates[nodeId].assignedUID);
  Serial.println("🌾 Farm: " + moduleStates[nodeId].farmId);
  
  // Set up stream for actuator commands
  String streamPath = 
    "users/" + moduleStates[nodeId].assignedUID +
    "/farms/" + moduleStates[nodeId].farmId +
    "/modules/" + moduleId +
    "/actuators";
  
  if (!Firebase.RTDB.beginStream(&fbdoStream, streamPath.c_str())) {
    Serial.println("❌ Stream error: " + fbdoStream.errorReason());
    return;
  }
  
  Firebase.RTDB.setStreamCallback(
    &fbdoStream,
    handleActuatorStream,
    [](bool timeout) {
      if (timeout) Serial.println("⚠️ Stream timeout");
    }
  );
}

// --- Check Master Node Assignment ---
void checkMasterAssignment() {
  String moduleId = String(MASTER_MODULE_ID);
  String path = "modules/" + moduleId;
  
  if (!Firebase.RTDB.getJSON(&fbdoSend, path.c_str())) {
    Serial.println("❌ Failed to read master module node");
    return;
  }
  
  FirebaseJson &json = fbdoSend.jsonObject();
  FirebaseJsonData data;
  
  json.get(data, "assignedTo");
  if (!data.success || String(data.stringValue) == "") {
    Serial.println("⏳ Master module not assigned");
    masterState.assigned = false;
    return;
  }
  
  masterState.assignedUID = String(data.stringValue);
  
  json.get(data, "farmId");
  masterState.farmId = String(data.stringValue);
  
  masterState.assigned = true;
  masterState.moduleId = moduleId;
  
  Serial.println("✅ MASTER Assigned!");
  Serial.println("👤 User: " + masterState.assignedUID);
  Serial.println("🌾 Farm: " + masterState.farmId);
  
  // Set up stream for master's actuator commands
  String streamPath = 
    "users/" + masterState.assignedUID +
    "/farms/" + masterState.farmId +
    "/modules/" + moduleId +
    "/actuators";
  
  if (!Firebase.RTDB.beginStream(&fbdoStream, streamPath.c_str())) {
    Serial.println("❌ Stream error for master: " + fbdoStream.errorReason());
    return;
  }
  
  Firebase.RTDB.setStreamCallback(
    &fbdoStream,
    handleActuatorStream,
    [](bool timeout) {
      if (timeout) Serial.println("⚠️ Master stream timeout");
    }
  );
}

// --- Handle Actuator Commands from Firebase Stream ---
void handleActuatorStream(FirebaseStream data) {
  String path = data.dataPath();
  String value = data.stringData();
  
  Serial.println("📡 Actuator command received:");
  Serial.println("   Path: " + path);
  Serial.println("   Value: " + value);
  
  // Parse which node/module this command is for and handle accordingly
  if (path == "/irrigation/status") {
    Serial.println(value == "on" ? "💧 Irrigation ON" : "💧 Irrigation OFF");
  }
  if (path == "/fertilization/status") {
    Serial.println(value == "on" ? "🌿 Fertilization ON" : "🌿 Fertilization OFF");
  }
}

// --- Send ACK ---
void sendACK(int Target, int AckSeq) {
  delay(50); // Important for switching time
  String msg = String(Device_ID) + "|" + String(Target) + "|ACK|" + String(AckSeq);
  LoRa.beginPacket();
  LoRa.print(msg);
  LoRa.endPacket();
  LoRa.receive(); 
  Serial.println("   -> Sent ACK for [SEQ: " + String(AckSeq) + "] to Node " + String(Target));
}

// --- Send RREP ---
void sendRREP(int Target) {
  String msg = String(Device_ID) + "|" + String(Target) + "|RREP|0"; 
  delay(random(50, 150)); 
  LoRa.beginPacket();
  LoRa.print(msg);
  LoRa.endPacket();
  LoRa.receive(); 
  Serial.println("   -> Sent Discovery Reply (RREP) to Node " + String(Target));
}

// --- Parse sensor data from string ---
// Expected format in data field: temperature,humidity,moisture,ph
// Example: "25.5,65.3,45.2,6.8"
struct SensorData {
  float temperature;
  float humidity;
  float soilMoisture;
  float ph;
  bool valid;
};

SensorData parseSensorData(String dataStr) {
  SensorData data = {0, 0, 0, 0, false};
  
  int commaCount = 0;
  int lastComma = -1;
  
  // Count commas
  for (int i = 0; i < dataStr.length(); i++) {
    if (dataStr[i] == ',') commaCount++;
  }
  
  // Parse values
  if (commaCount >= 0) {
    int comma1 = dataStr.indexOf(',');
    if (comma1 > 0) {
      data.temperature = dataStr.substring(0, comma1).toFloat();
      
      if (commaCount >= 1) {
        int comma2 = dataStr.indexOf(',', comma1 + 1);
        if (comma2 > comma1 + 1) {
          data.humidity = dataStr.substring(comma1 + 1, comma2).toFloat();
          
          if (commaCount >= 2) {
            int comma3 = dataStr.indexOf(',', comma2 + 1);
            if (comma3 > comma2 + 1) {
              data.soilMoisture = dataStr.substring(comma2 + 1, comma3).toFloat();
              
              if (commaCount >= 3) {
                data.ph = dataStr.substring(comma3 + 1).toFloat();
              } else {
                // Only 3 values: temp,humidity,moisture
                data.ph = 7.0; // Default pH
              }
              data.valid = true;
            }
          } else {
            // Only 2 values: temp,humidity
            data.soilMoisture = 0;
            data.ph = 7.0;
            data.valid = true;
          }
        }
      } else {
        // Only 1 value: temperature
        data.humidity = 0;
        data.soilMoisture = 0;
        data.ph = 7.0;
        data.valid = true;
      }
    }
  } else {
    // Single value - treat as temperature
    data.temperature = dataStr.toFloat();
    data.humidity = 0;
    data.soilMoisture = 0;
    data.ph = 7.0;
    data.valid = (data.temperature != 0);
  }
  
  return data;
}

// --- Send sensor data to Firebase (3-point storage) ---
void sendSensorDataToFirebase(int nodeId, SensorData sensorData) {
  if (nodeId >= MAX_NODES || !moduleStates[nodeId].assigned) {
    Serial.print("[ERROR] Node ");
    Serial.print(nodeId);
    Serial.println(" is not assigned!");
    return;
  }
  
  ModuleState &state = moduleStates[nodeId];
  unsigned long timestamp = getTimestampMs();
  
  // Create sensor data JSON
  FirebaseJson json;
  json.set("temperature", sensorData.temperature);
  json.set("humidity", sensorData.humidity);
  json.set("soilMoisture", sensorData.soilMoisture);
  json.set("ph", sensorData.ph);
  json.set("timestamp", timestamp);
  json.set("snr", snr);
  json.set("rssi", rssi);
  
  // Base path for this module
  String basePath = 
    "users/" + state.assignedUID +
    "/farms/" + state.farmId +
    "/modules/" + state.moduleId;
  
  Serial.println("");
  Serial.println(">>> Sending to Firebase:");
  Serial.println("    Module: " + state.moduleId);
  Serial.println("    Base Path: " + basePath);
  
  // 1. Update latest reading (for dashboard real-time display)
  String latestPath = basePath + "/latestReading";
  
  if (!Firebase.RTDB.updateNode(&fbdoSend, latestPath.c_str(), &json)) {
    Serial.println("❌ Latest reading failed: " + fbdoSend.errorReason());
  } else {
    Serial.println("📡 Latest reading updated");
  }
  
  // 2. Push to history array (for Analytics trends)
  String historyPath = basePath + "/history";
  
  if (!Firebase.RTDB.pushJSON(&fbdoSend, historyPath.c_str(), &json)) {
    Serial.println("❌ History push failed: " + fbdoSend.errorReason());
  } else {
    Serial.println("📊 Historical data added");
  }
  
  // 3. Store with timestamp key for direct access
  String timestampPath = basePath + "/sensorReadings/" + String((unsigned long)(timestamp / 1000));
  
  if (!Firebase.RTDB.setJSON(&fbdoSend, timestampPath.c_str(), &json)) {
    Serial.println("❌ Timestamped data failed: " + fbdoSend.errorReason());
  } else {
    Serial.println("🗂️  Timestamped data stored");
  }
  
  // Print sensor values
  Serial.println("--- Sensor Reading ---");
  Serial.println("🌡️  Temp: " + String(sensorData.temperature) + "°C");
  Serial.println("💧 Humidity: " + String(sensorData.humidity) + "%");
  Serial.println("🌱 Soil: " + String(sensorData.soilMoisture) + "%");
  Serial.println("⚗️  pH: " + String(sensorData.ph));
  Serial.println("📶 SNR: " + String(snr));
  Serial.println("📶 RSSI: " + String(rssi));
  Serial.println("⏰ Timestamp: " + String(timestamp));
  Serial.println("----------------------");
}

// --- Process Incoming Data ---
void processData(int Sender, int OriginID, String dataStr, int Seq, bool isRelayed) {
  Serial.println("--------------------------------");
  
  if(isRelayed) {
    Serial.print("[RELAY MSG] Delivered by Node " + String(Sender));
    Serial.println(" | Origin: Node " + String(OriginID));
  } else {
    Serial.println("[DIRECT MSG] From Node " + String(OriginID));
  }

  Serial.print("   DATA: " + dataStr);
  Serial.println("   [SEQ: " + String(Seq) + "]");
  Serial.print("   SNR: "); Serial.print(snr);
  Serial.print(" | RSSI: "); Serial.print(rssi);

  // Duplicate Check
  if (OriginID < MAX_NODES && lastSeq[OriginID] == Seq) {
    Serial.println("   [!] Status: DUPLICATE Packet. Resending ACK only.");
    sendACK(Sender, Seq); 
    return;
  }
  
  Serial.println("   Status: NEW Packet. Accepted.");
  
  if (OriginID < MAX_NODES) lastSeq[OriginID] = Seq;
  
  // Parse sensor data
  SensorData sensorData = parseSensorData(dataStr);
  
  if (sensorData.valid) {
    // Check if module is assigned (with caching to avoid excessive Firebase reads)
    unsigned long now = millis();
    if (!moduleStates[OriginID].assigned || (now - moduleStates[OriginID].lastAssignmentCheck > 60000)) {
      checkModuleAssignment(OriginID);
      moduleStates[OriginID].lastAssignmentCheck = now;
    }
    
    if (moduleStates[OriginID].assigned) {
      sendSensorDataToFirebase(OriginID, sensorData);
    } else {
      Serial.print("[ERROR] Node ");
      Serial.print(OriginID);
      Serial.println(" not assigned to any user");
    }
  } else {
    Serial.println("[ERROR] Failed to parse sensor data!");
  }

  sendACK(Sender, Seq);
}

// --- Decode Incoming LoRa Packet ---
void decodePacket(String msg) {
  int p1 = msg.indexOf("|");
  int p2 = msg.indexOf("|", p1 + 1);
  int p3 = msg.indexOf("|", p2 + 1);
  int p4 = msg.indexOf("|", p3 + 1); 

  if (p1 < 0) return;

  int Sender = msg.substring(0, p1).toInt();
  int Destination = msg.substring(p1 + 1, p2).toInt();
  String Type = msg.substring(p2 + 1, p3);

  if (Destination != Device_ID && Destination != 255) return;

  if (Type == "data") {
    // Format: Sender|Dest|data|OriginID,Data|Seq
    // Data format: temperature,humidity,moisture,ph (comma-separated values)
    String content = msg.substring(p3 + 1, p4); 
    int Seq = msg.substring(p4 + 1).toInt();
    int comma = content.indexOf(",");
    
    if (comma > 0) {
      int OriginID = content.substring(0, comma).toInt();
      String sensorDataStr = content.substring(comma + 1);
      processData(Sender, OriginID, sensorDataStr, Seq, false);
    }
  }
  else if (Type == "RELAY") {
    // Format: Sender|Dest|RELAY|OriginID,Data|Seq
    String remainder = msg.substring(p3 + 1); 
    int lastPipe = remainder.lastIndexOf("|");
    String innerData = remainder.substring(0, lastPipe);
    int Seq = remainder.substring(lastPipe + 1).toInt();
    int comma = innerData.indexOf(",");
    
    if (comma > 0) {
      int OriginID = innerData.substring(0, comma).toInt();
      String sensorDataStr = innerData.substring(comma + 1);
      processData(Sender, OriginID, sensorDataStr, Seq, true);
    }
  }
  else if (Type == "RREQ") {
    int TargetID = msg.substring(p3 + 1, p4).toInt();
    if (TargetID == Device_ID) {
      Serial.println("[RREQ] Discovery Request from Node " + String(Sender));
      sendRREP(Sender);
    }
  }
}

// --- SETUP ---
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n🚀 GreenSync Master Node Starting...");
  
  // Connect to Wi-Fi
  connectWiFi();
  
  // Sync time with NTP server
  syncTime();
  
  // Initialize Firebase
  initFirebase();
  
  // Initialize LoRa
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(LORA_BAND)) { 
    Serial.println("❌ LoRa Init Failed"); 
    while (1); 
  }

  LoRa.setSyncWord(0xF3);
  LoRa.setSpreadingFactor(9);
  LoRa.setTxPower(14, PA_OUTPUT_PA_BOOST_PIN); 

  // Initialize sequence tracking
  for(int i = 0; i < MAX_NODES; i++) lastSeq[i] = -1;
  
  // Initialize module states
  for(int i = 0; i < MAX_NODES; i++) {
    moduleStates[i].assigned = false;
    moduleStates[i].lastAssignmentCheck = 0;
  }

  LoRa.receive();
  Serial.println("✅ Master Ready. Listening for LoRa packets...");
  Serial.println("📍 Device ID: " + String(Device_ID));
  Serial.println("📡 Master Module ID: " + String(MASTER_MODULE_ID));
}

void loop() {
  // Periodically check for unassigned modules (every 30 seconds)
  static unsigned long lastModuleCheck = 0;
  unsigned long now = millis();
  
  if (now - lastModuleCheck > 30000) {
    // Check master's own assignment
    if (!masterState.assigned) {
      checkMasterAssignment();
    }
    
    // Check slave modules' assignments
    for (int i = 0; i < MAX_NODES; i++) {
      if (NODE_TO_MODULE_ID[i] != NULL && !moduleStates[i].assigned) {
        checkModuleAssignment(i);
      }
    }
    lastModuleCheck = now;
  }

  // LoRa packet processing
  int packetSize = LoRa.parsePacket();
  snr = LoRa.packetSnr();
  rssi = LoRa.packetRssi();

  if (packetSize) {
    String message = "";
    while (LoRa.available()) message += (char) LoRa.read();
    decodePacket(message);
  }
}
