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
        // Player action events
        this._registeredEvents.push(
            eventSystem.on('playerMoved', data => {
                this.addLogMessage(`Moved to (${data.toRow}, ${data.toCol})`, "player");
            })
        );
        
        this._registeredEvents.push(
            eventSystem.on('senseComplete', data => {
                this.addLogMessage(`Sensed tile at (${data.row}, ${data.col})`, "player");
            })
        );
        
        this._registeredEvents.push(
            eventSystem.on('interactComplete', data => {
                this.addLogMessage(`Interacted with tile at (${data.row}, ${data.col})`, "player");
            })
        );
        
        this._registeredEvents.push(
            eventSystem.on('stabilizeComplete', data => {
                this.addLogMessage(`Stabilized tile at (${data.row}, ${data.col})`, "player");
            })
        );
        
        // Tile events
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
        
        // Game state events
        this._registeredEvents.push(
            eventSystem.on('turnStart', data => {
                this.addLogMessage(`Turn ${data.turnCount} started`, "system");
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
                this.addLogMessage(`Earned ${data.points} evolution points`, "event");
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
        
        // Set content
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        // Add to container
        if (this.logContainer) {
            this.logContainer.appendChild(logEntry);
            
            // Scroll to bottom
            this.logContainer.scrollTop = this.logContainer.scrollHeight;
        }
        
        // Add to history
        this.messageHistory.push({
            message,
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
     */
    showFeedbackMessage(message, duration = 2000) {
        // Add to queue
        this.feedbackQueue.push({
            message,
            duration
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
        const { message, duration } = this.feedbackQueue.shift();
        
        // Show message
        if (this.feedbackElement) {
            this.feedbackElement.textContent = message;
            this.feedbackElement.classList.add('visible');
            
            // Hide after duration
            setTimeout(() => {
                this.feedbackElement.classList.remove('visible');
                
                // Wait for animation to complete
                setTimeout(() => {
                    this.processFeedbackQueue();
                }, 300);
            }, duration);
        } else {
            // If element not available, just skip to next message
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