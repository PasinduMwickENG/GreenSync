// src/Components/PrivateRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebaseConfig";

const PrivateRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);
  const location = useLocation();

  if (loading) return <div>Loading...</div>; // Show while checking auth

  // If not authenticated, redirect to sign-in and remember where the user wanted to go
  return user ? children : <Navigate to="/signin" replace state={{ from: location }} />;
};

export default PrivateRoute;
