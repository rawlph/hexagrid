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
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Emit an event
     * @param {string} eventType - Type of event to emit
     * @param {Object} data - Data to pass to listeners
     */
    emit(eventType, data = {}) {
        // Add timestamp to data
        data.timestamp = Date.now();
        
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
}

// Create singleton instance
export const eventSystem = new EventSystem(); 