import { Navigate, useLocation } from "react-router-dom";
import { useSetup } from "../../contexts/SetupContext";

const SetupGuard = ({ children }) => {
    const { setupCompleted, isChecking, permissionDenied } = useSetup();
    const location = useLocation();

    if (isChecking) {
        return <div style={{ padding: 30 }}>Loading...</div>;
    }

    if (permissionDenied) {
        return <div>Permission denied. Check Firestore rules.</div>;
    }

    const isSetupPage = location.pathname.startsWith("/setup");

    if (setupCompleted === false && !isSetupPage) {
        return <Navigate to="/setup" replace />;
    }

    if (setupCompleted === true && isSetupPage) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default SetupGuard;
