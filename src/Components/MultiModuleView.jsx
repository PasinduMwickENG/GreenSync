// src/Components/MultiModuleView.jsx
import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebaseConfig';
import {
    Thermometer,
    Droplets,
    Zap,
    Sun,
    Activity,
    TrendingUp,
    TrendingDown,
    Minus,
    RefreshCw
} from 'lucide-react';

const getSensorIcon = (paramId) => {
    const icons = {
        temperature: Thermometer,
        humidity: Droplets,
        soilMoisture: Droplets,
        soilPH: Zap,
        lightIntensity: Sun,
        nitrogen: Activity,
        phosphorus: Activity,
        potassium: Activity,
    };
    return icons[paramId] || Activity;
};

const getSensorUnit = (paramId) => {
    const units = {
        temperature: '°C',
        humidity: '%',
        soilMoisture: '%',
        soilPH: 'pH',
        lightIntensity: 'lux',
        nitrogen: 'ppm',
        phosphorus: 'ppm',
        potassium: 'ppm',
    };
    return units[paramId] || '';
};

const getSensorColor = (paramId) => {
    const colors = {
        temperature: 'from-red-500 to-orange-500',
        humidity: 'from-blue-500 to-cyan-500',
        soilMoisture: 'from-green-500 to-emerald-500',
        soilPH: 'from-purple-500 to-pink-500',
        lightIntensity: 'from-yellow-500 to-amber-500',
        nitrogen: 'from-indigo-500 to-blue-500',
        phosphorus: 'from-violet-500 to-purple-500',
        potassium: 'from-rose-500 to-red-500',
    };
    return colors[paramId] || 'from-gray-500 to-slate-500';
};

const formatParameterName = (paramId) => {
    const names = {
        temperature: 'Temperature',
        humidity: 'Humidity',
        soilMoisture: 'Soil Moisture',
        soilPH: 'Soil pH',
        lightIntensity: 'Light Intensity',
        nitrogen: 'Nitrogen (N)',
        phosphorus: 'Phosphorus (P)',
        potassium: 'Potassium (K)',
    };
    return names[paramId] || paramId;
};

const MultiModuleView = ({ userId, modules, parameters, plotName }) => {
    const [sensorData, setSensorData] = useState({});
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);

    useEffect(() => {
        if (!userId || modules.length === 0) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribers = [];

        // Subscribe to each module's data
        modules.forEach((moduleId) => {
            const moduleRef = ref(rtdb, `users/${userId}/farms`);

            const unsubscribe = onValue(moduleRef, (snapshot) => {
                const farms = snapshot.val();
                if (!farms) return;

                // Find the module in farms
                let moduleData = null;
                Object.entries(farms).forEach(([farmId, farm]) => {
                    if (farm.modules && farm.modules[moduleId]) {
                        moduleData = {
                            ...farm.modules[moduleId],
                            farmId,
                            location: farm.modules[moduleId].location || farm.name || 'Unknown'
                        };
                    }
                });

                if (moduleData) {
                    setSensorData(prev => ({
                        ...prev,
                        // Read from latestReading (new structure) or fallback to sensors (old structure)
                        [moduleId]: moduleData.latestReading || moduleData.sensors || {}
                    }));
                    setLastUpdate(new Date());
                }

                setLoading(false);
            });

            unsubscribers.push(unsubscribe);
        });

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [userId, modules]);

    const getParameterValue = (moduleId, paramId) => {
        const data = sensorData[moduleId];
        if (!data) return null;

        // Handle different naming conventions
        if (paramId === 'soilPH') {
            return data.ph || data.soilPH || data.pH || null;
        }
        if (paramId === 'soilMoisture') {
            return data.soilMoisture || data.moisture || null;
        }

        return data[paramId] || null;
    };

    const getComparison = (values) => {
        if (values.length < 2) return null;
        const validValues = values.filter(v => v !== null);
        if (validValues.length < 2) return null;

        const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;
        const max = Math.max(...validValues);
        const min = Math.min(...validValues);

        return { avg, max, min, range: max - min };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-green-600 animate-spin" />
                    <p className="text-gray-600 font-medium">Loading module data...</p>
                </div>
            </div>
        );
    }

    if (modules.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <p>No modules selected for this plot</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">{plotName}</h3>
                    <p className="text-sm text-gray-500">
                        Comparing {modules.length} module{modules.length !== 1 ? 's' : ''}
                        {lastUpdate && ` • Last updated: ${lastUpdate.toLocaleTimeString()}`}
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-semibold text-green-700">Live</span>
                </div>
            </div>

            {/* Parameters Grid */}
            <div className="space-y-4">
                {parameters.map((paramId) => {
                    const Icon = getSensorIcon(paramId);
                    const unit = getSensorUnit(paramId);
                    const color = getSensorColor(paramId);
                    const values = modules.map(moduleId => getParameterValue(moduleId, paramId));
                    const comparison = getComparison(values);

                    return (
                        <div key={paramId} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                            {/* Parameter Header */}
                            <div className={`bg-gradient-to-r ${color} p-4`}>
                                <div className="flex items-center gap-3 text-white">
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-lg">{formatParameterName(paramId)}</h4>
                                        {comparison && (
                                            <p className="text-sm text-white/90">
                                                Avg: {comparison.avg.toFixed(1)}{unit} • Range: {comparison.min.toFixed(1)} - {comparison.max.toFixed(1)}{unit}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Module Comparison */}
                            <div className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {modules.map((moduleId, index) => {
                                        const value = values[index];
                                        const isMax = comparison && value === comparison.max;
                                        const isMin = comparison && value === comparison.min;

                                        return (
                                            <div
                                                key={moduleId}
                                                className={`p-4 rounded-xl border-2 transition-all ${isMax
                                                    ? 'border-red-300 bg-red-50'
                                                    : isMin
                                                        ? 'border-blue-300 bg-blue-50'
                                                        : 'border-gray-200 bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="font-semibold text-sm text-gray-900">{moduleId}</p>
                                                    {isMax && <TrendingUp className="w-4 h-4 text-red-600" />}
                                                    {isMin && <TrendingDown className="w-4 h-4 text-blue-600" />}
                                                    {!isMax && !isMin && <Minus className="w-4 h-4 text-gray-400" />}
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-bold text-gray-900">
                                                        {value !== null ? value.toFixed(1) : '--'}
                                                    </span>
                                                    <span className="text-sm text-gray-500">{unit}</span>
                                                </div>
                                                {comparison && value !== null && (
                                                    <div className="mt-2 text-xs text-gray-600">
                                                        {((value - comparison.avg) >= 0 ? '+' : '')}
                                                        {(value - comparison.avg).toFixed(1)}{unit} from avg
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MultiModuleView;
