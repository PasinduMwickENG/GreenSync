import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, set, get } from 'firebase/database';
import { auth, db, rtdb } from '../../firebaseConfig';
import AddModuleDialog from '../Dialogs/AddModuleDialog';
import ConfirmDialog from '../Dialogs/ConfirmDialog';
import { toast } from 'sonner';
import dashboardConfig from '../../services/dashboardConfig';

const Setup = () => {
    const navigate = useNavigate();
    const [user] = useAuthState(auth);
    const [loading, setLoading] = useState(false);
    const [showAddModule, setShowAddModule] = useState(false);

    const [assignedModules, setAssignedModules] = useState([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [moduleToRemove, setModuleToRemove] = useState(null);
    const [recentlyRemoved, setRecentlyRemoved] = useState(null);

    // Load cached assigned modules (or from RTDB) on mount
    useEffect(() => {
        const load = async () => {
            if (!user) return;
            const key = `setup_assignedModules_${user.uid}`;
            try {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const cached = JSON.parse(raw);
                    setAssignedModules(cached);
                    console.log('Setup: Loaded assigned modules from localStorage');
                }

                // Also fetch latest data from RTDB and reconcile (merge any modules added elsewhere)
                const farmsSnap = await get(ref(rtdb, `users/${user.uid}/farms`));
                if (farmsSnap.exists()) {
                    const farms = farmsSnap.val();
                    const modules = [];
                    Object.entries(farms).forEach(([fid, fd]) => {
                        if (fd.modules) {
                            Object.entries(fd.modules).forEach(([mid, md]) => {
                                modules.push({ id: mid, farmId: fid, ...md });
                            });
                        }
                    });

                    // merge unique modules into state
                    setAssignedModules(prev => {
                        const map = new Map();
                        prev.forEach(m => map.set(m.id, m));
                        modules.forEach(m => map.set(m.id, m));
                        const merged = Array.from(map.values());
                        try { localStorage.setItem(key, JSON.stringify(merged)); } catch (e) {}
                        console.log('Setup: Reconciled assigned modules with RTDB');
                        return merged;
                    });
                }
            } catch (err) {
                console.warn('Setup: Failed loading assigned modules', err);
            }
        };
        load();
    }, [user]);

    // Cleanup any pending undo timers on unmount
    React.useEffect(() => {
        return () => {
            if (recentlyRemoved && recentlyRemoved.timer) {
                clearTimeout(recentlyRemoved.timer);
            }
        };
    }, []);

    const handleModuleAdded = (m) => {
        setAssignedModules(prev => {
            const exists = prev.find(x => x.id === m.id);
            if (exists) return prev;
            const nv = [...prev, m];
            try { localStorage.setItem(`setup_assignedModules_${user.uid}`, JSON.stringify(nv)); } catch (e) {}
            return nv;
        });
    };

    const handleFinishSetup = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // Update Firestore
            await setDoc(doc(db, 'users', user.uid), {
                setupCompleted: true,
                updatedAt: new Date()
            }, { merge: true });

            // Update RTDB (optional redundancy)
            await set(ref(rtdb, `users/${user.uid}/setupCompleted`), true);

            toast.success('Setup completed! Welcome to your dashboard.');
            // Force reload or just navigate (SetupContext listener should pick it up)
            window.location.href = '/dashboard';
        } catch (error) {
            console.error('Error completing setup:', error);
            toast.error('Failed to save setup status. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            {recentlyRemoved && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-yellow-50 border border-yellow-200 text-yellow-900 px-4 py-2 rounded-full shadow-md z-50 flex items-center gap-3">
                    <div className="text-sm">Removed {recentlyRemoved.module.id}</div>
                    <button
                        onClick={async () => {
                            const rem = recentlyRemoved.module;
                            clearTimeout(recentlyRemoved.timer);
                            try {
                                await dashboardConfig.assignModuleToPlot(user.uid, rem.id, rem.farmId);
                                // restore in UI
                                setAssignedModules(prev => {
                                    const nv = [...prev, rem];
                                    try { localStorage.setItem(`setup_assignedModules_${user.uid}`, JSON.stringify(nv)); } catch (e) {}
                                    return nv;
                                });
                                toast.success('Undo successful — module reassigned');
                            } catch (err) {
                                console.error('Undo failed', err);
                                toast.error('Failed to undo removal');
                            } finally {
                                setRecentlyRemoved(null);
                            }
                        }}
                        className="px-3 py-1 rounded-md text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                    >Undo</button>
                </div>
            )}
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    {/* Leaf icon or similar */}
                    <span className="text-3xl">🌱</span>
                </div>

                <h1 className="text-3xl font-bold text-gray-900">Welcome to GreenSync</h1>
                <p className="text-gray-600">
                    Your account is created. Let's get your farm set up.
                    To start, you can add your first sensor module.
                </p>

                <div className="space-y-4">
                    {/* Assigned Modules List */}
                    {assignedModules.length > 0 && (
                        <div className="space-y-2 p-4 bg-white rounded-xl border border-slate-100">
                            <h3 className="text-sm font-semibold text-slate-700">Assigned Modules</h3>
                            <div className="mt-2 grid gap-2">
                                {assignedModules.map((m) => (
                                    <div key={m.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg">
                                        <div>
                                            <div className="font-medium text-sm">{m.id}</div>
                                            <div className="text-xs text-slate-500">Assigned to plot: <span className="font-medium">{m.farmId}</span></div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => { setModuleToRemove(m); setConfirmOpen(true); }}
                                                className="px-3 py-1 rounded-md text-sm bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                            >Remove</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => setShowAddModule(true)}
                        className="w-full py-3 px-4 bg-blue-50 text-blue-700 font-semibold rounded-xl hover:bg-blue-100 transition-colors border border-blue-200 dashed"
                    >
                        + Add Sensor Module
                    </button>

                    <button
                        onClick={handleFinishSetup}
                        disabled={loading}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Finalizing...' : 'Complete Setup & Go to Dashboard'}
                    </button>
                </div>
            </div>

            <AddModuleDialog
                isOpen={showAddModule}
                onClose={() => setShowAddModule(false)}
                userId={user?.uid}
                farms={[{ id: 'default', name: 'Main Farm', crop: 'General' }]} // Placeholder farms for setup
                onModuleAdded={(m) => {
                    toast.success(`Module ${m.id} added!`);
                    handleModuleAdded(m);
                }}
            />
            <ConfirmDialog
                open={confirmOpen}
                title={`Remove module ${moduleToRemove?.id}?`}
                message={`This will unassign the module ${moduleToRemove?.id} from your farm. You can undo this action briefly.`}
                danger={true}
                confirmText="Remove"
                onCancel={() => { setConfirmOpen(false); setModuleToRemove(null); }}
                onConfirm={async () => {
                    if (!moduleToRemove) return setConfirmOpen(false);
                    try {
                        await dashboardConfig.unassignModule(user.uid, moduleToRemove.id);
                        setAssignedModules(prev => {
                            const nv = prev.filter(x => x.id !== moduleToRemove.id);
                            try { localStorage.setItem(`setup_assignedModules_${user.uid}`, JSON.stringify(nv)); } catch (e) {}
                            return nv;
                        });

                        // allow undo for 8 seconds
                        const timer = setTimeout(() => setRecentlyRemoved(null), 8000);
                        setRecentlyRemoved({ module: moduleToRemove, timer });
                        toast.success('Module removed — you can undo for a short time');
                    } catch (err) {
                        console.error('Failed to remove module', err);
                        toast.error('Failed to remove module. Try again.');
                    } finally {
                        setConfirmOpen(false);
                        setModuleToRemove(null);
                    }
                }}
            />
        </div>
    );
};

export default Setup;
