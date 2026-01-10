// src/services/validation.js
import { ref, get } from 'firebase/database';
import { rtdb } from '../firebaseConfig';

/**
 * Validation Service
 * Centralized validation for all module and plot operations
 */
class ValidationService {
    /**
     * Validate module ID format
     * @param {string} moduleId - Module ID to validate
     * @throws {Error} If format is invalid
     */
    validateModuleId(moduleId) {
        if (!moduleId || typeof moduleId !== 'string') {
            throw new Error('Module ID is required');
        }

        // Expected format: GS-ESP32-#### (e.g., GS-ESP32-0001)
        const moduleIdPattern = /^GS-ESP32-\d{4}$/;

        if (!moduleIdPattern.test(moduleId)) {
            throw new Error('Invalid module ID format. Expected: GS-ESP32-#### (e.g., GS-ESP32-0001)');
        }

        return true;
    }

    /**
     * Validate module claim operation
     * @param {string} moduleId - Module ID to claim
     * @param {string} userId - User ID attempting to claim
     * @throws {Error} If module cannot be claimed
     */
    async validateModuleClaim(moduleId, userId) {
        // Validate format first
        this.validateModuleId(moduleId);

        if (!userId) {
            throw new Error('User ID is required');
        }

        // Check global module registry
        const globalModuleRef = ref(rtdb, `modules/${moduleId}`);
        const snapshot = await get(globalModuleRef);

        if (snapshot.exists()) {
            const moduleData = snapshot.val();

            // Check if already assigned to another user
            if (moduleData.assignedTo && moduleData.assignedTo !== userId) {
                throw new Error('This module is already claimed by another user');
            }

            // Check if module is in a valid state
            if (moduleData.status === 'decommissioned') {
                throw new Error('This module has been decommissioned and cannot be claimed');
            }
        }

        return true;
    }

    /**
     * Validate plot assignment operation
     * @param {string} userId - User ID
     * @param {string} moduleId - Module ID to assign
     * @param {string} plotId - Plot ID to assign to
     * @throws {Error} If assignment is invalid
     */
    async validatePlotAssignment(userId, moduleId, plotId) {
        if (!userId || !moduleId || !plotId) {
            throw new Error('User ID, Module ID, and Plot ID are required');
        }

        // Check if module exists and belongs to user
        const moduleRef = ref(rtdb, `users/${userId}/modules/${moduleId}`);
        const moduleSnapshot = await get(moduleRef);

        if (!moduleSnapshot.exists()) {
            throw new Error('Module not found. Please claim this module first.');
        }

        const moduleData = moduleSnapshot.val();

        // Check if module is already assigned to a different plot
        if (moduleData.assignedToPlot && moduleData.assignedToPlot !== plotId) {
            throw new Error(`Module is already assigned to another plot. Please unassign it first.`);
        }

        // Check if plot exists
        const plotRef = ref(rtdb, `users/${userId}/dashboardConfig/plots/${plotId}`);
        const plotSnapshot = await get(plotRef);

        if (!plotSnapshot.exists()) {
            throw new Error('Plot not found');
        }

        return true;
    }

    /**
     * Validate plot deletion operation
     * @param {string} userId - User ID
     * @param {string} plotId - Plot ID to delete
     * @returns {Object} Validation result with warnings
     */
    async validatePlotDeletion(userId, plotId) {
        if (!userId || !plotId) {
            throw new Error('User ID and Plot ID are required');
        }

        // Check if plot exists
        const plotRef = ref(rtdb, `users/${userId}/dashboardConfig/plots/${plotId}`);
        const snapshot = await get(plotRef);

        if (!snapshot.exists()) {
            throw new Error('Plot not found');
        }

        const plotData = snapshot.val();
        const moduleCount = plotData.modules?.length || 0;

        return {
            valid: true,
            warnings: {
                hasModules: moduleCount > 0,
                moduleCount,
                message: moduleCount > 0
                    ? `This plot has ${moduleCount} module(s). They will be unassigned.`
                    : null
            }
        };
    }

    /**
     * Validate module metadata
     * @param {Object} metadata - Module metadata
     * @throws {Error} If metadata is invalid
     */
    validateModuleMetadata(metadata) {
        if (!metadata || typeof metadata !== 'object') {
            return true; // Metadata is optional
        }

        // Validate location if provided
        if (metadata.location && typeof metadata.location !== 'string') {
            throw new Error('Location must be a string');
        }

        // Validate crop if provided
        if (metadata.crop && typeof metadata.crop !== 'string') {
            throw new Error('Crop must be a string');
        }

        // Sanitize strings
        if (metadata.location) {
            metadata.location = metadata.location.trim().substring(0, 100);
        }

        if (metadata.crop) {
            metadata.crop = metadata.crop.trim().substring(0, 50);
        }

        return true;
    }

    /**
     * Validate plot configuration
     * @param {Object} plotConfig - Plot configuration
     * @throws {Error} If configuration is invalid
     */
    validatePlotConfig(plotConfig) {
        if (!plotConfig || typeof plotConfig !== 'object') {
            throw new Error('Plot configuration is required');
        }

        // Validate name
        if (!plotConfig.name || typeof plotConfig.name !== 'string') {
            throw new Error('Plot name is required');
        }

        if (plotConfig.name.trim().length === 0) {
            throw new Error('Plot name cannot be empty');
        }

        if (plotConfig.name.length > 100) {
            throw new Error('Plot name is too long (max 100 characters)');
        }

        // Validate parameters
        if (!plotConfig.parameters || !Array.isArray(plotConfig.parameters)) {
            throw new Error('Plot parameters are required');
        }

        if (plotConfig.parameters.length === 0) {
            throw new Error('At least one parameter must be selected');
        }

        // Validate modules if provided
        if (plotConfig.modules && !Array.isArray(plotConfig.modules)) {
            throw new Error('Plot modules must be an array');
        }

        return true;
    }
}

// Export singleton instance
export default new ValidationService();
