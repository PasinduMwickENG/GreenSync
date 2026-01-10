const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.database();
const firestore = admin.firestore();

function setBasicCors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-ingest-key');
}

function auditEntry(action, userId, moduleId, details = {}) {
  const entry = {
    action,
    userId,
    moduleId,
    details,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };
  return firestore.collection('audit').doc().set(entry);
}

exports.claimModule = functions.https.onCall(async (data, context) => {
  const { userId, moduleId, plotId } = data || {};
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Request has no auth context');
  }
  const callerUid = context.auth.uid;
  if (!userId || !moduleId || !plotId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing parameters');
  }
  if (callerUid !== userId) {
    // Caller is not the same user - only admins allowed to act on behalf
    const userDoc = await firestore.collection('users').doc(callerUid).get();
    const u = userDoc.exists ? userDoc.data() : {};
    if (u.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Not allowed to claim for another user');
    }
  }

  const moduleRef = db.ref(`modules/${moduleId}`);
  const moduleSnap = await moduleRef.get();
  const moduleData = moduleSnap.exists() ? moduleSnap.val() : null;

  if (moduleData && moduleData.assignedTo && moduleData.assignedTo !== userId) {
    throw new functions.https.HttpsError('failed-precondition', 'Module already assigned');
  }

  const updates = {};
  updates[`modules/${moduleId}/assignedTo`] = userId;
  updates[`modules/${moduleId}/status`] = 'assigned';
  updates[`modules/${moduleId}/farmId`] = plotId;
  updates[`modules/${moduleId}/lastRegisteredAt`] = Date.now();
  updates[`users/${userId}/farms/${plotId}/modules/${moduleId}`] = { createdAt: Date.now() };

  await db.ref('/').update(updates);
  await auditEntry('claim', callerUid, moduleId, { plotId, actedFor: userId });

  return { success: true };
});

exports.releaseModule = functions.https.onCall(async (data, context) => {
  const { userId, moduleId } = data || {};
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Request has no auth context');
  }
  const callerUid = context.auth.uid;
  if (!userId || !moduleId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing userId or moduleId');
  }
  
  console.log(`releaseModule called: userId=${userId}, moduleId=${moduleId}, callerUid=${callerUid}`);
  
  if (callerUid !== userId) {
    try {
      const userDoc = await firestore.collection('users').doc(callerUid).get();
      const u = userDoc.exists ? userDoc.data() : {};
      if (u.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Not allowed to release module for another user');
      }
    } catch (err) {
      if (err.code === 'permission-denied') throw err;
      console.warn('Could not verify admin role, denying access:', err.message);
      throw new functions.https.HttpsError('permission-denied', 'Could not verify permissions');
    }
  }

  const updates = {};

  // Remove from any farm modules under the user
  try {
    const farmsSnap = await db.ref(`users/${userId}/farms`).get();
    if (farmsSnap.exists()) {
      const farms = farmsSnap.val();
      Object.keys(farms).forEach((fid) => {
        if (farms[fid] && farms[fid].modules && farms[fid].modules[moduleId]) {
          updates[`users/${userId}/farms/${fid}/modules/${moduleId}`] = null;
        }
      });
    }
  } catch (err) {
    console.warn('Could not read farms:', err.message);
  }

  updates[`modules/${moduleId}/assignedTo`] = null;
  updates[`modules/${moduleId}/status`] = 'unassigned';
  updates[`modules/${moduleId}/farmId`] = null;

  console.log(`releaseModule updates:`, JSON.stringify(updates));
  
  try {
    await db.ref('/').update(updates);
    console.log(`releaseModule success: module ${moduleId} released`);
  } catch (updateErr) {
    console.error(`releaseModule RTDB update failed:`, updateErr);
    throw new functions.https.HttpsError('internal', `Database update failed: ${updateErr.message}`);
  }
  
  try {
    await auditEntry('release', callerUid, moduleId, { actedFor: userId });
  } catch (auditErr) {
    console.warn('Could not write audit entry:', auditErr.message);
  }

  return { success: true };
});

exports.removeModule = functions.https.onCall(async (data, context) => {
  const { userId, moduleId, force = false } = data || {};
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Request has no auth context');
  }
  const callerUid = context.auth.uid;
  if (!userId || !moduleId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing parameters');
  }

  const moduleSnap = await db.ref(`modules/${moduleId}`).get();
  const moduleData = moduleSnap.exists() ? moduleSnap.val() : null;

  if (moduleData && moduleData.assignedTo && moduleData.assignedTo !== userId) {
    if (!force) {
      throw new functions.https.HttpsError('permission-denied', 'Module assigned to another user');
    }
    // If forced, ensure caller is admin
    const callerDoc = await firestore.collection('users').doc(callerUid).get();
    const callerData = callerDoc.exists ? callerDoc.data() : {};
    if (callerData.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admin can force remove');
    }
  }

  if (callerUid !== userId && !force) {
    const callerDoc = await firestore.collection('users').doc(callerUid).get();
    const callerData = callerDoc.exists ? callerDoc.data() : {};
    if (callerData.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Not allowed to remove for another user');
    }
  }

  const updates = {};

  // Remove from the user's farms
  const farmsSnap = await db.ref(`users/${userId}/farms`).get();
  if (farmsSnap.exists()) {
    const farms = farmsSnap.val();
    Object.keys(farms).forEach((fid) => {
      if (farms[fid] && farms[fid].modules && farms[fid].modules[moduleId]) {
        updates[`users/${userId}/farms/${fid}/modules/${moduleId}`] = null;
      }
    });
  }

  updates[`modules/${moduleId}`] = null;

  await db.ref('/').update(updates);
  await auditEntry('remove', callerUid, moduleId, { actedFor: userId, force });

  return { success: true };
});

// -----------------------------------------------------------------------------
// Ingest + sampling
// -----------------------------------------------------------------------------

const DEFAULT_SAMPLING_INTERVAL_MS = 5 * 60 * 1000;

function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function parseTimestampToMs(ts) {
  if (ts == null) return null;
  const n = asNumber(ts);
  if (n == null) return null;
  // seconds -> ms
  if (n < 100000000000) return Math.round(n * 1000);
  return Math.round(n);
}

/**
 * HTTP endpoint for devices/backends to submit sensor readings.
 *
 * Stores ONLY once per sampling interval (bucketed) per module:
 * - users/{uid}/farms/{farmId}/modules/{moduleId}/latestReading
 * - users/{uid}/farms/{farmId}/modules/{moduleId}/history/{pushId}
 * - users/{uid}/farms/{farmId}/modules/{moduleId}/sensorReadings/{timestampMs}
 *
 * Sampling interval source:
 * - users/{uid}/dashboardConfig/preferences/samplingIntervalMs
 *
 * Module routing source:
 * - modules/{moduleId} => { assignedTo, farmId }
 */
exports.ingestReading = functions.https.onRequest(async (req, res) => {
  // Basic CORS for testing tools (Postman/browser). Devices usually don't need this.
  setBasicCors(res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Use POST' });

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const moduleId = String(body.moduleId || body.module_id || '').trim();
    if (!moduleId) return res.status(400).json({ success: false, error: 'Missing moduleId' });

    // Optional per-module key: if set in RTDB, require it.
    const providedKey = String(body.ingestKey || body.apiKey || req.get('x-ingest-key') || '').trim();

    const moduleSnap = await db.ref(`modules/${moduleId}`).get();
    if (!moduleSnap.exists()) return res.status(404).json({ success: false, error: 'Unknown moduleId' });
    const moduleData = moduleSnap.val() || {};

    const assignedTo = moduleData.assignedTo;
    const farmId = moduleData.farmId;
    if (!assignedTo || !farmId) {
      return res.status(409).json({ success: false, error: 'Module is not assigned to a user/plot yet' });
    }

    const requiredKey = String(moduleData.ingestKey || moduleData.apiKey || '').trim();
    if (requiredKey && requiredKey !== providedKey) {
      return res.status(403).json({ success: false, error: 'Invalid ingest key' });
    }

    const prefsSnap = await db.ref(`users/${assignedTo}/dashboardConfig/preferences`).get();
    const prefs = prefsSnap.exists() ? (prefsSnap.val() || {}) : {};

    const intervalMsRaw =
      prefs.samplingIntervalMs ??
      (prefs.samplingIntervalMinutes != null ? asNumber(prefs.samplingIntervalMinutes) * 60 * 1000 : null) ??
      (prefs.samplingIntervalSeconds != null ? asNumber(prefs.samplingIntervalSeconds) * 1000 : null);

    const intervalMs = clamp(
      asNumber(intervalMsRaw) ?? DEFAULT_SAMPLING_INTERVAL_MS,
      1000,              // min 1s
      24 * 60 * 60 * 1000 // max 24h
    );

    const nowMs = Date.now();
    const tsMs =
      parseTimestampToMs(body.timestampMs ?? body.timestamp ?? body.ts ?? body.time) ??
      nowMs;

    const bucket = Math.floor(tsMs / intervalMs);

    const basePath = `users/${assignedTo}/farms/${farmId}/modules/${moduleId}`;
    const samplingStateRef = db.ref(`${basePath}/_sampling`);
    const stateSnap = await samplingStateRef.get();
    const state = stateSnap.exists() ? (stateSnap.val() || {}) : {};
    const lastBucket = asNumber(state.lastBucket);

    // Normalize reading payload (accept either {reading:{...}} or flat body)
    const reading = (body.reading && typeof body.reading === 'object') ? body.reading : body;

    // Keep only sensor-ish fields + metadata; don't blindly store secrets.
    const stored = {
      sensor_id: reading.sensor_id ?? reading.sensorId ?? reading.sensor ?? 'unknown_sensor',
      temperature: reading.temperature ?? null,
      humidity: reading.humidity ?? null,
      moisture: reading.moisture ?? reading.soilMoisture ?? reading.soil_moisture ?? null,
      pH: reading.pH ?? reading.ph ?? reading.soilPH ?? null,
      nitrogen: reading.nitrogen ?? null,
      phosphorus: reading.phosphorus ?? null,
      potassium: reading.potassium ?? null,
      local_date: reading.local_date ?? null,
      local_time: reading.local_time ?? null,
      timestamp: tsMs,
      storedAt: nowMs,
    };

    const updates = {};
    updates[`${basePath}/_sampling/lastReceivedAt`] = nowMs;
    updates[`${basePath}/_sampling/lastReceivedBucket`] = bucket;

    // Only store once per interval bucket.
    const shouldStore = !(Number.isFinite(lastBucket) && lastBucket === bucket);
    if (shouldStore) {
      const historyKey = db.ref(`${basePath}/history`).push().key;
      updates[`${basePath}/latestReading`] = stored;
      updates[`${basePath}/history/${historyKey}`] = stored;
      updates[`${basePath}/sensorReadings/${String(tsMs)}`] = stored;
      updates[`${basePath}/_sampling/lastBucket`] = bucket;
      updates[`${basePath}/_sampling/lastStoredAt`] = nowMs;
      updates[`${basePath}/_sampling/lastStoredTimestamp`] = tsMs;
    }

    await db.ref('/').update(updates);

    return res.status(200).json({
      success: true,
      moduleId,
      userId: assignedTo,
      farmId,
      stored: shouldStore,
      samplingIntervalMs: intervalMs,
      bucket,
    });
  } catch (err) {
    console.error('ingestReading failed', err);
    return res.status(500).json({ success: false, error: err?.message || 'Internal error' });
  }
});

// -----------------------------------------------------------------------------
// Device helper endpoints (HTTP) - avoids RTDB streaming/client on ESP.
// -----------------------------------------------------------------------------

exports.registerModuleHttp = functions.https.onRequest(async (req, res) => {
  setBasicCors(res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Use POST' });

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const moduleId = String(body.moduleId || body.module_id || '').trim();
    if (!moduleId) return res.status(400).json({ success: false, error: 'Missing moduleId' });

    const moduleRef = db.ref(`modules/${moduleId}`);
    const snap = await moduleRef.get();
    if (snap.exists()) {
      const data = snap.val() || {};
      return res.status(200).json({
        success: true,
        created: false,
        moduleId,
        status: data.status ?? null,
        assignedTo: data.assignedTo ?? null,
        farmId: data.farmId ?? null,
      });
    }

    const now = Date.now();
    await moduleRef.set({
      status: 'unassigned',
      assignedTo: '',
      farmId: '',
      registeredAt: now,
      deviceType: 'ESP32',
      firmwareVersion: 'http-1.0',
    });

    return res.status(200).json({ success: true, created: true, moduleId });
  } catch (err) {
    console.error('registerModuleHttp failed', err);
    return res.status(500).json({ success: false, error: err?.message || 'Internal error' });
  }
});

exports.getModuleStatusHttp = functions.https.onRequest(async (req, res) => {
  setBasicCors(res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Use POST' });

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const moduleId = String(body.moduleId || body.module_id || '').trim();
    if (!moduleId) return res.status(400).json({ success: false, error: 'Missing moduleId' });

    const moduleSnap = await db.ref(`modules/${moduleId}`).get();
    if (!moduleSnap.exists()) return res.status(404).json({ success: false, error: 'Unknown moduleId' });
    const moduleData = moduleSnap.val() || {};

    const requiredKey = String(moduleData.ingestKey || moduleData.apiKey || '').trim();
    const providedKey = String(body.ingestKey || body.apiKey || req.get('x-ingest-key') || '').trim();
    if (requiredKey && requiredKey !== providedKey) {
      return res.status(403).json({ success: false, error: 'Invalid ingest key' });
    }

    const assignedTo = moduleData.assignedTo;
    const farmId = moduleData.farmId;

    return res.status(200).json({
      success: true,
      moduleId,
      assigned: !!(assignedTo && farmId),
      assignedTo: assignedTo || null,
      farmId: farmId || null,
      status: moduleData.status ?? null,
    });
  } catch (err) {
    console.error('getModuleStatusHttp failed', err);
    return res.status(500).json({ success: false, error: err?.message || 'Internal error' });
  }
});

exports.getActuatorsHttp = functions.https.onRequest(async (req, res) => {
  setBasicCors(res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Use POST' });

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const moduleId = String(body.moduleId || body.module_id || '').trim();
    if (!moduleId) return res.status(400).json({ success: false, error: 'Missing moduleId' });

    const moduleSnap = await db.ref(`modules/${moduleId}`).get();
    if (!moduleSnap.exists()) return res.status(404).json({ success: false, error: 'Unknown moduleId' });
    const moduleData = moduleSnap.val() || {};

    const requiredKey = String(moduleData.ingestKey || moduleData.apiKey || '').trim();
    const providedKey = String(body.ingestKey || body.apiKey || req.get('x-ingest-key') || '').trim();
    if (requiredKey && requiredKey !== providedKey) {
      return res.status(403).json({ success: false, error: 'Invalid ingest key' });
    }

    const assignedTo = moduleData.assignedTo;
    const farmId = moduleData.farmId;
    if (!assignedTo || !farmId) {
      return res.status(409).json({ success: false, error: 'Module is not assigned to a user/plot yet' });
    }

    const actuatorsRef = db.ref(`users/${assignedTo}/farms/${farmId}/modules/${moduleId}/actuators`);
    const snap = await actuatorsRef.get();
    let actuators = snap.exists() ? (snap.val() || {}) : null;

    if (!actuators) {
      actuators = {
        irrigation: { status: 'off', autoMode: false },
        fertilization: { status: 'off', autoMode: false },
      };
      await actuatorsRef.set(actuators);
    }

    const irrigationStatus = String(actuators?.irrigation?.status || 'off');
    const fertilizationStatus = String(actuators?.fertilization?.status || 'off');

    return res.status(200).json({
      success: true,
      moduleId,
      irrigationStatus,
      fertilizationStatus,
      irrigationAutoMode: !!actuators?.irrigation?.autoMode,
      fertilizationAutoMode: !!actuators?.fertilization?.autoMode,
    });
  } catch (err) {
    console.error('getActuatorsHttp failed', err);
    return res.status(500).json({ success: false, error: err?.message || 'Internal error' });
  }
});
