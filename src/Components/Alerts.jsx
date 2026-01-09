import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Bell,
  BellRing,
  Info
} from 'lucide-react';

const ALERTS_API_URL = '/api/alerts';
const SENSOR_DATA_API_URL = 'https://8j84zathh0.execute-api.ap-south-1.amazonaws.com/sensor-data';

const DEFAULT_THRESHOLDS = {
  temperature: { min: 15, max: 35 },
  moisture: { min: 30, max: 70 },
  pH: { min: 5.5, max: 7.5 },
  nitrogen: { min: 100, max: 200 },
  phosphorus: { min: 20, max: 40 },
  potassium: { min: 80, max: 150 }
};

// --- Utility Functions ---
const parseTimestamp = ts => {
  if (!ts) return null;
  const n = Number(ts);
  if (isFinite(n)) return n < 1e11 ? new Date(n * 1000) : new Date(n);
  const d = new Date(ts);
  return isNaN(d) ? null : d;
};

const formatTimeAgo = timestamp => {
  const t = parseTimestamp(timestamp);
  if (!t) return 'Unknown time';
  const diffMs = new Date() - t;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
};

const getAlertIcon = type => {
  switch (type) {
    case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
    case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'info': return <Info className="w-5 h-5 text-blue-500" />;
    case 'unacknowledged': return <BellRing className="w-5 h-5 text-gray-500" />;
    default: return <Bell className="w-5 h-5 text-gray-500" />;
  }
};

const getAlertColor = type => {
  switch (type) {
    case 'critical': return 'bg-red-50 border-red-200 text-red-800';
    case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
    default: return 'bg-gray-50 border-gray-200 text-gray-800';
  }
};

const getBadgeColor = type => {
  switch (type) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// --- Generate Alerts from Sensor Data ---
const generateAlertsFromSensorData = (sensorData, thresholds = DEFAULT_THRESHOLDS) => {
  const alerts = [];
  let idCounter = 1;
  Object.entries(sensorData || {}).forEach(([moduleId, readings]) => {
    const bySensor = {};
    readings.forEach(r => {
      const sid = r.sensor_id || 'unknown_sensor';
      bySensor[sid] = bySensor[sid] || [];
      bySensor[sid].push(r);
    });

    Object.entries(bySensor).forEach(([sensorId, sensorReadings]) => {
      const latest = sensorReadings.reduce((acc, cur) => {
        const at = Number(cur.timestamp) || 0;
        const bt = Number(acc?.timestamp) || 0;
        return at >= bt ? cur : acc;
      }, sensorReadings[0] || null);
      if (!latest) return;

      const fields = [
        { key: 'temperature', apiKey: 'temperature' },
        { key: 'moisture', apiKey: 'moisture' },
        { key: 'pH', apiKey: 'pH' },
        { key: 'nitrogen', apiKey: 'nitrogen' },
        { key: 'phosphorus', apiKey: 'phosphorus' },
        { key: 'potassium', apiKey: 'potassium' }
      ];

      fields.forEach(({ key, apiKey }) => {
        const val = Number(latest[apiKey]);
        if (!isFinite(val)) return;

        const thr = thresholds[key];
        if (!thr) return;

        if (val < thr.min || val > thr.max) {
          const range = Math.max(Math.abs(thr.max - thr.min), 1);
          const distance = val < thr.min ? thr.min - val : val - thr.max;
          const severity = distance / range > 0.2 ? 'critical' : 'warning';
          const message = `${key} reading ${val} is outside expected range (${thr.min} - ${thr.max})`;

          alerts.push({
            id: `gen-${moduleId}-${sensorId}-${key}-${idCounter++}`,
            moduleName: moduleId,
            sensor: sensorId,
            type: severity,
            message,
            timestamp: latest.timestamp || latest.local_date + ' ' + latest.local_time,
            acknowledged: false
          });
        }
      });
    });
  });
  return alerts;
};

// --- Alerts Component ---
const Alerts = ({ alertsApiUrl = ALERTS_API_URL, sensorApiUrl = SENSOR_DATA_API_URL, pollInterval = 60000 }) => {
  const [alerts, setAlerts] = useState([]);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [sensorFilter, setSensorFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [lastFetchFrom] = useState({ usedAlertsEndpoint: false });

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      if (alertsApiUrl) {
        try {
          const res = await fetch(alertsApiUrl);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              setAlerts(data.map(normalizeAlertFromApi));
              lastFetchFrom.usedAlertsEndpoint = true;
              setLoading(false);
              return;
            }
          }
        } catch {}
      }

      const sres = await fetch(sensorApiUrl);
      if (!sres.ok) throw new Error(`Sensor API Error: ${sres.status}`);
      const sensorData = await sres.json();
      setAlerts(generateAlertsFromSensorData(sensorData));
      lastFetchFrom.usedAlertsEndpoint = false;
    } catch (err) {
      console.error('Failed to fetch alerts or generate from sensor data', err);
    } finally {
      setLoading(false);
    }
  }, [alertsApiUrl, sensorApiUrl]);

  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, pollInterval);
    return () => clearInterval(id);
  }, [fetchAlerts, pollInterval]);

  const normalizeAlertFromApi = raw => ({
    id: raw.id ?? raw.alertId ?? `${raw.module}_${raw.sensor}_${Math.random().toString(36).slice(2, 9)}`,
    moduleName: raw.moduleName ?? raw.module ?? 'Unknown',
    sensor: raw.sensor ?? raw.sensor_id ?? 'unknown_sensor',
    type: (raw.type ?? raw.severity ?? 'info').toLowerCase(),
    message: raw.message ?? raw.text ?? 'No message',
    timestamp: raw.timestamp ?? new Date().toISOString(),
    acknowledged: !!raw.acknowledged
  });

  const acknowledgeAlert = alertId => setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  const dismissAlert = alertId => setAlerts(prev => prev.filter(a => a.id !== alertId));

  // --- Counts for summary cards ---
  const alertCounts = {
    critical: alerts.filter(a => a.type === 'critical').length,
    warning: alerts.filter(a => a.type === 'warning').length,
    info: alerts.filter(a => a.type === 'info').length,
    unacknowledged: alerts.filter(a => !a.acknowledged).length
  };

  // --- Get unique modules and sensors ---
  const modules = ['all', ...Array.from(new Set(alerts.map(a => a.moduleName)))];
  const sensors = ['all', ...Array.from(new Set(alerts.filter(a => moduleFilter === 'all' ? true : a.moduleName === moduleFilter).map(a => a.sensor)))];

  // --- Filtered alerts ---
  const filteredAlerts = alerts.filter(a => 
    (moduleFilter === 'all' || a.moduleName === moduleFilter) &&
    (sensorFilter === 'all' || a.sensor === sensorFilter)
  );

  // --- Group by module and sensor ---
  const grouped = {};
  filteredAlerts.forEach(a => {
    grouped[a.moduleName] = grouped[a.moduleName] || {};
    grouped[a.moduleName][a.sensor] = grouped[a.moduleName][a.sensor] || [];
    grouped[a.moduleName][a.sensor].push(a);
  });

  return (
    <div className="p-4 mt-10 md:p-6 space-y-6">
      {/* --- Title --- */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Alerts & Notifications</h2>
          <p className="text-gray-600 mt-1">Monitor system alerts and threshold breaches</p>
        </div>
        <div className="flex items-center space-x-2 flex-wrap">
          <div className="flex items-center space-x-2 bg-red-50 px-3 py-2 rounded-lg">
            <BellRing className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">{alertCounts.unacknowledged} Unacknowledged</span>
          </div>
        </div>
      </div>

      {/* --- Summary Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Critical', value: alertCounts.critical, color: 'text-red-600', bgColor: 'bg-red-50' },
          { label: 'Warning', value: alertCounts.warning, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
          { label: 'Info', value: alertCounts.info, color: 'text-blue-600', bgColor: 'bg-blue-50' },
          { label: 'Unacknowledged', value: alertCounts.unacknowledged, color: 'text-gray-600', bgColor: 'bg-gray-50' }
        ].map((stat, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4">
              <div className={`flex items-center justify-between ${stat.bgColor} p-3 rounded-lg`}>
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-full flex items-center justify-center`}>
                  {getAlertIcon(stat.label.toLowerCase())}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* --- Module & Sensor Filters --- */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={moduleFilter} onValueChange={v => { setModuleFilter(v); setSensorFilter('all'); }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Select Module" />
          </SelectTrigger>
          <SelectContent className="bg-white text-black border border-gray-200 shadow-md text-sm sm:text-base">
            {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={sensorFilter} onValueChange={setSensorFilter} className="w-full sm:w-48">
          <SelectTrigger>
            <SelectValue placeholder="Select Sensor" />
          </SelectTrigger>
          <SelectContent className="bg-white text-black border border-gray-200 shadow-md text-sm sm:text-base">
            {sensors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* --- Alerts List --- */}
      {Object.entries(grouped).length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">No Alerts Found</h3>
            <p className="text-gray-600 text-sm md:text-base">No alerts match your filters.</p>
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([moduleName, sensorsObj]) => (
        <div key={moduleName} className="space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">{moduleName}</h2>
          {Object.entries(sensorsObj).map(([sensor, alertsArr]) => (
            <div key={sensor} className="space-y-2">
              <h3 className="text-md md:text-lg font-semibold text-gray-700">{sensor}</h3>
              {alertsArr.map(alert => (
                <Card
                  key={alert.id}
                  className={`border-l-4 ${getAlertColor(alert.type)} ${alert.acknowledged ? 'opacity-60' : ''} transition-all duration-200`}
                >
                  <CardContent className="p-3 md:p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 mb-1 flex-wrap">
                        {getAlertIcon(alert.type)}
                        <Badge className={`${getBadgeColor(alert.type)} border-0 capitalize text-xs md:text-sm`}>{alert.type}</Badge>
                        {alert.acknowledged && (
                          <Badge className="bg-green-100 text-green-800 border-0 text-xs md:text-sm flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Acknowledged
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-700 text-sm md:text-base mb-2">{alert.message}</p>
                      <div className="flex flex-wrap gap-4 text-xs md:text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {formatTimeAgo(alert.timestamp)}
                        </div>
                        <span>Sensor: {alert.sensor}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!alert.acknowledged && (
                        <Button variant="outline" size="sm" onClick={() => acknowledgeAlert(alert.id)} className="text-green-600 hover:text-green-700">
                          <CheckCircle className="w-4 h-4 mr-1" /> Acknowledge
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => dismissAlert(alert.id)} className="text-red-600 hover:text-red-700">
                        <X className="w-4 h-4 mr-1" /> Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Alerts;
