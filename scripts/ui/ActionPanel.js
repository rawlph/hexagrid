/**
 * Manages the action panel UI and action execution
 */
import { eventSystem } from '../core/EventSystem.js';
import { TileComponent } from '../components/TileComponent.js';
import { PlayerComponent } from '../components/PlayerComponent.js';
import { entityManager } from '../core/EntityManager.js';

export class ActionPanel {
    /**
     * Create a new action panel
     * @param {Object} options - Initialization options
     * @param {Object} options.turnSystem - Turn system for the panel
     * @param {Object} options.grid - Grid system for the panel
     */
    constructor(options = {}) {
        // Store dependencies
        this.turnSystem = options.turnSystem || null;
        this.grid = options.grid || null;
        
        // Action buttons - initialize as empty object, will be populated in init()
        this.buttons = {};
        
        // Message system for feedback
        this.messageSystem = null;
        
        // Current player action
        this.currentAction = null;
        
        // Click handlers
        this.clickHandlers = {};
        
        // Event listeners
        this._registeredEvents = [];
    }
    
    /**
     * Initialize the action panel
     * @param {Object} messageSystem - Message system to use
     * @param {Object} options - Options for initialization
     * @param {Object} options.grid - Grid system to use
     * @param {Object} options.turnSystem - Turn system to use
     */
    init(messageSystem, options = {}) {
        console.log("Initializing action panel");
        
        // Clean up any previous initialization first
        this.destroy();
        
        // Reset click handlers
        this.clickHandlers = {};
        
        // Reset registered events
        this._registeredEvents = [];
        
        // Set new dependencies
        this.messageSystem = messageSystem;
        
        // Set turn system if provided
        if (options.turnSystem) {
            this.turnSystem = options.turnSystem;
        }
        
        // Set grid if provided
        if (options.grid) {
            this.grid = options.grid;
        }
        
        // Ensure we have access to the entity manager
        this.entityManager = window.game ? window.game.entityManager : null;
        
        // Get fresh references to DOM buttons
        this.buttons = {
            move: document.getElementById('move-btn'),
            sense: document.getElementById('sense-btn'),
            interact: document.getElementById('interact-btn'),
            stabilize: document.getElementById('stabilize-btn'),
            endTurn: document.getElementById('end-turn-btn')
        };
        
        console.log("ActionPanel initialized with dependencies:", {
            messageSystem: !!this.messageSystem,
            turnSystem: !!this.turnSystem, 
            grid: !!this.grid,
            entityManager: !!this.entityManager,
            buttons: Object.keys(this.buttons).filter(k => !!this.buttons[k])
        });
        
        // Set up button listeners
        this.setupButtonListeners();
        
        // Register game events
        this.registerEventListeners();
        
        // Reset the current action
        this.currentAction = null;
    }
    
    /**
     * Set up button click listeners
     */
    setupButtonListeners() {
        console.log("Setting up ActionPanel button listeners");
        
        // First, remove any existing listeners by cloning the buttons
        for (const actionType in this.buttons) {
            if (this.buttons[actionType]) {
                // Store reference to the original button
                const originalButton = this.buttons[actionType];
                
                // Clone the button to remove all event listeners
                const newButton = originalButton.cloneNode(true);
                if (originalButton.parentNode) {
                    originalButton.parentNode.replaceChild(newButton, originalButton);
                }
                
                // Update our reference
                this.buttons[actionType] = newButton;
                
                console.log(`Cleaned up listeners for ${actionType} button`);
            }
        }
        
        // Move button
        if (this.buttons.move) {
            this.clickHandlers.move = () => this.handleActionButtonClick('move');
            this.buttons.move.addEventListener('click', this.clickHandlers.move);
        }
        
        // Sense button
        if (this.buttons.sense) {
            this.clickHandlers.sense = () => this.handleActionButtonClick('sense');
            this.buttons.sense.addEventListener('click', this.clickHandlers.sense);
        }
        
        // Interact button
        if (this.buttons.interact) {
            this.clickHandlers.interact = () => this.handleActionButtonClick('interact');
            this.buttons.interact.addEventListener('click', this.clickHandlers.interact);
        }
        
        // Stabilize button
        if (this.buttons.stabilize) {
            this.clickHandlers.stabilize = () => this.handleActionButtonClick('stabilize');
            this.buttons.stabilize.addEventListener('click', this.clickHandlers.stabilize);
        }
        
        // End turn button
        if (this.buttons.endTurn) {
            this.clickHandlers.endTurn = () => this.handleEndTurnClick();
            this.buttons.endTurn.addEventListener('click', this.clickHandlers.endTurn);
        }
    }
    
    /**
     * Register game event listeners
     */
    registerEventListeners() {
        // Listen for tile clicks
        this._registeredEvents.push(
            eventSystem.on('tileClicked', this.handleTileClick.bind(this))
        );
        
        // Listen for player movement point changes
        this._registeredEvents.push(
            eventSystem.on('playerMovementPointsChanged', this.updateButtonStates.bind(this))
        );
        
        // Listen for player energy changes
        this._registeredEvents.push(
            eventSystem.on('playerEnergyChanged', this.updateButtonStates.bind(this))
        );
        
        // Listen for turn changes
        this._registeredEvents.push(
            eventSystem.on('turnStart', this.onTurnStart.bind(this))
        );
        
        this._registeredEvents.push(
            eventSystem.on('turnEnd', this.onTurnEnd.bind(this))
        );
        
        // Listen for action changes
        this._registeredEvents.push(
            eventSystem.on('playerActionChanged', this.onPlayerActionChanged.bind(this))
        );
    }
    
    /**
     * Handle action button click
     * @param {string} action - The action type
     */
    handleActionButtonClick(action) {
        console.log(`Action button clicked: ${action}`);
        
        // Handle null action - used when clearing action programmatically
        if (action === null) {
            // Find the player component
            const playerEntity = this.entityManager ? this.entityManager.getEntitiesByTag('player')[0] : null;
            if (playerEntity) {
                const playerComponent = playerEntity.getComponent(PlayerComponent);
                if (playerComponent) {
                    playerComponent.setAction(null);
                    this.currentAction = null;
                    this.updateButtonStates();
                }
            }
            return;
        }
        
        // Get player entity
        if (!this.entityManager) {
            console.error("Entity manager not available in ActionPanel");
            return;
        }
        
        const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
        if (!playerEntity) {
            console.error("Player entity not found");
            return;
        }
        
        const playerComponent = playerEntity.getComponent(PlayerComponent);
        if (!playerComponent) {
            console.error("Player component not found");
            return;
        }
        
        // Check if player has movement points
        if (playerComponent.movementPoints <= 0) {
            this.showFeedback("No movement points left! End your turn.", 'warning', 2000, false, 'resource-depleted');
            return;
        }
        
        // Toggle the action - clicking the same action button will deselect it
        // However, after performing an action, it will stay selected until:
        // 1. Player clicks the action button again to deselect it
        // 2. Player runs out of movement points
        // 3. Player doesn't have enough energy for another action
        // 4. Player ends their turn
        if (playerComponent.currentAction === action) {
            playerComponent.setAction(null);
            this.currentAction = null;
            this.showFeedback(`${this.formatActionName(action)} action deselected`, '', 2000, false, 'action-selection');
        } else {
            playerComponent.setAction(action);
            this.currentAction = action;
            this.showFeedback(`${this.formatActionName(action)} action selected. Click a highlighted tile.`, '', 2000, false, 'action-selection');
        }
        
        // Update button states
        this.updateButtonStates();
    }
    
    /**
     * Handle end turn button click
     */
    handleEndTurnClick() {
        console.log("End turn button clicked");
        
        // Clear current action in the ActionPanel
        this.currentAction = null;
        
        // Also clear it in the PlayerComponent
        const playerEntity = this.entityManager ? this.entityManager.getEntitiesByTag('player')[0] : null;
        if (playerEntity) {
            const playerComponent = playerEntity.getComponent(PlayerComponent);
            if (playerComponent) {
                playerComponent.setAction(null);
            }
        }
        
        let turnEnded = false;
        
        // Use the proper dependency chain to end the turn
        if (this.turnSystem) {
            // Direct dependency - best practice
            turnEnded = true; // Assume success when using direct reference
            this.turnSystem.endTurn();
        } else if (window.game) {
            // Let Game handle it - preferred fallback as it centralizes logic
            turnEnded = window.game.endTurn();
        } else {
            // Last resort error case
            console.error("ActionPanel: Turn system not available and window.game not found.");
            this.showFeedback("Error: Could not end turn. Turn system not found.", 'error', 2000, true, 'turn-system');
            return;
        }
        
        // Only provide feedback for failures - evolution points message will show on success
        if (!turnEnded) {
            this.showFeedback("Failed to end turn", 'error', 2000, true, 'turn-end');
        }
        
        // Don't show "Turn ended" feedback - the evolution points awarded message 
        // and turn start message in the log are sufficient feedback
        
        // Update button states
        this.updateButtonStates();
    }
    
    /**
     * Handle tile click
     * @param {object} data - Tile click data
     */
    handleTileClick(data) {
        console.log(`Tile clicked: (${data.row}, ${data.col})`);
        
        // Get player entity
        const playerEntity = this.entityManager ? this.entityManager.getEntitiesByTag('player')[0] : null;
        if (!playerEntity) {
            console.error("Player entity not found");
            return;
        }
        
        const playerComponent = playerEntity.getComponent(PlayerComponent);
        if (!playerComponent) {
            console.error("Player component not found");
            return;
        }
        
        // If no action is selected, provide feedback
        if (!playerComponent.currentAction) {
            this.showFeedback("Select an action first", 'warning', 2000, false, 'action-error');
            return;
        }
        
        // Check if player has movement points
        if (playerComponent.movementPoints <= 0) {
            this.showFeedback("No movement points left! End your turn.", 'warning', 2000, false, 'resource-depleted');
            return;
        }
        
        // Execute the action
        this.executeAction(playerComponent.currentAction, data.row, data.col, playerComponent);
    }
    
    /**
     * Check if the player has enough energy for an action
     * @param {PlayerComponent} playerComponent - The player component
     * @param {number} energyCost - Energy cost of the action
     * @returns {boolean} True if the player has enough energy
     */
    hasEnoughEnergy(playerComponent, energyCost) {
        if (playerComponent.energy < energyCost) {
            this.showFeedback(`Not enough energy! Need ${energyCost}`, 'warning', 2000, false, 'resource-depleted');
            return false;
        }
        return true;
    }

    /**
     * Update system balance
     * @param {number} chaosDelta - Change in chaos level
     */
    updateSystemBalance(chaosDelta) {
        // Validate input to prevent NaN or invalid values
        if (typeof chaosDelta !== 'number' || isNaN(chaosDelta)) {
            console.warn("ActionPanel.updateSystemBalance: Invalid chaosDelta:", chaosDelta);
            return;
        }
        
        if (this.grid) {
            // Apply reduced effect for better gameplay balance
            const scaledDelta = chaosDelta / 10; 
            this.grid.updateSystemBalance(scaledDelta);
        } else {
            console.error("ActionPanel: Grid not available. Could not update system balance.");
        }
    }

    /**
     * Provide feedback for action execution
     * @param {string} action - The action performed
     * @param {boolean} success - Whether the action was successful
     * @param {string} details - Additional details for feedback
     */
    provideActionFeedback(action, success, details) {
        if (success) {
            this.showFeedback(`${action} successful: ${details}`, 'success', 2000, true, 'action-success');
        } else {
            this.showFeedback(`${action} failed: ${details}`, 'error', 2000, true, 'action-error');
        }
    }

    /**
     * Execute an action
     * @param {string} action - The action type
     * @param {number} row - Target row
     * @param {number} col - Target column
     * @param {PlayerComponent} playerComponent - The player component
     */
    executeAction(action, row, col, playerComponent) {
        console.log(`Executing ${action} action on tile (${row}, ${col})`);
        
        // Check if target is adjacent to player (or same tile for non-move actions)
        const isAdjacentOrSame = 
            (row === playerComponent.row && col === playerComponent.col) || 
            playerComponent.isAdjacentTo(row, col);
            
        if (!isAdjacentOrSame) {
            this.showFeedback(`Cannot ${action} to that tile - too far away`, 'warning', 2000, false, 'action-invalid');
            return;
        }
        
        // Get target tile entity
        const tileEntity = this.entityManager ? this.entityManager.getEntitiesByTag(`tile_${row}_${col}`)[0] : null;
        if (!tileEntity) {
            console.error(`No tile entity found at (${row}, ${col})`);
            return;
        }
        
        const tileComponent = tileEntity.getComponent(TileComponent);
        if (!tileComponent) {
            console.error("Tile has no TileComponent");
            return;
        }
        
        // Get energy cost for the action
        const energyCost = playerComponent.getActionCost(action, row, col);
        if (energyCost === -1) {
            this.showFeedback(`Cannot ${action} on that tile type`, 'warning', 2000, false, 'action-invalid');
            return;
        }
        
        // Check if player has enough energy
        if (!this.hasEnoughEnergy(playerComponent, energyCost)) {
            return;
        }
        
        // Execute the specific action
        let success = false;
        
        // Flag to track if feedback was already shown in the action method
        let feedbackShown = false;
        
        switch (action) {
            case 'move':
                success = this.executeMoveAction(playerComponent, row, col, energyCost);
                // Move action doesn't show its own feedback, so we need to do it here
                if (success) {
                    this.showFeedback(`Moved to (${row}, ${col}). Energy: -${energyCost}`, "success", 2000, true, 'action-move');
                    feedbackShown = true;
                }
                break;
                
            case 'sense':
            case 'interact':
            case 'stabilize':
                // For these actions, feedback is already shown in their respective methods
                if (action === 'sense') {
                    success = this.executeSenseAction(playerComponent, tileComponent, row, col, energyCost);
                } else if (action === 'interact') {
                    success = this.executeInteractAction(playerComponent, tileComponent, row, col, energyCost);
                } else if (action === 'stabilize') {
                    success = this.executeStabilizeAction(playerComponent, tileComponent, row, col, energyCost);
                }
                feedbackShown = true;
                break;
                
            default:
                this.showFeedback(`Unknown action: ${action}`, 'error', 2000, false, 'action-error');
                return;
        }
        
        // Only provide general feedback if specific feedback wasn't already shown
        if (success && !feedbackShown) {
            this.provideActionFeedback(action, success, `${action} successful`);
        } else if (!success && !feedbackShown) {
            this.provideActionFeedback(action, success, `${action} failed`);
        }
        
        // If action was successful, handle resource changes
        if (success) {
            // Use energy
            playerComponent.useEnergy(energyCost);
            
            // Use movement point
            playerComponent.useMovementPoint();
            
            // We no longer clear the action after successful execution
            // This allows players to perform the same action multiple times
            // Instead, check if player can still perform actions
            
            // If player has no movement points left, deselect the action
            if (playerComponent.movementPoints <= 0) {
                playerComponent.setAction(null);
                this.currentAction = null;
                this.showFeedback("No movement points left! Action deselected.", "warning", 2000, true, 'resource-depleted');
            }
            
            // If player doesn't have enough energy for another action, deselect
            else if (playerComponent.energy < energyCost) {
                playerComponent.setAction(null);
                this.currentAction = null;
                this.showFeedback("Not enough energy for another action! Action deselected.", "warning", 2000, true, 'resource-depleted');
            }
            
            // Update UI
            this.updateButtonStates();
        }
    }
    
    /**
     * Execute move action
     * @param {PlayerComponent} playerComponent - The player component
     * @param {number} row - Target row
     * @param {number} col - Target column
     * @param {number} energyCost - Energy cost
     * @returns {boolean} True if successful
     */
    executeMoveAction(playerComponent, row, col, energyCost) {
        // Try to move the player
        const success = playerComponent.updatePosition(row, col);
        
        if (success) {
            this.updateSystemBalance(0); // No chaos change for move
            
            // Emit standardized event
            eventSystem.emit('action:complete:move', {
                player: playerComponent,
                row: row,
                col: col
            });
            
            // Show feedback - will be handled by the calling method
        }
        
        return success;
    }
    
    /**
     * Execute sense action
     * @param {PlayerComponent} playerComponent - The player component
     * @param {TileComponent} tileComponent - The tile component
     * @param {number} row - Target row
     * @param {number} col - Target column
     * @param {number} energyCost - Energy cost
     * @returns {boolean} True if successful
     */
    executeSenseAction(playerComponent, tileComponent, row, col, energyCost) {
        // Mark tile as explored
        tileComponent.markExplored();
        
        // Apply visual effect using the renamed method
        if (typeof tileComponent.applyVisualEffect === 'function') {
            tileComponent.applyVisualEffect('sense-effect');
        } else if (typeof tileComponent.applyEffect === 'function') {
            // Backward compatibility for older method name
            console.warn('ActionPanel: Using deprecated tileComponent.applyEffect method');
            tileComponent.applyEffect('sense-effect');
        }
        
        // Show detailed tile information
        const chaosLevel = Math.round(tileComponent.chaos * 100);
        const orderLevel = Math.round(tileComponent.order * 100);
        
        // Show feedback and add to log
        this.showFeedback(`Sensed ${tileComponent.type} tile: ${tileComponent.getChaosDescription()} (${orderLevel}% order, ${chaosLevel}% chaos)`, "success", 2000, true, 'action-sense');
        
        // Emit standardized event only (remove legacy event)
        eventSystem.emit('action:complete:sense', {
            player: playerComponent,
            tileComponent: tileComponent,
            row: row,
            col: col,
            chaosLevel: tileComponent.chaos,
            orderLevel: tileComponent.order
        });
        
        return true;
    }
    
    /**
     * Execute interact action
     * @param {PlayerComponent} playerComponent - The player component
     * @param {TileComponent} tileComponent - The tile component
     * @param {number} row - Target row
     * @param {number} col - Target column
     * @param {number} energyCost - Energy cost
     * @returns {boolean} True if successful
     */
    executeInteractAction(playerComponent, tileComponent, row, col, energyCost) {
        // Apply visual effect using the renamed method
        if (typeof tileComponent.applyVisualEffect === 'function') {
            tileComponent.applyVisualEffect('interact-effect');
        } else if (typeof tileComponent.applyEffect === 'function') {
            // Backward compatibility for older method name
            console.warn('ActionPanel: Using deprecated tileComponent.applyEffect method');
            tileComponent.applyEffect('interact-effect');
        }
        
        // Mark tile as explored
        tileComponent.markExplored();
        
        let feedbackMessage = "";
        
        // Random effect - slightly biased towards increasing chaos to make it easier to gain chaos points
        const rand = Math.random();
        
        if (rand < 0.2) {
            // Reduce chaos
            const oldChaos = tileComponent.chaos;
            const newChaos = Math.max(0, oldChaos - 0.1 - Math.random() * 0.1);
            tileComponent.updateChaosLevel(newChaos - oldChaos);
            
            // Update system balance
            this.updateSystemBalance(newChaos - oldChaos);
            
            feedbackMessage = `Interaction reduced chaos slightly`;
        } else if (rand < 0.7) {  // Increased from 0.6 to 0.7 - more chance to increase chaos
            // Increase chaos
            const oldChaos = tileComponent.chaos;
            const newChaos = Math.min(1, oldChaos + 0.15 + Math.random() * 0.15);  // Increased from 0.1 to 0.15 for both base and random
            tileComponent.updateChaosLevel(newChaos - oldChaos);
            
            // Update system balance
            this.updateSystemBalance(newChaos - oldChaos);
            
            feedbackMessage = `Interaction increased chaos significantly`;
        } else {
            // Change tile type
            const tileTypes = ['normal', 'forest', 'mountain', 'desert'];
            const newType = tileTypes[Math.floor(Math.random() * tileTypes.length)];
            
            if (newType !== tileComponent.type) {
                tileComponent.changeType(newType);
                feedbackMessage = `Interaction transformed tile to ${newType}`;
            } else {
                feedbackMessage = `Interaction had no effect on tile type`;
            }
        }
        
        // Show feedback and add to log
        this.showFeedback(feedbackMessage, "success", 2000, true, 'action-interact');
        
        // Emit standardized event only (remove legacy event)
        eventSystem.emit('action:complete:interact', {
            player: playerComponent,
            tileComponent: tileComponent,
            row: row,
            col: col
        });
        
        return true;
    }
    
    /**
     * Execute stabilize action
     * @param {PlayerComponent} playerComponent - Player component
     * @param {TileComponent} tileComponent - Tile component
     * @param {number} row - Target row
     * @param {number} col - Target column
     * @param {number} energyCost - Energy cost
     * @returns {boolean} True if successful
     */
    executeStabilizeAction(playerComponent, tileComponent, row, col, energyCost) {
        // Ensure traits array exists
        if (!playerComponent.traits) {
            console.warn('ActionPanel: playerComponent.traits not initialized, creating empty array');
            playerComponent.traits = [];
        }
        
        // Apply visual effect using the renamed method
        if (typeof tileComponent.applyVisualEffect === 'function') {
            tileComponent.applyVisualEffect('stabilize-effect');
        } else if (typeof tileComponent.applyEffect === 'function') {
            // Backward compatibility for older method name
            console.warn('ActionPanel: Using deprecated tileComponent.applyEffect method');
            tileComponent.applyEffect('stabilize-effect');
        }
        
        // Mark tile as explored
        tileComponent.markExplored();
        
        // Check if already fully stabilized
        if (tileComponent.chaos === 0) {
            this.showFeedback("Tile is already fully stabilized", 'info', 2000, false, 'action-stabilized');
            return false;
        }
        
        // Calculate stabilization amount (stronger for players with the trait)
        let stabilizeAmount = 0.2 + Math.random() * 0.2;
        
        // Check for powerful stabilizer trait with defensive programming
        const hasPowerfulStabilizer = Array.isArray(playerComponent.traits) && 
            playerComponent.traits.some(t => t && t.id === 'powerful_stabilizer');
            
        if (hasPowerfulStabilizer) {
            stabilizeAmount *= 1.5;
        }
        
        // Apply stabilization
        const oldChaos = tileComponent.chaos;
        const newChaos = Math.max(0, oldChaos - stabilizeAmount);
        const chaosDelta = newChaos - oldChaos; // This will be negative
        tileComponent.updateChaosLevel(chaosDelta);
        
        // Update system-wide balance
        this.updateSystemBalance(chaosDelta);
        
        // Calculate the reduction percentage
        const reductionPct = Math.round((oldChaos - newChaos) * 100);
        
        // Show feedback with more detail
        if (hasPowerfulStabilizer) {
            this.showFeedback(`Stabilized tile with enhanced effect (${reductionPct}%)`, "success", 2000, true, 'action-stabilized');
        } else {
            this.showFeedback(`Stabilized tile, reducing chaos by ${reductionPct}%`, "success", 2000, true, 'action-stabilized');
        }
        
        // Emit standardized event only (remove legacy event)
        eventSystem.emit('action:complete:stabilize', {
            player: playerComponent,
            tileComponent: tileComponent,
            row: row,
            col: col,
            oldChaos: oldChaos,
            newChaos: newChaos,
            reduction: oldChaos - newChaos
        });
        
        return true;
    }
    
    /**
     * Update button states based on player state
     */
    updateButtonStates() {
        // Get player component
        const playerEntity = this.entityManager ? this.entityManager.getEntitiesByTag('player')[0] : null;
        if (!playerEntity) return;
        
        const playerComponent = playerEntity.getComponent(PlayerComponent);
        if (!playerComponent) return;
        
        // Remove active class from all buttons
        for (const button of Object.values(this.buttons)) {
            if (button) button.classList.remove('active');
        }
        
        // Add active class to current action
        if (playerComponent.currentAction && this.buttons[playerComponent.currentAction]) {
            this.buttons[playerComponent.currentAction].classList.add('active');
        }
        
        // Disable buttons if player has no movement points
        const hasMovementPoints = playerComponent.movementPoints > 0;
        
        if (this.buttons.move) this.buttons.move.disabled = !hasMovementPoints;
        if (this.buttons.sense) this.buttons.sense.disabled = !hasMovementPoints;
        if (this.buttons.interact) this.buttons.interact.disabled = !hasMovementPoints;
        if (this.buttons.stabilize) this.buttons.stabilize.disabled = !hasMovementPoints;
    }
    
    /**
     * Display feedback message
     * @param {string} message - The message to show
     * @param {string} type - Optional message type (success, error, warning)
     * @param {number} duration - How long to show the message in ms
     * @param {boolean} addToLog - Whether to also add this message to the game log
     * @param {string} category - Optional category for message coalescing
     */
    showFeedback(message, type = '', duration = 2000, addToLog = false, category = '') {
        console.log(`Feedback: ${message}`);
        
        if (this.messageSystem) {
            // Show feedback popup with category for coalescing similar messages
            this.messageSystem.showFeedbackMessage(message, duration, type, category);
            
            // Also add to game log if requested (for important messages)
            if (addToLog) {
                // Convert message type to log type
                let logType = 'system';
                if (type === 'success') logType = 'player';
                if (type === 'error' || type === 'warning') logType = 'event';
                
                this.messageSystem.addLogMessage(message, logType);
            }
        }
    }
    
    /**
     * Format action name for display
     * @param {string} action - The action name
     * @returns {string} Formatted action name
     */
    formatActionName(action) {
        if (!action) return 'No';
        return action.charAt(0).toUpperCase() + action.slice(1);
    }
    
    /**
     * Handle turn start event
     * @param {object} data - Event data
     */
    onTurnStart(data) {
        // Reset action selection in the ActionPanel
        this.currentAction = null;
        
        // Also ensure the PlayerComponent's action is reset
        const playerEntity = this.entityManager ? this.entityManager.getEntitiesByTag('player')[0] : null;
        if (playerEntity) {
            const playerComponent = playerEntity.getComponent(PlayerComponent);
            if (playerComponent) {
                playerComponent.setAction(null);
            }
        }
        
        // Update button states
        this.updateButtonStates();
    }
    
    /**
     * Handle turn end event
     * @param {object} data - Event data
     */
    onTurnEnd(data) {
        // Nothing specific to do here yet
    }
    
    /**
     * Handle player action changed event
     * @param {object} data - Event data
     */
    onPlayerActionChanged(data) {
        this.currentAction = data.action;
        this.updateButtonStates();
    }
    
    /**
     * Clean up resources and event listeners
     */
    destroy() {
        console.log("Destroying action panel");
        
        // Reset action selection state
        this.currentAction = null;
        
        // Remove game event listeners
        if (Array.isArray(this._registeredEvents)) {
            for (const registration of this._registeredEvents) {
                if (registration) {
                    eventSystem.off(registration);
                }
            }
            this._registeredEvents = [];
        }
        
        // Safer approach - clone all buttons to remove any event listeners
        for (const actionType in this.buttons) {
            if (this.buttons[actionType] && this.buttons[actionType].parentNode) {
                const originalButton = this.buttons[actionType];
                const newButton = originalButton.cloneNode(true);
                originalButton.parentNode.replaceChild(newButton, originalButton);
                
                // Update our reference
                this.buttons[actionType] = newButton;
            }
        }
        
        // Also clear clickHandlers for good measure
        this.clickHandlers = {};
        
        // Clear references to systems
        this.messageSystem = null;
        this.turnSystem = null;
        this.grid = null;
        this.entityManager = null;
        
        console.log("Action panel destroyed successfully");
    }
} 