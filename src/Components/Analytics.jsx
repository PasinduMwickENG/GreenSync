import React, { useState, useEffect, useMemo, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { auth, rtdb } from "../firebaseConfig";
import { ref, onValue, get, query, limitToLast } from "firebase/database";
import { useAuthState } from "react-firebase-hooks/auth";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LoadingSpinner } from "./ui/loading-spinner";
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

const parseTimestampToMs = (ts, nowMs = Date.now()) => {
  if (ts == null) return null;
  const n = Number(ts);
  if (!isFinite(n)) return null;

  const MOD_32_MS = 4294967296; // 2^32 ms ~= 49.71 days

  const candidates = [];

  // Interpretations by magnitude
  if (n > 1e17) candidates.push(Math.round(n / 1e6)); // ns -> ms
  if (n > 1e14) candidates.push(Math.round(n / 1e3)); // µs -> ms

  // Ambiguous range: could be seconds OR 32-bit-overflowed ms
  candidates.push(Math.round(n)); // ms
  candidates.push(Math.round(n * 1000)); // seconds -> ms

  // ESP32 pitfall: `unsigned long timestamp = time()*1000` overflows 32-bit.
  // When we see a 32-bit-ish value, "unwrap" it to the closest time near now.
  if (n >= 0 && n <= 0xFFFFFFFF) {
    const low = Math.round(n);
    const k = Math.round((nowMs - low) / MOD_32_MS);
    candidates.push(low + k * MOD_32_MS);
    candidates.push(low + (k - 1) * MOD_32_MS);
    candidates.push(low + (k + 1) * MOD_32_MS);
  }

  // Pick the candidate closest to now (reasonableness handled upstream).
  let best = null;
  let bestDelta = Infinity;
  for (const ms of candidates) {
    if (!isFinite(ms)) continue;
    const d = Math.abs(ms - nowMs);
    if (d < bestDelta) {
      bestDelta = d;
      best = ms;
    }
  }
  return best;
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

const startOfDayMs = (ms) => {
  if (ms == null) return null;
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
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

const HISTORY_CHILDREN = [
  "history",
  "readings",
  "records",
  "logs",
  "sensorReadings",
  "sensorHistory",
  "measurements",
  "data",
];

const normalizeRecordsFromUnknownShape = (val) => {
  if (val == null) return [];

  // Array of records
  if (Array.isArray(val)) {
    return val
      .map((v, idx) => (v && typeof v === "object" ? { __key: v.__key ?? String(idx), ...v } : null))
      .filter(Boolean);
  }

  // Object map of records OR single record
  if (typeof val === "object") {
    const keys = Object.keys(val);
    if (!keys.length) return [];

    const looksLikeSingleRecord = keys.some((k) =>
      [
        "timestamp",
        "ts",
        "time",
        "sensor_id",
        "temperature",
        "humidity",
        "soilMoisture",
        "moisture",
        "ph",
        "pH",
        "nitrogen",
        "phosphorus",
        "potassium",
      ].includes(k)
    );

    const valuesAreObjects = keys.every((k) => {
      const v = val[k];
      return v && typeof v === "object" && !Array.isArray(v);
    });

    if (valuesAreObjects && !looksLikeSingleRecord) {
      return Object.entries(val)
        .map(([k, v]) => (v && typeof v === "object" ? { __key: k, ...v } : null))
        .filter(Boolean);
    }

    return [{ __key: val.__key ?? "record", ...val }];
  }

  return [];
};

/* --- Component --- */
const obtainRecordMs = (rec) => {
  if (!rec) return null;

  const nowMs = Date.now();
  const minReasonable = nowMs - 1000 * 60 * 60 * 24 * 365 * 5; // 5y ago
  const maxReasonable = nowMs + 1000 * 60 * 60 * 24 * 2; // +2 days

  const isReasonable = (ms) =>
    typeof ms === "number" && isFinite(ms) && ms >= minReasonable && ms <= maxReasonable;

  const score = (ms) => {
    if (!isFinite(ms)) return Infinity;
    // Strongly penalize unreasonable values; otherwise prefer closest to now.
    const unreasonablePenalty = isReasonable(ms) ? 0 : 1e18;
    return unreasonablePenalty + Math.abs(ms - nowMs);
  };

  const rawCandidates = [
    rec.timestamp,
    rec.ts,
    rec.time,
    rec.createdAt,
    rec.created_at,
    rec.dateTime,
    rec.datetime,
    rec.recordedAt,
    rec.__key,
  ];

  // Prefer local_date/local_time if it parses reasonably.
  if (rec.local_date && rec.local_time) {
    const s = `${rec.local_date}T${rec.local_time}`;
    const ms = Date.parse(s);
    if (isReasonable(ms)) return ms;
  }

  let bestMs = null;
  let bestScore = Infinity;
  for (const c of rawCandidates) {
    const ms = parseTimestampToMs(c, nowMs);
    if (ms == null) continue;
    const sc = score(ms);
    if (sc < bestScore) {
      bestScore = sc;
      bestMs = ms;
    }
  }

  return isReasonable(bestMs) ? bestMs : null;
};

const Analytics = () => {
  const [user] = useAuthState(auth);

  const [userPlots, setUserPlots] = useState({});
  const [moduleIndex, setModuleIndex] = useState({});

  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedSensor, setSelectedSensor] = useState("all");
  const [selectedMetric, setSelectedMetric] = useState("temperature");

  const [historyByModule, setHistoryByModule] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastReceivedMs, setLastReceivedMs] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const activeFetchRef = useRef(0);

  const [dayCursorMs, setDayCursorMs] = useState(null);

  const [savedZoom, setSavedZoom] = useState(null);

  const loadModuleHistory = async (uid, farmId, moduleId) => {
    const basePath = `users/${uid}/farms/${farmId}/modules/${moduleId}`;

    // Try common history children first (bounded)
    for (const childKey of HISTORY_CHILDREN) {
      const snap = await get(query(ref(rtdb, `${basePath}/${childKey}`), limitToLast(1000)));
      if (!snap.exists()) continue;
      const records = normalizeRecordsFromUnknownShape(snap.val());
      if (records.length) return records;
    }

    // Fallback: latest snapshot only (not true history)
    const moduleSnap = await get(ref(rtdb, basePath));
    const moduleData = moduleSnap.val() || {};
    const latest = moduleData.latestReading || moduleData.sensors || null;
    return latest && typeof latest === "object" ? [latest] : [];
  };

  // Subscribe to plots
  useEffect(() => {
    if (!user) return;
    const plotsRef = ref(rtdb, `users/${user.uid}/dashboardConfig/plots`);
    const unsub = onValue(plotsRef, (snap) => {
      setUserPlots(snap.val() || {});
    });
    return () => unsub();
  }, [user]);

  // Subscribe to farms to build moduleId -> farmId index
  useEffect(() => {
    if (!user) return;
    const farmsRef = ref(rtdb, `users/${user.uid}/farms`);
    const unsub = onValue(farmsRef, (snap) => {
      const farms = snap.val() || {};
      const idx = {};
      Object.entries(farms).forEach(([farmId, farm]) => {
        const mods = farm?.modules || {};
        Object.keys(mods).forEach((mid) => {
          idx[mid] = { farmId };
        });
      });
      setModuleIndex(idx);
    });
    return () => unsub();
  }, [user]);

  const plotsArray = useMemo(
    () => Object.entries(userPlots || {}).map(([id, plot]) => ({ ...plot, id })),
    [userPlots]
  );

  // Default plot selection
  useEffect(() => {
    if (!plotsArray.length) {
      setSelectedPlotId("");
      setSelectedModuleId("");
      return;
    }
    if (!selectedPlotId || !userPlots[selectedPlotId]) {
      setSelectedPlotId(plotsArray[0].id);
    }
  }, [plotsArray, selectedPlotId, userPlots]);

  const selectedPlot = selectedPlotId ? userPlots[selectedPlotId] : null;
  const plotModuleIds = useMemo(() => {
    const ids = Array.isArray(selectedPlot?.modules) ? selectedPlot.modules : [];
    return ids;
  }, [selectedPlot]);

  // Default module selection (first module in plot)
  useEffect(() => {
    if (!plotModuleIds.length) {
      setSelectedModuleId("");
      return;
    }
    if (!selectedModuleId || !plotModuleIds.includes(selectedModuleId)) {
      setSelectedModuleId(plotModuleIds[0]);
      setSelectedSensor("all");
      return;
    }
  }, [plotModuleIds, selectedModuleId]);

  const cycleModule = (direction) => {
    if (!plotModuleIds.length) return;
    const current = selectedModuleId && plotModuleIds.includes(selectedModuleId) ? selectedModuleId : plotModuleIds[0];
    const idx = plotModuleIds.indexOf(current);
    const nextIdx = (idx + direction + plotModuleIds.length) % plotModuleIds.length;
    setSelectedModuleId(plotModuleIds[nextIdx]);
    setSelectedSensor("all");
  };

  useEffect(() => {
    const run = async () => {
      if (!user || !selectedModuleId) return;
      const farmId = moduleIndex?.[selectedModuleId]?.farmId;
      if (!farmId) return;

      const fetchId = ++activeFetchRef.current;
      setLoading(true);

      try {
        const records = await loadModuleHistory(user.uid, farmId, selectedModuleId);
        if (activeFetchRef.current !== fetchId) return;

        records.sort((a, b) => (obtainRecordMs(a) ?? 0) - (obtainRecordMs(b) ?? 0));

        const sensors = new Set();
        let maxMs = null;
        records.forEach((r) => {
          sensors.add(r?.sensor_id || "unknown_sensor");
          const ms = obtainRecordMs(r);
          if (ms !== null && (maxMs === null || ms > maxMs)) maxMs = ms;
        });

        setHistoryByModule((prev) => ({
          ...prev,
          [selectedModuleId]: {
            records,
            sensorIds: Array.from(sensors),
            lastReceivedMs: maxMs,
          },
        }));

        setLastReceivedMs(maxMs);

        // Default to latest day with data for this module
        if (dayCursorMs == null && maxMs != null) {
          setDayCursorMs(startOfDayMs(maxMs));
        }
      } catch (e) {
        console.error("Failed to load module history from RTDB", e);
      } finally {
        if (activeFetchRef.current === fetchId) setLoading(false);
      }
    };

    run();
  }, [user, selectedModuleId, moduleIndex, refreshToken, dayCursorMs]);

  // When module changes, reset day cursor so it snaps to the module's latest day
  useEffect(() => {
    setDayCursorMs(null);
  }, [selectedModuleId]);

  const displayDayStartMs = useMemo(() => {
    if (dayCursorMs != null) return dayCursorMs;
    const m = historyByModule?.[selectedModuleId]?.lastReceivedMs;
    return m != null ? startOfDayMs(m) : null;
  }, [dayCursorMs, historyByModule, selectedModuleId]);

  const displayDayEndMs = useMemo(() => {
    if (displayDayStartMs == null) return null;
    return displayDayStartMs + 24 * 60 * 60 * 1000 - 1;
  }, [displayDayStartMs]);

  const cycleDay = (direction) => {
    const base = displayDayStartMs;
    if (base == null) return;
    setDayCursorMs(base + direction * 24 * 60 * 60 * 1000);
  };

  const zoomStorageKey = useMemo(() => {
    const uid = user?.uid || "anon";
    const dayKey = displayDayStartMs != null ? String(displayDayStartMs) : "noday";
    return `analyticsZoom:${uid}:${selectedPlotId || "noplot"}:${selectedModuleId || "nomodule"}:${selectedMetric || "nom"}:${selectedSensor || "nos"}:${dayKey}`;
  }, [user?.uid, selectedPlotId, selectedModuleId, selectedMetric, selectedSensor, displayDayStartMs]);

  // Load persisted zoom for the current context
  useEffect(() => {
    try {
      const raw = localStorage.getItem(zoomStorageKey);
      if (!raw) {
        setSavedZoom(null);
        return;
      }
      const parsed = JSON.parse(raw);
      const xMin = parsed?.xMin != null ? Number(parsed.xMin) : null;
      const xMax = parsed?.xMax != null ? Number(parsed.xMax) : null;
      const yMin = parsed?.yMin != null ? Number(parsed.yMin) : null;
      const yMax = parsed?.yMax != null ? Number(parsed.yMax) : null;

      if (!isFinite(xMin) || !isFinite(xMax) || xMin >= xMax) {
        setSavedZoom(null);
        return;
      }

      // Clamp to current display day bounds when available
      const clampedXMin = displayDayStartMs != null ? Math.max(xMin, displayDayStartMs) : xMin;
      const clampedXMax = displayDayEndMs != null ? Math.min(xMax, displayDayEndMs) : xMax;

      if (!isFinite(clampedXMin) || !isFinite(clampedXMax) || clampedXMin >= clampedXMax) {
        setSavedZoom(null);
        return;
      }

      setSavedZoom({
        xMin: clampedXMin,
        xMax: clampedXMax,
        yMin: isFinite(yMin) ? yMin : null,
        yMax: isFinite(yMax) ? yMax : null,
      });
    } catch {
      setSavedZoom(null);
    }
  }, [zoomStorageKey, displayDayStartMs, displayDayEndMs]);

  const availableSensors = useMemo(() => {
    if (!selectedModuleId) return [];
    return historyByModule?.[selectedModuleId]?.sensorIds || [];
  }, [historyByModule, selectedModuleId]);

  const trendData = useMemo(() => {
    if (!selectedModuleId) return [];
    const moduleHistory = historyByModule?.[selectedModuleId];
    if (!moduleHistory) return [];
    const apiKey = metricToApiKey[selectedMetric];
    if (!apiKey) return [];
    const points = [];
    (moduleHistory.records || []).forEach((r) => {
      const sid = r?.sensor_id || "unknown_sensor";
      if (selectedSensor !== "all" && sid !== selectedSensor) return;
      const ts = obtainRecordMs(r);
      if (!ts) return;
      if (displayDayStartMs != null && displayDayEndMs != null) {
        if (ts < displayDayStartMs || ts > displayDayEndMs) return;
      }
      const val = r[apiKey] == null || r[apiKey] === "" ? NaN : Number(r[apiKey]);
      if (!isFinite(val)) return;
      points.push({ x: ts, y: scaleNPKValue(val, selectedMetric) });
    });

    if (selectedSensor === "all") {
      const grouped = {};
      points.forEach((p) => {
        if (!grouped[p.x]) grouped[p.x] = [];
        grouped[p.x].push(p.y);
      });
      return Object.entries(grouped)
        .map(([ts, arr]) => ({ x: Number(ts), y: arr.reduce((a, b) => a + b, 0) / arr.length }))
        .sort((a, b) => a.x - b.x);
    }

    return points.sort((a, b) => a.x - b.x);
  }, [historyByModule, selectedModuleId, selectedSensor, selectedMetric, displayDayStartMs, displayDayEndMs]);

  const recordCount = useMemo(() => {
    if (!selectedModuleId) return 0;
    return historyByModule?.[selectedModuleId]?.records?.length || 0;
  }, [historyByModule, selectedModuleId]);

  const hasAnyHistoryForSelected = recordCount > 0;

  const hasTrendPoints = trendData.length > 0;

  const selectedPlotName = selectedPlot?.name || (selectedPlotId || "—");

  const chartOptions = {
    chart: {
      id: "sensor-trend",
      type: "line",
      zoom: { enabled: true },
      toolbar: { show: true },
      animations: { enabled: false },
      events: {
        zoomed: (_chartCtx, { xaxis, yaxis }) => {
          const xMin = xaxis?.min;
          const xMax = xaxis?.max;
          if (xMin == null || xMax == null || !isFinite(xMin) || !isFinite(xMax) || xMin >= xMax) return;

          const next = {
            xMin,
            xMax,
            yMin: isFinite(yaxis?.min) ? yaxis.min : null,
            yMax: isFinite(yaxis?.max) ? yaxis.max : null,
          };

          setSavedZoom(next);
          try {
            localStorage.setItem(zoomStorageKey, JSON.stringify(next));
          } catch {
            // ignore storage errors
          }
        },
        beforeResetZoom: () => {
          setSavedZoom(null);
          try {
            localStorage.removeItem(zoomStorageKey);
          } catch {
            // ignore storage errors
          }

          // Return day bounds so reset stays within the day view.
          return {
            xaxis: {
              min: displayDayStartMs ?? undefined,
              max: displayDayEndMs ?? undefined,
            },
          };
        },
      },
    },
    xaxis: {
      type: "datetime",
      min: savedZoom?.xMin ?? (displayDayStartMs ?? undefined),
      max: savedZoom?.xMax ?? (displayDayEndMs ?? undefined),
      labels: { datetimeUTC: false, rotate: -45 },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: savedZoom?.yMin ?? undefined,
      max: savedZoom?.yMax ?? undefined,
      labels: { formatter: (val) => `${val}${getMetricUnit(selectedMetric)}` },
    },
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
            onClick={() => setRefreshToken((x) => x + 1)}
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
            <Select value={selectedPlotId} onValueChange={(val) => { setSelectedPlotId(val); setSelectedSensor("all"); }}>
              <SelectTrigger className="w-full sm:w-60 bg-white border-0 shadow-md rounded-2xl px-4 py-3 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                <SelectValue placeholder="Select plot" />
              </SelectTrigger>
              <SelectContent className="bg-white border-0 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-xl">
                {plotsArray.map((plot) => (
                  <SelectItem 
                    key={plot.id}
                    value={plot.id}
                    className="px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 text-gray-900 font-medium transition-colors"
                  >
                    {plot.name || plot.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 bg-white border-0 shadow-md rounded-2xl px-3 py-2">
            <button
              onClick={() => cycleModule(-1)}
              disabled={!plotModuleIds.length}
              className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-all duration-150 active:scale-95"
              aria-label="Previous module"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <div className="min-w-0 px-1">
              <div className="text-xs text-gray-500 font-medium">Module</div>
              <div className="text-sm font-bold text-gray-900 truncate" title={selectedModuleId || ""}>
                {selectedModuleId || "—"}
              </div>
              {selectedModuleId ? (
                <div className="text-[11px] text-gray-500">
                  {moduleIndex?.[selectedModuleId]?.farmId ? `${recordCount} records` : "Not found in farms"}
                </div>
              ) : null}
            </div>
            <button
              onClick={() => cycleModule(1)}
              disabled={!plotModuleIds.length}
              className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-all duration-150 active:scale-95"
              aria-label="Next module"
            >
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
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

      {/* Day Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 bg-white p-3 rounded-3xl shadow-lg">
          <button
            onClick={() => cycleDay(-1)}
            disabled={displayDayStartMs == null}
            className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-all duration-150 active:scale-95 shadow-sm"
            aria-label="Previous day"
          >
            <span className="text-gray-600 text-lg font-bold">◀</span>
          </button>

          <div className="px-4 py-2 bg-blue-50 rounded-2xl shadow-inner">
            <span className="font-bold text-blue-600 text-sm sm:text-base">
              {displayDayStartMs
                ? new Date(displayDayStartMs).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }).toUpperCase()
                : "—"}
            </span>
          </div>

          <button
            onClick={() => cycleDay(1)}
            disabled={displayDayStartMs == null}
            className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-all duration-150 active:scale-95 shadow-sm"
            aria-label="Next day"
          >
            <span className="text-gray-600 text-lg font-bold">▶</span>
          </button>

          <button
            onClick={() => setDayCursorMs(null)}
            disabled={!historyByModule?.[selectedModuleId]?.lastReceivedMs}
            className="ml-2 px-4 py-2 text-sm font-semibold text-blue-500 hover:text-blue-600 active:text-blue-700 hover:bg-blue-50 active:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-all duration-150 active:scale-95"
          >
            Latest
          </button>
        </div>
      </div>

      {/* ApexChart */}
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="text-lg font-bold text-gray-900">
                  {selectedMetric} Trend • {selectedPlotName} • {selectedModuleId || "—"} {selectedSensor !== "all" ? `• ${selectedSensor}` : "(All sensors averaged)"}
          </h3>
          {selectedModuleId && !moduleIndex?.[selectedModuleId]?.farmId ? (
            <p className="mt-1 text-xs text-gray-500">Module not found in your farms.</p>
          ) : null}
        </div>
        <div className="px-6 pb-6">
          <div className="w-full h-60 sm:h-80 rounded-2xl overflow-hidden bg-gray-50">
            {loading ? (
              <div className="flex justify-center items-center w-full h-full">
                <LoadingSpinner size="md" text="Loading chart data..." />
              </div>
            ) : selectedModuleId && !moduleIndex?.[selectedModuleId]?.farmId ? (
              <div className="flex flex-col justify-center items-center w-full h-full text-center px-6">
                <div className="text-sm font-semibold text-gray-900">Module not found</div>
                <div className="mt-1 text-xs text-gray-500">
                  This module is not present under your Firebase farms.
                </div>
              </div>
            ) : !hasAnyHistoryForSelected ? (
              <div className="flex flex-col justify-center items-center w-full h-full text-center px-6">
                <div className="text-sm font-semibold text-gray-900">No historical data</div>
                <div className="mt-1 text-xs text-gray-500">
                  No historical readings found in Firebase for this module.
                </div>
              </div>
            ) : !hasTrendPoints ? (
              <div className="flex flex-col justify-center items-center w-full h-full text-center px-6">
                <div className="text-sm font-semibold text-gray-900">No points for this selection</div>
                <div className="mt-1 text-xs text-gray-500">
                  Try another metric or choose a specific sensor.
                </div>
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