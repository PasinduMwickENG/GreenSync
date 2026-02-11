// src/Components/Dialogs/AddGatewayDialog.jsx
import React, { useState } from 'react';
import { X, Router, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { ref, get, set, update } from 'firebase/database';
import { rtdb } from '../../firebaseConfig';
import ConfirmDialog from './ConfirmDialog';

const AddGatewayDialog = ({ isOpen, onClose, userId, farms, onGatewayAdded }) => {
    const [gatewayKey, setGatewayKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingGateway, setCheckingGateway] = useState(false);
    const [gatewayInfo, setGatewayInfo] = useState(null); // { exists, assignedTo, status, deviceType }
    const [selectedFarm, setSelectedFarm] = useState('General');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);
    const [transferTarget, setTransferTarget] = useState(null);

    const validateGatewayKey = (k) => /^[A-Za-z0-9\-]{3,64}$/.test(k);

    const checkGateway = async () => {
        if (!gatewayKey.trim()) {
            toast.error('Enter a gateway ID to check');
            return;
        }

        setCheckingGateway(true);
        try {
            const id = gatewayKey.trim().toUpperCase();
            const gatewayRef = ref(rtdb, `modules/${id}`);
            const snap = await get(gatewayRef);
            const data = snap.val();

            if (data && data.deviceType === 'LoRa-Gateway') {
                setGatewayInfo({
                    exists: true,
                    assignedTo: data?.assignedTo || null,
                    status: data?.status || 'unknown',
                    deviceType: data?.deviceType,
                    farmId: data?.farmId || null
                });
            } else if (data) {
                toast.error('This device is not a LoRa Gateway');
                setGatewayInfo(null);
            } else {
                setGatewayInfo({
                    exists: false,
                    assignedTo: null,
                    status: 'not_registered',
                    deviceType: null
                });
                toast.info('Gateway not found. Ensure it\'s powered on and online.');
            }
        } catch (err) {
            console.error('Failed to check gateway:', err);
            toast.error(`Failed to check gateway: ${err.message}`);
            setGatewayInfo(null);
        } finally {
            setCheckingGateway(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!gatewayKey.trim()) {
            toast.error('Please enter a gateway ID');
            return;
        }

        const gatewayId = gatewayKey.trim().toUpperCase();

        if (!validateGatewayKey(gatewayId)) {
            toast.error('Invalid gateway ID format. Use letters, numbers and dashes (3-64 chars).');
            return;
        }

        setLoading(true);

        try {
            console.log(`\n🔄 Claiming gateway: ${gatewayId} for user: ${userId} to farm: ${selectedFarm}`);
            
            // Check current gateway status
            const gatewayRef = ref(rtdb, `modules/${gatewayId}`);
            const snapshot = await get(gatewayRef);
            const gatewayData = snapshot.val();
            
            console.log('Current gateway data:', gatewayData);
            console.log('Current assignedTo:', gatewayData?.assignedTo);
            console.log('Current status:', gatewayData?.status);

            if (!gatewayData) {
                toast.error('Gateway not found. Ensure it\'s powered on and online.');
                setLoading(false);
                return;
            }

            if (gatewayData.deviceType !== 'LoRa-Gateway') {
                toast.error('This device is not a LoRa Gateway');
                setLoading(false);
                return;
            }

            if (gatewayData.assignedTo && gatewayData.assignedTo !== userId) {
                // Open transfer confirmation
                setTransferTarget({ assignedTo: gatewayData.assignedTo, gatewayId });
                setTransferConfirmOpen(true);
                setLoading(false);
                return;
            }

            // Ensure user has the selected farm
            const farmRef = ref(rtdb, `users/${userId}/farms/${selectedFarm}`);
            const farmSnap = await get(farmRef);

            if (!farmSnap.exists()) {
                console.log(`📁 Creating farm: ${selectedFarm}`);
                // Create farm if it doesn't exist
                await set(farmRef, {
                    name: selectedFarm === 'General' ? 'Main Farm' : selectedFarm,
                    modules: {}
                });
                console.log(`✅ Farm created: ${selectedFarm}`);
            } else {
                console.log(`✅ Farm already exists: ${selectedFarm}`);
            }

            console.log('Attempting to update gateway with the following data:', {
                assignedTo: userId,
                status: 'assigned',
                farmId: selectedFarm,
                lastRegisteredAt: Date.now()
            });

            console.log('Firebase path for gateway update:', `modules/${gatewayId}`);

            // Claim the gateway
            await update(gatewayRef, {
                assignedTo: userId,
                status: 'assigned',
                farmId: selectedFarm,
                lastRegisteredAt: Date.now()
            });

            console.log('✅ Gateway claimed in modules collection');

            console.log('Adding gateway to user farms with the following data:', {
                deviceType: 'LoRa-Gateway',
                createdAt: Date.now(),
                location: 'Unknown',
                description: 'LoRa Gateway'
            });

            console.log('Firebase path for user farm update:', `users/${userId}/farms/${selectedFarm}/modules/${gatewayId}`);

            // Add to user's farms
            await set(ref(rtdb, `users/${userId}/farms/${selectedFarm}/modules/${gatewayId}`), {
                deviceType: 'LoRa-Gateway',
                createdAt: Date.now(),
                location: 'Unknown',
                description: 'LoRa Gateway'
            });

            console.log('✅ Gateway added to user farms');

            toast.success('Gateway claimed successfully!');

            if (onGatewayAdded) {
                onGatewayAdded({ id: gatewayId, farmId: selectedFarm, deviceType: 'LoRa-Gateway' });
            }

            // Reset and close
            setGatewayKey('');
            setGatewayInfo(null);
            setSelectedFarm('General');
            onClose();
        } catch (error) {
            console.error('Full error object:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Error toString:', error.toString());

            if (error.code === 'PERMISSION_DENIED') {
                toast.error('❌ Permission denied. Check Firebase rules.');
            } else {
                toast.error(`❌ Failed: ${error.message || error.code || 'Unknown error'}`);
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
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Router className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Add LoRa Gateway</h2>
                            <p className="text-sm text-gray-500">Claim a gateway device</p>
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
                    {/* Gateway ID Input */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Gateway ID
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <input
                                type="text"
                                value={gatewayKey}
                                onChange={(e) => setGatewayKey(e.target.value.toUpperCase())}
                                placeholder="e.g., GS-ESP32-GATEWAY-01"
                                className="col-span-2 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={checkGateway}
                                className="col-span-1 px-3 py-3 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50"
                                disabled={loading || checkingGateway || !gatewayKey}
                            >
                                {checkingGateway ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                    'Check'
                                )}
                            </button>
                        </div>

                        {gatewayInfo && (
                            <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                                {gatewayInfo.exists ? (
                                    gatewayInfo.assignedTo ? (
                                        gatewayInfo.assignedTo === userId ? (
                                            <div className="flex items-center justify-between text-green-700 font-medium">
                                                <span>✓ Claimed by you</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmOpen(true)}
                                                    className="ml-2 px-2 py-1 rounded bg-red-50 text-red-700 text-xs hover:bg-red-100"
                                                >
                                                    Release
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between text-yellow-700 font-medium">
                                                <span>⚠ Claimed by another user</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTransferTarget({ assignedTo: gatewayInfo.assignedTo, gatewayId: gatewayKey.trim().toUpperCase() });
                                                        setTransferConfirmOpen(true);
                                                    }}
                                                    className="ml-2 px-2 py-1 rounded bg-yellow-50 text-yellow-800 text-xs hover:bg-yellow-100"
                                                >
                                                    Transfer
                                                </button>
                                            </div>
                                        )
                                    ) : (
                                        <div className="text-blue-700 font-medium">✅ Available to claim</div>
                                    )
                                ) : (
                                    <div className="text-gray-600 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>Gateway not registered online yet</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Check gateway status before claiming
                        </p>
                    </div>

                    {/* Farm Selection */}
                    {gatewayInfo?.exists && (
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">
                                Assign to Farm
                            </label>
                            <select
                                value={selectedFarm}
                                onChange={(e) => setSelectedFarm(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                                disabled={loading}
                            >
                                <option value="General">General Farm</option>
                                {farms && farms.map((farm) => (
                                    <option key={farm.id} value={farm.id}>
                                        {farm.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                        <div className="flex gap-3">
                            <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-purple-900">
                                <p className="font-semibold mb-1">What happens next?</p>
                                <ul className="space-y-1 text-purple-700">
                                    <li>• Gateway will be claimed to your account</li>
                                    <li>• It will relay data from LoRa nodes</li>
                                    <li>• Data streams to your farm dashboard</li>
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
                            className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 transition-all shadow-lg shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading || !gatewayKey || !gatewayInfo?.exists}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Claiming...
                                </span>
                            ) : (
                                'Claim Gateway'
                            )}
                        </button>
                    </div>
                </form>

                {/* Release confirmation */}
                <ConfirmDialog
                    open={confirmOpen}
                    title={`Release ${gatewayKey.trim().toUpperCase()}?`}
                    message="This will unassign the gateway and make it available for others to claim."
                    danger={true}
                    confirmText="Release"
                    onCancel={() => setConfirmOpen(false)}
                    onConfirm={async () => {
                        setConfirmLoading(true);
                        try {
                            const gatewayId = gatewayKey.trim().toUpperCase();
                            await update(ref(rtdb, `modules/${gatewayId}`), {
                                status: 'unassigned',
                                assignedTo: '',
                                farmId: ''
                            });

                            toast.success('Gateway released');
                            setGatewayInfo({ ...gatewayInfo, assignedTo: null });
                            setConfirmOpen(false);
                        } catch (err) {
                            toast.error('Failed to release gateway');
                        } finally {
                            setConfirmLoading(false);
                        }
                    }}
                />

                {/* Transfer confirmation */}
                <ConfirmDialog
                    open={transferConfirmOpen}
                    title={transferTarget ? `Transfer ${transferTarget.gatewayId}?` : 'Transfer gateway?'}
                    message={transferTarget ? `This gateway is claimed by another user. Transfer to your account?` : ''}
                    danger={false}
                    confirmText="Transfer"
                    onCancel={() => {
                        setTransferConfirmOpen(false);
                        setTransferTarget(null);
                    }}
                    onConfirm={async () => {
                        if (!transferTarget) return setTransferConfirmOpen(false);
                        setConfirmLoading(true);
                        try {
                            await update(ref(rtdb, `modules/${transferTarget.gatewayId}`), {
                                assignedTo: userId,
                                status: 'assigned',
                                farmId: selectedFarm,
                                lastRegisteredAt: Date.now()
                            });

                            await set(ref(rtdb, `users/${userId}/farms/${selectedFarm}/modules/${transferTarget.gatewayId}`), {
                                deviceType: 'LoRa-Gateway',
                                createdAt: Date.now(),
                                location: 'Unknown',
                                description: 'LoRa Gateway'
                            });

                            toast.success('Gateway transferred to your account');
                            setGatewayKey('');
                            setGatewayInfo(null);
                            onClose();
                        } catch (err) {
                            toast.error('Failed to transfer gateway');
                        } finally {
                            setConfirmLoading(false);
                            setTransferTarget(null);
                            setTransferConfirmOpen(false);
                        }
                    }}
                />
            </div>
        </div>
    );
};

export default AddGatewayDialog;
