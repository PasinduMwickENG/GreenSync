# 🌱 GreenSync – Intelligent Agriculture Monitoring System

GreenSync is a comprehensive **IoT-based agricultural monitoring and control platform** designed to optimize crop management through **real-time sensor data**, **automated alerts**, and **intelligent actuator control**.

The system is built on a **slave-node mesh network architecture**, where multiple ESP32-based sensor modules communicate within a local mesh and forward data to a **central master node**, which acts as a gateway to the cloud. This design ensures **scalability, reliability, and long-range farm deployment capability**.

---

## 🏗️ System Architecture

GreenSync operates using a **two-layer architecture**:

### 🔹 Field Layer – Mesh Network
- Multiple **ESP32 slave nodes**
- Each node monitors a specific plot/module
- Nodes form a **wireless mesh network**
- Handles:
  - Sensor data collection  
  - Local communication  
  - Actuator control  

### 🔹 Gateway Layer – Master Node
- A dedicated **ESP32 master node**
- Responsibilities:
  - Aggregates data from all slave nodes  
  - Performs basic validation & formatting  
  - Sends data securely to the cloud (Firebase)  
  - Receives control commands from the dashboard and routes them back to slave nodes  

[ Slave Nodes (Mesh) ] → [ Master Node / Gateway ] → [ Cloud Backend ] → [ Web Dashboard ]
(ESP32) (ESP32) (Firebase) (React)


---

## 🚀 Features

### 🌡️ Real-Time Sensor Monitoring
- Temperature, humidity, soil moisture, and more  
- Live data streaming from distributed slave nodes  

### 🧩 Multi-Plot / Module Management
- Each slave node represents a farm plot/module  
- Centralized monitoring from a single dashboard  

### 🔔 Automated Alerts & Notifications
- Threshold-based alerts
- Cloud-triggered notifications

### 🚿 Smart Actuator Control
- Master node relays commands to mesh slave nodes
- Supports irrigation, ventilation, and automation systems

### 📊 Advanced Analytics
- Historical records and trend analysis per module  
- Resource usage and environmental insights  

### 🔐 Authentication & Security
- Firebase authentication
- Role-based system access

### 📱 Responsive Dashboard
- Real-time charts and live updates  
- Module-based data visualization  

### 🔄 Reliable Data Ingestion
- Master node handles buffering and cloud upload  
- Sampling strategies to optimize bandwidth and power

---

## 🛠️ Technology Stack

### Frontend
- React 19 (Vite)  
- Tailwind CSS  
- Radix UI  
- Material UI  

### Backend & Cloud
- Node.js  
- Firebase Cloud Functions  
- Firebase Firestore  
- Firebase Realtime Database  

### IoT & Networking
- ESP32  
- Mesh / long-range wireless communication  
- Master–slave gateway architecture  

### Data Visualization
- ApexCharts  
- Chart.js  
- Ant Design Charts  
- MUI Charts  

### Deployment
- Firebase Hosting  
- Firebase Cloud Functions  

---

## 🌾 Use Cases

- Distributed greenhouse monitoring  
- Large-scale precision agriculture  
- Research farms and smart agriculture labs  
- Resource-optimized irrigation systems  

---

## 📦 High-Level Data Flow

Sensors → Slave Node → Mesh Network → Master Node → Firebase → Web Dashboard
Dashboard → Firebase → Master Node → Mesh Network → Slave Node → Actuators
