import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Sprout, 
  Thermometer, 
  Droplets, 
  Zap, 
  Sun,
  Calendar,
  BookOpen,
  TrendingUp,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { mockCrops, mockModules } from '../data/mock';

const CropInfo = () => {
  const [selectedCrop, setSelectedCrop] = useState('tomatoes');

  const getCropIcon = (cropName) => {
    switch (cropName) {
      case 'tea': return '🍅';
      case 'lettuce': return '🥬';
      case 'peppers': return '🌶️';
      default: return '🌱';
    }
  };

  const getConditionStatus = (currentValue, optimalRange) => {
    // Parse optimal range (e.g., "20-25°C" -> {min: 20, max: 25})
    const range = optimalRange.match(/(\d+\.?\d*)-(\d+\.?\d*)/);
    if (!range) return 'unknown';
    
    const min = parseFloat(range[1]);
    const max = parseFloat(range[2]);
    
    if (currentValue >= min && currentValue <= max) return 'optimal';
    if (currentValue < min * 0.8 || currentValue > max * 1.2) return 'critical';
    return 'warning';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'optimal': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'optimal': return 'bg-green-50 border-green-200 text-green-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  // Get current conditions for selected crop
  const getCropModules = (cropName) => {
    return mockModules.filter(module => module.crop === cropName);
  };

  const selectedCropData = mockCrops[selectedCrop];
  const cropModules = getCropModules(selectedCrop);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Crop Information</h2>
          <p className="text-gray-600 mt-1">Optimize growing conditions for your crops</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
            <Sprout className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              {Object.keys(mockCrops).length} Crop Types
            </span>
          </div>
        </div>
      </div>

      {/* Crop Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Crop Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(mockCrops).map(([cropKey, crop]) => (
              <Button
                key={cropKey}
                variant={selectedCrop === cropKey ? "default" : "outline"}
                className={`h-auto p-4 flex flex-col items-center space-y-2 ${
                  selectedCrop === cropKey ? 'bg-green-500 hover:bg-green-600' : ''
                }`}
                onClick={() => setSelectedCrop(cropKey)}
              >
                <div className="text-3xl">{getCropIcon(cropKey)}</div>
                <span className="font-medium">{crop.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {getCropModules(cropKey).length} modules
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Crop Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span className="text-2xl">{getCropIcon(selectedCrop)}</span>
              <span>{selectedCropData.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-blue-500" />
                <span>Description</span>
              </h3>
              <p className="text-gray-600">{selectedCropData.description}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-green-500" />
                <span>Harvest Time</span>
              </h3>
              <p className="text-gray-600">{selectedCropData.harvestTime}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <span>Growth Tips</span>
              </h3>
              <ul className="space-y-1">
                {selectedCropData.growthTips.map((tip, index) => (
                  <li key={index} className="text-gray-600 text-sm flex items-start space-x-2">
                    <span className="text-green-500 mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optimal Growing Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(selectedCropData.optimalConditions).map(([condition, range]) => {
                const getConditionIcon = (condition) => {
                  switch (condition) {
                    case 'temperature': return <Thermometer className="w-5 h-5 text-red-500" />;
                    case 'humidity': return <Droplets className="w-5 h-5 text-blue-500" />;
                    case 'soilPH': return <Zap className="w-5 h-5 text-purple-500" />;
                    case 'soilMoisture': return <Droplets className="w-5 h-5 text-green-500" />;
                    case 'lightIntensity': return <Sun className="w-5 h-5 text-yellow-500" />;
                    default: return <CheckCircle className="w-5 h-5 text-gray-500" />;
                  }
                };

                return (
                  <div key={condition} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getConditionIcon(condition)}
                      <span className="font-medium text-gray-800 capitalize">
                        {condition.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {range}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>Current Conditions for {selectedCropData.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {cropModules.length === 0 ? (
            <div className="text-center py-8">
              <Sprout className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No modules currently growing {selectedCropData.name}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cropModules.map(module => {
                // Calculate average sensor values from all sensor modules
                let avgSensors = {
                  temperature: 0,
                  humidity: 0,
                  soilPH: 0,
                  soilMoisture: 0,
                  lightIntensity: 0,
                  nutrients: 0
                };

                if (module.sensorModules && module.sensorModules.length > 0) {
                  const totals = module.sensorModules.reduce((acc, sensorModule) => {
                    acc.temperature += sensorModule.sensors.temperature?.value || 0;
                    acc.humidity += sensorModule.sensors.humidity?.value || 0;
                    acc.soilPH += sensorModule.sensors.soilPH?.value || 0;
                    acc.soilMoisture += sensorModule.sensors.soilMoisture?.value || 0;
                    acc.lightIntensity += sensorModule.sensors.lightIntensity?.value || 0;
                    acc.nutrients += sensorModule.sensors.nutrients?.value || 0;
                    return acc;
                  }, { temperature: 0, humidity: 0, soilPH: 0, soilMoisture: 0, lightIntensity: 0, nutrients: 0 });

                  const count = module.sensorModules.length;
                  avgSensors = {
                    temperature: parseFloat((totals.temperature / count).toFixed(1)),
                    humidity: parseFloat((totals.humidity / count).toFixed(1)),
                    soilPH: parseFloat((totals.soilPH / count).toFixed(1)),
                    soilMoisture: parseFloat((totals.soilMoisture / count).toFixed(1)),
                    lightIntensity: parseFloat((totals.lightIntensity / count).toFixed(0)),
                    nutrients: parseFloat((totals.nutrients / count).toFixed(1))
                  };
                }

                return (
                  <div key={module.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">{module.name}</h3>
                      <div className="flex items-center space-x-2">
                        <Badge className={`${module.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} border-0`}>
                          {module.status}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {module.sensorModules?.length || 0} sensors
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(selectedCropData.optimalConditions).map(([sensorType, optimalRange]) => {
                        const currentValue = avgSensors[sensorType];
                        if (currentValue === undefined || currentValue === 0) return null;
                        
                        const status = getConditionStatus(currentValue, optimalRange);
                        const unit = sensorType === 'temperature' ? '°C' :
                                    sensorType === 'humidity' ? '%' :
                                    sensorType === 'soilPH' ? 'pH' :
                                    sensorType === 'soilMoisture' ? '%' :
                                    sensorType === 'lightIntensity' ? 'lux' :
                                    sensorType === 'nutrients' ? 'ppm' : '';
                        
                        return (
                          <div key={sensorType} className={`p-3 rounded-lg border ${getStatusColor(status)}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium capitalize">
                                {sensorType.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              {getStatusIcon(status)}
                            </div>
                            <div className="text-lg font-bold">
                              {currentValue}{unit}
                            </div>
                            <div className="text-xs text-gray-600">
                              Optimal: {optimalRange}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CropInfo;