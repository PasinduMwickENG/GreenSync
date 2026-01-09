// src/Components/PlotManager.jsx
import React, { useState } from 'react';
import { Trash2, Edit, MoreVertical, X } from 'lucide-react';
import { toast } from 'sonner';
import MultiModuleView from './MultiModuleView';
import dashboardConfig from '../services/dashboardConfig';

const PlotManager = ({ userId, plots, onPlotDeleted, onPlotUpdated }) => {
    const [expandedPlots, setExpandedPlots] = useState({});
    const [menuOpen, setMenuOpen] = useState(null);

    const togglePlot = (plotId) => {
        setExpandedPlots(prev => ({
            ...prev,
            [plotId]: !prev[plotId]
        }));
    };

    const handleDeletePlot = async (plotId, plotName) => {
        if (!confirm(`Are you sure you want to delete "${plotName}"?`)) {
            return;
        }

        try {
            await dashboardConfig.deletePlot(userId, plotId);
            toast.success('Plot deleted successfully');

            if (onPlotDeleted) {
                onPlotDeleted(plotId);
            }
        } catch (error) {
            console.error('Error deleting plot:', error);
            toast.error('Failed to delete plot');
        }

        setMenuOpen(null);
    };

    const getPlotSizeClass = (size) => {
        const sizes = {
            small: 'lg:col-span-1',
            medium: 'lg:col-span-2',
            large: 'lg:col-span-3'
        };
        return sizes[size] || 'lg:col-span-2';
    };

    if (!plots || Object.keys(plots).length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                <p className="text-gray-500 font-medium">No plots created yet</p>
                <p className="text-sm text-gray-400 mt-1">Click "Create Plot" to create your first monitoring view</p>
            </div>
        );
    }

    const plotsArray = Object.entries(plots).map(([id, plot]) => ({ ...plot, id }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {plotsArray.map((plot) => (
                <div
                    key={plot.id}
                    className={`bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all hover:shadow-xl ${getPlotSizeClass(plot.layout?.size)}`}
                >
                    {/* Plot Header */}
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-gray-900">{plot.name}</h3>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                                    <span className="px-2 py-0.5 bg-white rounded-full font-medium">
                                        {plot.modules?.length || 0} module{plot.modules?.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className="px-2 py-0.5 bg-white rounded-full font-medium">
                                        {plot.parameters?.length || 0} parameter{plot.parameters?.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className="px-2 py-0.5 bg-white rounded-full font-medium capitalize">
                                        {plot.type}
                                    </span>
                                </div>
                            </div>

                            {/* Menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setMenuOpen(menuOpen === plot.id ? null : plot.id)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
                                >
                                    <MoreVertical className="w-5 h-5 text-gray-600" />
                                </button>

                                {menuOpen === plot.id && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setMenuOpen(null)}
                                        />
                                        <div className="absolute right-0 top-10 z-20 bg-white rounded-xl shadow-xl border border-gray-200 py-1 min-w-[160px]">
                                            <button
                                                onClick={() => {
                                                    togglePlot(plot.id);
                                                    setMenuOpen(null);
                                                }}
                                                className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                            >
                                                {expandedPlots[plot.id] ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                                                {expandedPlots[plot.id] ? 'Collapse' : 'Expand'}
                                            </button>
                                            <button
                                                onClick={() => handleDeletePlot(plot.id, plot.name)}
                                                className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Plot Content */}
                    <div className="p-4">
                        {expandedPlots[plot.id] ? (
                            <MultiModuleView
                                userId={userId}
                                modules={plot.modules || []}
                                parameters={plot.parameters || []}
                                plotName={plot.name}
                            />
                        ) : (
                            <button
                                onClick={() => togglePlot(plot.id)}
                                className="w-full py-8 text-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                <p className="font-medium">Click to view data</p>
                                <p className="text-xs mt-1">Monitoring {plot.modules?.length || 0} modules</p>
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PlotManager;
