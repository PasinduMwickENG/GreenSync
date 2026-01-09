// Mock data for IOT agriculture dashboard

export const mockModules = [
  {
    id: 'module-1',
    name: 'Greenhouse A',
    location: 'North Field',
    status: 'active',
    crop: 'tomatoes',
    cropHealth: 'excellent',
    weather: {
      condition: 'sunny',
      temperature: 24.5,
      humidity: 65,
      description: 'Sunny and mild'
    },
    lastUpdated: '2 mins ago',
    sensorModules: [
      {
        id: 'sensor-1-1',
        name: 'Zone A - Entry',
        location: 'North Side',
        status: 'active',
        sensors: {
          temperature: { value: 24.5, unit: '°C', threshold: { min: 18, max: 30 } },
          humidity: { value: 65, unit: '%', threshold: { min: 40, max: 80 } },
          soilPH: { value: 6.8, unit: 'pH', threshold: { min: 6.0, max: 7.5 } },
          soilMoisture: { value: 45, unit: '%', threshold: { min: 30, max: 70 } },
          lightIntensity: { value: 850, unit: 'lux', threshold: { min: 500, max: 1200 } },
          nutrients: { value: 2.3, unit: 'ppm', threshold: { min: 2.0, max: 4.0 } }
        }
      },
      {
        id: 'sensor-1-2',
        name: 'Zone B - Center',
        location: 'Central Area',
        status: 'active',
        sensors: {
          temperature: { value: 25.1, unit: '°C', threshold: { min: 18, max: 30 } },
          humidity: { value: 68, unit: '%', threshold: { min: 40, max: 80 } },
          soilPH: { value: 6.9, unit: 'pH', threshold: { min: 6.0, max: 7.5 } },
          soilMoisture: { value: 48, unit: '%', threshold: { min: 30, max: 70 } },
          lightIntensity: { value: 920, unit: 'lux', threshold: { min: 500, max: 1200 } },
          nutrients: { value: 2.5, unit: 'ppm', threshold: { min: 2.0, max: 4.0 } }
        }
      },
      {
        id: 'sensor-1-3',
        name: 'Zone C - Exit',
        location: 'South Side',
        status: 'active',
        sensors: {
          temperature: { value: 23.8, unit: '°C', threshold: { min: 18, max: 30 } },
          humidity: { value: 62, unit: '%', threshold: { min: 40, max: 80 } },
          soilPH: { value: 6.7, unit: 'pH', threshold: { min: 6.0, max: 7.5 } },
          soilMoisture: { value: 42, unit: '%', threshold: { min: 30, max: 70 } },
          lightIntensity: { value: 780, unit: 'lux', threshold: { min: 500, max: 1200 } },
          nutrients: { value: 2.1, unit: 'ppm', threshold: { min: 2.0, max: 4.0 } }
        }
      }
    ],
    actuators: {
      irrigation: { status: 'off', autoMode: true },
      fertilization: { status: 'on', autoMode: true },
      
    }
  },
  {
    id: 'module-2',
    name: 'Greenhouse B',
    location: 'South Field',
    status: 'active',
    crop: 'lettuce',
    cropHealth: 'good',
    weather: {
      condition: 'cloudy',
      temperature: 22.1,
      humidity: 72,
      description: 'Cloudy and cool'
    },
    lastUpdated: '1 min ago',
    sensorModules: [
      {
        id: 'sensor-2-1',
        name: 'Zone A - Seedling',
        location: 'West Side',
        status: 'active',
        sensors: {
          temperature: { value: 22.1, unit: '°C', threshold: { min: 18, max: 30 } },
          humidity: { value: 72, unit: '%', threshold: { min: 40, max: 80 } },
          soilPH: { value: 6.2, unit: 'pH', threshold: { min: 6.0, max: 7.5 } },
          soilMoisture: { value: 38, unit: '%', threshold: { min: 30, max: 70 } },
          lightIntensity: { value: 920, unit: 'lux', threshold: { min: 500, max: 1200 } },
          nutrients: { value: 3.1, unit: 'ppm', threshold: { min: 2.0, max: 4.0 } }
        }
      },
      {
        id: 'sensor-2-2',
        name: 'Zone B - Mature',
        location: 'East Side',
        status: 'active',
        sensors: {
          temperature: { value: 21.8, unit: '°C', threshold: { min: 18, max: 30 } },
          humidity: { value: 75, unit: '%', threshold: { min: 40, max: 80 } },
          soilPH: { value: 6.3, unit: 'pH', threshold: { min: 6.0, max: 7.5 } },
          soilMoisture: { value: 41, unit: '%', threshold: { min: 30, max: 70 } },
          lightIntensity: { value: 880, unit: 'lux', threshold: { min: 500, max: 1200 } },
          nutrients: { value: 2.9, unit: 'ppm', threshold: { min: 2.0, max: 4.0 } }
        }
      }
    ],
    actuators: {
      irrigation: { status: 'on', autoMode: true },
      fertilization: { status: 'on', autoMode: true },
      
    }
  },
  {
    id: 'module-3',
    name: 'Outdoor Plot C',
    location: 'East Field',
    status: 'warning',
    crop: 'peppers',
    cropHealth: 'needs attention',
    weather: {
      condition: 'hot',
      temperature: 32.8,
      humidity: 42,
      description: 'Hot and dry'
    },
    lastUpdated: '5 mins ago',
    sensorModules: [
      {
        id: 'sensor-3-1',
        name: 'Plot A - Row 1-3',
        location: 'North Rows',
        status: 'warning',
        sensors: {
          temperature: { value: 32.8, unit: '°C', threshold: { min: 18, max: 30 } },
          humidity: { value: 42, unit: '%', threshold: { min: 40, max: 80 } },
          soilPH: { value: 7.8, unit: 'pH', threshold: { min: 6.0, max: 7.5 } },
          soilMoisture: { value: 25, unit: '%', threshold: { min: 30, max: 70 } },
          lightIntensity: { value: 1350, unit: 'lux', threshold: { min: 500, max: 1200 } },
          nutrients: { value: 1.8, unit: 'ppm', threshold: { min: 2.0, max: 4.0 } }
        }
      },
      {
        id: 'sensor-3-2',
        name: 'Plot B - Row 4-6',
        location: 'South Rows',
        status: 'active',
        sensors: {
          temperature: { value: 31.2, unit: '°C', threshold: { min: 18, max: 30 } },
          humidity: { value: 45, unit: '%', threshold: { min: 40, max: 80 } },
          soilPH: { value: 7.2, unit: 'pH', threshold: { min: 6.0, max: 7.5 } },
          soilMoisture: { value: 32, unit: '%', threshold: { min: 30, max: 70 } },
          lightIntensity: { value: 1280, unit: 'lux', threshold: { min: 500, max: 1200 } },
          nutrients: { value: 2.1, unit: 'ppm', threshold: { min: 2.0, max: 4.0 } }
        }
      }
    ],
    actuators: {
      irrigation: { status: 'off', autoMode: false },
      fertilization: { status: 'off', autoMode: false },
      
    }
  }
];

export const mockCrops = {
  tomatoes: {
    name: 'Tomatoes',
    description: 'Heat-loving crop that requires consistent watering and warm temperatures',
    optimalConditions: {
      temperature: '20-25°C',
      humidity: '60-70%',
      soilPH: '6.0-6.8',
      soilMoisture: '40-60%',
      lightIntensity: '600-1000 lux',
      nutrients: '2.5-3.5 ppm'
    },
    growthTips: [
      'Maintain consistent soil moisture',
      'Provide strong support for vines',
      'Ensure good air circulation',
      'Monitor for pest infestations'
    ],
    harvestTime: '75-85 days'
  },
  lettuce: {
    name: 'Lettuce',
    description: 'Cool-season crop that prefers moderate temperatures and consistent moisture',
    optimalConditions: {
      temperature: '15-20°C',
      humidity: '50-70%',
      soilPH: '6.0-7.0',
      soilMoisture: '35-55%',
      lightIntensity: '400-800 lux',
      nutrients: '1.5-2.5 ppm'
    },
    growthTips: [
      'Keep soil consistently moist',
      'Provide shade during hot weather',
      'Harvest outer leaves first',
      'Succession plant for continuous harvest'
    ],
    harvestTime: '45-65 days'
  },
  peppers: {
    name: 'Peppers',
    description: 'Warm-season crop that thrives in hot conditions with good drainage',
    optimalConditions: {
      temperature: '21-29°C',
      humidity: '40-60%',
      soilPH: '6.0-6.8',
      soilMoisture: '40-60%',
      lightIntensity: '800-1200 lux',
      nutrients: '2.0-3.0 ppm'
    },
    growthTips: [
      'Ensure good drainage',
      'Provide support for heavy fruit',
      'Maintain consistent watering',
      'Harvest regularly to encourage production'
    ],
    harvestTime: '60-90 days'
  }
};

export const mockHistoricalData = {
  'module-1': {
    temperature: [
      { timestamp: '2025-01-15T08:00:00Z', value: 23.2 },
      { timestamp: '2025-01-15T09:00:00Z', value: 24.1 },
      { timestamp: '2025-01-15T10:00:00Z', value: 24.8 },
      { timestamp: '2025-01-15T11:00:00Z', value: 25.2 },
      { timestamp: '2025-01-15T12:00:00Z', value: 25.8 },
      { timestamp: '2025-01-15T13:00:00Z', value: 26.1 },
      { timestamp: '2025-01-15T14:00:00Z', value: 25.9 },
      { timestamp: '2025-01-15T15:00:00Z', value: 25.3 },
      { timestamp: '2025-01-15T16:00:00Z', value: 24.9 },
      { timestamp: '2025-01-15T17:00:00Z', value: 24.5 }
    ],
    humidity: [
      { timestamp: '2025-01-15T08:00:00Z', value: 68 },
      { timestamp: '2025-01-15T09:00:00Z', value: 66 },
      { timestamp: '2025-01-15T10:00:00Z', value: 64 },
      { timestamp: '2025-01-15T11:00:00Z', value: 62 },
      { timestamp: '2025-01-15T12:00:00Z', value: 60 },
      { timestamp: '2025-01-15T13:00:00Z', value: 58 },
      { timestamp: '2025-01-15T14:00:00Z', value: 61 },
      { timestamp: '2025-01-15T15:00:00Z', value: 63 },
      { timestamp: '2025-01-15T16:00:00Z', value: 65 },
      { timestamp: '2025-01-15T17:00:00Z', value: 65 }
    ]
  }
};

export const mockAlerts = [
  {
    id: 'alert-1',
    moduleId: 'module-3',
    moduleName: 'Outdoor Plot C',
    sensorModuleId: 'sensor-3-1',
    sensorModuleName: 'Plot A - Row 1-3',
    type: 'critical',
    sensor: 'temperature',
    message: 'Temperature exceeds maximum threshold (32.8°C > 30°C)',
    timestamp: '2025-01-15T17:30:00Z',
    acknowledged: false
  },
  {
    id: 'alert-2',
    moduleId: 'module-3',
    moduleName: 'Outdoor Plot C',
    sensorModuleId: 'sensor-3-1',
    sensorModuleName: 'Plot A - Row 1-3',
    type: 'warning',
    sensor: 'soilMoisture',
    message: 'Soil moisture below minimum threshold (25% < 30%)',
    timestamp: '2025-01-15T17:15:00Z',
    acknowledged: false
  },
  {
    id: 'alert-3',
    moduleId: 'module-2',
    moduleName: 'Greenhouse B',
    sensorModuleId: 'sensor-2-1',
    sensorModuleName: 'Zone A - Seedling',
    type: 'info',
    sensor: 'irrigation',
    message: 'Irrigation system activated automatically',
    timestamp: '2025-01-15T16:45:00Z',
    acknowledged: true
  }
];

export const mockLogEntries = [
  {
    id: 'log-1',
    timestamp: '2025-01-15T17:30:00Z',
    moduleId: 'module-1',
    moduleName: 'Greenhouse A',
    sensorModuleId: 'sensor-1-1',
    sensorModuleName: 'Zone A - Entry',
    sensor: 'temperature',
    value: 24.5,
    unit: '°C',
    status: 'normal'
  },
  {
    id: 'log-2',
    timestamp: '2025-01-15T17:30:00Z',
    moduleId: 'module-1',
    moduleName: 'Greenhouse A',
    sensorModuleId: 'sensor-1-2',
    sensorModuleName: 'Zone B - Center',
    sensor: 'humidity',
    value: 68,
    unit: '%',
    status: 'normal'
  },
  {
    id: 'log-3',
    timestamp: '2025-01-15T17:30:00Z',
    moduleId: 'module-2',
    moduleName: 'Greenhouse B',
    sensorModuleId: 'sensor-2-1',
    sensorModuleName: 'Zone A - Seedling',
    sensor: 'temperature',
    value: 22.1,
    unit: '°C',
    status: 'normal'
  },
  {
    id: 'log-4',
    timestamp: '2025-01-15T17:30:00Z',
    moduleId: 'module-3',
    moduleName: 'Outdoor Plot C',
    sensorModuleId: 'sensor-3-1',
    sensorModuleName: 'Plot A - Row 1-3',
    sensor: 'temperature',
    value: 32.8,
    unit: '°C',
    status: 'critical'
  },
  {
    id: 'log-5',
    timestamp: '2025-01-15T17:15:00Z',
    moduleId: 'module-3',
    moduleName: 'Outdoor Plot C',
    sensorModuleId: 'sensor-3-1',
    sensorModuleName: 'Plot A - Row 1-3',
    sensor: 'soilMoisture',
    value: 25,
    unit: '%',
    status: 'warning'
  }
];

export const mockSettings = {
  samplingInterval: 5, // minutes
  dataRetentionPeriod: 30, // days
  alertNotifications: true,
  emailNotifications: false,
  autoIrrigation: true,
  temperatureUnit: 'celsius',
  theme: 'light'
};