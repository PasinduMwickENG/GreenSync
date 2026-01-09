import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import './Loader.css';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { auth, rtdb } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  Thermometer, Droplets, Zap, Sun, Activity, Beaker, Settings, RefreshCw, ArrowLeft,
  ChevronLeft, ChevronRight, Plus, MapPin, AlertTriangle, CheckCircle
} from 'lucide-react';

// Helper to map RTDB data to the component's module structure
const mapRtdbToModules = (farmData) => {
  if (!farmData) return [];

  const processedModules = [];

  Object.entries(farmData).forEach(([farmId, farm]) => {
    if (farm.modules) {
      Object.entries(farm.modules).forEach(([moduleId, moduleData]) => {
        // Read from latestReading (new structure) or fallback to sensors (old structure)
        const sensors = moduleData.latestReading || moduleData.sensors || {};

        // Robust sensor mapping
        const temperature = sensors.temperature ?? 0;
        const humidity = sensors.humidity ?? 0;
        const soilMoisture = sensors.soilMoisture ?? sensors.moisture ?? 0;
        const ph = sensors.ph ?? sensors.soilPH ?? sensors.pH ?? 7;

        processedModules.push({
          id: moduleId,
          name: moduleId.toUpperCase(),
          location: moduleData.location || farm.name || 'Unknown',
          crop: moduleData.crop || 'Unknown',
          status: 'active',
          sensorModules: [{
            id: `${moduleId}-main`,
            name: `${moduleId} Sensors`,
            location: moduleData.location || 'Unknown',
            lastUpdated: sensors.timestamp ? new Date(parseTimestampToMs(sensors.timestamp)).toLocaleString() : 'Never',
            sensorData: { ...sensors, temperature, humidity, soilMoisture, ph },
            status: 'active',
            sensors: {
              temperature: {
                value: temperature,
                unit: '°C',
                threshold: { min: 15, max: 35 }
              },
              humidity: {
                value: humidity,
                unit: '%',
                threshold: { min: 30, max: 80 }
              },
              soilMoisture: {
                value: soilMoisture,
                unit: '%',
                threshold: { min: 20, max: 80 }
              },
              soilPH: {
                value: ph,
                unit: 'pH',
                threshold: { min: 5.5, max: 7.5 }
              }
            },
          }]
        });
      });
    }
  });

  return processedModules;
};

const parseTimestampToMs = (ts) => {
  if (ts == null) return null;
  const n = Number(ts);
  if (!isFinite(n)) return null;
  if (n < 100000000000) return Math.round(n * 1000);
  return Math.round(n);
};

const LiveSensors = ({ selectedModuleId, onBackToDashboard }) => {
  const [user] = useAuthState(auth);
  const [modules, setModules] = useState([]);
  const [editingThreshold, setEditingThreshold] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filterModule, setFilterModule] = useState(selectedModuleId || 'all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  const [currentSensorIndex, setCurrentSensorIndex] = useState({});

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const userFarmsRef = ref(rtdb, `users/${user.uid}/farms`);

    const unsubscribe = onValue(userFarmsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setModules([]);
        setLoading(false);
        return;
      }

      const parsedModules = mapRtdbToModules(data);
      setModules(parsedModules);
      setLastUpdated(new Date());

      // Auto-expand if a specific module is selected
      if (selectedModuleId && expandedModules[selectedModuleId] === undefined) {
        setExpandedModules(prev => ({ ...prev, [selectedModuleId]: true }));
      }

      const initialIndex = {};
      parsedModules.forEach(m => (initialIndex[m.id] = 0));
      setCurrentSensorIndex(initialIndex);
      setLoading(false);
    }, (err) => {
      console.error("RTDB Error:", err);
      setError("Failed to fetch live data.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, selectedModuleId]);

  // Helpers
  const toggleModule = (moduleId) => setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  const handlePrevSensor = (moduleId) => setCurrentSensorIndex(prev => ({ ...prev, [moduleId]: Math.max((prev[moduleId] || 0) - 1, 0) }));
  const handleNextSensor = (moduleId, total) => setCurrentSensorIndex(prev => ({ ...prev, [moduleId]: Math.min((prev[moduleId] || 0) + 1, total - 1) }));
  const handleSelectSensor = (moduleId, index) => setCurrentSensorIndex(prev => ({ ...prev, [moduleId]: index }));

  const getCurrentSensorModule = (module) => module.sensorModules?.[currentSensorIndex[module.id]] || module.sensorModules?.[0];

  const getSensorIcon = (sensorType) => {
    switch (sensorType) {
      case 'temperature': return <Thermometer className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'soilMoisture': return <Droplets className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'soilPH': return <Zap className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'lightIntensity': return <Sun className="w-5 h-5 sm:w-6 sm:h-6" />;
      default: return <Activity className="w-5 h-5 sm:w-6 sm:h-6" />;
    }
  };

  const getSensorColor = (value, threshold) => (value < threshold.min || value > threshold.max ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50');
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'warning':
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };
  const formatSensorName = (sensorType) => sensorType.replace(/([A-Z])/g, ' $1').trim();

  const handleThresholdChange = (moduleId, sensorModuleId, sensorType, type, value) => {
    setModules(prevModules =>
      prevModules.map(module =>
        module.id === moduleId
          ? {
            ...module,
            sensorModules: module.sensorModules.map(sensorModule =>
              sensorModule.id === sensorModuleId
                ? {
                  ...sensorModule,
                  sensors: {
                    ...sensorModule.sensors,
                    [sensorType]: {
                      ...sensorModule.sensors[sensorType],
                      threshold: {
                        ...sensorModule.sensors[sensorType].threshold,
                        [type]: value[0]
                      }
                    }
                  }
                }
                : sensorModule
            )
          }
          : module
      )
    );
  };

  // Filter modules
  const filteredModules = filterModule === 'all' ? modules : modules.filter(m => m.id === filterModule);

  return (
    <div className="p-3 mt-10 sm:p-6 space-y-4 sm:space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
          {selectedModuleId && (
            <button
              onClick={onBackToDashboard}
              className="flex items-center space-x-1 sm:space-x-2 px-4 py-2 bg-white hover:bg-gray-100 active:bg-gray-200 border-0 shadow-md rounded-full transition-all duration-150 active:scale-95 text-sm sm:text-base font-semibold text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Back</span>
            </button>
          )}
          <div>
            <h2 className="text-xl sm:text-3xl font-bold text-gray-900">Live Sensor Data</h2>
            <p className="text-gray-500 mt-1 text-xs sm:text-base font-medium">Real-time monitoring & threshold controls</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4 mt-2 sm:mt-0 text-xs sm:text-sm">
          <span className="text-gray-500 font-medium">Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Waiting for data...'}</span>
          <div className="flex items-center gap-2 text-green-600 font-bold px-3 py-1 bg-green-50 rounded-full animate-pulse">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Live Data
          </div>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {error && (
        <div className="text-center text-red-600 py-4 bg-red-50 rounded-2xl mx-4 font-medium">
          Error: {error}
        </div>
      )}

      {/* Filter */}
      {!loading && !error && !selectedModuleId && (
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Filter by Module</h3>
          <div className="relative">
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-full sm:w-64 bg-white border-0 shadow-md rounded-2xl px-4 py-3 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent className="bg-white border-0 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-xl">
                <SelectItem value="all" className="px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 text-gray-900 font-medium transition-colors">
                  All Modules
                </SelectItem>
                {modules.map(module => (
                  <SelectItem
                    key={module.id}
                    value={module.id}
                    className="px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 text-gray-900 font-medium transition-colors"
                  >
                    {module.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Modules */}
      {!loading && !error && filteredModules.map((module) => {
        const totalSensors = module.sensorModules?.length || 0;
        const currentSensorModule = getCurrentSensorModule(module);

        return (
          <div key={module.id} className="bg-white rounded-3xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
            <div className="p-6 pb-4 cursor-pointer" onClick={() => toggleModule(module.id)}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-gray-900">{module.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">{module.location} • {module.crop}</p>
                </div>
                <div className="px-3 py-1.5 bg-green-100 text-green-800 rounded-full font-semibold text-xs sm:text-sm flex items-center space-x-1">
                  <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{module.status}</span>
                </div>
              </div>
            </div>

            {expandedModules[module.id] && (
              <div className="px-6 pb-6 space-y-4">
                {/* Sensor Navigation */}
                {totalSensors > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 p-3 sm:p-4 bg-blue-50 rounded-2xl">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <button
                        onClick={() => handlePrevSensor(module.id)}
                        disabled={currentSensorIndex[module.id] === 0}
                        className="w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-100 active:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 rounded-full shadow-md transition-all duration-150 active:scale-95"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="text-center">
                        <h4 className="font-bold text-blue-800 text-sm sm:text-base">{currentSensorModule?.name}</h4>
                        <div className="flex items-center space-x-1 text-xs sm:text-sm text-blue-600 justify-center font-medium">
                          <MapPin className="w-3 h-3" />
                          <span>{currentSensorModule?.location}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleNextSensor(module.id, totalSensors)}
                        disabled={currentSensorIndex[module.id] === totalSensors - 1}
                        className="w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-100 active:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 rounded-full shadow-md transition-all duration-150 active:scale-95"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Sensor Data */}
                {currentSensorModule && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {Object.entries(currentSensorModule.sensors).map(([sensorType, data]) => {
                      const isEditing = editingThreshold === `${module.id}-${currentSensorModule.id}-${sensorType}`;
                      const isOutOfRange = data.value < data.threshold.min || data.value > data.threshold.max;

                      return (
                        <div key={sensorType} className={`p-3 sm:p-4 rounded-2xl transition-all duration-200 ${isOutOfRange
                          ? 'bg-red-50 border-2 border-red-200'
                          : 'bg-green-50 border-2 border-green-200'
                          }`}>
                          <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <div className="flex items-center space-x-2">
                              <div className={`p-2 rounded-full ${isOutOfRange ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {getSensorIcon(sensorType)}
                              </div>
                              <span className="font-bold text-gray-800 text-xs sm:text-sm capitalize">{formatSensorName(sensorType)}</span>
                            </div>
                            <button
                              onClick={() => setEditingThreshold(isEditing ? null : `${module.id}-${currentSensorModule.id}-${sensorType}`)}
                              className="w-8 h-8 flex items-center justify-center bg-white hover:bg-gray-100 active:bg-gray-200 rounded-full shadow-sm transition-all duration-150 active:scale-95"
                            >
                              <Settings className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>

                          <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                            {data.value?.toFixed ? data.value.toFixed(1) : data.value}{data.unit}
                          </div>

                          {isEditing ? (
                            <div className="space-y-2 sm:space-y-3">
                              <div>
                                <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                                  Min: {data.threshold.min}{data.unit}
                                </label>
                                <Slider
                                  value={[data.threshold.min]}
                                  onValueChange={(value) => handleThresholdChange(module.id, currentSensorModule.id, sensorType, 'min', value)}
                                  max={data.threshold.max - 1}
                                  min={0}
                                  step={0.1}
                                  className="w-full"
                                />
                              </div>
                              <div>
                                <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                                  Max: {data.threshold.max}{data.unit}
                                </label>
                                <Slider
                                  value={[data.threshold.max]}
                                  onValueChange={(value) => handleThresholdChange(module.id, currentSensorModule.id, sensorType, 'max', value)}
                                  max={100}
                                  min={data.threshold.min + 1}
                                  step={0.1}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs sm:text-sm text-gray-600 font-medium">
                              <div className="mb-1">Range: {data.threshold.min} - {data.threshold.max}{data.unit}</div>
                              {isOutOfRange && (
                                <div className="text-red-600 font-bold flex items-center space-x-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Outside normal range</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LiveSensors;