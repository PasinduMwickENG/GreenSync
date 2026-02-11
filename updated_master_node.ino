#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <time.h>
#include "secrets.h"

// Provide the token generation process info.
#include <addons/TokenHelper.h>
// Provide the RTDB payload printing info and other helper functions.
#include <addons/RTDBHelper.h>

/* =============================
   MODULE CONFIG
   ============================= */
#define MODULE_ID "GS-ESP32-GATEWAY-01" // Unique ID for this Gateway

// --- Pin Definitions (ESP32-S3 Box) ---
#define LORA_SCK   12
#define LORA_MISO  16
#define LORA_MOSI  15
#define LORA_SS    10
#define LORA_RST   9
#define LORA_DIO0  8
#define LORA_BAND  433E6 

/* =============================
   NTP CONFIG
   ============================= */
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 19800; // GMT +5:30 (India/Sri Lanka)
const int   daylightOffset_sec = 0;

/* =============================
   FIREBASE OBJECTS
   ============================= */
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

/* =============================
   STATE VARIABLES
   ============================= */
String assignedUID = "";
String farmId = "";
bool moduleAssigned = false;
unsigned long lastAssignmentCheck = 0;

// LoRa State
const int Device_ID = 0; 
const int MAX_NODES = 10;
int lastSeq[MAX_NODES]; 
float snr = 0;
float rssi = 0;

/* =============================
   WIFI & TIME
   ============================= */
void connectWiFi() {
  Serial.print("📶 Connecting WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected");
  Serial.println("IP: " + WiFi.localIP().toString());
}

void syncTime() {
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)){
    Serial.println("❌ Failed to obtain time");
    return;
  }
  Serial.println("🕒 Time synced");
}

/* =============================
   FIREBASE INIT
   ============================= */
void initFirebase() {
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DB_SECRET;
  
  // Set buffer size to avoid memory issues
  fbdo.setResponseSize(4096);

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  Serial.println("🔥 Firebase connected (Gateway Mode)");
}

/* =============================
   ASSIGNMENT CHECK (SELF-REGISTERING)
   ============================= */
void checkAssignment() {
  // Check every 5 seconds if not assigned, or every 30s if assigned
  unsigned long interval = moduleAssigned ? 30000 : 5000;
  if (millis() - lastAssignmentCheck < interval) return;
  lastAssignmentCheck = millis();

  String path = "modules/" + String(MODULE_ID);
  
  // 1. Try to read the module node
  if (!Firebase.RTDB.getJSON(&fbdo, path)) {
    // If read fails, it likely doesn't exist (or network error)
    if (fbdo.errorReason() == "path not exist") {
       Serial.println("⚠️ Module not found in DB. Registering self...");
       
       FirebaseJson json;
       json.set("status", "unassigned");
       json.set("assignedTo", ""); 
       json.set("deviceType", "LoRa-Gateway");
       json.set("farmId", ""); 
       
       if (Firebase.RTDB.setJSON(&fbdo, path, &json)) {
          Serial.println("✅ Self-registration complete! Waiting for user to claim...");
       } else {
          Serial.println("❌ Registration failed: " + fbdo.errorReason());
       }
    } else {
       Serial.println("❌ Error reading DB: " + fbdo.errorReason());
    }
    return;
  }
  
  // 2. Node exists, check assignment
  FirebaseJson &json = fbdo.jsonObject();
  FirebaseJsonData data;
  
  json.get(data, "assignedTo");
  
  if (data.success && data.stringValue != "") {
     assignedUID = data.stringValue;
     
     // Get Farm ID
     json.get(data, "farmId");
     if (data.success && data.stringValue != "") {
        farmId = data.stringValue;
     } else {
        farmId = "default_farm"; // Fallback
     }

     moduleAssigned = true;
     Serial.println("✅ Module is ACTIVE!");
     Serial.println("👤 Owner: " + assignedUID);
     Serial.println("🌾 Farm: " + farmId);
  } else {
     moduleAssigned = false;
     Serial.println("⏳ Device online but UNCLAIMED. Waiting for user...");
  }
}

/* =============================
   DATA UPLOAD
   ============================= */
void uploadLoRaData(int originID, String tempVal, int seq) {
  if (!moduleAssigned) {
    Serial.println("⚠️ Cannot upload: Module not assigned to a user.");
    return;
  }

  unsigned long timestamp = (unsigned long)time(nullptr) * 1000;
  
  FirebaseJson json;
  json.set("temperature", tempVal.toFloat());
  json.set("sequenceId", seq);
  json.set("rssi", rssi);
  json.set("snr", snr);
  json.set("timestamp", timestamp);

  // Path: users/{uid}/farms/{farm}/modules/{GatewayID}/nodes/Node{originID}
  String nodePath = "users/" + assignedUID + "/farms/" + farmId + "/modules/" + MODULE_ID + "/nodes/Node" + String(originID);

  // Update individual node data (latest reading)
  if (Firebase.RTDB.updateNode(&fbdo, nodePath, &json)) {
     Serial.println("📡 Upload Success: Node" + String(originID));
  } else {
     Serial.println("❌ Upload Fail: " + fbdo.errorReason());
  }

  // Push to history for Analytics
  if (Firebase.RTDB.pushJSON(&fbdo, nodePath + "/history", &json)) {
     Serial.println("📝 History recorded for Node" + String(originID));
  } else {
     Serial.println("⚠️ History log failed: " + fbdo.errorReason());
  }
}

/* =============================
   LORA FUNCTIONS
   ============================= */
void sendACK(int Target, int AckSeq) {
  delay(50); 
  String msg = String(Device_ID) + "|" + String(Target) + "|ACK|" + String(AckSeq);
  LoRa.beginPacket();
  LoRa.print(msg);
  LoRa.endPacket();
  LoRa.receive(); 
  Serial.println("   -> Sent ACK for [SEQ: " + String(AckSeq) + "] to Node " + String(Target));
}

void sendRREP(int Target) {
  String msg = String(Device_ID) + "|" + String(Target) + "|RREP|0"; 
  delay(random(50, 150)); 
  LoRa.beginPacket();
  LoRa.print(msg);
  LoRa.endPacket();
  LoRa.receive(); 
  Serial.println("   -> Sent Discovery Reply (RREP) to Node " + String(Target));
}

void processData(int Sender, int OriginID, String Temp, int Seq, bool isRelayed) {
  Serial.println("--------------------------------");
  
  if(isRelayed) {
    Serial.print("[RELAY MSG] Delivered by Node " + String(Sender));
    Serial.println(" | Origin: Node " + String(OriginID));
  } else {
    Serial.println("[DIRECT MSG] From Node " + String(OriginID));
  }

  Serial.print("   DATA: " + Temp + "C");
  Serial.println("   [SEQ: " + String(Seq) + "]");
  
  // Duplicate Check
  if (OriginID < MAX_NODES && lastSeq[OriginID] == Seq) {
     Serial.println("   [!] Status: DUPLICATE. Resending ACK only.");
     sendACK(Sender, Seq); 
     return;
  }
  
  Serial.println("   Status: NEW Packet. Accepted.");
  if (OriginID < MAX_NODES) lastSeq[OriginID] = Seq;

  // Upload to Firebase if connected and assigned
  if (WiFi.status() == WL_CONNECTED) {
      uploadLoRaData(OriginID, Temp, Seq);
  }
  
  sendACK(Sender, Seq);
}

void decodePacket(String msg) {
  int p1 = msg.indexOf("|");
  int p2 = msg.indexOf("|", p1+1);
  int p3 = msg.indexOf("|", p2+1);
  int p4 = msg.indexOf("|", p3+1); 

  if (p1 < 0) return;

  int Sender = msg.substring(0, p1).toInt();
  int Destination = msg.substring(p1 + 1, p2).toInt();
  String Type = msg.substring(p2 + 1, p3);

  if (Destination != Device_ID && Destination != 255) return;

  if (Type == "data") {
    String content = msg.substring(p3 + 1, p4); 
    int Seq = msg.substring(p4 + 1).toInt();
    int comma = content.indexOf(",");
    int OriginID = content.substring(0, comma).toInt();
    String Temp = content.substring(comma + 1);

    processData(Sender, OriginID, Temp, Seq, false);
  }
  else if (Type == "RELAY") {
    String remainder = msg.substring(p3 + 1); 
    int lastPipe = remainder.lastIndexOf("|");
    String innerData = remainder.substring(0, lastPipe);
    int Seq = remainder.substring(lastPipe + 1).toInt();
    int comma = innerData.indexOf(",");
    int OriginID = innerData.substring(0, comma).toInt();
    String Temp = innerData.substring(comma + 1);

    processData(Sender, OriginID, Temp, Seq, true);
  }
  else if (Type == "RREQ") {
    int TargetID = msg.substring(p3 + 1, p4).toInt();
    if (TargetID == Device_ID) {
      Serial.println("[RREQ] Discovery Request from Node " + String(Sender));
      sendRREP(Sender);
    }
  }
}

/* =============================
   SETUP & LOOP
   ============================= */
void setup() {
  Serial.begin(115200);
  
  connectWiFi();
  syncTime();
  initFirebase();

  // LoRa Init
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(LORA_BAND)) { Serial.println("LoRa Init Failed"); while (1); }

  LoRa.setSyncWord(0xF3);
  LoRa.setSpreadingFactor(9);
  LoRa.setTxPower(14, PA_OUTPUT_PA_BOOST_PIN); 

  for(int i=0; i<MAX_NODES; i++) lastSeq[i] = -1; 

  Serial.println("🚀 LoRa Gateway Ready.");
  Serial.println("📍 Module ID: " + String(MODULE_ID));
}

void loop() {
  // Check assignment periodically (Non-blocking)
  checkAssignment();

  // Listen for LoRa packets
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    snr = LoRa.packetSnr();
    rssi = LoRa.packetRssi();
    
    String message = "";
    while (LoRa.available()) message += (char) LoRa.read();
    decodePacket(message);
  }
}