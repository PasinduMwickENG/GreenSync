# Module setup and management (GreenSync)

This document explains how to claim, transfer, and unassign sensor modules in GreenSync, database rules required, troubleshooting, and testing.

For the full user-flow overview (Sign Up/Sign In, authentication, dashboard tabs), see: `docs/app-documentation.md`.

## Claiming a module

1. Open the Setup page in the app.
2. Click **Add Sensor Module** and enter the module key printed on your device (e.g., `GS-MOD-AX92`).
3. Use the **Check** button to view the module status (unassigned / claimed by you / claimed by another user).
4. If unassigned, select a farm/plot and confirm to claim. The UI will perform an atomic RTDB update to set `modules/<moduleId>/assignedTo` and create `users/<uid>/farms/<farmId>/modules/<moduleId>`.

## Transferring a module

- If a module is already claimed, the UI prompts for transfer confirmation. Confirming will overwrite the previous assignment and assign the module to your account.
- Transfers are protected by a check that warns the user; consider contacting the previous owner before transferring devices in a production environment.

## Unassigning / Removing a module

- Release (Unassign): If you own a module, you can release it from the **Add Module** dialog (when checking a module) or by removing it from the Setup/Dashboard. Releasing performs an atomic unassign so the module becomes available for anyone to claim.
- Remove (Delete): The owner can also **Remove** a module (Dashboard → Module Management). Removing deletes the module registry node and any references in your farms.

## Database rules (recommended)

### Firestore (users document, used for setup status)

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### RTDB (modules and users)

For development/testing you can permit authenticated writes to module nodes and restrict user data to owners:

```json
{
  "rules": {
    "modules": {
      "$moduleId": {
        ".read": true,
        ".write": "auth != null"
      }
    },
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

> Important: For production, validate writes server-side or via Cloud Functions, and add stricter conditions (for example, ensure `assignedTo` matches `auth.uid` when writing or require a transfer token).

## Troubleshooting

- "Redirected to Setup on reload": Check Firestore `users/<uid>/setupCompleted`. The app uses a cached value and a fast `getDoc()` to avoid false negatives; check browser console for `SetupContext:` logs.
- "Permission denied": Check Firestore and RTDB rules and ensure the current user's UID matches the document path.
- "Module not appearing": Confirm RTDB nodes: `modules/<moduleId>` and `users/<uid>/farms/<farmId>/modules/<moduleId>`.

## Testing and CI

- Run tests locally:
  - npm install
  - npm test

- A GitHub Actions workflow is added at `.github/workflows/test.yml` to run tests on push and PR, including linting.

## Developer notes

- Key files:
  - `src/Components/Dialogs/AddModuleDialog.jsx` — UI for adding/checking modules
  - `src/services/dashboardConfig.js` — atomic assign/unassign helpers
  - `src/Components/Pages/Setup.jsx` — setup flow and caching
  - `src/contexts/SetupContext.jsx` — startup logic and permission handling

