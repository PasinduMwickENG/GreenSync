import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LiveSensors from './components/LiveSensors';
import Analytics from './components/Analytics';
import Alerts from './components/Alerts';
import CropInfo from './components/CropInfo';
import Actuators from './components/Actuators';
import History from './components/History';
import Settings from './components/Settings';
import { mockModules } from './data/mock';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [modules, setModules] = useState(mockModules);

  const handleModuleSelect = (module) => {
    setSelectedModule(module);
  };

  const handleNavigateToSensors = (moduleId) => {
    setSelectedModuleId(moduleId);
    setActiveTab('sensors');
  };

  const handleBackToDashboard = () => {
    setSelectedModuleId(null);
    setActiveTab('dashboard');
  };

  const handleAddGreenhouse = (newGreenhouse) => {
    setModules(prevModules => [...prevModules, newGreenhouse]);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard 
          onModuleSelect={handleModuleSelect} 
          onNavigateToSensors={handleNavigateToSensors} 
          onAddGreenhouse={handleAddGreenhouse}
        />;
      case 'sensors':
        return <LiveSensors 
          selectedModuleId={selectedModuleId} 
          onBackToDashboard={handleBackToDashboard} 
        />;
      case 'charts':
        return <Analytics />;
      case 'alerts':
        return <Alerts />;
      case 'crops':
        return <CropInfo />;
      case 'actuators':
        return <Actuators />;
      case 'history':
        return <History />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard 
          onModuleSelect={handleModuleSelect} 
          onNavigateToSensors={handleNavigateToSensors} 
          onAddGreenhouse={handleAddGreenhouse}
        />;
    }
  };

  return (
    <BrowserRouter>
      <div className="App flex h-screen bg-gray-50">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={renderContent()} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;