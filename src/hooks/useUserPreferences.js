import { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";
import { auth, rtdb } from "../firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";

export const DEFAULT_USER_PREFERENCES = {
  // Settings UI uses minutes; we store ms in RTDB for consistency.
  samplingIntervalMs: 5 * 60 * 1000,
};

const normalizePreferences = (raw) => {
  const obj = raw && typeof raw === "object" ? raw : {};

  // Back-compat: if someone stored minutes/seconds, convert.
  const samplingIntervalMsRaw =
    obj.samplingIntervalMs ??
    (obj.samplingIntervalMinutes != null ? Number(obj.samplingIntervalMinutes) * 60 * 1000 : null) ??
    (obj.samplingIntervalSeconds != null ? Number(obj.samplingIntervalSeconds) * 1000 : null);

  const samplingIntervalMs = Number(samplingIntervalMsRaw);

  return {
    ...obj,
    samplingIntervalMs: Number.isFinite(samplingIntervalMs) && samplingIntervalMs > 0
      ? Math.round(samplingIntervalMs)
      : DEFAULT_USER_PREFERENCES.samplingIntervalMs,
  };
};

export const useUserPreferences = (userId) => {
  const [authUser] = useAuthState(auth);
  const uid = userId ?? authUser?.uid ?? null;

  const [preferences, setPreferences] = useState(DEFAULT_USER_PREFERENCES);
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) {
      setPreferences(DEFAULT_USER_PREFERENCES);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const prefsRef = ref(rtdb, `users/${uid}/dashboardConfig/preferences`);
    const unsub = onValue(
      prefsRef,
      (snap) => {
        const val = snap.exists() ? snap.val() : null;
        setPreferences(normalizePreferences(val));
        setLoading(false);
      },
      (err) => {
        console.warn("Preferences subscription failed", err);
        setError(err);
        setPreferences(DEFAULT_USER_PREFERENCES);
        setLoading(false);
      }
    );

    return () => {
      try {
        unsub();
      } catch {
        // ignore
      }
    };
  }, [uid]);

  return useMemo(() => ({ preferences, loading, error }), [preferences, loading, error]);
};

export const useSamplingIntervalMs = (userId) => {
  const { preferences } = useUserPreferences(userId);
  return preferences?.samplingIntervalMs ?? DEFAULT_USER_PREFERENCES.samplingIntervalMs;
};
