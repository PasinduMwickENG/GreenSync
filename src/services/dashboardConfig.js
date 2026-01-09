// src/services/dashboardConfig.js
import { ref, get, set, update, onValue, remove } from 'firebase/database';
import { rtdb } from '../firebaseConfig';

/**
 * Dashboard Configuration Service
 * Manages user-specific dashboard configurations including plots, modules, and preferences
 */
class DashboardConfigService {
    /**
     * Load user's complete dashboard configuration
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Dashboard configuration
     */
    async loadUserConfig(userId) {
        try {
            const configRef = ref(rtdb, `users/${userId}/dashboardConfig`);
            const snapshot = await get(configRef);

            if (snapshot.exists()) {
                return snapshot.val();
            }

            // Return default configuration for new users
            return this.getDefaultConfig();
        } catch (error) {
            console.error('Error loading dashboard config:', error);
            throw error;
        }
    }

    /**
     * Get default configuration for new users
     * @returns {Object} Default configuration
     */
    getDefaultConfig() {
        return {
            plots: {},
            preferences: {
                defaultView: 'grid',
                autoRefresh: true,
                refreshInterval: 5000,
                theme: 'light'
            },
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }

    /**
     * Save a new plot configuration
     * @param {string} userId - User ID
     * @param {Object} plotConfig - Plot configuration
     * @returns {Promise<string>} Plot ID
     */
    async savePlot(userId, plotConfig) {
        try {
            const plotId = plotConfig.id || `plot-${Date.now()}`;
            const plotRef = ref(rtdb, `users/${userId}/dashboardConfig/plots/${plotId}`);

            const plotData = {
                ...plotConfig,
                id: plotId,
                createdAt: plotConfig.createdAt || Date.now(),
                updatedAt: Date.now()
            };

            await set(plotRef, plotData);
            return plotId;
        } catch (error) {
            console.error('Error saving plot:', error);
            throw error;
        }
    }

    /**
     * Delete a plot
     * @param {string} userId - User ID
     * @param {string} plotId - Plot ID to delete
     * @returns {Promise<void>}
     */
    async deletePlot(userId, plotId) {
        try {
            const plotRef = ref(rtdb, `users/${userId}/dashboardConfig/plots/${plotId}`);
            await remove(plotRef);
        } catch (error) {
            console.error('Error deleting plot:', error);
            throw error;
        }
    }

    /**
     * Update modules assigned to a plot
     * @param {string} userId - User ID
     * @param {string} plotId - Plot ID
     * @param {Array<string>} modules - Array of module IDs
     * @returns {Promise<void>}
     */
    async updatePlotModules(userId, plotId, modules) {
        try {
            const plotRef = ref(rtdb, `users/${userId}/dashboardConfig/plots/${plotId}`);
            await update(plotRef, {
                modules,
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error('Error updating plot modules:', error);
            throw error;
        }
    }

    /**
     * Update parameters displayed in a plot
     * @param {string} userId - User ID
     * @param {string} plotId - Plot ID
     * @param {Array<string>} parameters - Array of parameter names
     * @returns {Promise<void>}
     */
    async updatePlotParameters(userId, plotId, parameters) {
        try {
            const plotRef = ref(rtdb, `users/${userId}/dashboardConfig/plots/${plotId}`);
            await update(plotRef, {
                parameters,
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error('Error updating plot parameters:', error);
            throw error;
        }
    }

    /**
     * Update plot layout configuration
     * @param {string} userId - User ID
     * @param {string} plotId - Plot ID
     * @param {Object} layout - Layout configuration
     * @returns {Promise<void>}
     */
    async updatePlotLayout(userId, plotId, layout) {
        try {
            const plotRef = ref(rtdb, `users/${userId}/dashboardConfig/plots/${plotId}`);
            await update(plotRef, {
                layout,
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error('Error updating plot layout:', error);
            throw error;
        }
    }

    /**
     * Update user preferences
     * @param {string} userId - User ID
     * @param {Object} preferences - Preferences object
     * @returns {Promise<void>}
     */
    async updatePreferences(userId, preferences) {
        try {
            const prefsRef = ref(rtdb, `users/${userId}/dashboardConfig/preferences`);
            await update(prefsRef, preferences);
        } catch (error) {
            console.error('Error updating preferences:', error);
            throw error;
        }
    }

    /**
     * Subscribe to real-time configuration updates
     * @param {string} userId - User ID
     * @param {Function} callback - Callback function to receive updates
     * @returns {Function} Unsubscribe function
     */
    subscribeToConfig(userId, callback) {
        const configRef = ref(rtdb, `users/${userId}/dashboardConfig`);

        const unsubscribe = onValue(configRef, (snapshot) => {
            const config = snapshot.exists() ? snapshot.val() : this.getDefaultConfig();
            callback(config);
        }, (error) => {
            console.error('Error in config subscription:', error);
            callback(null, error);
        });

        return unsubscribe;
    }

    /**
     * Initialize dashboard configuration for new users
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
    async initializeConfig(userId) {
        try {
            const configRef = ref(rtdb, `users/${userId}/dashboardConfig`);
            const snapshot = await get(configRef);

            if (!snapshot.exists()) {
                await set(configRef, this.getDefaultConfig());
            }
        } catch (error) {
            console.error('Error initializing config:', error);
            throw error;
        }
    }

    /**
     * Get all available modules for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of modules
     */
    async getUserModules(userId) {
        try {
            const farmsRef = ref(rtdb, `users/${userId}/farms`);
            const snapshot = await get(farmsRef);

            if (!snapshot.exists()) {
                return [];
            }

            const farms = snapshot.val();
            const modules = [];

            Object.entries(farms).forEach(([farmId, farmData]) => {
                if (farmData.modules) {
                    Object.entries(farmData.modules).forEach(([moduleId, moduleData]) => {
                        modules.push({
                            id: moduleId,
                            farmId,
                            ...moduleData
                        });
                    });
                }
            });

            return modules;
        } catch (error) {
            console.error('Error getting user modules:', error);
            throw error;
        }
    }
}

// Export singleton instance
export default new DashboardConfigService();
