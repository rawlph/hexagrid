/**
 * Event System for Hexgrid Evolution
 * Provides pub/sub event system for game components
 */
export class EventSystem {
    constructor() {
        // Event listeners by event type
        this.listeners = {};
        
        // Registrations for easy removal
        this.registrations = [];
        
        // Event queue for asynchronous events
        this.eventQueue = [];
        
        // Processing state to prevent recursion
        this.isProcessing = false;
        
        // Debug mode for logging events
        this.debugMode = false;
        
        // Tracking for migration progress
        this.legacyEventUsage = {};
        this.standardEventUsage = {};
        
        // Deprecation settings
        this.showDeprecationWarnings = true;
        this.deprecationWarningCount = 0;
        this.maxDeprecationWarnings = 100; // Limit console spam
        
        // Migration control
        this.disableLegacyEvents = false; // Master switch to disable all legacy events
        this.disabledLegacyEventTypes = new Set(); // Specific legacy events to disable
        this.fullyMigratedEvents = new Set([
            // Mark action complete events as fully migrated
            'moveComplete',
            'senseComplete',
            'interactComplete', 
            'stabilizeComplete'
        ]); // Events that have been fully migrated
        
        // Listener statistics for migration tracking
        this.listenerStatistics = {
            standardListeners: {},
            legacyListeners: {}
        };
    }
    
    /**
     * Register an event listener
     * @param {string} eventType - Type of event to listen for
     * @param {Function} callback - Function to call when event is emitted
     * @param {Object} context - Context (this) for callback
     * @returns {Object} Registration object for removing listener
     */
    on(eventType, callback, context = null) {
        // Initialize listeners array for this event type if needed
        if (!this.listeners[eventType]) {
            this.listeners[eventType] = [];
        }
        
        // Create listener object
        const listener = {
            callback,
            context
        };
        
        // Add to listeners
        this.listeners[eventType].push(listener);
        
        // Create registration for removal
        const registration = {
            eventType,
            callback,
            context
        };
        
        // Store registration
        this.registrations.push(registration);
        
        // Additional tracking for migration
        if (eventType.includes(':')) {
            // This is a standardized event listener
            this.listenerStatistics.standardListeners[eventType] = 
                (this.listenerStatistics.standardListeners[eventType] || 0) + 1;
        } else {
            // This is a legacy event listener
            this.listenerStatistics.legacyListeners[eventType] = 
                (this.listenerStatistics.legacyListeners[eventType] || 0) + 1;
        }
        
        return registration;
    }
    
    /**
     * Remove an event listener
     * @param {Object} registration - Registration object from on()
     * @returns {boolean} Whether listener was removed
     */
    off(registration) {
        if (!registration) return false;
        
        const { eventType, callback, context } = registration;
        
        // Check if we have listeners for this event type
        if (!this.listeners[eventType]) return false;
        
        // Find and remove listener
        const index = this.listeners[eventType].findIndex(listener => 
            listener.callback === callback && listener.context === context
        );
        
        if (index !== -1) {
            // Remove listener
            this.listeners[eventType].splice(index, 1);
            
            // Remove registration
            const regIndex = this.registrations.findIndex(reg => 
                reg.eventType === eventType && 
                reg.callback === callback && 
                reg.context === context
            );
            
            if (regIndex !== -1) {
                this.registrations.splice(regIndex, 1);
            }
            
            // Update tracking for migration
            if (eventType.includes(':')) {
                // This was a standardized event listener
                this.listenerStatistics.standardListeners[eventType] = 
                    Math.max(0, (this.listenerStatistics.standardListeners[eventType] || 1) - 1);
            } else {
                // This was a legacy event listener
                this.listenerStatistics.legacyListeners[eventType] = 
                    Math.max(0, (this.listenerStatistics.legacyListeners[eventType] || 1) - 1);
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Normalize event data to ensure consistency between legacy and standardized formats
     * @param {Object} data - Original event data
     * @param {string} eventType - Event type being emitted
     * @returns {Object} Normalized data object
     */
    normalizeEventData(data = {}, eventType = '') {
        // Create a copy of data to avoid modifying the original
        const normalized = {...data};
        
        // Add timestamp if not present
        if (!normalized.timestamp) {
            normalized.timestamp = Date.now();
        }
        
        // Add standardization flag
        normalized.isStandardized = eventType.includes(':');
        
        // Normalize player resource change events
        if (eventType.includes('player:resource:changed')) {
            // Movement points normalization
            if ('oldPoints' in normalized && !('oldMovementPoints' in normalized)) {
                normalized.oldMovementPoints = normalized.oldPoints;
            }
            if ('newPoints' in normalized && !('movementPoints' in normalized)) {
                normalized.movementPoints = normalized.newPoints;
            }
            
            // Energy normalization
            if ('oldEnergy' in normalized && !('oldValue' in normalized)) {
                normalized.oldValue = normalized.oldEnergy;
            }
            if ('newEnergy' in normalized && !('newValue' in normalized)) {
                normalized.newValue = normalized.newEnergy;
            } else if ('energy' in normalized && !('newValue' in normalized)) {
                normalized.newValue = normalized.energy;
            }
            
            // Ensure delta exists
            if (!('delta' in normalized) && 'newValue' in normalized && 'oldValue' in normalized) {
                normalized.delta = normalized.newValue - normalized.oldValue;
            }
        }
        
        return normalized;
    }
    
    /**
     * Emit an event
     * @param {string} eventType - Type of event to emit
     * @param {Object} data - Data to pass to listeners
     */
    emit(eventType, data = {}) {
        // Add timestamp to data
        data.timestamp = Date.now();
        
        // Add standardization flag
        data.isStandardized = eventType.includes(':');
        
        // Track usage for migration metrics
        if (eventType.includes(':')) {
            this.standardEventUsage[eventType] = (this.standardEventUsage[eventType] || 0) + 1;
        } else {
            this.legacyEventUsage[eventType] = (this.legacyEventUsage[eventType] || 0) + 1;
        }
        
        // Debug logging
        if (this.debugMode) {
            console.log(`[EventSystem] Emit: ${eventType}`, data);
        }
        
        // Queue event for processing
        this.eventQueue.push({
            eventType,
            data
        });
        
        // Process queue if not already processing
        if (!this.isProcessing) {
            this.processEventQueue();
        }
    }
    
    /**
     * Emit both a legacy event and its standardized equivalent
     * @param {string} legacyType - Legacy event name
     * @param {string} standardType - Standardized event name (with colons)
     * @param {Object} data - Data to pass to listeners
     * @param {Object} [options] - Additional options for emission
     * @param {Object} [options.deprecationInfo] - Deprecation information
     * @param {boolean} [options.forceLegacy=false] - Force legacy event emission even if disabled
     * @returns {boolean} Always returns true for method chaining
     */
    emitStandardized(legacyType, standardType, data = {}, options = {}) {
        const { deprecationInfo, forceLegacy = false } = typeof options === 'object' ? options : { deprecationInfo: options };
        
        // Track deprecation warnings per event type to avoid excessive logging
        if (!this._deprecationWarningTracker) {
            this._deprecationWarningTracker = {};
        }
        
        // Determine if we should emit the legacy event
        const shouldEmitLegacy = forceLegacy || 
                               !(this.disableLegacyEvents || // Master switch is off
                                 this.disabledLegacyEventTypes.has(legacyType) || // Event specifically disabled
                                 this.fullyMigratedEvents.has(legacyType)); // Event fully migrated
        
        // Show deprecation warning if enabled
        if (this.showDeprecationWarnings && deprecationInfo && 
            (!this._deprecationWarningTracker[legacyType] || 
             this._deprecationWarningTracker[legacyType] < 3)) {
                
            // Create more visible warning with migration status
            let warningMsg = `🔶 DEPRECATED EVENT: '${legacyType}' is deprecated. Use '${standardType}' instead.`;
            
            // Add compatibility status
            if (this.fullyMigratedEvents.has(legacyType)) {
                warningMsg += ' (FULLY MIGRATED - Legacy emission DISABLED)';
            } else if (!shouldEmitLegacy) {
                warningMsg += ' (Legacy emission DISABLED)';
            } else {
                // Get listener stats if available
                const legacyListenerCount = this.listenerStatistics.legacyListeners[legacyType] || 0;
                const standardListenerCount = this.listenerStatistics.standardListeners[standardType] || 0;
                
                if (legacyListenerCount > 0) {
                    warningMsg += ` (${legacyListenerCount} legacy listeners still active)`;
                }
            }
            
            console.warn(warningMsg);
            
            if (deprecationInfo.message) {
                console.info(deprecationInfo.message);
            }
            
            // Increment the counter for this specific event type
            this._deprecationWarningTracker[legacyType] = (this._deprecationWarningTracker[legacyType] || 0) + 1;
            
            // Log only once when limit is reached for this event type
            if (this._deprecationWarningTracker[legacyType] === 3) {
                console.warn(`[EventSystem] Suppressing further deprecation warnings for '${legacyType}'.`);
            }
            
            // Global counter for overall tracking
            this.deprecationWarningCount++;
            
            // Warn when reaching the global limit
            if (this.deprecationWarningCount === this.maxDeprecationWarnings) {
                console.warn(`[EventSystem] Reached maximum deprecation warnings (${this.maxDeprecationWarnings}). Some may be suppressed.`);
            }
        }
        
        // Emit standardized event with normalized data
        const normalizedData = this.normalizeEventData({...data}, standardType);
        this.emit(standardType, normalizedData);
        
        // Also emit legacy event for backward compatibility if not disabled
        if (shouldEmitLegacy) {
            this.emit(legacyType, data);
        }
        
        // Return true for method chaining
        return true;
    }
    
    /**
     * Process queued events
     */
    processEventQueue() {
        // Set processing flag to prevent recursion
        this.isProcessing = true;
        
        // Process all events in queue
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            this.processEvent(event.eventType, event.data);
        }
        
        // Clear processing flag
        this.isProcessing = false;
    }
    
    /**
     * Process a single event
     * @param {string} eventType - Type of event to process
     * @param {Object} data - Event data
     */
    processEvent(eventType, data) {
        // Check if we have listeners for this event type
        if (!this.listeners[eventType]) return;
        
        // Create a copy of listeners to allow for removal during iteration
        const listeners = [...this.listeners[eventType]];
        
        // Call each listener
        for (const listener of listeners) {
            try {
                listener.callback.call(listener.context, data);
            } catch (error) {
                console.error(`[EventSystem] Error in ${eventType} listener:`, error);
            }
        }
    }
    
    /**
     * Clear all event listeners
     */
    clear() {
        this.listeners = {};
        this.registrations = [];
        this.eventQueue = [];
        this.isProcessing = false;
    }
    
    /**
     * Remove all listeners for a specific event type
     * @param {string} eventType - Type of event to remove listeners for
     * @returns {boolean} Whether any listeners were removed
     */
    removeAllListeners(eventType) {
        // Check if we have listeners for this event type
        if (!this.listeners[eventType]) return false;
        
        // Remove all registrations for this event type
        this.registrations = this.registrations.filter(reg => reg.eventType !== eventType);
        
        // Remove all listeners for this event type
        delete this.listeners[eventType];
        
        return true;
    }
    
    /**
     * Set debug mode
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
    
    /**
     * Enable or disable deprecation warnings
     * @param {boolean} enabled - Whether to show deprecation warnings
     */
    setDeprecationWarnings(enabled) {
        this.showDeprecationWarnings = enabled;
        // Reset counter when re-enabling
        if (enabled) {
            this.deprecationWarningCount = 0;
        }
    }
    
    /**
     * Get migration statistics with enhanced listener information
     * Shows which events are being used and their listener counts
     * @returns {Object} Statistics about event usage and listeners
     */
    getMigrationStats() {
        const totalLegacyEvents = Object.values(this.legacyEventUsage).reduce((sum, count) => sum + count, 0);
        const totalStandardEvents = Object.values(this.standardEventUsage).reduce((sum, count) => sum + count, 0);
        
        // Calculate standardization percentage
        const totalEvents = totalLegacyEvents + totalStandardEvents;
        const standardizationPercentage = totalEvents === 0 ? 0 : 
            Math.round((totalStandardEvents / totalEvents) * 100);
            
        // Get count of fully migrated events
        const fullyMigratedCount = this.fullyMigratedEvents.size;
        
        // Calculate listener migration progress
        const totalLegacyListeners = Object.values(this.listenerStatistics.legacyListeners)
            .reduce((sum, count) => sum + count, 0);
            
        const totalStandardListeners = Object.values(this.listenerStatistics.standardListeners)
            .reduce((sum, count) => sum + count, 0);
            
        const totalListeners = totalLegacyListeners + totalStandardListeners;
        
        const listenerMigrationPercentage = totalListeners === 0 ? 0 : 
            Math.round((totalStandardListeners / totalListeners) * 100);
            
        return {
            legacyEventCount: Object.keys(this.legacyEventUsage).length,
            standardizedEventCount: Object.keys(this.standardEventUsage).length,
            legacyEventUsage: this.legacyEventUsage,
            standardizedEventUsage: this.standardEventUsage,
            totalLegacyEvents,
            totalStandardEvents,
            standardizationPercentage,
            listenerStatistics: this.listenerStatistics,
            totalLegacyListeners,
            totalStandardListeners,
            listenerMigrationPercentage,
            fullyMigratedEvents: Array.from(this.fullyMigratedEvents),
            fullyMigratedCount,
            disabledLegacyEvents: Array.from(this.disabledLegacyEventTypes)
        };
    }
    
    /**
     * Check if an event is fully migrated (no legacy listeners)
     * @param {string} legacyType - Legacy event name
     * @param {string} standardType - Standardized event name
     * @returns {boolean} Whether event is fully migrated
     */
    isEventFullyMigrated(legacyType, standardType) {
        // Event is fully migrated if there are no legacy listeners
        // and there is at least one standard listener
        const hasNoLegacyListeners = !this.listeners[legacyType] || 
                                    this.listeners[legacyType].length === 0;
                                    
        const hasStandardListeners = this.listeners[standardType] && 
                                    this.listeners[standardType].length > 0;
                                    
        return hasNoLegacyListeners && hasStandardListeners;
    }
    
    /**
     * Mark an event as fully migrated (will no longer emit legacy version)
     * @param {string} legacyType - Legacy event name
     */
    markEventAsMigrated(legacyType) {
        this.fullyMigratedEvents.add(legacyType);
        console.log(`Marked '${legacyType}' as fully migrated. Legacy emissions disabled.`);
    }
    
    /**
     * Disable legacy events completely or selectively
     * @param {boolean|string|Array<string>} events - true to disable all, or event names to disable
     */
    disableLegacyEventEmissions(events) {
        if (events === true) {
            // Disable all legacy events
            this.disableLegacyEvents = true;
            console.log('All legacy event emissions disabled.');
        } else if (Array.isArray(events)) {
            // Disable specific events
            events.forEach(eventName => {
                this.disabledLegacyEventTypes.add(eventName);
            });
            console.log(`Legacy emissions disabled for: ${events.join(', ')}`);
        } else if (typeof events === 'string') {
            // Disable a single event
            this.disabledLegacyEventTypes.add(events);
            console.log(`Legacy emissions disabled for: ${events}`);
        }
    }
    
    /**
     * Re-enable legacy events
     * @param {boolean|string|Array<string>} events - true to enable all, or event names to enable
     */
    enableLegacyEventEmissions(events) {
        if (events === true) {
            // Enable all legacy events
            this.disableLegacyEvents = false;
            this.disabledLegacyEventTypes.clear();
            console.log('All legacy event emissions re-enabled.');
        } else if (Array.isArray(events)) {
            // Enable specific events
            events.forEach(eventName => {
                this.disabledLegacyEventTypes.delete(eventName);
            });
            console.log(`Legacy emissions re-enabled for: ${events.join(', ')}`);
        } else if (typeof events === 'string') {
            // Enable a single event
            this.disabledLegacyEventTypes.delete(events);
            console.log(`Legacy emissions re-enabled for: ${events}`);
        }
    }
    
    /**
     * Completely disable all legacy events (should only be used in v2.0 or later)
     * This is a convenience method to make it easier to fully migrate to standardized events
     * @param {boolean} showWarnings - Whether to show warnings about this being a breaking change
     * @returns {boolean} Whether all legacy events were disabled
     */
    disableAllLegacyEvents(showWarnings = true) {
        if (showWarnings) {
            console.warn('⚠️ WARNING: Disabling ALL legacy events. This is a breaking change!');
            console.warn('This should only be done in v2.0 or later when all code has been updated to use standardized events.');
            console.warn('If you are seeing unexpected behavior, revert this change and complete migration first.');
        }
        
        // Master switch to disable all legacy events
        this.disableLegacyEvents = true;
        
        // Log statistics of what was disabled
        const stats = this.getMigrationStats();
        console.log(`Disabled ${Object.keys(stats.legacyEventUsage).length} legacy event types.`);
        console.log(`Standardization progress before disabling: ${stats.standardizationPercentage}%`);
        
        return true;
    }
    
    /**
     * Get legacy event usage sorted by frequency
     * Useful for identifying which legacy events are still most actively used
     * @returns {Array} Legacy events sorted by usage count (descending)
     */
    getLegacyEventUsageRanking() {
        const sorted = Object.entries(this.legacyEventUsage)
            .sort((a, b) => b[1] - a[1])
            .map(([eventName, count]) => {
                return {
                    eventName,
                    count,
                    standardName: getStandardName ? getStandardName(eventName) : null,
                    hasStandardName: !!getStandardName && !!getStandardName(eventName)
                };
            });
        
        return sorted;
    }
}

// Create singleton instance
export const eventSystem = new EventSystem(); 