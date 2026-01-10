// src/Components/ModuleManager.jsx
import React, { useState, useEffect } from 'react';
import { ref, set, get } from 'firebase/database';
import { rtdb } from '../firebaseConfig';
import { toast } from 'sonner';
import { Cpu, Trash2, MapPin, Sprout, Edit2, X, Save, Plus, ChevronDown } from 'lucide-react';
import dashboardConfig from '../services/dashboardConfig';

const ModuleManager = ({ userId }) => {
    const [modules, setModules] = useState([]);
    const [plots, setPlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingModule, setEditingModule] = useState(null);
    const [editForm, setEditForm] = useState({ location: '', crop: '' });
    const [openDropdown, setOpenDropdown] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [moduleToRemove, setModuleToRemove] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);


    useEffect(() => {
        loadModules();
        loadPlots();

        // check admin role for force-remove capability
        const checkAdmin = async () => {
            if (!userId) return;
            try {
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('../firebaseConfig');
                const snap = await getDoc(doc(db, 'users', userId));
                if (snap.exists()) {
                    const data = snap.data();
                    setIsAdmin(data?.role === 'admin');
                }
            } catch (err) {
                console.warn('ModuleManager: failed to detect admin role', err);
            }
        };
        checkAdmin();
    }, [userId]);

    const loadModules = async () => {
        if (!userId) return;

        setLoading(true);
        try {
            const modules = await dashboardConfig.getUserModules(userId);
            setModules(modules);
        } catch (error) {
            console.error('Error loading modules:', error);
            toast.error('Failed to load modules');
        } finally {
            setLoading(false);
        }
    };

    const loadPlots = async () => {
        if (!userId) return;

        try {
            const config = await dashboardConfig.loadUserConfig(userId);
            setPlots(Object.entries(config?.plots || {}).map(([id, plot]) => ({ id, ...plot })));
        } catch (error) {
            console.error('Error loading plots:', error);
        }
    };

    const handleAddToPlot = async (moduleId, plotId) => {
        try {
            const plot = plots.find(p => p.id === plotId);
            if (!plot) return;

            const updatedModules = [...(plot.modules || []), moduleId];
            await dashboardConfig.updatePlotModules(userId, plotId, updatedModules);

            toast.success(`Module added to ${plot.name}`);
            setOpenDropdown(null);
            loadPlots();
        } catch (error) {
            console.error('Error adding module to plot:', error);
            toast.error('Failed to add module to plot');
        }
    };

    const handleRemoveModule = async (moduleId, assignedTo) => {
        setModuleToRemove({ id: moduleId, assignedTo });
        setConfirmOpen(true);
    };

    const doRemoveConfirm = async (force = false) => {
        if (!moduleToRemove) return;
        setConfirmOpen(false);
        try {
            await dashboardConfig.removeModule(userId, moduleToRemove.id, { force });
            toast.success('Module removed successfully');
            setModuleToRemove(null);
            loadModules();
        } catch (error) {
            console.error('Error removing module:', error);
            toast.error(error.message || 'Failed to remove module');
        }
    };

    const handleEditModule = (module) => {
        setEditingModule(module);
        setEditForm({
            location: module.location || '',
            crop: module.crop || ''
        });
    };

    const handleSaveEdit = async () => {
        if (!editingModule) return;

        try {
            const moduleRef = ref(rtdb, `users/${userId}/modules/${editingModule.id}`);
            await set(moduleRef, {
                location: editForm.location,
                crop: editForm.crop,
                claimedAt: editingModule.claimedAt || Date.now(),
                assignedToPlot: editingModule.assignedToPlot || null,
                updatedAt: Date.now()
            });

            toast.success('Module updated successfully');
            setEditingModule(null);
            loadModules();
        } catch (error) {
            console.error('Error updating module:', error);
            toast.error('Failed to update module');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-600 font-semibold">Loading modules...</p>
                </div>
            </div>
        );
    }

    if (modules.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <Cpu className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Modules Found</h3>
                <p className="text-gray-500">
                    You haven't added any sensor modules yet. Click "Add Module" to get started.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Module Management</h2>
                    <p className="text-gray-500 mt-1">View and manage your sensor modules</p>
                </div>
                <div className="px-4 py-2 bg-blue-50 rounded-full">
                    <span className="text-sm font-semibold text-blue-700">
                        {modules.length} module{modules.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((module) => (
                    <div
                        key={module.id}
                        className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                        <Cpu className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <h3 className="font-bold text-white text-lg">{module.id}</h3>
                                                <p className="text-xs text-blue-100">Sensor Module</p>
                                            </div>
                                            <div>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${module.status === 'assigned' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/90'}`}>
                                                    {module.status || 'unknown'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-3">
                            {editingModule?.id === module.id ? (
                                // Edit Mode
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Location
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.location}
                                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            placeholder="e.g., North Field"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Crop Type
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.crop}
                                            onChange={(e) => setEditForm({ ...editForm, crop: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            placeholder="e.g., Tea"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={handleSaveEdit}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                                        >
                                            <Save className="w-4 h-4" />
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setEditingModule(null)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // View Mode
                                <>
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <MapPin className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-medium">{module.location || 'Unknown Location'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <span className="text-xs text-gray-500">Owner:</span>
                                        <span className="text-sm font-medium">{module.assignedTo ? `${module.assignedTo.slice(0,8)}...` : 'Unassigned'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Sprout className="w-4 h-4 text-green-600" />
                                        <span className="text-sm font-medium">{module.crop || 'Unknown Crop'}</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                                        <button
                                            onClick={() => handleEditModule(module)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            Edit
                                        </button>

                                        {/* Add to Plot Dropdown */}
                                        <div className="relative flex-1">
                                            <button
                                                onClick={() => setOpenDropdown(openDropdown === module.id ? null : module.id)}
                                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded-lg transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add to Plot
                                                <ChevronDown className="w-3 h-3" />
                                            </button>

                                            {openDropdown === module.id && (
                                                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10 max-h-48 overflow-y-auto">
                                                    {plots.length === 0 ? (
                                                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                            No plots available
                                                        </div>
                                                    ) : (
                                                        plots.map(plot => {
                                                            const isInPlot = plot.modules?.includes(module.id);
                                                            return (
                                                                <button
                                                                    key={plot.id}
                                                                    onClick={() => !isInPlot && handleAddToPlot(module.id, plot.id)}
                                                                    disabled={isInPlot}
                                                                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${isInPlot
                                                                        ? 'text-gray-400 cursor-not-allowed'
                                                                        : 'text-gray-700 hover:bg-gray-50'
                                                                        }`}
                                                                >
                                                                    {plot.name} {isInPlot && '✓'}
                                                                </button>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleRemoveModule(module.id, module.assignedTo)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Remove
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Confirm dialog for removal */}
            <ConfirmDialog
                open={confirmOpen}
                title={`Remove module ${moduleToRemove?.id}?`}
                message={moduleToRemove?.assignedTo && moduleToRemove?.assignedTo !== userId && isAdmin
                    ? 'This module is owned by another user. As an admin you can force-remove it from the registry. Proceed?'
                    : 'This will delete the module and remove it from your farm. This action cannot be undone.'}
                danger={true}
                confirmText={moduleToRemove?.assignedTo && moduleToRemove?.assignedTo !== userId && isAdmin ? 'Force Remove' : 'Remove'}
                onCancel={() => { setConfirmOpen(false); setModuleToRemove(null); }}
                onConfirm={() => doRemoveConfirm(moduleToRemove?.assignedTo && moduleToRemove?.assignedTo !== userId && isAdmin)}
            />

        </div>
    );
};

export default ModuleManager;
