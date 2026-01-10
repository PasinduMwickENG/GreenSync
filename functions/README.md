Firebase Cloud Functions

This folder contains callable Cloud Functions used to safely claim/release/remove modules.

Deploy:
1. Install dependencies: `cd functions && npm install`
2. Deploy functions: `npx firebase deploy --only functions` (requires firebase CLI and project configured)

Functions implemented:
- `claimModule` - Claim/assign a module to a user's plot (atomic, with audit log)
- `releaseModule` - Unassign a module from a user
- `removeModule` - Remove module registry and user references (owner-only, admin `force` supported)
- `ingestReading` - HTTP endpoint to ingest sensor readings and store them ONLY at the user's configured sampling interval
- `registerModuleHttp` - HTTP endpoint for devices to create module registry entry (if missing)
- `getModuleStatusHttp` - HTTP endpoint for devices to check whether module is assigned
- `getActuatorsHttp` - HTTP endpoint for devices to read actuator statuses (creates defaults if missing)

Notes:
- Functions use `context.auth.uid` to enforce caller identity; client should call these as authenticated users via Firebase client SDK `httpsCallable`.
- Audit logs are written to Firestore `audit` collection.

## ingestReading

This function implements BACKEND-side sampling:
even if a module sends readings frequently, the backend only stores a reading once per sampling interval bucket.

Sampling interval source (RTDB):
- `users/{uid}/dashboardConfig/preferences/samplingIntervalMs`

Storage paths (RTDB):
- `users/{uid}/farms/{farmId}/modules/{moduleId}/latestReading`
- `users/{uid}/farms/{farmId}/modules/{moduleId}/history/{pushId}`
- `users/{uid}/farms/{farmId}/modules/{moduleId}/sensorReadings/{timestampMs}`

Routing source:
- `modules/{moduleId}` must contain `assignedTo` and `farmId` (set by `claimModule`).

Request:
- Method: `POST`
- Body: JSON including at least `moduleId` and sensor fields

Optional security:
- If `modules/{moduleId}/ingestKey` (or `apiKey`) exists, requests must include matching key via `ingestKey` / `apiKey` field or `x-ingest-key` header.

## Device endpoints (HTTP)

These are intended for ESP32/embedded clients to avoid keeping RTDB sockets open.

- `registerModuleHttp`
	- `POST` body: `{ "moduleId": "GS-ESP32-0001" }`
	- Creates `modules/{moduleId}` if it doesn't exist.

- `getModuleStatusHttp`
	- `POST` body: `{ "moduleId": "..." }`
	- Response includes `assigned: true|false`.

- `getActuatorsHttp`
	- `POST` body: `{ "moduleId": "..." }`
	- Response includes `irrigationStatus` and `fertilizationStatus`.
	- If actuators node is missing, defaults are created server-side.
