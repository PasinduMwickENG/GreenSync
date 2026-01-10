// src/Components/Dialogs/EditPlotModulesDialog.jsx
import React, { useState, useEffect } from 'react';
import { X, Edit, CheckSquare, Square, Save } from 'lucide-react';
import { toast } from 'sonner';
import dashboardConfig from '../../services/dashboardConfig';

const AVAILABLE_PARAMETERS = [
    { id: 'temperature', label: 'Temperature', icon: '🌡️' },
    { id: 'humidity', label: 'Humidity', icon: '💧' },
    { id: 'soilMoisture', label: 'Soil Moisture', icon: '🌱' },
    { id: 'soilPH', label: 'Soil pH', icon: '⚗️' },
    { id: 'lightIntensity', label: 'Light Intensity', icon: '☀️' },
    { id: 'nitrogen', label: 'Nitrogen (N)', icon: '🧪' },
    { id: 'phosphorus', label: 'Phosphorus (P)', icon: '🧪' },
    { id: 'potassium', label: 'Potassium (K)', icon: '🧪' },
];

const EditPlotModulesDialog = ({ isOpen, onClose, userId, plot, availableModules, onPlotUpdated }) => {
    const [selectedModules, setSelectedModules] = useState([]);
    const [selectedParameters, setSelectedParameters] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && plot) {
            // Initialize with current plot configuration
            setSelectedModules(plot.modules || []);
            setSelectedParameters(plot.parameters || []);
        }
    }, [isOpen, plot]);

    const toggleModule = (moduleId) => {
        setSelectedModules(prev =>
            prev.includes(moduleId)
                ? prev.filter(id => id !== moduleId)
                : [...prev, moduleId]
        );
    };

    const toggleParameter = (paramId) => {
        setSelectedParameters(prev =>
            prev.includes(paramId)
                ? prev.filter(id => id !== paramId)
                : [...prev, paramId]
        );
    };

    const handleSave = async () => {
        if (selectedParameters.length === 0) {
            toast.error('Please select at least one parameter');
            return;
        }

        setLoading(true);

        try {
            // Find modules to add and remove
            const originalModules = plot.modules || [];
            const modulesToAdd = selectedModules.filter(id => !originalModules.includes(id));
            const modulesToRemove = originalModules.filter(id => !selectedModules.includes(id));

            // Update plot modules and parameters
            await dashboardConfig.updatePlotModules(userId, plot.id, selectedModules);
            await dashboardConfig.updatePlotParameters(userId, plot.id, selectedParameters);

            // Assign new modules to this plot
            for (const moduleId of modulesToAdd) {
                await dashboardConfig.assignModuleToPlot(userId, moduleId, plot.id);
            }

            // Unassign removed modules
            for (const moduleId of modulesToRemove) {
                await dashboardConfig.unassignModule(userId, moduleId);
            }

            toast.success('Plot updated successfully!');

            if (onPlotUpdated) {
                onPlotUpdated({
                    ...plot,
                    modules: selectedModules,
                    parameters: selectedParameters
                });
            }

            onClose();
        } catch (error) {
            console.error('Error updating plot:', error);
            toast.error('Failed to update plot. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-8 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Edit className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Edit Plot</h2>
                            <p className="text-sm text-gray-500">{plot?.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Module Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Select Modules ({selectedModules.length} selected) - Optional
                        </label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-xl">
                            {availableModules.length === 0 ? (
                                <div className="col-span-2 text-center py-6 px-4">
                                    <p className="text-gray-600 font-medium mb-2">No modules claimed yet</p>
                                    <p className="text-sm text-gray-500">
                                        Add modules from Dashboard → Modules tab first
                                    </p>
                                </div>
                            ) : (
                                availableModules.map((module) => (
                                    <button
                                        key={module.id}
                                        type="button"
                                        onClick={() => toggleModule(module.id)}
                                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${selectedModules.includes(module.id)
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                            }`}
                                        disabled={loading}
                                    >
                                        {selectedModules.includes(module.id) ? (
                                            <CheckSquare className="w-5 h-5 text-blue-600" />
                                        ) : (
                                            <Square className="w-5 h-5 text-gray-400" />
                                        )}
                                        <div className="text-left flex-1">
                                            <p className="font-semibold text-sm text-gray-900">{module.id}</p>
                                            <p className="text-xs text-gray-500">{module.location}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Parameter Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Select Parameters ({selectedParameters.length} selected)
                        </label>
                        <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded-xl">
                            {AVAILABLE_PARAMETERS.map((param) => (
                                <button
                                    key={param.id}
                                    type="button"
                                    onClick={() => toggleParameter(param.id)}
                                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${selectedParameters.includes(param.id)
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                        }`}
                                    disabled={loading}
                                >
                                    {selectedParameters.includes(param.id) ? (
                                        <CheckSquare className="w-5 h-5 text-blue-600" />
                                    ) : (
                                        <Square className="w-5 h-5 text-gray-400" />
                                    )}
                                    <span className="text-lg">{param.icon}</span>
                                    <span className="font-medium text-sm text-gray-900">{param.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-6 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        disabled={loading || selectedParameters.length === 0}
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditPlotModulesDialog;
