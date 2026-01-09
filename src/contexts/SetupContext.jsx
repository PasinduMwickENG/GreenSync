import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { ref, get } from "firebase/database";
import { auth, db, rtdb } from "../firebaseConfig";

const SetupContext = createContext(null);

export const useSetup = () => {
    const ctx = useContext(SetupContext);
    if (!ctx) throw new Error("useSetup must be used within SetupProvider");
    return ctx;
};

export const SetupProvider = ({ children }) => {
    const [user, authLoading] = useAuthState(auth);

    const [setupCompleted, setSetupCompleted] = useState(null);
    const [checkingSetup, setCheckingSetup] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);

    useEffect(() => {
        if (authLoading) return;

        console.log("SetupContext: Auth loaded. User:", user?.uid);

        if (!user) {
            setSetupCompleted(null);
            setCheckingSetup(false);
            return;
        }

        setCheckingSetup(true);
        setPermissionDenied(false);

        // ---------- FAST CACHE READ ----------
        try {
            const raw = localStorage.getItem(`setupCompleted_${user.uid}`);
            if (raw !== null) {
                console.log("SetupContext: Found cached setup status:", raw);
                setSetupCompleted(JSON.parse(raw));
                // If we found a cached value, we can stop blocking the UI immediately
                // while we verify in the background (optional optimization)
            }
        } catch (e) {
            console.warn("localStorage read failed", e);
        }

        let unsub = () => { };
        let mounted = true;

        (async () => {
            let sc = false;
            try {
                console.log("SetupContext: Checking Firestore for setup status...");
                const userRef = doc(db, "users", user.uid);

                const snapshotPromise = getDoc(userRef);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout checking setup status")), 10000)
                );

                const snap = await Promise.race([snapshotPromise, timeoutPromise]);

                if (!mounted) return;

                if (snap.exists()) {
                    const d = snap.data();
                    if (d.setupCompleted === true || d.setupCompleted === "true") {
                        sc = true;
                    }
                } else {
                    console.log("SetupContext: User document not found.");
                }

                if (!sc) {
                    try {
                        console.log("SetupContext: Checking RTDB fallback...");
                        const rtdbRef = ref(rtdb, `users/${user.uid}/setupCompleted`);
                        const rSnap = await get(rtdbRef);
                        const val = rSnap.exists() ? rSnap.val() : null;
                        if (val === true || val === "true") sc = true;
                    } catch (rtdbErr) {
                        console.warn("SetupContext: RTDB check failed", rtdbErr);
                    }
                }
            } catch (err) {
                console.error("SetupContext: Setup check failed:", err);

                if (String(err.code || "").includes("permission")) {
                    setPermissionDenied(true);
                }

                // On failure, try one last time to use cached value, else sc stays false
                try {
                    const raw = localStorage.getItem(`setupCompleted_${user.uid}`);
                    if (raw !== null) {
                        sc = JSON.parse(raw);
                        console.log("SetupContext: Using cached status after fail:", sc);
                    }
                } catch { }
            } finally {
                if (mounted) {
                    console.log("SetupContext: Final setup status to be set:", sc);
                    setSetupCompleted(sc);
                    localStorage.setItem(`setupCompleted_${user.uid}`, JSON.stringify(sc));
                    setCheckingSetup(false);
                    console.log("SetupContext: Checking finished.");
                }
            }

            // ---------- REALTIME LISTENER ----------
            if (mounted) {
                try {
                    unsub = onSnapshot(
                        doc(db, "users", user.uid),
                        (d) => {
                            if (d.exists()) {
                                const data = d.data();
                                if (data.setupCompleted === true || data.setupCompleted === "true") {
                                    setSetupCompleted(true);
                                    localStorage.setItem(`setupCompleted_${user.uid}`, "true");
                                }
                            }
                        },
                        (err) => {
                            console.error("SetupContext: Snapshot error:", err);
                            if (err.code === "permission-denied") {
                                setPermissionDenied(true);
                            }
                        }
                    );
                } catch (listenErr) {
                    console.error("SetupContext: Failed to attach listener:", listenErr);
                }
            }
        })();

        return () => {
            mounted = false;
            unsub();
        };
    }, [user, authLoading]);

    return (
        <SetupContext.Provider
            value={{
                setupCompleted,
                isChecking: checkingSetup || authLoading,
                permissionDenied,
            }}
        >
            {children}
        </SetupContext.Provider>
    );
};
