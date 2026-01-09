import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  Download, 
  Filter, 
  Calendar,
  Search,
  RefreshCw,
  FileText,
  Clock,
  Activity
} from 'lucide-react';
import { mockLogEntries } from '../data/mock';

const History = () => {
  const [logEntries, setLogEntries] = useState(mockLogEntries);
  const [filteredEntries, setFilteredEntries] = useState(mockLogEntries);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [sensorFilter, setSensorFilter] = useState('all');

  // Apply filters
  React.useEffect(() => {
    let filtered = logEntries;

    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.moduleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.sensor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(entry => entry.status === statusFilter);
    }

    if (moduleFilter !== 'all') {
      filtered = filtered.filter(entry => entry.moduleId === moduleFilter);
    }

    if (sensorFilter !== 'all') {
      filtered = filtered.filter(entry => entry.sensor === sensorFilter);
    }

    setFilteredEntries(filtered);
  }, [searchTerm, statusFilter, moduleFilter, sensorFilter, logEntries]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'normal': return '✓';
      case 'warning': return '⚠';
      case 'critical': return '⚠';
      default: return '?';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Timestamp', 'Module', 'Sensor', 'Value', 'Unit', 'Status'],
      ...filteredEntries.map(entry => [
        formatTimestamp(entry.timestamp),
        entry.moduleName,
        entry.sensor,
        entry.value,
        entry.unit,
        entry.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensor_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateMockData = () => {
    const sensors = ['temperature', 'humidity', 'soilPH', 'soilMoisture', 'lightIntensity', 'nutrients'];
    const modules = ['module-1', 'module-2', 'module-3'];
    const moduleNames = ['Greenhouse A', 'Greenhouse B', 'Outdoor Plot C'];
    const statuses = ['normal', 'normal', 'normal', 'warning', 'critical'];
    
    const newEntries = Array.from({ length: 50 }, (_, i) => {
      const moduleIndex = Math.floor(Math.random() * modules.length);
      const sensorIndex = Math.floor(Math.random() * sensors.length);
      const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      
      return {
        id: `log-${Date.now()}-${i}`,
        timestamp: timestamp.toISOString(),
        moduleId: modules[moduleIndex],
        moduleName: moduleNames[moduleIndex],
        sensor: sensors[sensorIndex],
        value: parseFloat((Math.random() * 100).toFixed(1)),
        unit: sensors[sensorIndex] === 'temperature' ? '°C' : 
              sensors[sensorIndex] === 'humidity' ? '%' : 
              sensors[sensorIndex] === 'soilPH' ? 'pH' : 
              sensors[sensorIndex] === 'lightIntensity' ? 'lux' : 
              sensors[sensorIndex] === 'nutrients' ? 'ppm' : '%',
        status: statuses[Math.floor(Math.random() * statuses.length)]
      };
    });

    setLogEntries([...mockLogEntries, ...newEntries]);
  };

  const refreshData = () => {
    generateMockData();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setModuleFilter('all');
    setSensorFilter('all');
  };

  // Get unique values for filters
  const uniqueModules = [...new Set(logEntries.map(entry => ({ id: entry.moduleId, name: entry.moduleName })))];
  const uniqueSensors = [...new Set(logEntries.map(entry => entry.sensor))];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Historical Data</h2>
          <p className="text-gray-600 mt-1">View and analyze past sensor readings</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: logEntries.length, icon: FileText, color: 'text-blue-600' },
          { label: 'Filtered Records', value: filteredEntries.length, icon: Filter, color: 'text-green-600' },
          { label: 'Critical Events', value: logEntries.filter(e => e.status === 'critical').length, icon: Activity, color: 'text-red-600' },
          { label: 'Last 24 Hours', value: logEntries.filter(e => new Date(e.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length, icon: Clock, color: 'text-purple-600' }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search modules or sensors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Module</label>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {uniqueModules.map(module => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Sensor</label>
              <Select value={sensorFilter} onValueChange={setSensorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All sensors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sensors</SelectItem>
                  {uniqueSensors.map(sensor => (
                    <SelectItem key={sensor} value={sensor}>
                      {sensor.charAt(0).toUpperCase() + sensor.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={clearFilters} variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sensor Readings History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Sensor</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.slice(0, 50).map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">
                      {formatTimestamp(entry.timestamp)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.moduleName}
                    </TableCell>
                    <TableCell className="capitalize">
                      {entry.sensor.replace(/([A-Z])/g, ' $1').trim()}
                    </TableCell>
                    <TableCell className="font-mono">
                      {entry.value}{entry.unit}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(entry.status)} border-0`}>
                        {getStatusIcon(entry.status)} {entry.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredEntries.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No data found matching your filters</p>
            </div>
          )}
          {filteredEntries.length > 50 && (
            <div className="text-center py-4 text-sm text-gray-500">
              Showing first 50 of {filteredEntries.length} results
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default History;