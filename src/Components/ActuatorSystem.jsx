import React, { useEffect, useState } from 'react';
import './Values.css';

function ActuatorSystem({ moduleId = "moduleX" }) {
  const [latestData, setLatestData] = useState(null);

  useEffect(() => {
    fetch('https://8j84zathh0.execute-api.ap-south-1.amazonaws.com/sensor-data')
      .then(res => res.json())
      .then(json => {
        const moduleData = json[moduleId];
        if (!moduleData || moduleData.length === 0) {
          console.warn("No data found for module:", moduleId);
          return;
        }

        const latest = moduleData[moduleData.length - 1]; // Last reading
        setLatestData(latest);
      })
      .catch(err => {
        console.error("Failed to load sensor data:", err);
      });
  }, [moduleId]);

  if (!latestData) return <p>Loading actuator data...</p>;

  return (
    <div className="ActuatorStatus space-y-6 flex justify-center gap-3">
      {/* Irrigation System */}
      <div className="card" onClick={() => showGraph('WaterUsage')}>
        <h3 className="mb-2 text-2xl font-bold tracking-tight text-amber-400 flex justify-center">Irrigation System</h3>
        <div className="readings">Last Irrigation: <span className="values">{latestData.lastIrrigation || 'N/A'}</span></div>
        <div className="readings">Next Scheduled: <span className="values">{latestData.nextScheduledWater || 'N/A'}</span></div>
        <div className="readings">Valve Status: <span className="values">{latestData.valveStatusWater || 'N/A'}</span></div>
        <div className="readings">Water Usage: <span className="values">{latestData.waterUsage ?? 'N/A'}</span></div>
      </div>

      {/* Fertilizer System */}
      <div className="card" onClick={() => showGraph('FertilizerUsage')}>
        <h3 className="mb-2 text-2xl font-bold tracking-tight text-amber-400 flex justify-center">Fertilizer System</h3>
        <div className="readings">Last Fertilized: <span className="values">{latestData.lastFertilized || 'N/A'}</span></div>
        <div className="readings">Next Scheduled: <span className="values">{latestData.nextScheduledFertilizer || 'N/A'}</span></div>
        <div className="readings">Valve Status: <span className="values">{latestData.valveStatusFertilizer || 'N/A'}</span></div>
        <div className="readings">Fertilizer Usage: <span className="values">{latestData.fertilizerUsage ?? 'N/A'}</span></div>
      </div>
    </div>
  );
}

// Dummy function (replace with chart logic if needed)
function showGraph(id) {
  alert(`Showing graph for: ${id}`);
}

export default ActuatorSystem;
