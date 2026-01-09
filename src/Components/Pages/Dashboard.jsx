import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebaseConfig';
import { Plus, LayoutGrid, Cpu, Settings as SettingsIcon } from 'lucide-react';
import Sidebar from '../Sidebar';
import LiveSensors from '../LiveSensors';
import Analytics from '../Analytics';
import Actuators from '../Actuators';
import Alerts from '../Alerts';
import Settings from '../Settings';
import Dashboardz from '../Dashboardz';
import PlotManager from '../PlotManager';
import AddModuleDialog from '../Dialogs/AddModuleDialog';
import AddPlotDialog from '../Dialogs/AddPlotDialog';
import dashboardConfig from '../../services/dashboardConfig';

function Dashboard() {
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedModuleId, setSelectedModuleId] = useState(null);

  // Dashboard configuration state
  const [dashboardPlots, setDashboardPlots] = useState({});
  const [availableModules, setAvailableModules] = useState([]);
  const [availableFarms, setAvailableFarms] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);

  // Dialog states
  const [showAddModuleDialog, setShowAddModuleDialog] = useState(false);
  const [showAddPlotDialog, setShowAddPlotDialog] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/signin');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (activeTab !== 'sensors') setSelectedModuleId(null);
  }, [activeTab]);

  // Load dashboard configuration
  useEffect(() => {
    if (!user) return;

    setConfigLoading(true);

    // Subscribe to dashboard configuration
    const unsubscribe = dashboardConfig.subscribeToConfig(user.uid, (config, error) => {
      if (error) {
        console.error('Error loading dashboard config:', error);
        setConfigLoading(false);
        return;
      }

      if (config) {
        setDashboardPlots(config.plots || {});
      }
      setConfigLoading(false);
    });

    // Load available modules
    dashboardConfig.getUserModules(user.uid).then(modules => {
      setAvailableModules(modules);

      // Extract unique farms
      const farms = {};
      modules.forEach(module => {
        if (!farms[module.farmId]) {
          farms[module.farmId] = {
            id: module.farmId,
            name: module.location || 'Unknown',
            crop: module.crop || 'Unknown'
          };
        }
      });
      setAvailableFarms(Object.values(farms));
    });

    return () => unsubscribe();
  }, [user]);

  const handleNavigateToSensors = (moduleId) => {
    setSelectedModuleId(moduleId);
    setActiveTab('sensors');
  };

  const handleModuleAdded = (module) => {
    // Refresh available modules
    dashboardConfig.getUserModules(user.uid).then(modules => {
      setAvailableModules(modules);
    });
  };

  const handlePlotAdded = (plot) => {
    // Plot will be automatically updated via subscription
    console.log('Plot added:', plot);
  };

  const handlePlotDeleted = (plotId) => {
    // Plot will be automatically updated via subscription
    console.log('Plot deleted:', plotId);
  };

  if (loading || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-semibold">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen py-10 bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="md:ml-64 p-4 pt-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Clean Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl py-10 px-10 font-bold text-gray-900">Dashboard</h2>
                <p className="text-gray-500 px-10 mt-1">Monitor and manage your agricultural modules</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddModuleDialog(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                  <Cpu className="w-4 h-4" />
                  Add Module
                </button>
                <button
                  onClick={() => setShowAddPlotDialog(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-lg shadow-green-200 transition-all active:scale-95"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Create Plot
                </button>
              </div>
            </div>

            {/* Module Grid - Uses Dashboardz without its header */}
            <Dashboardz
              hideHeader={true}
              onModuleSelect={(m) => setSelectedModuleId(m.id)}
              onNavigateToSensors={handleNavigateToSensors}
              onAddGreenhouse={() => setShowAddModuleDialog(true)}
            />

            {/* Custom Plots Section - Only show if plots exist */}
            {Object.keys(dashboardPlots).length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Custom Comparison Plots</h3>
                  <span className="text-sm text-gray-500">{Object.keys(dashboardPlots).length} plot{Object.keys(dashboardPlots).length !== 1 ? 's' : ''}</span>
                </div>
                <PlotManager
                  userId={user.uid}
                  plots={dashboardPlots}
                  onPlotDeleted={handlePlotDeleted}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'sensors' && (
          <LiveSensors
            selectedModuleId={selectedModuleId}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'charts' && <Analytics />}
        {activeTab === 'actuators' && <Actuators />}
        {activeTab === 'alerts' && <Alerts />}
        {activeTab === 'settings' && <Settings />}
      </main>

      {/* Dialogs */}
      <AddModuleDialog
        isOpen={showAddModuleDialog}
        onClose={() => setShowAddModuleDialog(false)}
        userId={user.uid}
        farms={availableFarms}
        onModuleAdded={handleModuleAdded}
      />

      <AddPlotDialog
        isOpen={showAddPlotDialog}
        onClose={() => setShowAddPlotDialog(false)}
        userId={user.uid}
        availableModules={availableModules}
        onPlotAdded={handlePlotAdded}
      />
    </div>
  );
}

export default Dashboard;

