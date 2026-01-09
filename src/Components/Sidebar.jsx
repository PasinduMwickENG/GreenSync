import React, { useState } from 'react';
import { 
  Home, 
  BarChart3, 
  Bell, 
  Settings, 
  History, 
  Sprout,
  Activity,
  Sliders,
  Menu,
  X
} from 'lucide-react';

const Sidebar = ({ activeTab, onTabChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard', color: 'text-blue-600' },
    { id: 'sensors', icon: Activity, label: 'Live Sensors', color: 'text-green-600' },
    { id: 'charts', icon: BarChart3, label: 'Analytics', color: 'text-purple-600' },
    { id: 'actuators', icon: Sliders, label: 'Actuators', color: 'text-orange-600' },
    { id: 'alerts', icon: Bell, label: 'Alerts', color: 'text-red-600' },
    /*{ id: 'crops', icon: Sprout, label: 'Crop Info', color: 'text-emerald-600' },
    { id: 'history', icon: History, label: 'History', color: 'text-indigo-600' },*/
    { id: 'settings', icon: Settings, label: 'Settings', color: 'text-gray-600' }
  ];

  return (
    <>
      {/* Mobile hamburger */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 rounded-full bg-white shadow-lg backdrop-blur-xl focus:outline-none active:scale-95 transition-all duration-150 flex items-center justify-center"
        >
          {isOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
        </button>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      <div
        className={`
          fixed top-0 left-0 h-screen ${collapsed ? 'w-20' : 'w-64'} bg-white/95 backdrop-blur-xl shadow-2xl z-50
          transform transition-all duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:fixed md:top-20 md:h-[calc(100vh-5rem)] md:block md:bg-white
        `}
      >
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg">
              <Sprout className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">GreenSync</h1>
              <p className="text-sm text-gray-500 font-medium"></p>
            </div>
          </div>

          <nav className="space-y-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setIsOpen(false); // auto close on mobile
                  }}
                  className={`
                    w-full flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-2xl transition-all duration-200 text-left active:scale-98 font-medium
                    ${isActive
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : item.color}`} />
                  {!collapsed && <span className="font-semibold">{item.label}</span>}
                </button>
              );
            })}
          </nav>
          {/* Collapse toggle (desktop) */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:inline-flex items-center px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-700"
            >
              {collapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
