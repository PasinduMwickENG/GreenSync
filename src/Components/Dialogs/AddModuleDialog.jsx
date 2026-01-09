// src/Components/Dialogs/AddModuleDialog.jsx
import React, { useState } from 'react';
import { X, Cpu, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ref, get, set } from 'firebase/database';
import { rtdb } from '../../firebaseConfig';

const AddModuleDialog = ({ isOpen, onClose, userId, farms, onModuleAdded }) => {
    const [moduleKey, setModuleKey] = useState('');
    const [selectedFarm, setSelectedFarm] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!moduleKey.trim()) {
            toast.error('Please enter a module key');
            return;
        }

        if (!selectedFarm) {
            toast.error('Please select a farm');
            return;
        }

        setLoading(true);

        try {
            const moduleId = moduleKey.trim().toUpperCase();

            // Check if module exists and is available
            const moduleRef = ref(rtdb, `modules/${moduleId}`);
            const snapshot = await get(moduleRef);
            const moduleData = snapshot.val();

            // Security check
            if (moduleData && moduleData.assignedTo && moduleData.assignedTo !== userId) {
                toast.error('This module is already assigned to another user');
                setLoading(false);
                return;
            }

            const farm = farms.find(f => f.id === selectedFarm);

            // Assign module
            await set(moduleRef, {
                assignedTo: userId,
                status: 'assigned',
                farmId: selectedFarm,
                lastRegisteredAt: Date.now()
            });

            // Add to user's farm
            await set(
                ref(rtdb, `users/${userId}/farms/${selectedFarm}/modules/${moduleId}`),
                {
                    crop: farm?.crop || 'Unknown',
                    location: farm?.name || 'Unknown',
                    createdAt: Date.now()
                }
            );

            toast.success('Module added successfully!');

            if (onModuleAdded) {
                onModuleAdded({ id: moduleId, farmId: selectedFarm });
            }

            // Reset and close
            setModuleKey('');
            setSelectedFarm('');
            onClose();
        } catch (error) {
            console.error('Error adding module:', error);
            toast.error('Failed to add module. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Cpu className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Add Sensor Module</h2>
                            <p className="text-sm text-gray-500">Connect a new ESP32 device</p>
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
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Module Key Input */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Module Key Code
                        </label>
                        <input
                            type="text"
                            value={moduleKey}
                            onChange={(e) => setModuleKey(e.target.value.toUpperCase())}
                            placeholder="e.g., GS-MOD-AX92"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                            disabled={loading}
                        />
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Enter the unique key printed on your ESP32 module
                        </p>
                    </div>

                    {/* Farm Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Assign to Farm/Plot
                        </label>
                        <select
                            value={selectedFarm}
                            onChange={(e) => setSelectedFarm(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                            disabled={loading}
                        >
                            <option value="">Select a farm...</option>
                            {farms.map((farm) => (
                                <option key={farm.id} value={farm.id}>
                                    {farm.name} ({farm.crop})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Info Box */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex gap-3">
                            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-900">
                                <p className="font-semibold mb-1">What happens next?</p>
                                <ul className="space-y-1 text-blue-700">
                                    <li>• Module will be claimed to your account</li>
                                    <li>• Data will start streaming automatically</li>
                                    <li>• You can view it in your dashboard</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
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
                            className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading || !moduleKey || !selectedFarm}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Adding...
                                </span>
                            ) : (
                                'Add Module'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddModuleDialog;
