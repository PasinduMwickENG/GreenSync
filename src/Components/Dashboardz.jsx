import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { auth, rtdb, db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import dashboardConfig from '../services/dashboardConfig';
import ConfirmDialog from './Dialogs/ConfirmDialog';
import { LoadingSpinner } from './ui/loading-spinner';
import { EmptyState, ErrorState } from './ui/states';
import {
  MapPin,
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  Plus,
  Sun,
  Cloud,
  CloudRain,
  Thermometer,
  Settings,
  Trash2,
  LayoutGrid,
} from 'lucide-react';

const parseTimestampToMs = (ts) => {
  if (ts == null) return null;
  const n = Number(ts);
  if (!isFinite(n)) return null;
  // If timestamp is in seconds (less than 10^11), convert to ms
  if (n < 100000000000) return Math.round(n * 1000);
  return Math.round(n);
};

const Dashboardz = ({ onModuleSelect, onNavigateToSensors, onAddGreenhouse, hideHeader = false }) => {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [moduleToRemove, setModuleToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [userPlots, setUserPlots] = useState({});
  const [error, setError] = useState(null);

  // Check if user is admin
  useEffect(() => {
    let mounted = true;
    const checkAdmin = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (mounted && userDoc.exists()) {
          setIsAdmin(userDoc.data()?.role === 'admin');
        }
      } catch (err) {
        console.warn('Failed to check admin role', err);
      }
    };
    checkAdmin();
    return () => { mounted = false; };
  }, [user]);

  // Listen to user's custom plots
  useEffect(() => {
    if (!user) return;

    const plotsRef = ref(rtdb, `users/${user.uid}/dashboardConfig/plots`);
    const unsubscribe = onValue(plotsRef, (snapshot) => {
      const plots = snapshot.val() || {};
      setUserPlots(plots);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const userModulesRef = ref(rtdb, `users/${user.uid}/farms`);

    const unsubscribe = onValue(userModulesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setModules([]);
        setLoading(false);
        return;
      }

      // Get all module IDs that are part of custom plots
      const plotModuleIds = new Set();
      Object.values(userPlots).forEach(plot => {
        if (plot.modules && Array.isArray(plot.modules)) {
          plot.modules.forEach(moduleId => plotModuleIds.add(moduleId));
        }
      });

      // If no custom plots exist, don't show any modules
      if (plotModuleIds.size === 0) {
        setModules([]);
        setLoading(false);
        return;
      }

      const processedModules = [];
      Object.entries(data).forEach(([farmId, farmData]) => {
        if (farmData.modules) {
          Object.entries(farmData.modules).forEach(([moduleId, moduleData]) => {
            // Only include modules that are part of user-created plots
            if (!plotModuleIds.has(moduleId)) return;

            // Read from latestReading (new structure) or fallback to sensors (old structure)
            const sensors = moduleData.latestReading || moduleData.sensors || {};

            // Robust sensor mapping
            const temperature = sensors.temperature ?? 0;
            const humidity = sensors.humidity ?? 0;
            const soilMoisture = sensors.soilMoisture ?? sensors.moisture ?? 0;
            const ph = sensors.ph ?? sensors.soilPH ?? sensors.pH ?? 7;

            processedModules.push({
              id: moduleId,
              name: moduleId,
              location: moduleData.location || 'Unknown',
              status: 'active',
              crop: moduleData.crop || 'Unknown',
              cropHealth: 'good',
              weather: {
                condition: 'sunny',
                temperature,
                humidity,
                soilMoisture,
                ph,
                description: `Temp: ${temperature.toFixed(1)}°C • Hum: ${humidity}%`,
              },
              lastUpdated: sensors.timestamp ? new Date(parseTimestampToMs(sensors.timestamp)).toLocaleString() : 'Never',
              sensorData: { ...sensors, temperature, humidity, soilMoisture, ph },
            });
          });
        }
      });

      setModules(processedModules);
      setLoading(false);
    }, (error) => {
      console.error('RTDB Listener error:', error);
      setError('Failed to load dashboard data.');
      setLoading(false);
    });

    return () => {
      try {
        unsubscribe();
      } catch {
        // ignore
      }
    };
  }, [user, userPlots]);

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

  const getCropIcon = (cropName) => {
    switch (cropName.toLowerCase()) {
      case 'tomatoes': return '🍅';
      case 'lettuce': return '🥬';
      case 'peppers': return '🌶️';
      case 'tea': return '🍵';
      default: return '🌱';
    }
  };

  const getWeatherIcon = (condition) => {
    switch (condition) {
      case 'sunny': return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'cloudy': return <Cloud className="w-5 h-5 text-gray-500" />;
      case 'hot': return <Thermometer className="w-5 h-5 text-red-500" />;
      case 'rainy': return <CloudRain className="w-5 h-5 text-blue-500" />;
      default: return <Sun className="w-5 h-5 text-gray-500" />;
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'needs attention': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getHealthIcon = (health) => {
    switch (health) {
      case 'excellent': return '💚';
      case 'good': return '💙';
      case 'needs attention': return '💛';
      case 'poor': return '❤️';
      default: return '💚';
    }
  };

  const handleModuleClick = (module) => {
    if (onModuleSelect) onModuleSelect(module);
    if (onNavigateToSensors) onNavigateToSensors(module.id);
  };

  const handleAddGreenhouse = () => {
    alert('Add Greenhouse clicked!');
    if (onAddGreenhouse) onAddGreenhouse();
  };

  const handleRemoveModule = (module) => {
    setModuleToRemove(module);
    setRemoveConfirmOpen(true);
  };

  const confirmRemoveModule = async () => {
    if (!moduleToRemove || !user) return;
    setRemoving(true);
    try {
      console.log(`Attempting to remove module ${moduleToRemove.id} for user ${user.uid}`);
      await dashboardConfig.unassignModule(user.uid, moduleToRemove.id);
      console.log(`Successfully removed module ${moduleToRemove.id}`);
      // Wait a moment for RTDB to update the listener
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Module unassigned');
      setRemoveConfirmOpen(false);
      setModuleToRemove(null);
    } catch (err) {
      console.error('Failed to remove module - Full error object:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      const errorMsg = err.message || err.code || 'Unknown error';
      toast.error(`Failed to remove module: ${errorMsg}`);
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="xl" text="Loading your modules..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState 
          title="Failed to load modules"
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!modules.length) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <Activity className="w-10 h-10 text-slate-400" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">No Modules Found</h3>
      <p className="text-slate-500 max-w-sm mb-8 font-medium">
        It looks like you haven't set up any farm plots or claimed any sensor modules yet.
      </p>
      <button
        onClick={() => navigate('/setup')}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-green-200 transition-all active:scale-95"
      >
        <Settings className="w-5 h-5" />
        Start Setup Now
      </button>
    </div>
  );

  return (
    <div className="app-container p-4 md:p-6 space-y-6">
      {/* Header - Only show if hideHeader is false */}
      {!hideHeader && (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard Overview</h2>
            <p className="text-gray-500 mt-1 text-sm md:text-base font-medium">Monitor your agricultural modules and crops</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-green-100 px-4 py-2 rounded-full shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-bold text-green-700">Live Updates</span>
            </div>
            <button
              onClick={handleAddGreenhouse}
              className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white flex items-center px-4 py-2 rounded-full font-semibold text-sm shadow-md transition-all duration-150 active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" /> Add New Zone
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Modules', value: modules.length, icon: Activity, color: 'text-white', bgColor: 'bg-gradient-to-br from-green-500 to-green-600', cardBg: 'bg-green-500/10', labelColor: 'text-white' },
          { label: 'Warnings', value: 0, icon: AlertTriangle, color: 'text-white', bgColor: 'bg-gradient-to-br from-amber-500 to-orange-500', cardBg: 'bg-amber-500/10', labelColor: 'text-white' },
          { label: 'Critical Alerts', value: 0, icon: AlertTriangle, color: 'text-white', bgColor: 'bg-gradient-to-br from-red-500 to-red-600', cardBg: 'bg-red-500/10', labelColor: 'text-white' },
          { label: 'Total Crops', value: [...new Set(modules.map((m) => m.crop))].length, icon: TrendingUp, color: 'text-white', bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600', cardBg: 'bg-blue-500/10', labelColor: 'text-white' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className={`card ${stat.cardBg} p-0`}
            >
              <div className="p-5">
                <div className={`flex items-center justify-between p-4 ${stat.bgColor} rounded-[16px] shadow-sm`}>
                  <div className="flex-1">
                    <p className={`text-sm font-medium mb-1 ${stat.labelColor}/80`}>{stat.label}</p>
                    <p className={`text-2xl font-bold tracking-tight ${stat.labelColor}`}>{stat.value}</p>
                  </div>
                  <div className={`flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full ${stat.color}`}>
                    <Icon className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {modules.map((module) => (
          <div
            key={module.id}
            className="card overflow-hidden cursor-pointer"
            onClick={() => handleModuleClick(module)}
          >
            <div className="p-6 pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">{module.name}</h3>
                  <div className="flex items-center space-x-1 mt-1 text-xs md:text-sm text-gray-500 font-medium">
                    <MapPin className="w-3 h-3 md:w-4 md:h-4" />
                    <span>{module.location}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveModule(module); }}
                    className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors"
                    title="Remove this module"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className={`px-3 py-2 rounded-full text-xs md:text-sm font-semibold flex items-center gap-1 backdrop-blur-sm ${getStatusColor(module.status)}`}>
                    {getStatusIcon(module.status)}
                    <span className="ml-1 capitalize">{module.status}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-3 md:space-y-4">
              {/* Crop Info */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-[18px] border border-green-200/30">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl md:text-3xl">{getCropIcon(module.crop)}</div>
                  <div>
                    <p className="text-xs md:text-sm text-green-600 font-semibold">Crop</p>
                    <p className="text-sm md:text-base font-bold text-gray-900 capitalize">{module.crop}</p>
                  </div>
                </div>
                <div className="px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full text-xs text-gray-600 font-semibold shadow-sm border border-white/50">
                  {module.sensorData.sensor_id ? '1 sensor' : 'No sensor'}
                </div>
              </div>

              {/* Crop Health */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm rounded-[18px] border border-blue-200/30">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{getHealthIcon(module.cropHealth)}</div>
                  <div>
                    <p className="text-xs md:text-sm text-blue-600 font-semibold">Health Status</p>
                    <div className={`inline-block text-xs md:text-sm font-bold px-3 py-1.5 rounded-full capitalize backdrop-blur-sm ${getHealthColor(module.cropHealth)}`}>
                      {module.cropHealth}
                    </div>
                  </div>
                </div>
              </div>

              {/* Weather & Soil */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 backdrop-blur-sm rounded-[18px] border border-purple-200/30">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-white/80 backdrop-blur-sm rounded-full text-purple-600 border border-white/50 shadow-sm">
                    {getWeatherIcon(module.weather.condition)}
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-purple-600 font-semibold">Environment</p>
                    <p className="text-sm font-bold text-gray-900">{module.weather.description}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      <p className="text-[10px] md:text-xs text-gray-600 font-medium flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                        Moisture: {module.weather.soilMoisture}%
                      </p>
                      <p className="text-[10px] md:text-xs text-gray-600 font-medium flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                        pH: {module.weather.ph.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Last Updated */}
              <div className="flex items-center justify-center space-x-1 md:space-x-2 text-xs text-gray-500 pt-2 border-t border-gray-200/50 font-medium">
                <Clock className="w-3 h-3 md:w-4 md:h-4" />
                <span>Last updated: {module.lastUpdated}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={removeConfirmOpen}
        title={`Remove module ${moduleToRemove?.name}?`}
        message="This will unassign the module and make it available for others to claim."
        danger={true}
        confirmText="Remove"
        onCancel={() => { setRemoveConfirmOpen(false); setModuleToRemove(null); }}
        onConfirm={confirmRemoveModule}
      />
    </div>
  );
};

export default Dashboardz;
