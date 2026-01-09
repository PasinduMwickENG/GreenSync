// src/Components/Dialogs/AddPlotDialog.jsx
import React, { useState, useEffect } from 'react';
import { X, LayoutGrid, CheckSquare, Square } from 'lucide-react';
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

const PLOT_TYPES = [
    { id: 'single', label: 'Single Module', description: 'Display data from one module' },
    { id: 'comparison', label: 'Comparison', description: 'Compare multiple modules side-by-side' },
    { id: 'grid', label: 'Grid View', description: 'Show all modules in a grid layout' },
];

const PLOT_SIZES = [
    { id: 'small', label: 'Small', cols: 1 },
    { id: 'medium', label: 'Medium', cols: 2 },
    { id: 'large', label: 'Large', cols: 3 },
];

const AddPlotDialog = ({ isOpen, onClose, userId, availableModules, onPlotAdded }) => {
    const [plotName, setPlotName] = useState('');
    const [plotType, setPlotType] = useState('comparison');
    const [selectedModules, setSelectedModules] = useState([]);
    const [selectedParameters, setSelectedParameters] = useState(['temperature', 'humidity', 'soilMoisture']);
    const [plotSize, setPlotSize] = useState('medium');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset form when dialog opens
            setPlotName('');
            setPlotType('comparison');
            setSelectedModules([]);
            setSelectedParameters(['temperature', 'humidity', 'soilMoisture']);
            setPlotSize('medium');
        }
    }, [isOpen]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!plotName.trim()) {
            toast.error('Please enter a plot name');
            return;
        }

        if (selectedModules.length === 0) {
            toast.error('Please select at least one module');
            return;
        }

        if (selectedParameters.length === 0) {
            toast.error('Please select at least one parameter');
            return;
        }

        setLoading(true);

        try {
            const plotConfig = {
                name: plotName.trim(),
                type: plotType,
                modules: selectedModules,
                parameters: selectedParameters,
                layout: {
                    position: 0,
                    size: plotSize
                }
            };

            const plotId = await dashboardConfig.savePlot(userId, plotConfig);

            toast.success('Plot created successfully!');

            if (onPlotAdded) {
                onPlotAdded({ ...plotConfig, id: plotId });
            }

            onClose();
        } catch (error) {
            console.error('Error creating plot:', error);
            toast.error('Failed to create plot. Please try again.');
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
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <LayoutGrid className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Create New Plot</h2>
                            <p className="text-sm text-gray-500">Customize your monitoring view</p>
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
                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Plot Name */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Plot Name
                        </label>
                        <input
                            type="text"
                            value={plotName}
                            onChange={(e) => setPlotName(e.target.value)}
                            placeholder="e.g., North Field Overview"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                            disabled={loading}
                        />
                    </div>

                    {/* Plot Type */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Plot Type
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {PLOT_TYPES.map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setPlotType(type.id)}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${plotType === type.id
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    disabled={loading}
                                >
                                    <p className="font-semibold text-sm text-gray-900">{type.label}</p>
                                    <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Module Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Select Modules ({selectedModules.length} selected)
                        </label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-xl">
                            {availableModules.length === 0 ? (
                                <p className="col-span-2 text-center text-gray-500 py-4">No modules available</p>
                            ) : (
                                availableModules.map((module) => (
                                    <button
                                        key={module.id}
                                        type="button"
                                        onClick={() => toggleModule(module.id)}
                                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${selectedModules.includes(module.id)
                                                ? 'border-green-500 bg-green-50'
                                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                            }`}
                                        disabled={loading}
                                    >
                                        {selectedModules.includes(module.id) ? (
                                            <CheckSquare className="w-5 h-5 text-green-600" />
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
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                        }`}
                                    disabled={loading}
                                >
                                    {selectedParameters.includes(param.id) ? (
                                        <CheckSquare className="w-5 h-5 text-green-600" />
                                    ) : (
                                        <Square className="w-5 h-5 text-gray-400" />
                                    )}
                                    <span className="text-lg">{param.icon}</span>
                                    <span className="font-medium text-sm text-gray-900">{param.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Plot Size */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Plot Size
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {PLOT_SIZES.map((size) => (
                                <button
                                    key={size.id}
                                    type="button"
                                    onClick={() => setPlotSize(size.id)}
                                    className={`p-3 rounded-xl border-2 transition-all ${plotSize === size.id
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    disabled={loading}
                                >
                                    <p className="font-semibold text-sm text-gray-900">{size.label}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading || !plotName || selectedModules.length === 0 || selectedParameters.length === 0}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Creating...
                                </span>
                            ) : (
                                'Create Plot'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPlotDialog;
