import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Separator } from './ui/separator';
import { 
  Settings as SettingsIcon, 
  Save, 
  RotateCcw,
  Clock,
  Bell,
  Thermometer,
  Palette,
  Database,
  Wifi,
  Shield,
  CheckCircle
} from 'lucide-react';
import { mockSettings } from '../data/mock';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebaseConfig';
import dashboardConfig from '../services/dashboardConfig';
import { useSamplingIntervalMs } from '../hooks/useUserPreferences';

const Settings = () => {
  const [user] = useAuthState(auth);
  const samplingIntervalMs = useSamplingIntervalMs(user?.uid);

  const [settings, setSettings] = useState(mockSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load sampling interval from RTDB preferences into UI (minutes)
  useEffect(() => {
    const minutes = Math.max(1, Math.min(60, Math.round(Number(samplingIntervalMs) / 60000) || mockSettings.samplingInterval));
    setSettings((prev) => ({
      ...prev,
      samplingInterval: minutes,
    }));
    // This is a load/refresh from DB; don't mark as user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samplingIntervalMs]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    // Keep local storage for the mock-only settings,
    // but persist sampling interval to Firebase RTDB so all components can use it.
    localStorage.setItem('agriDashSettings', JSON.stringify(settings));

    if (!user) {
      alert('Please sign in to save sampling interval to the database.');
      return;
    }

    const samplingIntervalMinutes = Number(settings.samplingInterval);
    const samplingMs = Math.max(1, Math.round(samplingIntervalMinutes)) * 60 * 1000;

    try {
      setSaving(true);
      await dashboardConfig.updatePreferences(user.uid, {
        samplingIntervalMs: samplingMs,
        updatedAt: Date.now(),
      });
      setHasChanges(false);
      alert('Settings saved successfully!');
    } catch (e) {
      console.error('Failed to save sampling interval to RTDB', e);
      alert('Failed to save sampling interval. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    setSettings(mockSettings);
    setHasChanges(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Settings</h2>
          <p className="text-gray-600 mt-1">Configure your dashboard preferences and system settings</p>
        </div>
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <div className="flex items-center space-x-2 bg-orange-50 px-3 py-2 rounded-lg">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Unsaved Changes</span>
            </div>
          )}
          <Button onClick={resetSettings} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={saveSettings} size="sm" disabled={!hasChanges || saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Data Collection Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-500" />
            <span>Data Collection</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="sampling-interval" className="text-sm font-medium text-gray-700">
              Sampling Interval (minutes)
            </Label>
            <div className="mt-2 space-y-2">
              <Slider
                id="sampling-interval"
                min={1}
                max={60}
                step={1}
                value={[settings.samplingInterval]}
                onValueChange={(value) => handleSettingChange('samplingInterval', value[0])}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>1 min</span>
                <span className="font-medium text-gray-700">{settings.samplingInterval} minutes</span>
                <span>60 min</span>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="retention-period" className="text-sm font-medium text-gray-700">
              Data Retention Period (days)
            </Label>
            <div className="mt-2 space-y-2">
              <Slider
                id="retention-period"
                min={7}
                max={365}
                step={1}
                value={[settings.dataRetentionPeriod]}
                onValueChange={(value) => handleSettingChange('dataRetentionPeriod', value[0])}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>7 days</span>
                <span className="font-medium text-gray-700">{settings.dataRetentionPeriod} days</span>
                <span>365 days</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-yellow-500" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="alert-notifications" className="text-sm font-medium text-gray-700">
                Alert Notifications
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                Show notifications when sensor thresholds are exceeded
              </p>
            </div>
            <Switch
              id="alert-notifications"
              checked={settings.alertNotifications}
              onCheckedChange={(checked) => handleSettingChange('alertNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications" className="text-sm font-medium text-gray-700">
                Email Notifications
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                Send critical alerts via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
            />
          </div>

          {settings.emailNotifications && (
            <div>
              <Label htmlFor="email-address" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <Input
                id="email-address"
                type="email"
                placeholder="Enter your email address"
                className="mt-2"
                defaultValue="admin@example.com"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wifi className="w-5 h-5 text-green-500" />
            <span>Automation</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-irrigation" className="text-sm font-medium text-gray-700">
                Auto Irrigation
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                Automatically trigger irrigation based on soil moisture thresholds
              </p>
            </div>
            <Switch
              id="auto-irrigation"
              checked={settings.autoIrrigation}
              onCheckedChange={(checked) => handleSettingChange('autoIrrigation', checked)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="auto-irrigation-threshold" className="text-sm font-medium text-gray-700">
                Irrigation Threshold (%)
              </Label>
              <Input
                id="auto-irrigation-threshold"
                type="number"
                min="0"
                max="100"
                defaultValue="30"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="irrigation-duration" className="text-sm font-medium text-gray-700">
                Irrigation Duration (minutes)
              </Label>
              <Input
                id="irrigation-duration"
                type="number"
                min="1"
                max="60"
                defaultValue="15"
                className="mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="w-5 h-5 text-purple-500" />
            <span>Display</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="temperature-unit" className="text-sm font-medium text-gray-700">
              Temperature Unit
            </Label>
            <Select 
              value={settings.temperatureUnit} 
              onValueChange={(value) => handleSettingChange('temperatureUnit', value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="celsius">Celsius (°C)</SelectItem>
                <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="theme" className="text-sm font-medium text-gray-700">
              Theme
            </Label>
            <Select 
              value={settings.theme} 
              onValueChange={(value) => handleSettingChange('theme', value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="refresh-rate" className="text-sm font-medium text-gray-700">
              Dashboard Refresh Rate
            </Label>
            <Select defaultValue="auto">
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="5">5 seconds</SelectItem>
                <SelectItem value="10">10 seconds</SelectItem>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            <span>System Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Version:</span>
                <span className="text-sm text-gray-800">v2.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Last Updated:</span>
                <span className="text-sm text-gray-800">Jan 15, 2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Database:</span>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-800">Connected</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Active Modules:</span>
                <span className="text-sm text-gray-800">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Total Sensors:</span>
                <span className="text-sm text-gray-800">18</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Uptime:</span>
                <span className="text-sm text-gray-800">2d 14h 32m</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button onClick={resetSettings} variant="outline">
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button onClick={saveSettings} disabled={!hasChanges || saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving…' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  );
};

export default Settings;