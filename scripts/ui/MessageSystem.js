/**
 * Manages in-game messages and notifications
 */
import { EventTypes } from '../core/EventTypes.js';

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
        
        // Append to grid container instead of document body
        const gridContainer = document.getElementById('grid-container');
        if (gridContainer) {
            gridContainer.appendChild(this.feedbackElement);
        } else {
            // Fallback to body if grid container not found
            document.body.appendChild(this.feedbackElement);
        }
    }
    
    /**
     * Register event listeners
     */
    registerEventListeners() {
        // Player action events - using standardized event names with EventTypes constants
        
        // Move actions
        this._registeredEvents.push(
            eventSystem.on(EventTypes.ACTION_COMPLETE_MOVE.standard, data => {
                // For move actions, we don't need to log here as the ActionPanel already handles it
                // with more details like energy cost
            })
        );
        
        // Sense actions
        this._registeredEvents.push(
            eventSystem.on(EventTypes.ACTION_COMPLETE_SENSE.standard, data => {
                // For sense actions, we don't log here as ActionPanel provides more detailed feedback
                // that includes tile type and chaos levels
            })
        );
        
        // Interact actions
        this._registeredEvents.push(
            eventSystem.on(EventTypes.ACTION_COMPLETE_INTERACT.standard, data => {
                // For interact actions, we don't log here as ActionPanel provides more detailed feedback
                // about the specific interaction effect
            })
        );
        
        // Stabilize actions
        this._registeredEvents.push(
            eventSystem.on(EventTypes.ACTION_COMPLETE_STABILIZE.standard, data => {
                // For stabilize actions, we don't log here as ActionPanel provides more detailed feedback
                // that includes the reduction percentage
            })
        );
        
        // Tile events - updated to use standardized event names
        this._registeredEvents.push(
            eventSystem.on(EventTypes.TILE_EXPLORED.standard, data => {
                // Skip logging if this was from a sense action since ActionPanel already logs it
                // The 'sourceAction' property indicates what action caused this exploration
                if (data.sourceAction === 'sense') {
                    return;
                }
                
                // Only log exploration from other sources (e.g., initial reveal, quests, etc.)
                this.addLogMessage(`Explored ${data.tileInfo?.type || 'unknown'} tile at (${data.row}, ${data.col})`, "event");
            })
        );
        
        // Add a listener for system balance changes to log significant shifts
        this._registeredEvents.push(
            eventSystem.on(EventTypes.SYSTEM_BALANCE_CHANGED.standard, data => {
                // Skip if this is part of a transaction (handled by ActionPanel)
                if (data.sourceAction) {
                    return;
                }
                
                // Only log significant balance changes (>= 1%)
                if (Math.abs(data.chaosDelta) >= 0.01) {
                    const chaosPercent = Math.round(data.chaos * 100);
                    const orderPercent = Math.round(data.order * 100);
                    
                    // Format message based on change magnitude
                    let message;
                    if (Math.abs(data.chaosDelta) >= 0.05) {
                        // For large changes (>= 5%), include the change amount
                        const changeDirection = data.chaosDelta > 0 ? "increased" : "decreased";
                        const changeAmount = Math.abs(Math.round(data.chaosDelta * 100));
                        message = `World balance ${changeDirection} by ${changeAmount}% (${chaosPercent}% Chaos / ${orderPercent}% Order)`;
                    } else {
                        // For smaller changes, just show the new balance
                        message = `World balance shifted to ${chaosPercent}% Chaos / ${orderPercent}% Order`;
                    }
                    
                    this.addLogMessage(message, "system");
                }
            })
        );
        
        this._registeredEvents.push(
            eventSystem.on(EventTypes.TILE_CHAOS_CHANGED.standard, data => {
                // Skip logging if this was from a stabilize action since ActionPanel already logs it
                // The 'sourceAction' property indicates what action caused this chaos change
                if (data.sourceAction === 'stabilize') {
                    return;
                }
                
                const changeType = data.chaosDelta > 0 ? "increased" : "decreased";
                const changeAmt = Math.abs(Math.round(data.chaosDelta * 100));
                if (changeAmt > 5) { // Only log significant changes
                    this.addLogMessage(`Chaos ${changeType} by ${changeAmt}% at (${data.row}, ${data.col})`, "event");
                }
            })
        );
        
        // Game state events - updated to use standardized event names
        this._registeredEvents.push(
            eventSystem.on(EventTypes.TURN_START.standard, data => {
                this.addLogMessage(`Turn ${data.turnCount} started`, "system");
            })
        );
        
        this._registeredEvents.push(
            eventSystem.on(EventTypes.TURN_END.standard, data => {
                this.addLogMessage(`Turn ${data.turnCount} ended`, "system");
            })
        );
        
        this._registeredEvents.push(
            eventSystem.on(EventTypes.GAME_VICTORY.standard, data => {
                this.addLogMessage(`Victory achieved! Order level: ${Math.round(data.systemOrder * 100)}%`, "system");
            })
        );
        
        this._registeredEvents.push(
            eventSystem.on(EventTypes.GAME_OVER.standard, data => {
                this.addLogMessage(`Game over: ${data.reason}`, "system");
            })
        );
        
        // Evolution events - updated to use standardized event names
        this._registeredEvents.push(
            eventSystem.on(EventTypes.EVOLUTION_POINTS_AWARDED.standard, data => {
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
            eventSystem.on(EventTypes.PLAYER_TRAIT_PURCHASED.standard, data => {
                this.addLogMessage(`Acquired trait: ${data.trait.name}`, "event");
            })
        );
        
        // Achievement events - updated to use standardized event names
        this._registeredEvents.push(
            eventSystem.on(EventTypes.ACHIEVEMENTS_COMPLETED.standard, data => {
                data.achievements.forEach(achievement => {
                    this.addLogMessage(`Achievement unlocked: ${achievement.name}`, "event");
                    this.showFeedbackMessage(`Achievement: ${achievement.name}`, 3000, 'achievement', 'achievement');
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
     * @param {string} category - Optional category to identify similar messages for coalescing
     */
    showFeedbackMessage(message, duration = 2000, type = '', category = '') {
        // Add to queue with optional category for message coalescing
        const newMessage = {
            message,
            duration,
            type,
            category,
            timestamp: Date.now()
        };
        
        // If category is provided, look for existing messages of the same category to replace
        if (category) {
            const existingIndex = this.feedbackQueue.findIndex(msg => msg.category === category);
            if (existingIndex >= 0) {
                // Replace existing message with the new one
                this.feedbackQueue[existingIndex] = newMessage;
                
                // If we're replacing the currently displayed message, immediately update it
                if (existingIndex === 0 && this.feedbackActive) {
                    clearTimeout(this._feedbackTimeout);
                    this.showCurrentMessage(newMessage);
                }
                
                return;
            }
        }
        
        // Check for similar messages in rapid succession (within 1 second)
        const similarMessageIndex = this.feedbackQueue.findIndex(msg => {
            const isSimilarType = msg.type === type;
            const isRecentEnough = (Date.now() - msg.timestamp) < 1000;
            const isSimilarMessage = this._calculateMessageSimilarity(msg.message, message) > 0.7;
            return isSimilarType && isRecentEnough && isSimilarMessage;
        });
        
        if (similarMessageIndex >= 0) {
            // Combine the messages
            const existingMsg = this.feedbackQueue[similarMessageIndex];
            const count = existingMsg.count || 1;
            
            // Update the existing message to show the count
            this.feedbackQueue[similarMessageIndex] = {
                ...newMessage,
                message: this._formatCoalescedMessage(message, count + 1),
                count: count + 1,
                duration: Math.max(duration, existingMsg.duration) // Keep the longer duration
            };
            
            // If we're updating the current message, refresh the display
            if (similarMessageIndex === 0 && this.feedbackActive) {
                clearTimeout(this._feedbackTimeout);
                this.showCurrentMessage(this.feedbackQueue[0]);
            }
            
            return;
        }
        
        // Basic queue management - limit queue size to prevent message backlog during fast gameplay
        const maxQueueSize = 5;
        if (this.feedbackQueue.length >= maxQueueSize) {
            // Only keep important messages (errors, warnings) and the most recent ones
            this.feedbackQueue = this.feedbackQueue.filter(msg => 
                msg.type === 'error' || 
                msg.type === 'warning' || 
                msg.type === 'evolution-points' ||
                (Date.now() - msg.timestamp) < 1000
            );
            
            // If still too many, remove the oldest non-critical ones
            if (this.feedbackQueue.length >= maxQueueSize) {
                const oldestIndex = this.feedbackQueue.findIndex(msg => 
                    msg.type !== 'error' && 
                    msg.type !== 'warning' && 
                    msg.type !== 'evolution-points'
                );
                
                if (oldestIndex >= 0) {
                    this.feedbackQueue.splice(oldestIndex, 1);
                }
            }
        }
        
        // Add the new message to the queue
        this.feedbackQueue.push(newMessage);
        
        // Process queue if not active
        if (!this.feedbackActive) {
            this.processFeedbackQueue();
        }
    }
    
    /**
     * Calculate similarity between two messages
     * @param {string} msg1 - First message
     * @param {string} msg2 - Second message
     * @returns {number} Similarity score between 0 and 1
     * @private
     */
    _calculateMessageSimilarity(msg1, msg2) {
        // Remove HTML tags for comparison
        const clean1 = msg1.replace(/<[^>]*>/g, '');
        const clean2 = msg2.replace(/<[^>]*>/g, '');
        
        // If messages are identical, return 1
        if (clean1 === clean2) return 1;
        
        // Split into words and compare
        const words1 = clean1.toLowerCase().split(/\s+/);
        const words2 = clean2.toLowerCase().split(/\s+/);
        
        // Count matching words
        const matches = words1.filter(word => words2.includes(word));
        
        // Calculate similarity score
        return matches.length / Math.max(words1.length, words2.length);
    }
    
    /**
     * Format a message with count for coalesced messages
     * @param {string} message - Original message
     * @param {number} count - Number of occurrences
     * @returns {string} Formatted message
     * @private
     */
    _formatCoalescedMessage(message, count) {
        if (count <= 1) return message;
        
        // For HTML messages, add count before the closing tag of the first element
        if (message.includes('<')) {
            return message.replace('>', `> (×${count})`);
        }
        
        // For plain text, append the count
        return `${message} (×${count})`;
    }
    
    /**
     * Display the current message
     * @param {object} messageData - Message data including message, duration, and type
     */
    showCurrentMessage(messageData) {
        const { message, duration, type, category } = messageData;
        
        // Show message
        if (this.feedbackElement) {
            // Support HTML content
            this.feedbackElement.innerHTML = message;
            
            // Clear any existing classes first
            this.feedbackElement.className = '';
            
            // Check if we should use compact mode for fast gameplay
            const isRapidMessage = this.isRapidGameplay();
            
            // Add styling classes
            this.feedbackElement.classList.add('visible');
            
            // Add type class if provided
            if (type) {
                this.feedbackElement.classList.add(type);
            }
            
            // Add category class if provided (for special styling)
            if (category) {
                this.feedbackElement.classList.add(category);
            }
            
            // For rapid gameplay, use compact mode for most messages
            // Important messages should always be shown in their full format
            const isImportantMessage = type === 'error' || 
                                       type === 'evolution-points' || 
                                       type === 'achievement' || 
                                       category === 'evolution-points' || 
                                       category === 'achievement';
            
            if (isRapidMessage && !isImportantMessage) {
                this.feedbackElement.classList.add('compact');
            }
            
            // Set timeout to hide message and process next in queue
            clearTimeout(this._feedbackTimeout);
            
            // Use shorter duration for rapid non-critical messages
            let actualDuration = duration;
            if (isRapidMessage && !isImportantMessage) {
                actualDuration = Math.min(duration, 1200); // Shorter duration during rapid gameplay
            }
            
            this._feedbackTimeout = setTimeout(() => {
                // Remove the visible class first to trigger fade out
                this.feedbackElement.classList.remove('visible');
                
                // After the transition completes, clear all classes and process the next message
                setTimeout(() => {
                    this.feedbackElement.className = '';
                    this.processFeedbackQueue();
                }, 300); // Match this to the CSS transition duration
            }, actualDuration);
        }
    }
    
    /**
     * Check if we're in rapid gameplay mode based on message frequency
     * @returns {boolean} True if messages are being displayed rapidly
     */
    isRapidGameplay() {
        if (!this._lastMessageTime) {
            this._lastMessageTime = Date.now();
            this._rapidMessageCount = 0;
            return false;
        }
        
        const now = Date.now();
        const timeSinceLastMessage = now - this._lastMessageTime;
        
        // If messages are coming in faster than 2 per second, consider it rapid gameplay
        if (timeSinceLastMessage < 2000) {
            this._rapidMessageCount++;
        } else {
            // Reset the counter if there's been a pause
            this._rapidMessageCount = 0;
        }
        
        this._lastMessageTime = now;
        
        // If we've had 3 or more rapid messages, we're in rapid gameplay mode
        return this._rapidMessageCount >= 2;
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
        const messageData = this.feedbackQueue.shift();
        
        // Show the message
        if (this.feedbackElement) {
            this.showCurrentMessage(messageData);
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