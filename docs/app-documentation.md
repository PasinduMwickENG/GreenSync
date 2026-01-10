# GreenSync Application Documentation

This document describes the core user-facing flows and the underlying implementation for:
- Sign Up / Sign In
- User authentication & route protection
- Module assignment (claim/release/remove)
- User dashboard (plots, live sensors, analytics, actuators, alerts, settings)

For deeper module-management troubleshooting and suggested database rules, also see: `docs/module-setup.md`.

---

## 1) Tech Stack (Relevant to these flows)

- Frontend: React (Vite)
- Authentication: Firebase Authentication (Email/Password)
- Database:
  - Firestore: user profile and `setupCompleted`
  - Realtime Database (RTDB): dashboard config, plots, preferences, module registry & sensor data
- Cloud Functions:
  - Callable: `claimModule`, `releaseModule`, `removeModule`
  - HTTP: `ingestReading` (backend-side sampling), plus device helper endpoints (if used)

---

## 2) User Authentication

### 2.1 How authentication state is read

The app uses `react-firebase-hooks/auth`:
- `useAuthState(auth)` returns `[user, loading]`

This pattern is used in multiple places to:
- render a loading state while Firebase initializes
- redirect unauthenticated users to Sign In

Key files:
- `src/Components/Pages/PrivateRoute.jsx`
- `src/Components/Pages/SignIn.jsx`
- `src/Components/Pages/SignUp.jsx`

### 2.2 Protected routes

`PrivateRoute` wraps protected pages:
- If `loading` → shows a simple Loading UI
- If `user` exists → renders children
- If not authenticated → redirects to `/signin` and stores the original route in `location.state.from`

Implementation:
- `src/Components/Pages/PrivateRoute.jsx`

### 2.3 Setup gating (first-time flow)

After authentication, the app uses a “Setup Guard” to ensure the user completes initial setup:
- If `setupCompleted === false` and user is not on `/setup` → redirect to `/setup`
- If `setupCompleted === true` and user is on `/setup` → redirect to `/dashboard`

Implementation:
- `src/Components/Pages/SetupGuard.jsx`
- `src/contexts/SetupContext.jsx`

**Where `setupCompleted` comes from:**
- Primary: Firestore `users/{uid}.setupCompleted`
- Fallback: RTDB `users/{uid}/setupCompleted`
- Performance optimization: cached value in `localStorage` (`setupCompleted_{uid}`) is used to avoid blocking UI during slow network calls.

---

## 3) Sign Up Page

### 3.1 What the page does

The Sign Up page creates a new Firebase Auth user and attempts to create a Firestore profile document.

User inputs:
- Full name
- Email
- Password
- Confirm password

Validation:
- Name required
- Valid email format
- Password length ≥ 6
- Passwords must match

On success:
1) `createUserWithEmailAndPassword(auth, email, password)`
2) `setDoc(doc(db, 'users', uid), { name, email, createdAt, modules: [] })`
3) Navigates to the intended destination (default `/dashboard`)

Implementation:
- `src/Components/Pages/SignUp.jsx`

Notes:
- The Firestore write is attempted but navigation is not blocked if it fails; the user is still created in Auth.

---

## 4) Sign In Page

### 4.1 What the page does

The Sign In page authenticates an existing user.

User inputs:
- Email
- Password

On success:
- `signInWithEmailAndPassword(auth, email, password)`
- Redirects to the original route captured by `PrivateRoute` (default `/dashboard`)

Implementation:
- `src/Components/Pages/SignIn.jsx`

### 4.2 Password reset

The Sign In page includes a reset-password mode:
- User enters email
- App calls `sendPasswordResetEmail(auth, email)`

---

## 5) Module Assignment (Claim/Release/Remove)

GreenSync uses a module registry under RTDB to map a device/module to a user.

### 5.1 Data model (high-level)

Module registry:
- `modules/{moduleId}`
  - `status`: `assigned` | `unassigned`
  - `assignedTo`: `{uid}` or empty
  - `farmId`: plot/farm id (in this app, plot ids are used as farm ids)

User farm/module reference:
- `users/{uid}/farms/{farmId}/modules/{moduleId}`
  - created when claimed
  - contains metadata like `createdAt`

### 5.2 Claiming a module

User flow:
- User opens Setup or Dashboard
- Uses Add Module UI to enter the module ID
- If unassigned, selects a plot/farm and confirms

Backend behavior:
- The frontend calls Cloud Function `claimModule` via `httpsCallable`.
- The function updates RTDB atomically:
  - sets `modules/{moduleId}/assignedTo = userId`
  - sets `modules/{moduleId}/farmId = plotId`
  - adds `users/{uid}/farms/{plotId}/modules/{moduleId}`

Implementation:
- Cloud Function: `functions/index.js` (`exports.claimModule`)
- Client service: `src/services/dashboardConfig.js`
- UI: `src/Components/Dialogs/AddModuleDialog.jsx`

### 5.3 Releasing (unassigning) a module

User flow:
- User chooses to remove/unassign a module

Backend behavior:
- Calls Cloud Function `releaseModule` (callable)
- Removes user farm references and sets module back to unassigned

Implementation:
- Cloud Function: `functions/index.js` (`exports.releaseModule`)
- Client service: `src/services/dashboardConfig.js`

### 5.4 Removing (deleting) a module

User flow:
- Owner (or admin with `force`) removes a module

Backend behavior:
- Calls Cloud Function `removeModule` (callable)
- Deletes `modules/{moduleId}` and removes user references

Implementation:
- Cloud Function: `functions/index.js` (`exports.removeModule`)
- Client service: `src/services/dashboardConfig.js`

---

## 6) User Dashboard

The main logged-in UI is the Dashboard page.

Implementation:
- `src/Components/Pages/Dashboard.jsx`

### 6.1 Tabs / sections

The sidebar controls the active tab. Key tabs include:
- Dashboard (plots)
- Sensors (LiveSensors)
- Charts (Analytics)
- Actuators
- Alerts
- Settings

The dashboard renders these components:
- `src/Components/PlotManager.jsx`
- `src/Components/LiveSensors.jsx`
- `src/Components/Analytics.jsx`
- `src/Components/Actuators.jsx`
- `src/Components/Alerts.jsx`
- `src/Components/Settings.jsx`

### 6.2 Dashboard config and plots

Dashboard configuration is stored in RTDB:
- `users/{uid}/dashboardConfig`
  - `plots/{plotId}`
  - `preferences/*`

Loading behavior:
- The dashboard subscribes to config updates via `dashboardConfig.subscribeToConfig(uid, cb)`.
- A cached copy of plots may be restored from `localStorage` (`dashboardPlots_{uid}`) to make refresh faster.

Implementation:
- `src/services/dashboardConfig.js`
- `src/Components/Pages/Dashboard.jsx`

### 6.3 Live sensor display

LiveSensors reads the user’s RTDB farms/modules and displays the latest readings.

Typical RTDB path used by the UI:
- `users/{uid}/farms/{farmId}/modules/{moduleId}/latestReading`

### 6.4 Analytics

Analytics reads module history and visualizes trends.

Typical RTDB paths:
- `.../history/*`
- `.../sensorReadings/*`

(Exact query shapes vary by component. The UI is designed to visualize stored points; backend sampling controls how often points are stored.)

### 6.5 Actuators

The Actuators page reads actuator status and can write actuator updates to RTDB (user-owned paths).

Typical RTDB path:
- `users/{uid}/farms/{farmId}/modules/{moduleId}/actuators/*`

---

## 7) Sampling Interval (Backend Storage Cadence)

GreenSync supports a user-configurable sampling interval stored in RTDB:
- `users/{uid}/dashboardConfig/preferences/samplingIntervalMs`

On the backend, `ingestReading` stores only one reading per interval bucket.

Implementation:
- Cloud Function: `functions/index.js` (`exports.ingestReading`)
- Settings UI: `src/Components/Settings.jsx`

---

## 8) Security Notes (High level)

- The app relies on Firebase Auth to protect user-specific RTDB paths.
- Module assignment is enforced via Cloud Functions (`claimModule`, `releaseModule`, `removeModule`) to prevent unsafe direct client writes.
- If devices send readings, prefer routing them through `ingestReading` and lock down direct device writes to user data paths via RTDB rules.

---

## 9) Quick Navigation (Key implementation files)

Authentication & gating:
- `src/Components/Pages/SignIn.jsx`
- `src/Components/Pages/SignUp.jsx`
- `src/Components/Pages/PrivateRoute.jsx`
- `src/Components/Pages/SetupGuard.jsx`
- `src/contexts/SetupContext.jsx`

Module assignment:
- `src/Components/Dialogs/AddModuleDialog.jsx`
- `src/services/dashboardConfig.js`
- `functions/index.js`

Dashboard:
- `src/Components/Pages/Dashboard.jsx`
- `src/Components/PlotManager.jsx`
- `src/Components/Dashboardz.jsx`
- `src/Components/LiveSensors.jsx`
- `src/Components/Analytics.jsx`
- `src/Components/Actuators.jsx`
- `src/Components/Settings.jsx`
