/**
 * Manages in-game messages and notifications
 */
class MessageSystem {
    constructor() {
        // DOM elements
        this.logContainer = document.getElementById('log-entries');
        this.feedbackElement = null;
        
        // Message history
        this.messageHistory = [];
        this.maxMessageHistory = 50;
        
        // Feedback message queue
        this.feedbackQueue = [];
        this.feedbackActive = false;
        
        // Event listeners
        this._registeredEvents = [];
        
        // Create feedback message element if needed
        this.createFeedbackElement();
    }
    
    /**
     * Initialize the message system
     */
    init() {
        console.log("Initializing message system");
        
        // Clear log
        this.clearLog();
        
        // Clean up any existing event listeners before registering new ones
        this.destroy();
        
        // Register event listeners
        this.registerEventListeners();
        
        // Add welcome message
        this.addLogMessage("Welcome to Hexgrid Evolution!", "system");
        this.addLogMessage("Explore the grid and bring order to chaos.", "system");
    }
    
    /**
     * Create the feedback message element
     */
    createFeedbackElement() {
        // Check if element already exists
        if (document.getElementById('feedback-message')) {
            this.feedbackElement = document.getElementById('feedback-message');
            return;
        }
        
        // Create new element
        this.feedbackElement = document.createElement('div');
        this.feedbackElement.id = 'feedback-message';
        document.body.appendChild(this.feedbackElement);
    }
    
    /**
     * Register event listeners
     */
    registerEventListeners() {
        // Player action events - using only standardized event names to avoid duplicates
        
        // Move actions
        this._registeredEvents.push(
            eventSystem.on('action:complete:move', data => {
                // For move actions, we don't need to log here as the ActionPanel already handles it
                // with more details like energy cost
            })
        );
        
        // Sense actions
        this._registeredEvents.push(
            eventSystem.on('action:complete:sense', data => {
                // For sense actions, we don't log here as ActionPanel provides more detailed feedback
                // that includes tile type and chaos levels
            })
        );
        
        // Interact actions
        this._registeredEvents.push(
            eventSystem.on('action:complete:interact', data => {
                // For interact actions, we don't log here as ActionPanel provides more detailed feedback
                // about the specific interaction effect
            })
        );
        
        // Stabilize actions
        this._registeredEvents.push(
            eventSystem.on('action:complete:stabilize', data => {
                // For stabilize actions, we don't log here as ActionPanel provides more detailed feedback
                // that includes the reduction percentage
            })
        );
        
        // Tile events - keep these as they're not duplicated elsewhere
        this._registeredEvents.push(
            eventSystem.on('tileExplored', data => {
                this.addLogMessage(`Explored ${data.type} tile at (${data.row}, ${data.col})`, "event");
            })
        );
        
        this._registeredEvents.push(
            eventSystem.on('tileChaosChanged', data => {
                const changeType = data.chaosDelta > 0 ? "increased" : "decreased";
                const changeAmt = Math.abs(Math.round(data.chaosDelta * 100));
                if (changeAmt > 5) { // Only log significant changes
                    this.addLogMessage(`Chaos ${changeType} by ${changeAmt}% at (${data.row}, ${data.col})`, "event");
                }
            })
        );
        
        // Game state events - keep these as they're not duplicated elsewhere
        this._registeredEvents.push(
            eventSystem.on('turnStart', data => {
                this.addLogMessage(`Turn ${data.turnCount} started`, "system");
            })
        );
        
        this._registeredEvents.push(
            eventSystem.on('turnEnd', data => {
                this.addLogMessage(`Turn ${data.turnCount} ended`, "system");
            })
        );
        
        this._registeredEvents.push(
            eventSystem.on('gameVictory', data => {
                this.addLogMessage(`Victory achieved! Order level: ${Math.round(data.systemOrder * 100)}%`, "system");
            })
        );
        
        this._registeredEvents.push(
            eventSystem.on('gameOver', data => {
                this.addLogMessage(`Game over: ${data.reason}`, "system");
            })
        );
        
        // Evolution events
        this._registeredEvents.push(
            eventSystem.on('evolutionPointsAwarded', data => {
                // Add a text-only version to the log
                if (data.pointsAwarded) {
                    const { chaos = 0, flow = 0, order = 0 } = data.pointsAwarded;
                    const totalPoints = chaos + flow + order;
                    
                    if (totalPoints > 0) {
                        let logMessage = `Earned evolution points:`;
                        if (chaos > 0) logMessage += ` Chaos +${chaos}`;
                        if (flow > 0) logMessage += ` Flow +${flow}`;
                        if (order > 0) logMessage += ` Order +${order}`;
                        
                        this.addLogMessage(logMessage, "event");
                    }
                }
            })
        );
        
        this._registeredEvents.push(
            eventSystem.on('traitPurchased', data => {
                this.addLogMessage(`Acquired trait: ${data.trait.name}`, "event");
            })
        );
        
        // Achievement events
        this._registeredEvents.push(
            eventSystem.on('achievementsCompleted', data => {
                data.achievements.forEach(achievement => {
                    this.addLogMessage(`Achievement unlocked: ${achievement.name}`, "event");
                    this.showFeedbackMessage(`Achievement: ${achievement.name}`, 3000);
                });
            })
        );
    }
    
    /**
     * Strip HTML tags from a message
     * @param {string} html - HTML string to strip
     * @returns {string} - Plain text string
     * @private
     */
    _stripHtml(html) {
        // Simple regex to remove HTML tags
        if (typeof html !== 'string') return html; 
        return html.replace(/<[^>]*>/g, '');
    }
    
    /**
     * Add a message to the log
     * @param {string} message - The message text
     * @param {string} type - Message type (system, player, event)
     */
    addLogMessage(message, type = "system") {
        // Create log entry element
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        // Add timestamp
        const now = new Date();
        const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        // Set content - ensure we strip any HTML tags that might be in the message
        const plainTextMessage = this._stripHtml(message);
        logEntry.textContent = `[${timestamp}] ${plainTextMessage}`;
        
        // Add to container
        if (this.logContainer) {
            this.logContainer.appendChild(logEntry);
            
            // Scroll to bottom
            this.logContainer.scrollTop = this.logContainer.scrollHeight;
        }
        
        // Add to history
        this.messageHistory.push({
            message: plainTextMessage,
            type,
            timestamp: Date.now()
        });
        
        // Trim history if too long
        if (this.messageHistory.length > this.maxMessageHistory) {
            this.messageHistory.shift();
        }
    }
    
    /**
     * Show a feedback message
     * @param {string} message - The message text
     * @param {number} duration - Display duration in milliseconds
     * @param {string} type - Message type (success, error, warning, evolution-points)
     */
    showFeedbackMessage(message, duration = 2000, type = '') {
        // Add to queue
        this.feedbackQueue.push({
            message,
            duration,
            type
        });
        
        // Process queue if not active
        if (!this.feedbackActive) {
            this.processFeedbackQueue();
        }
    }
    
    /**
     * Process the feedback message queue
     */
    processFeedbackQueue() {
        if (this.feedbackQueue.length === 0) {
            this.feedbackActive = false;
            return;
        }
        
        this.feedbackActive = true;
        
        // Get next message
        const { message, duration, type } = this.feedbackQueue.shift();
        
        // Show message
        if (this.feedbackElement) {
            // Support HTML content
            this.feedbackElement.innerHTML = message;
            
            // Clear any existing classes first
            this.feedbackElement.className = '';
            
            // Add styling classes
            this.feedbackElement.classList.add('visible');
            if (type) {
                this.feedbackElement.classList.add(type);
            }
            
            // Set timeout to hide message and process next in queue
            clearTimeout(this._feedbackTimeout);
            this._feedbackTimeout = setTimeout(() => {
                // Remove the visible class first to trigger fade out
                this.feedbackElement.classList.remove('visible');
                
                // After the transition completes, clear all classes and process the next message
                setTimeout(() => {
                    this.feedbackElement.className = '';
                    this.processFeedbackQueue();
                }, 300); // Match this to the CSS transition duration
            }, duration);
        } else {
            // Element not available, try next message
            this.processFeedbackQueue();
        }
    }
    
    /**
     * Clear the message log
     */
    clearLog() {
        if (this.logContainer) {
            this.logContainer.innerHTML = '';
        }
    }
    
    /**
     * Get message history
     * @param {number} count - Number of messages to retrieve (0 for all)
     * @returns {Array} Array of message objects
     */
    getMessageHistory(count = 0) {
        if (count === 0 || count >= this.messageHistory.length) {
            return [...this.messageHistory];
        }
        
        return this.messageHistory.slice(-count);
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        for (const registration of this._registeredEvents) {
            eventSystem.off(registration);
        }
        
        this._registeredEvents = [];
        
        // Clear feedback queue
        this.feedbackQueue = [];
        this.feedbackActive = false;
        
        // Hide feedback element
        if (this.feedbackElement) {
            this.feedbackElement.classList.remove('visible');
        }
    }
}

export { MessageSystem }; 