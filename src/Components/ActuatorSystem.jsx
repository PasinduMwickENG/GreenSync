import React from 'react';
import './Values.css';

function ActuatorSystem({ data }) {
  const latestData = data || null;

  if (!latestData) return <p>Actuator data unavailable.</p>;

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
