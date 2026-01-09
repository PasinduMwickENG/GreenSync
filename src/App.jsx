import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';

import Navbar from './Components/Navbar';
import Home from './Components/Pages/Home';
import SignIn from './Components/Pages/SignIn';
import SignUp from './Components/Pages/SignUp';
import Dashboard from './Components/Pages/Dashboard';
import Module from './Components/Pages/Module';
import Analytics from './Components/Analytics';
import PrivateRoute from './Components/Pages/PrivateRoute';

import Setup from './Components/Pages/Setup';
import SetupGuard from './Components/Pages/SetupGuard';

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <Toaster richColors position="top-right" />
      <Navbar />

      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Home />} />

        {/* Public auth routes */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <SetupGuard>
                <Dashboard />
              </SetupGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/setup"
          element={
            <PrivateRoute>
              <SetupGuard>
                <Setup />
              </SetupGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <PrivateRoute>
              <Analytics />
            </PrivateRoute>
          }
        />
        <Route
          path="/module/:id"
          element={
            <PrivateRoute>
              <Module />
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
