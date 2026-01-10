// src/Components/Dialogs/AddModuleDialog.jsx
import React, { useState } from 'react';
import { X, Cpu, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ref, get, set, update } from 'firebase/database';
import { rtdb } from '../../firebaseConfig';
import dashboardConfig from '../../services/dashboardConfig';
import ConfirmDialog from './ConfirmDialog';

const AddModuleDialog = ({ isOpen, onClose, userId, farms, onModuleAdded, initialFarm = '' }) => {
    const [moduleKey, setModuleKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingModule, setCheckingModule] = useState(false);
    const [moduleInfo, setModuleInfo] = useState(null); // { exists, assignedTo, status }
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);
    const [transferTarget, setTransferTarget] = useState(null);

    const validateModuleKey = (k) => /^[A-Za-z0-9\-]{3,64}$/.test(k);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!moduleKey.trim()) {
            toast.error('Please enter a module key');
            return;
        }

        const moduleId = moduleKey.trim().toUpperCase();

        if (!validateModuleKey(moduleId)) {
            toast.error('Invalid module key format. Use letters, numbers and dashes (3-64 chars).');
            return;
        }

        setLoading(true);

        try {
            // Check current module status
            const moduleRef = ref(rtdb, `modules/${moduleId}`);
            const snapshot = await get(moduleRef);
            const moduleData = snapshot.val();

            if (moduleData && moduleData.assignedTo && moduleData.assignedTo !== userId) {
                // Open transfer confirmation modal instead of native confirm
                setTransferTarget({ assignedTo: moduleData.assignedTo, moduleId });
                setTransferConfirmOpen(true);
                setLoading(false);
                return;
            }

            // Just claim the module AND add to default farm "General"
            // First ensure user has at least one farm
            const farmsSnap = await get(ref(rtdb, `users/${userId}/farms`));
            let defaultFarmId = 'General';
            
            if (!farmsSnap.exists()) {
                // Create default farm if it doesn't exist
                await set(ref(rtdb, `users/${userId}/farms/General`), {
                    name: 'Main Farm',
                    modules: {}
                });
            }

            // Create entries in both places
            await set(ref(rtdb, `modules/${moduleId}`), {
                assignedTo: userId,
                status: 'assigned',
                farmId: defaultFarmId,
                lastRegisteredAt: Date.now()
            });

            // ALSO add to user's farms so dashboard can see it
            await set(ref(rtdb, `users/${userId}/farms/${defaultFarmId}/modules/${moduleId}`), {
                crop: 'Unknown',
                location: 'Unknown',
                createdAt: Date.now()
            });

            toast.success('Module claimed successfully!');

            if (onModuleAdded) {
                onModuleAdded({ id: moduleId, farmId: null });
            }

            // Reset and close
            setModuleKey('');
            setModuleInfo(null);
            onClose();
        } catch (error) {
            console.error('Error adding module:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            if (error.code === 'PERMISSION_DENIED') {
                toast.error('Permission denied. Please check database rules.');
            } else if (error.message?.includes('another user')) {
                toast.error('Module is already claimed by someone else.');
            } else {
                toast.error(`Failed to add module: ${error.message || error.code || 'Unknown error'}`);
            }
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
                        <div className="grid grid-cols-3 gap-2">
                            <input
                                type="text"
                                value={moduleKey}
                                onChange={(e) => setModuleKey(e.target.value.toUpperCase())}
                                placeholder="e.g., GS-MOD-AX92"
                                className="col-span-2 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!moduleKey.trim()) return toast.error('Enter a module key to check');
                                    setCheckingModule(true);
                                    try {
                                        const id = moduleKey.trim().toUpperCase();
                                        console.log('Checking module:', id);
                                        const moduleRef = ref(rtdb, `modules/${id}`);
                                        const snap = await get(moduleRef);
                                        const data = snap.val();
                                        console.log('Module data:', data);
                                        setModuleInfo({ exists: !!data, assignedTo: data?.assignedTo || null, status: data?.status || (data ? 'unknown' : 'unregistered') });
                                    } catch (err) {
                                        console.error('Failed to check module - Full error:', err);
                                        console.error('Error code:', err.code);
                                        console.error('Error message:', err.message);
                                        toast.error(`Failed to check module: ${err.message || err.code}`);
                                        setModuleInfo(null);
                                    } finally {
                                        setCheckingModule(false);
                                    }
                                }}
                                className="col-span-1 px-3 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                                disabled={loading}
                            >
                                {checkingModule ? 'Checking...' : 'Check'}
                            </button>
                        </div>

                        {moduleInfo && (
                            <div className="mt-2 p-2 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-700">
                                {moduleInfo.exists ? (
                                    moduleInfo.assignedTo ? (
                                        moduleInfo.assignedTo === userId ? (
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-green-700">Claimed by you</span>
                                                        <button
                                                    type="button"
                                                    onClick={() => setConfirmOpen(true)}
                                                    className="ml-2 px-2 py-1 rounded bg-red-50 text-red-700 text-sm hover:bg-red-100"
                                                >Release</button>

                                                <ConfirmDialog
                                                    open={confirmOpen}
                                                    title={`Release ${moduleKey.trim().toUpperCase()}?`}
                                                    message={`This will unassign the module and make it available for others to claim. Are you sure you want to release this module from your account?`}
                                                    danger={true}
                                                    confirmText="Release"
                                                    onCancel={() => setConfirmOpen(false)}
                                                    onConfirm={async () => {
                                                        setConfirmLoading(true);
                                                        try {
                                                            await dashboardConfig.unassignModule(userId, moduleKey.trim().toUpperCase());
                                                            toast.success('Module released');
                                                            setModuleInfo({ ...moduleInfo, assignedTo: null, status: 'unassigned' });
                                                            setConfirmOpen(false);
                                                        } catch (err) {
                                                            console.error('Release failed', err);
                                                            toast.error('Failed to release module');
                                                        } finally {
                                                            setConfirmLoading(false);
                                                        }
                                                    }}
                                                />

                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-yellow-700">Claimed by another user ({moduleInfo.assignedTo.slice(0,8)}...)</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTransferTarget({ assignedTo: moduleInfo.assignedTo, moduleId: moduleKey.trim().toUpperCase() });
                                                        setTransferConfirmOpen(true);
                                                    }}
                                                    className="ml-2 px-2 py-1 rounded bg-yellow-50 text-yellow-800 text-sm hover:bg-yellow-100"
                                                >Transfer</button>
                                            </div>
                                        )
                                    ) : (
                                        <span className="font-medium text-blue-700">Unassigned</span>
                                    )
                                ) : (
                                    <span className="font-medium text-slate-600">Not registered yet</span>
                                )}
                            </div>
                        )}
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Enter the unique key printed on your ESP32 module
                        </p>
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
                            disabled={loading || !moduleKey}
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

            {/* Transfer confirmation dialog */}
            <ConfirmDialog
                open={transferConfirmOpen}
                title={transferTarget ? `Transfer ${transferTarget.moduleId} to your account?` : 'Transfer module?'}
                message={transferTarget ? `This module is currently claimed by ${transferTarget.assignedTo.slice(0,8)}.... Do you want to transfer it to your account?` : ''}
                danger={false}
                confirmText="Transfer"
                onCancel={() => { setTransferConfirmOpen(false); setTransferTarget(null); }}
                onConfirm={async () => {
                    if (!transferTarget) return setTransferConfirmOpen(false);
                    setConfirmLoading(true);
                    try {
                        // Just claim the module
                        await set(ref(rtdb, `modules/${transferTarget.moduleId}`), {
                            assignedTo: userId,
                            status: 'assigned',
                            farmId: null,
                            lastRegisteredAt: Date.now()
                        });
                        toast.success('Module transferred to your account');
                        setModuleKey('');
                        setModuleInfo(null);
                        onClose();
                    } catch (err) {
                        console.error('Transfer failed', err);
                        toast.error(err.message || 'Failed to transfer module');
                    } finally {
                        setConfirmLoading(false);
                        setTransferTarget(null);
                        setTransferConfirmOpen(false);
                    }
                }}
            />

        </div>
    );
};

export default AddModuleDialog;
