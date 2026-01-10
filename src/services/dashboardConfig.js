// src/services/dashboardConfig.js
import { ref, get, set, update, onValue, remove } from 'firebase/database';
import { rtdb, db } from '../firebaseConfig';
import { httpsCallable } from 'firebase/functions';

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
                samplingIntervalMs: 5 * 60 * 1000,
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

    /**
     * Get module registry entry
     * @param {string} moduleId
     * @returns {Promise<Object|null>} module data or null
     */
    async getModule(moduleId) {
        try {
            const moduleRef = ref(rtdb, `modules/${moduleId}`);
            const snap = await get(moduleRef);
            if (!snap.exists()) return null;
            return { id: moduleId, ...(snap.val() || {}) };
        } catch (error) {
            console.error('Error fetching module:', error);
            return null;
        }
    }

    /**
     * Assign a module to a plot (atomic update)
     */
    async assignModuleToPlot(userId, moduleId, plotId) {
        console.log(`DashboardConfig: assignModuleToPlot module=${moduleId} plot=${plotId} user=${userId}`);
        try {
            // Prefer server-side callable function for security and atomicity
            if (functions) {
                const claim = httpsCallable(functions, 'claimModule');
                const res = await claim({ userId, moduleId, plotId });
                return res.data;
            }

            const moduleRef = ref(rtdb, `modules/${moduleId}`);
            const snap = await get(moduleRef);
            const moduleData = snap.val();

            if (moduleData && moduleData.assignedTo && moduleData.assignedTo !== userId) {
                throw new Error('Module already assigned to another user');
            }

            const rootRef = ref(rtdb, '/');
            const updates = {};
            updates[`modules/${moduleId}/assignedTo`] = userId;
            updates[`modules/${moduleId}/status`] = 'assigned';
            updates[`modules/${moduleId}/farmId`] = plotId;
            updates[`modules/${moduleId}/lastRegisteredAt`] = Date.now();
            updates[`users/${userId}/farms/${plotId}/modules/${moduleId}`] = {
                createdAt: Date.now()
            };

            await update(rootRef, updates);
            console.log(`DashboardConfig: module ${moduleId} assigned to ${userId}/${plotId}`);
        } catch (error) {
            console.error('Error assigning module to plot:', error);
            throw error;
        }
    }

    /**
     * Unassign a module from any plot of the user (atomic update)
     */
    async unassignModule(userId, moduleId) {
        console.log(`DashboardConfig: unassignModule module=${moduleId} user=${userId}`);
        try {
            // Import locally to avoid Rollup tree-shaking issues
            const { functions } = await import('../firebaseConfig');
            
            // Try Cloud Function first
            if (functions) {
                try {
                    const release = httpsCallable(functions, 'releaseModule');
                    const res = await release({ userId, moduleId });
                    console.log(`DashboardConfig: module ${moduleId} unassigned for user ${userId} (Cloud Function)`);
                    return res.data;
                } catch (fnError) {
                    console.warn('Cloud Function failed, falling back to RTDB:', fnError.message);
                }
            }

            // Fallback: Direct RTDB update - remove from BOTH user's farms AND global module registry
            const deletes = [];

            // 1. Remove from all of user's farms
            const farmsSnap = await get(ref(rtdb, `users/${userId}/farms`));
            if (farmsSnap.exists()) {
                const farms = farmsSnap.val();
                Object.keys(farms).forEach((fid) => {
                    if (farms[fid]?.modules?.[moduleId]) {
                        console.log(`Removing module ${moduleId} from farm ${fid}`);
                        deletes.push(remove(ref(rtdb, `users/${userId}/farms/${fid}/modules/${moduleId}`)));
                    }
                });
            }

            // 2. Also delete from global modules registry if user owns it
            const moduleSnap = await get(ref(rtdb, `modules/${moduleId}`));
            if (moduleSnap.exists()) {
                const moduleData = moduleSnap.val();
                if (moduleData?.assignedTo === userId) {
                    console.log(`Also removing global module ${moduleId} entry`);
                    deletes.push(remove(ref(rtdb, `modules/${moduleId}`)));
                }
            }

            if (deletes.length === 0) {
                console.warn('Module not found anywhere');
                throw new Error('Module not found');
            }

            // Execute all deletions in parallel
            await Promise.all(deletes);
            console.log(`DashboardConfig: module ${moduleId} successfully removed from farms and global registry`);
        } catch (error) {
            console.error('Error unassigning module:', error);
            throw error;
        }
    }

    /**
     * Remove a module entirely (owner-only). Deletes module node and any references in the owner's farms.
     */
    async removeModule(userId, moduleId, { force = false } = {}) {
        console.log(`DashboardConfig: removeModule module=${moduleId} user=${userId} force=${force}`);
        try {
            if (functions) {
                const removeFn = httpsCallable(functions, 'removeModule');
                const res = await removeFn({ userId, moduleId, force });
                return res.data;
            }

            const moduleRef = ref(rtdb, `modules/${moduleId}`);
            const snap = await get(moduleRef);
            const moduleData = snap.val();

            if (moduleData && moduleData.assignedTo && moduleData.assignedTo !== userId) {
                if (!force) {
                    throw new Error('Not authorized to remove module');
                }
                // If force remove is requested, verify caller is admin
                const { getDoc, doc } = await import('firebase/firestore');
                const { db } = await import('../firebaseConfig');
                const userSnap = await getDoc(doc(db, 'users', userId));
                const userData = userSnap.exists() ? userSnap.data() : {};
                if (userData.role !== 'admin') {
                    throw new Error('Not authorized to force remove module');
                }
            }

            const rootRef = ref(rtdb, '/');
            const updates = {};

            // Remove from any of the user's farms
            const farmsSnap = await get(ref(rtdb, `users/${userId}/farms`));
            if (farmsSnap.exists()) {
                const farms = farmsSnap.val();
                Object.keys(farms).forEach((fid) => {
                    if (farms[fid] && farms[fid].modules && farms[fid].modules[moduleId]) {
                        updates[`users/${userId}/farms/${fid}/modules/${moduleId}`] = null;
                    }
                });
            }

            // Delete module registry node
            updates[`modules/${moduleId}`] = null;

            await update(rootRef, updates);
            console.log(`DashboardConfig: module ${moduleId} removed by user ${userId} (force=${force})`);
        } catch (error) {
            console.error('Error removing module:', error);
            throw error;
        }
    }
}

// Export singleton instance
export default new DashboardConfigService();
