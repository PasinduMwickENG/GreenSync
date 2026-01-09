import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import Chart from "react-apexcharts";
import "./Loader.css";

/* --- Helpers --- */
const metricToApiKey = {
  temperature: "temperature",
  soilMoisture: "moisture",
  soilPH: "pH",
  nitrogen: "nitrogen",
  phosphorus: "phosphorus",
  potassium: "potassium",
};

const metrics = ["temperature", "soilMoisture", "soilPH", "nitrogen", "phosphorus", "potassium"];

// scale values. for exhibition purpose only. remove later
const scaleNPKValue = (value, metric) => {
  if (!isFinite(value)) return value;
  if (metric === "nitrogen") {
    return value /2;
  }
  if (metric === "phosphorus") {
    return value /20;
  }
  if (metric === "potassium") {
    return value /5;
  }
  return value;
};

const parseTimestampToMs = (ts) => {
  if (ts == null) return null;
  const n = Number(ts);
  if (!isFinite(n)) return null;
  if (n < 1e11) return Math.round(n * 1000);
  return Math.round(n);
};

const parseLocalDateTimeToMs = (local_date, local_time) => {
  if (!local_date || !local_time) return null;
  const [dd, mm, yyyy] = local_date.split("/").map(Number);
  const [hh = 0, min = 0, ss = 0] = local_time.split(":").map(Number);
  if (![dd, mm, yyyy, hh, min, ss].every(Number.isFinite)) return null;
  return new Date(yyyy, mm - 1, dd, hh, min, ss).getTime();
};

const formatTimestampLabel = (ms, includeSeconds = false) => {
  if (ms == null) return "—";
  const d = new Date(ms);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
  });
};

const formatDateTime = (ms) => {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
};

const getMetricUnit = (metric) => {
  switch (metric) {
    case "temperature": return "°C";
    case "soilMoisture": return "%";
    case "soilPH": return "pH";
    default: return "ppm";
  }
};

const getMetricColor = (metric) => {
  switch (metric) {
    case "temperature": return "#EF4444";
    case "soilMoisture": return "#10B981";
    case "soilPH": return "#8B5CF6";
    case "nitrogen": return "#F59E0B";
    case "phosphorus": return "#3B82F6";
    case "potassium": return "#EC4899";
    default: return "#6B7280";
  }
};

/* --- Component --- */
const Analytics = () => {
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedSensor, setSelectedSensor] = useState("all");
  const [selectedMetric, setSelectedMetric] = useState("temperature");
  const [loading, setLoading] = useState(false);
  const [lastReceivedMs, setLastReceivedMs] = useState(null);
  const [manualDate, setManualDate] = useState(null);

  const debounceRef = useRef(null);

  const obtainRecordMs = (record) => {
    if (!record) return null;
    const candidates = ["timestamp", "ts", "time"];
    for (const k of candidates) {
      if (k in record) {
        const ms = parseTimestampToMs(record[k]);
        if (ms !== null) return ms;
      }
    }
    if (record.local_date && record.local_time) {
      const ms = parseLocalDateTimeToMs(record.local_date, record.local_time);
      if (ms !== null) return ms;
    }
    return null;
  };

  const fetchSensorData = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://8j84zathh0.execute-api.ap-south-1.amazonaws.com/sensor-data");
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();

      let maxMs = null;
      Object.values(data).forEach((sensorsArray) => {
        sensorsArray.forEach((rec) => {
          const ms = obtainRecordMs(rec);
          if (ms !== null && (maxMs === null || ms > maxMs)) maxMs = ms;
        });
      });

      const parsedModules = Object.entries(data).map(([moduleId, sensorsArray]) => {
        const sensorModulesMap = {};
        sensorsArray.forEach((sensor) => {
          const sid = sensor.sensor_id || "unknown_sensor";
          if (!sensorModulesMap[sid]) {
            sensorModulesMap[sid] = { id: sid, name: sid, sensors: {}, apiData: [] };
          }
          const sm = sensorModulesMap[sid];
          sm.apiData.push(sensor);
          Object.entries(metricToApiKey).forEach(([metric, apiKey]) => {
            const raw = sensor[apiKey];
            const num = raw == null || raw === "" ? NaN : Number(raw);
            if (isFinite(num)) {
              // Apply scaling for NPK values
              const scaledValue = scaleNPKValue(num, metric);
              sm.sensors[metric] = { value: scaledValue };
            }
          });
        });
        Object.values(sensorModulesMap).forEach((sm) => {
          sm.apiData.sort((a, b) => (obtainRecordMs(a) ?? 0) - (obtainRecordMs(b) ?? 0));
        });
        return {
          id: moduleId,
          name: moduleId.replace(/_/g, " ").toUpperCase(),
          sensorModules: Object.values(sensorModulesMap),
        };
      });

      setModules(parsedModules);
      setLastReceivedMs(maxMs ?? Date.now());
    } catch (err) {
      console.error("fetchSensorData error:", err);
      setLastReceivedMs(Date.now());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 600000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedModule && modules.length > 0) {
      setSelectedModule(modules[0].id);
      setSelectedSensor("all");
    }
  }, [modules, selectedModule]);

  const availableSensors = useMemo(() => {
    const m = modules.find((x) => x.id === selectedModule);
    return m ? m.sensorModules.map((sm) => sm.id) : [];
  }, [modules, selectedModule]);

  const displayDate = useMemo(() => {
    if (manualDate) return manualDate;
    if (!lastReceivedMs) return new Date();
    return new Date(lastReceivedMs);
  }, [manualDate, lastReceivedMs]);

  const trendData = useMemo(() => {
    if (!selectedModule) return [];
    const moduleData = modules.find((m) => m.id === selectedModule);
    if (!moduleData) return [];
    const apiKey = metricToApiKey[selectedMetric];
    if (!apiKey) return [];

    const startMs = new Date(displayDate.getFullYear(), displayDate.getMonth(), displayDate.getDate()).getTime();
    const endMs = new Date(displayDate.getFullYear(), displayDate.getMonth(), displayDate.getDate(), 23, 59, 59, 999).getTime();

    const points = [];

    moduleData.sensorModules.forEach((sm) => {
      if (selectedSensor !== "all" && sm.id !== selectedSensor) return;
      sm.apiData.forEach((r) => {
        const ts = obtainRecordMs(r);
        if (!ts || ts < startMs || ts > endMs) return;
        const val = r[apiKey] == null || r[apiKey] === "" ? NaN : Number(r[apiKey]);
        if (isFinite(val)) {
          // Apply scaling for NPK values in trend data
          const scaledVal = scaleNPKValue(val, selectedMetric);
          points.push({ x: ts, y: scaledVal });
        }
      });
    });

    // If averaging all sensors
    if (selectedSensor === "all") {
      const grouped = {};
      points.forEach((p) => {
        if (!grouped[p.x]) grouped[p.x] = [];
        grouped[p.x].push(p.y);
      });
      return Object.entries(grouped).map(([ts, arr]) => ({ x: Number(ts), y: arr.reduce((a, b) => a + b, 0) / arr.length }));
    }

    return points.sort((a, b) => a.x - b.x);
  }, [modules, selectedModule, selectedSensor, selectedMetric, displayDate]);

  const selectedModuleData = modules.find((m) => m.id === selectedModule) || modules[0];

  const chartOptions = {
    chart: {
      id: "sensor-trend",
      type: "line",
      zoom: { enabled: true },
      toolbar: { show: true },
      animations: { enabled: false },
    },
    xaxis: {
      type: "datetime",
      labels: { datetimeUTC: false, rotate: -45 },
      tooltip: { enabled: false },
    },
    yaxis: { labels: { formatter: (val) => `${val}${getMetricUnit(selectedMetric)}` } },
    stroke: { curve: "smooth", width: 2 },
    markers: { size: 4 },
    tooltip: { x: { format: "dd MMM yyyy HH:mm" } },
    grid: { borderColor: "#f1f1f1" },
    colors: [getMetricColor(selectedMetric)],
  };

  const chartSeries = [
    {
      name: selectedMetric,
      data: trendData.map((d) => [d.x, d.y]),
    },
  ];

  return (
    <div className="p-4 mt-10 space-y-6 bg-white-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-500 text-sm font-medium">Visualize trends and patterns in your sensor data</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-gray-500">
            <div className="font-medium">Last received</div>
            <div className="font-semibold text-gray-700">{lastReceivedMs ? formatDateTime(lastReceivedMs) : "—"}</div>
          </div>
          <button 
            onClick={fetchSensorData}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold text-sm rounded-full shadow-md transition-all duration-150 active:scale-95"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Module & Sensor Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <Select value={selectedModuleData?.id || ""} onValueChange={(val) => { setSelectedModule(val); setSelectedSensor("all"); }}>
              <SelectTrigger className="w-full sm:w-48 bg-white border-0 shadow-md rounded-2xl px-4 py-3 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent className="bg-white border-0 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-xl">
                {modules.map((module) => (
                  <SelectItem 
                    key={module.id} 
                    value={module.id}
                    className="px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 text-gray-900 font-medium transition-colors"
                  >
                    {module.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Select value={selectedSensor} onValueChange={(val) => setSelectedSensor(val)}>
              <SelectTrigger className="w-full sm:w-48 bg-white border-0 shadow-md rounded-2xl px-4 py-3 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                <SelectValue placeholder="Select sensor" />
              </SelectTrigger>
              <SelectContent className="bg-white border-0 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-xl">
                <SelectItem 
                  value="all"
                  className="px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 text-gray-900 font-medium transition-colors"
                >
                  Module Average
                </SelectItem>
                {availableSensors.map((sid) => (
                  <SelectItem 
                    key={sid} 
                    value={sid}
                    className="px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 text-gray-900 font-medium transition-colors"
                  >
                    {sid}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Metric Buttons */}
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Select Metric</h3>
        <div className="flex flex-wrap gap-3">
          {metrics && metrics.length > 0 && metrics.map((metric) => {
            const isSelected = selectedMetric === metric;
            const label = metric ? metric.charAt(0).toUpperCase() + metric.slice(1) : "";
            return (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric)}
                className={`
                  px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 active:scale-95 shadow-sm
                  ${isSelected 
                    ? "bg-blue-500 text-white shadow-md" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"}
                `}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Navigation */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 bg-white p-3 rounded-3xl shadow-lg">
          <button
            onClick={() =>
              setManualDate(prev =>
                prev ? new Date(prev.getTime() - 86400000) : new Date(displayDate.getTime() - 86400000)
              )
            }
            className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full transition-all duration-150 active:scale-95 shadow-sm"
          >
            <span className="text-gray-600 text-lg font-bold">◀</span>
          </button>

          <div className="px-4 py-2 bg-blue-50 rounded-2xl shadow-inner">
            <span className="font-bold text-blue-600 text-sm sm:text-base">
              {displayDate.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }).toUpperCase()}
            </span>
          </div>

          <button
            onClick={() =>
              setManualDate(prev =>
                prev ? new Date(prev.getTime() + 86400000) : new Date(displayDate.getTime() + 86400000)
              )
            }
            className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full transition-all duration-150 active:scale-95 shadow-sm"
          >
            <span className="text-gray-600 text-lg font-bold">▶</span>
          </button>

          <button
            onClick={() => setManualDate(null)}
            className="ml-2 px-4 py-2 text-sm font-semibold text-blue-500 hover:text-blue-600 active:text-blue-700 hover:bg-blue-50 active:bg-blue-100 rounded-full transition-all duration-150 active:scale-95"
          >
            Latest
          </button>
        </div>
      </div>

      {/* ApexChart */}
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {selectedMetric} Trend - {selectedModuleData?.name} {selectedSensor !== "all" ? `• ${selectedSensor}` : "(All sensors averaged)"}
          </h3>
        </div>
        <div className="px-6 pb-6">
          <div className="w-full h-60 sm:h-80 rounded-2xl overflow-hidden bg-gray-50">
            {loading ? (
              <div className="flex justify-center items-center w-full h-full">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <Chart options={chartOptions} series={chartSeries} type="line" height="100%" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;