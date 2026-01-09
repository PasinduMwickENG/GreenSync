import React, { useState } from 'react';
import Sidebar from '../Sidebar';
import Dashboard from './Dashboard';
import LiveSensors from '../LiveSensors';
import Analytics from '../Analytics';
import Alerts from '../Alerts';
import CropInfo from '../CropInfo';
import Actuators from '../Actuators';
import Settings from '../Settings';
import History from '../History';

function User() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'sensors':
        return <LiveSensors />;
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
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full md:relative md:w-0 w-0 z-50">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:ml-64">
        {renderContent()}
      </main>
    </div>
  );
}

export default User;
