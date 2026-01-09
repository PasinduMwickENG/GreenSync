import React, { useState, useEffect } from 'react';

const Counter = ({ title, sensorType, initialThresholds, onThresholdChange }) => {
  const [thresholds, setThresholds] = useState({
    lower: 0,
    upper: 0
  });

  // Initialize with props
  useEffect(() => {
    if (initialThresholds) {
      setThresholds(initialThresholds);
    }
  }, [initialThresholds]);

  const handleChange = (type, value) => {
    const newThresholds = {
      ...thresholds,
      [type]: sensorType === 'pH' ? parseFloat(value.toFixed(1)) : Math.round(value)
    };
    setThresholds(newThresholds);
    onThresholdChange(sensorType, newThresholds);
  };

  return (
    <div className="flex flex-col gap-1 mt-2 w-full">
      <div className="flex items-center gap-2 text-sm">
        <span className="w-20 text-gray-600">Lower:</span>
        <button 
          className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition"
          onClick={() => handleChange('lower', Math.max(0, thresholds.lower - (sensorType === 'pH' ? 0.1 : 1)))}
        >
          -
        </button>
        <span className="w-10 text-center font-medium">
          {sensorType === 'pH' ? thresholds.lower.toFixed(1) : thresholds.lower}
        </span>
        <button 
          className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition"
          onClick={() => handleChange('lower', thresholds.lower + (sensorType === 'pH' ? 0.1 : 1))}
        >
          +
        </button>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="w-20 text-gray-600">Upper:</span>
        <button 
          className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition"
          onClick={() => handleChange('upper', Math.max(0, thresholds.upper - (sensorType === 'pH' ? 0.1 : 1)))}
        >
          -
        </button>
        <span className="w-10 text-center font-medium">
          {sensorType === 'pH' ? thresholds.upper.toFixed(1) : thresholds.upper}
        </span>
        <button 
          className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition"
          onClick={() => handleChange('upper', thresholds.upper + (sensorType === 'pH' ? 0.1 : 1))}
        >
          +
        </button>
      </div>
    </div>
  );
};

export default Counter;