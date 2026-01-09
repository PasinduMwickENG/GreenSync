import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { auth, db, rtdb } from '../../firebaseConfig';
import AddModuleDialog from '../Dialogs/AddModuleDialog';
import { toast } from 'sonner';

const Setup = () => {
    const navigate = useNavigate();
    const [user] = useAuthState(auth);
    const [loading, setLoading] = useState(false);
    const [showAddModule, setShowAddModule] = useState(false);

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
                onModuleAdded={(m) => toast.success(`Module ${m.id} added!`)}
            />
        </div>
    );
};

export default Setup;
