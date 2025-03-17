/**
 * Event System for Hexgrid Evolution
 * Provides pub/sub event system for game components
 */
import { EventTypes } from './EventTypes.js';

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
        
        // Consolidated event statistics
        this.eventStats = {
            usage: {
                legacy: {},
                standard: {}
            },
            listeners: {
                legacy: {},
                standard: {}
            }
        };
        
        // Deprecation settings
        this.showDeprecationWarnings = true;
        this.deprecationWarningCount = 0;
        this.maxDeprecationWarnings = 100;
        
        // Migration control
        this.disableLegacyEvents = false;
        this.disabledLegacyEventTypes = new Set();
        
        // Initialize with empty set first, then update in next tick to avoid circular dependencies
        this.fullyMigratedEvents = new Set();
        
        // Deprecation warning tracker
        this._deprecationWarningTracker = {};
        
        // Initialize fully migrated events in next tick to avoid circular dependencies
        setTimeout(() => {
            if (EventTypes && EventTypes.FULLY_MIGRATED_EVENTS) {
                this.fullyMigratedEvents = new Set(EventTypes.FULLY_MIGRATED_EVENTS);
            }
        }, 0);
    }
    
    /**
     * Register an event listener
     * @param {string} eventType - Type of event to listen for
     * @param {Function} callback - Function to call when event is emitted
     * @param {Object} context - Context (this) for callback
     * @returns {Object} Registration object for removing listener
     */
    on(eventType, callback, context = null) {
        if (!this.listeners[eventType]) {
            this.listeners[eventType] = [];
        }
        
        const listener = { callback, context };
        this.listeners[eventType].push(listener);
        
        const registration = { eventType, callback, context };
        this.registrations.push(registration);
        
        // Update listener statistics
        const statsKey = eventType.includes(':') ? 'standard' : 'legacy';
        this.eventStats.listeners[statsKey][eventType] = 
            (this.eventStats.listeners[statsKey][eventType] || 0) + 1;
        
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
        
        if (!this.listeners[eventType]) return false;
        
        const index = this.listeners[eventType].findIndex(listener => 
            listener.callback === callback && listener.context === context
        );
        
        if (index !== -1) {
            this.listeners[eventType].splice(index, 1);
            
            const regIndex = this.registrations.findIndex(reg => 
                reg.eventType === eventType && 
                reg.callback === callback && 
                reg.context === context
            );
            
            if (regIndex !== -1) {
                this.registrations.splice(regIndex, 1);
            }
            
            // Update listener statistics
            const statsKey = eventType.includes(':') ? 'standard' : 'legacy';
            this.eventStats.listeners[statsKey][eventType] = 
                Math.max(0, (this.eventStats.listeners[statsKey][eventType] || 1) - 1);
            
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
        
        // Note: Legacy normalization code for oldPoints, newPoints, oldEnergy, etc. has been removed
        // since all components now use standardized event data formats
        
        // Ensure delta exists for resource change events
        if (eventType.includes('player:resource:changed')) {
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
        // Add timestamp and standardization flag
        const enrichedData = {
            ...data,
            timestamp: Date.now(),
            isStandardized: eventType.includes(':')
        };
        
        // Update usage statistics
        const statsKey = enrichedData.isStandardized ? 'standard' : 'legacy';
        this.eventStats.usage[statsKey][eventType] = 
            (this.eventStats.usage[statsKey][eventType] || 0) + 1;
        
        if (this.debugMode) {
            console.log(`[EventSystem] Emit: ${eventType}`, enrichedData);
        }
        
        this.eventQueue.push({
            eventType,
            data: enrichedData
        });
        
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
                const legacyListenerCount = this.eventStats.listeners.legacy[legacyType] || 0;
                const standardListenerCount = this.eventStats.listeners.standard[standardType] || 0;
                
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
        const stats = this.eventStats;
        
        const totalLegacyEvents = Object.values(stats.usage.legacy)
            .reduce((sum, count) => sum + count, 0);
            
        const totalStandardEvents = Object.values(stats.usage.standard)
            .reduce((sum, count) => sum + count, 0);
            
        const totalEvents = totalLegacyEvents + totalStandardEvents;
        const standardizationPercentage = totalEvents === 0 ? 0 : 
            Math.round((totalStandardEvents / totalEvents) * 100);
            
        const totalLegacyListeners = Object.values(stats.listeners.legacy)
            .reduce((sum, count) => sum + count, 0);
            
        const totalStandardListeners = Object.values(stats.listeners.standard)
            .reduce((sum, count) => sum + count, 0);
            
        return {
            legacyEventCount: Object.keys(stats.usage.legacy).length,
            standardizedEventCount: Object.keys(stats.usage.standard).length,
            legacyEventUsage: stats.usage.legacy,
            standardizedEventUsage: stats.usage.standard,
            totalLegacyEvents,
            totalStandardEvents,
            standardizationPercentage,
            listenerStatistics: stats.listeners,
            totalLegacyListeners,
            totalStandardListeners,
            listenerMigrationPercentage: totalLegacyListeners + totalStandardListeners === 0 ? 0 :
                Math.round((totalStandardListeners / (totalLegacyListeners + totalStandardListeners)) * 100),
            fullyMigratedEvents: Array.from(this.fullyMigratedEvents),
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
        const sorted = Object.entries(this.eventStats.usage.legacy)
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
    
    /**
     * Check if an event type is ready for migration
     * An event is ready when:
     * 1. It has no legacy listeners
     * 2. It has at least one standard listener
     * 3. It has been emitted at least once in standard format
     * 4. It is not already in FULLY_MIGRATED_EVENTS
     * @param {string} legacyType - Legacy event name
     * @param {string} standardType - Standardized event name
     * @returns {Object} Object containing readiness status and analysis
     */
    checkEventMigrationReadiness(legacyType, standardType) {
        // Get current statistics
        const legacyListeners = this.eventStats.listeners.legacy[legacyType] || 0;
        const standardListeners = this.eventStats.listeners.standard[standardType] || 0;
        const legacyUsage = this.eventStats.usage.legacy[legacyType] || 0;
        const standardUsage = this.eventStats.usage.standard[standardType] || 0;
        
        // Check if already fully migrated
        const isAlreadyMigrated = this.fullyMigratedEvents.has(legacyType);
        
        // Calculate readiness
        const hasNoLegacyListeners = legacyListeners === 0;
        const hasStandardListeners = standardListeners > 0;
        const hasStandardUsage = standardUsage > 0;
        
        const isReady = !isAlreadyMigrated && 
                       hasNoLegacyListeners && 
                       hasStandardListeners && 
                       hasStandardUsage;
        
        // Return detailed analysis
        return {
            isReady,
            analysis: {
                legacyListeners,
                standardListeners,
                legacyUsage,
                standardUsage,
                isAlreadyMigrated,
                hasNoLegacyListeners,
                hasStandardListeners,
                hasStandardUsage,
                blockers: {
                    hasLegacyListeners: legacyListeners > 0,
                    noStandardListeners: standardListeners === 0,
                    noStandardUsage: standardUsage === 0,
                    alreadyMigrated: isAlreadyMigrated
                }
            }
        };
    }
    
    /**
     * Get a list of all events that are ready for migration
     * @returns {Array} Array of objects containing event info and analysis
     */
    getEventsMigrationStatus() {
        const results = [];
        
        // Check each event type defined in EventTypes
        for (const [key, mapping] of Object.entries(EventTypes)) {
            const { legacy, standard } = mapping;
            const readiness = this.checkEventMigrationReadiness(legacy, standard);
            
            results.push({
                eventKey: key,
                legacyName: legacy,
                standardName: standard,
                ...readiness
            });
        }
        
        return results;
    }
}

// Create singleton instance
export const eventSystem = new EventSystem(); 