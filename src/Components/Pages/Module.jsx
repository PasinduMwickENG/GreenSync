import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Counter from '../Counter';
import ActuatorSystem from '../ActuatorSystem';
import NotificationPanel from '../NotificationPanel';
import CropInfo from '../CropInfo';
import { toast, Toaster } from 'sonner';


// ✅ Default threshold values for each sensor parameter
const defaultThresholds = {
  temperature: { lower: 20, upper: 35 },
  moisture: { lower: 30, upper: 70 },
  pH: { lower: 5.5, upper: 7.5 },
  nitrogen: { lower: 0.5, upper: 2.0 },
  phosphorus: { lower: 0.3, upper: 1.5 },
  potassium: { lower: 0.5, upper: 2.0 }
};

function Module() {
  const { id } = useParams(); // id = "1", "2", etc.
  const moduleKey = `module${id}`; // e.g., "module1"
  const [sensorList, setSensorList] = useState([]);
  const [selectedSensorId, setSelectedSensorId] = useState('');
  const [sensorData, setSensorData] = useState([]);
  const [latest, setLatest] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [thresholds, setThresholds] = useState(defaultThresholds); // ✅ Initialize with defaults

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('https://8j84zathh0.execute-api.ap-south-1.amazonaws.com/sensor-data');
        const data = await res.json();
        const moduleData = data[moduleKey];
        if (!moduleData) return;

        setSensorData(moduleData);

        const sensorIds = [...new Set(moduleData.map(entry => entry.sensor_id))];
        setSensorList(sensorIds);
        setSelectedSensorId(sensorIds[0]); // default to first sensor
      } catch (err) {
        console.error("Error fetching sensor data:", err);
      }
    };
    fetchData();
  }, [moduleKey]);

  useEffect(() => {
    if (!sensorData.length || !selectedSensorId) return;
    const entries = sensorData.filter(entry => entry.sensor_id === selectedSensorId);
    if (!entries.length) return;

    const latestEntry = entries[entries.length - 1];
    setLatest(latestEntry);

    const alerts = {
      temperature: latestEntry.temperature,
      moisture: latestEntry.moisture,
      pH: latestEntry.pH,
      nitrogen: latestEntry.nitrogen,
      phosphorus: latestEntry.phosphorus,
      potassium: latestEntry.potassium,
    };

    Object.entries(alerts).forEach(([key, value]) => {
      const t = thresholds[key];
      if (!t) return;
      if (value < t.lower) {
        showToast(`${key.toUpperCase()} is Low`, value, t.lower, 'low');
      } else if (value > t.upper) {
        showToast(`${key.toUpperCase()} is High`, value, t.upper, 'high');
      }
    });

  }, [sensorData, selectedSensorId, thresholds]);

  const showToast = (message, value, limit, type) => {
    toast(message, {
      description: `Value: ${value} | Threshold: ${limit}`,
      duration: 5000,
      style: {
        backgroundColor: type === 'low' ? '#e0f2ff' : '#ffffff',
        color: type === 'low' ? '#0369a1' : '#000000'
      }
    });
    const time = new Date().toLocaleTimeString();
    setNotifications(prev => [{ type, message, value, limit, timestamp: time }, ...prev]);
  };

  const handleThresholdChange = (sensorType, newThresholds) => {
    setThresholds(prev => ({
      ...prev,
      [sensorType]: newThresholds
    }));
  };

  return (
    <main className="p-4 mt-5">
      <Toaster richColors position="top-right" />
      <NotificationPanel
        notifications={notifications}
        show={showPanel}
        toggle={() => setShowPanel(!showPanel)}
      />

      <h1 className="Title">Crop Information - {moduleKey}</h1>
      <div className="flex justify-center mb-10 mt-10">
        <div className="mr-10"><CropInfo moduleId={moduleKey} /></div>
      </div>

      <h1 className="Title mb-5">Sensor Data</h1>

    <div className="flex justify-center mb-8">
  <div className="relative w-64">
    <select
      className="appearance-none w-full bg-white text-slate-700 px-5 py-3 pr-10 rounded-xl shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:shadow-md focus:bg-white/95 cursor-pointer"
      value={selectedSensorId}
      onChange={(e) => setSelectedSensorId(e.target.value)}
    >
      {sensorList.map((id, idx) => (
        <option 
          key={idx} 
          value={id} 
          className="bg-white text-slate-700 hover:bg-gray-100"
        >
          {id}
        </option>
      ))}
    </select>
    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
      <svg 
        className="w-5 h-5 text-slate-400" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={1.5} 
          d="M19 9l-7 7-7-7" 
        />
      </svg>
    </div>
  </div>
</div>

      {latest ? (
        <>
          <div className="flex flex-wrap justify-center gap-5 mt-10">
            {[
              { reading: 'Temperature', value: `${latest.temperature}°C`, sensorType: 'temperature' },
              { reading: 'Moisture', value: `${latest.moisture}%`, sensorType: 'moisture' },
              { reading: 'pH', value: latest.pH, sensorType: 'pH' },
              { reading: 'Nitrogen', value: `${latest.nitrogen} mg/kg`, sensorType: 'nitrogen' },
              { reading: 'Phosphorus', value: `${latest.phosphorus} mg/kg`, sensorType: 'phosphorus' },
              { reading: 'Potassium', value: `${latest.potassium} mg/kg`, sensorType: 'potassium' },
            ].map((card, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg">
                <Card card={card} />
                <Counter
                  title={card.reading}
                  moduleId={moduleKey}
                  sensorType={card.sensorType}
                  initialThresholds={thresholds[card.sensorType]}
                  onThresholdChange={handleThresholdChange}
                />
              </div>
            ))}
          </div>

          <h1 className="Title">Actuator Status</h1>
          <div className="p-8">
            <ActuatorSystem data={latest} />
          </div>
        </>
      ) : (
        <p className="text-center mt-10">Select a sensor to view its data.</p>
      )}
    </main>
  );
}

export default Module;
