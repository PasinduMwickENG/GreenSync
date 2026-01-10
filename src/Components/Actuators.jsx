import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { auth, rtdb } from '../firebaseConfig';
import { ref, onValue, set as rtdbSet } from 'firebase/database';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  Droplets,
  Leaf,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

const formatDateTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  const ms = parseTimestampToMs(timestamp);
  const date = new Date(ms);
  if (isNaN(date)) return 'Invalid date';
  return date.toLocaleString();
};

const parseTimestampToMs = (ts) => {
  if (ts == null) return null;
  const n = Number(ts);
  if (!isFinite(n)) return null;
  if (n < 100000000000) return Math.round(n * 1000);
  return Math.round(n);
};

const Actuators = () => {
  const [user] = useAuthState(auth);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  const mapRtdbToModules = (farmData) => {
    if (!farmData) return [];

    const processedModules = [];

    Object.entries(farmData).forEach(([farmId, farm]) => {
      if (farm.modules) {
        Object.entries(farm.modules).forEach(([moduleId, moduleData]) => {
          const sensors = moduleData.sensors || {};

          // Robust sensor mapping
          const temperature = sensors.temperature ?? 0;
          const humidity = sensors.humidity ?? 0;
          const soilMoisture = sensors.soilMoisture ?? sensors.moisture ?? 0;
          const ph = sensors.ph ?? sensors.soilPH ?? sensors.pH ?? 7;

          const actuators = moduleData.actuators || {
            irrigation: { status: 'off', autoMode: false },
            fertilization: { status: 'off', autoMode: false }
          };

          processedModules.push({
            id: moduleId,
            farmId: farmId,
            name: moduleId.toUpperCase(),
            location: moduleData.location || farm.name || 'Smart Farm',
            crop: moduleData.crop || 'Unknown',
            status: 'active',
            lastFertilized: sensors.lastFertilized || Date.now() - 86400000,
            nextFertilization: sensors.nextFertilization || Date.now() + 86400000,
            lastIrrigation: sensors.lastIrrigation || Date.now() - 43200000,
            nextIrrigation: sensors.nextIrrigation || Date.now() + 43200000,
            waterUsage: sensors.waterUsage || 0,
            fertilizerUsage: sensors.fertilizerUsage || 0,
            sensorModules: [{
              id: `${moduleId}-main`,
              sensors: {
                temperature: { value: temperature, threshold: { min: 15, max: 35 } },
                humidity: { value: humidity, threshold: { min: 30, max: 80 } },
                soilMoisture: { value: soilMoisture, threshold: { min: 20, max: 70 } },
                ph: { value: ph, threshold: { min: 6.0, max: 7.5 } }
              }
            }],
            actuators: actuators
          });
        });
      }
    });

    return processedModules;
  };

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
      const mappedModules = mapRtdbToModules(data);
      setModules(mappedModules);
      setLoading(false);
    }, (error) => {
      console.error('RTDB Listener error:', error);
      setLoading(false);
    });

    return () => {
      try {
        unsubscribe();
      } catch {
        // ignore
      }
    };
  }, [user]);

  const getActuatorIcon = (actuatorType) => {
    switch (actuatorType) {
      case 'irrigation': return <Droplets className="w-5 h-5 text-blue-500" />;
      case 'fertilization': return <Leaf className="w-5 h-5 text-green-500" />;
      default: return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'on': return 'bg-green-100 text-green-800';
      case 'off': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'on': return <Play className="w-4 h-4" />;
      case 'off': return <Pause className="w-4 h-4" />;
      default: return <Pause className="w-4 h-4" />;
    }
  };

  const updateActuatorInRtdb = (moduleId, farmId, actuatorType, field, value) => {
    const actuatorRef = ref(rtdb, `users/${user.uid}/farms/${farmId}/modules/${moduleId}/actuators/${actuatorType}/${field}`);
    rtdbSet(actuatorRef, value);
  };

  const toggleActuator = (moduleId, actuatorType) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const currentActuator = module.actuators[actuatorType];
    const newStatus = currentActuator.status === 'on' ? 'off' : 'on';

    updateActuatorInRtdb(moduleId, module.farmId, actuatorType, 'status', newStatus);
  };

  const toggleAutoMode = (moduleId, actuatorType) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const currentActuator = module.actuators[actuatorType];

    updateActuatorInRtdb(moduleId, module.farmId, actuatorType, 'autoMode', !currentActuator.autoMode);
  };

  const resetActuator = (moduleId, actuatorType) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const actuatorRef = ref(rtdb, `users/${user.uid}/farms/${module.farmId}/modules/${moduleId}/actuators/${actuatorType}`);
    rtdbSet(actuatorRef, {
      status: 'off',
      autoMode: false
    });
  };

  const getRecommendation = (module, actuatorType) => {
    if (!module.sensorModules || module.sensorModules.length === 0) {
      return { type: 'info', message: 'No sensor data available for recommendations' };
    }

    const avg = module.sensorModules.reduce((acc, sm) => {
      acc.temperature += sm.sensors.temperature.value || 0;
      acc.humidity += sm.sensors.humidity.value || 0;
      acc.soilMoisture += sm.sensors.soilMoisture.value || 0;
      acc.ph += sm.sensors.ph.value || 0;
      return acc;
    }, { temperature: 0, humidity: 0, soilMoisture: 0, ph: 0 });

    const count = module.sensorModules.length;
    const sensors = {
      temperature: avg.temperature / count,
      humidity: avg.humidity / count,
      soilMoisture: avg.soilMoisture / count,
      ph: avg.ph / count
    };

    switch (actuatorType) {
      case 'irrigation':
        if (sensors.soilMoisture < 20) return { type: 'warning', message: 'Soil moisture low - irrigation recommended' };
        if (sensors.soilMoisture > 70) return { type: 'caution', message: 'Soil moisture high - avoid irrigation' };
        return { type: 'ok', message: 'Soil moisture within optimal range' };
      case 'fertilization':
        if (sensors.nutrients < 100) return { type: 'warning', message: 'Nutrient levels low - fertilization recommended' };
        if (sensors.nutrients > 200) return { type: 'caution', message: 'Nutrient levels high - avoid fertilization' };
        if (sensors.ph < 6.0 || sensors.ph > 7.5) return { type: 'warning', message: 'pH out of range - fertilization needed' };
        return { type: 'ok', message: 'Nutrient levels within optimal range' };
      default:
        return { type: 'ok', message: 'No recommendations available' };
    }
  };

  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'caution': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'ok': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTotalActuators = () => modules.reduce((t, m) => t + Object.keys(m.actuators).length, 0);
  const getActiveActuators = () => modules.reduce((t, m) => t + Object.values(m.actuators).filter(a => a.status === 'on').length, 0);
  const getAutoModeActuators = () => modules.reduce((t, m) => t + Object.values(m.actuators).filter(a => a.autoMode).length, 0);

  // ✅ Full-page centered loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white">
        <div className="flex flex-col items-center">
          <svg
            className="animate-spin h-12 w-12 text-green-500"
            viewBox="0 0 66 66"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className="path"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              cx="33"
              cy="33"
              r="30"
            />
          </svg>
          <span className="mt-4 text-gray-600 font-semibold text-lg">
            LOADING ACTUATOR INFO
          </span>
        </div>
      </div>
    );
  }
  ;

  return (
    <div className="p-4 mt-10 space-y-6 bg-white-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Actuator Control System</h2>
          <p className="text-gray-500 mt-1 font-medium">Manual and automated control of irrigation and fertilization</p>
        </div>
        <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full shadow-sm">
          <Activity className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-bold text-blue-700">{getActiveActuators()} / {getTotalActuators()} Active</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Actuators', value: getTotalActuators(), icon: Settings, color: 'text-gray-600', bgColor: 'bg-gray-100' },
          { label: 'Active', value: getActiveActuators(), icon: Play, color: 'text-green-600', bgColor: 'bg-green-100' },
          { label: 'Auto Mode', value: getAutoModeActuators(), icon: RotateCcw, color: 'text-blue-600', bgColor: 'bg-blue-100' }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="p-6">
                <div className={`flex items-center justify-between ${stat.bgColor} p-4 rounded-2xl`}>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <div className={`p-3 bg-white rounded-full shadow-md ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Module Controls */}
      {modules.map(module => (
        <div key={module.id} className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{module.name}</h3>
                <p className="text-sm text-gray-500 font-medium">{module.location} • {module.crop} • {module.sensorModules?.length || 0} sensor modules</p>
              </div>
              <div className="px-3 py-1.5 bg-green-100 text-green-800 rounded-full font-semibold text-sm flex items-center gap-1">
                <Activity className="w-4 h-4" />
                <span>{module.status}</span>
              </div>
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {Object.entries(module.actuators).map(([actuatorType, actuatorData]) => {
                const recommendation = getRecommendation(module, actuatorType);
                return (
                  <div key={actuatorType} className="p-4 bg-gray-50 rounded-2xl flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className={`p-2 rounded-full ${actuatorData.status === 'on' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                          {getActuatorIcon(actuatorType)}
                        </div>
                        <span className="font-bold text-gray-800 capitalize">{actuatorType}</span>
                      </div>
                      <div className={`px-3 py-1 rounded-full font-semibold text-xs flex items-center gap-1 ${getStatusColor(actuatorData.status)}`}>
                        {getStatusIcon(actuatorData.status)}
                        <span className="capitalize">{actuatorData.status}</span>
                      </div>
                    </div>

                    {actuatorType === 'irrigation' && (
                      <div className="mb-4 p-3 rounded-2xl bg-blue-100 border border-blue-200 text-sm text-blue-800 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-blue-200 rounded-full">
                            <Droplets className="w-3 h-3" />
                          </div>
                          <span className="font-bold">Water Used:</span> {module.waterUsage} liters
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-blue-200 rounded-full">
                            <Clock className="w-3 h-3" />
                          </div>
                          <span className="font-bold">Last:</span> {formatDateTime(module.lastIrrigation)}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-blue-200 rounded-full">
                            <ArrowRight className="w-3 h-3" />
                          </div>
                          <span className="font-bold">Next:</span> {formatDateTime(module.nextIrrigation)}
                        </div>
                      </div>
                    )}

                    {actuatorType === 'fertilization' && (
                      <div className="mb-4 p-3 rounded-2xl bg-green-100 border border-green-200 text-sm text-green-800 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-green-200 rounded-full">
                            <Leaf className="w-3 h-3" />
                          </div>
                          <span className="font-bold">Fertilizer Used:</span> {module.fertilizerUsage} kg
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-green-200 rounded-full">
                            <Clock className="w-3 h-3" />
                          </div>
                          <span className="font-bold">Last:</span> {formatDateTime(module.lastFertilized)}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-green-200 rounded-full">
                            <ArrowRight className="w-3 h-3" />
                          </div>
                          <span className="font-bold">Next:</span> {formatDateTime(module.nextFertilization)}
                        </div>
                      </div>
                    )}

                    {/* Control Buttons - Mobile friendly */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                      <button
                        onClick={() => toggleActuator(module.id, actuatorType)}
                        className={`w-full sm:w-auto px-4 py-2 rounded-full font-semibold text-sm transition-all duration-150 active:scale-95 shadow-md ${actuatorData.status === 'on'
                          ? 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
                          : 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                      >
                        {actuatorData.status === 'on' ? 'Turn Off' : 'Turn On'}
                      </button>

                      <button
                        onClick={() => toggleAutoMode(module.id, actuatorType)}
                        className={`w-full sm:w-auto px-4 py-2 rounded-full font-semibold text-sm transition-all duration-150 active:scale-95 shadow-md ${actuatorData.autoMode
                          ? 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700'
                          : 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                      >
                        {actuatorData.autoMode ? 'Auto ON' : 'Auto OFF'}
                      </button>

                      <button
                        onClick={() => resetActuator(module.id, actuatorType)}
                        className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-300 text-gray-800 hover:bg-gray-100 active:bg-gray-200 rounded-full font-semibold text-sm transition-all duration-150 active:scale-95 shadow-md flex items-center justify-center space-x-1"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Reset</span>
                      </button>
                    </div>

                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex items-start space-x-2">
                        <div className="p-1.5 bg-purple-100 rounded-full text-purple-600 mt-0.5">
                          {getRecommendationIcon(recommendation.type)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-600 mb-1">AI Recommendation</p>
                          <p className="text-sm text-gray-700 font-medium">{recommendation.message}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {/* System Status */}
      <div className="bg-white rounded-3xl shadow-lg">
        <div className="p-6 pb-4">
          <h3 className="text-xl font-bold text-gray-900">System Status Overview</h3>
        </div>
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-bold text-gray-800 text-base">Active Actuators</h4>
              {modules.map(module => (
                <div key={module.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-2xl">
                  <span className="text-sm font-semibold text-gray-700">{module.name}</span>
                  <div className="flex items-center space-x-2">
                    {Object.entries(module.actuators).map(([type, data]) => (
                      <div key={type} className="flex items-center space-x-1">
                        <div className={`p-1.5 rounded-full ${data.status === 'on' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                          {getActuatorIcon(type)}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${data.status === 'on' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                          {data.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-gray-800 text-base">Auto Mode Status</h4>
              {modules.map(module => (
                <div key={module.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-2xl">
                  <span className="text-sm font-semibold text-gray-700">{module.name}</span>
                  <div className="flex items-center space-x-2">
                    {Object.entries(module.actuators).map(([type, data]) => (
                      <div key={type} className="flex items-center space-x-1">
                        <div className={`p-1.5 rounded-full ${data.autoMode ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                          {getActuatorIcon(type)}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${data.autoMode ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                          {data.autoMode ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Actuators;
