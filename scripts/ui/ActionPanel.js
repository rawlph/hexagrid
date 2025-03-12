/**
 * Manages the action panel UI and action execution
 */
import { eventSystem } from '../core/EventSystem.js';
import { TileComponent } from '../components/TileComponent.js';
import { PlayerComponent } from '../components/PlayerComponent.js';
import { entityManager } from '../core/EntityManager.js';

export class ActionPanel {
    /**
     * Create a new ActionPanel
     * @param {Object} options - Configuration options
     * @param {Object} options.turnSystem - The turn system to use (optional)
     */
    constructor(options = {}) {
        // Store dependencies
        this.turnSystem = options.turnSystem || null;
        
        // Action buttons
        this.buttons = {
            move: document.getElementById('move-btn'),
            sense: document.getElementById('sense-btn'),
            interact: document.getElementById('interact-btn'),
            stabilize: document.getElementById('stabilize-btn'),
            endTurn: document.getElementById('end-turn-btn')
        };
        
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
     * @param {MessageSystem} messageSystem - The message system for feedback
     * @param {Object} options - Additional initialization options
     * @param {Object} options.turnSystem - The turn system to use (optional)
     */
    init(messageSystem, options = {}) {
        console.log("Initializing action panel");
        
        this.messageSystem = messageSystem;
        
        // Set turn system if provided
        if (options.turnSystem) {
            this.turnSystem = options.turnSystem;
        }
        
        // Set up button listeners
        this.setupButtonListeners();
        
        // Register game events
        this.registerEventListeners();
    }
    
    /**
     * Set up button click listeners
     */
    setupButtonListeners() {
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
        
        // Get player entity
        const playerEntity = entityManager.getEntitiesByTag('player')[0];
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
            this.showFeedback("No movement points left! End your turn.");
            return;
        }
        
        // Toggle the action
        if (playerComponent.currentAction === action) {
            playerComponent.setAction(null);
            this.currentAction = null;
            this.showFeedback(`${this.formatActionName(action)} action deselected`);
        } else {
            playerComponent.setAction(action);
            this.currentAction = action;
            this.showFeedback(`${this.formatActionName(action)} action selected. Click a highlighted tile.`);
        }
        
        // Update button states
        this.updateButtonStates();
    }
    
    /**
     * Handle end turn button click
     */
    handleEndTurnClick() {
        console.log("End turn button clicked");
        
        // Clear current action
        this.currentAction = null;
        
        // Get player entity and clear its action
        const playerEntity = entityManager.getEntitiesByTag('player')[0];
        if (playerEntity) {
            const playerComponent = playerEntity.getComponent(PlayerComponent);
            if (playerComponent) {
                playerComponent.setAction(null);
            }
        }
        
        // Use the injected turn system if available, otherwise fall back to global
        if (this.turnSystem) {
            this.turnSystem.endTurn();
        } else if (window.game && window.game.turnSystem) {
            // Legacy support for global reference
            console.warn('ActionPanel: Using global turnSystem reference. Consider injecting turnSystem directly.');
            window.game.turnSystem.endTurn();
        } else {
            console.error("ActionPanel: Turn system not available. Please inject it during initialization.");
            this.showFeedback("Error: Could not end turn. Turn system not found.");
        }
        
        this.showFeedback("Turn ended");
    }
    
    /**
     * Handle tile click
     * @param {object} data - Tile click data
     */
    handleTileClick(data) {
        console.log(`Tile clicked: (${data.row}, ${data.col})`);
        
        // Get player entity
        const playerEntity = entityManager.getEntitiesByTag('player')[0];
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
            this.showFeedback("Select an action first");
            return;
        }
        
        // Check if player has movement points
        if (playerComponent.movementPoints <= 0) {
            this.showFeedback("No movement points left! End your turn.");
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
            this.showFeedback(`Not enough energy! Need ${energyCost}`);
            return false;
        }
        return true;
    }

    /**
     * Update system balance
     * @param {number} chaosDelta - Change in chaos level
     */
    updateSystemBalance(chaosDelta) {
        if (window.game && window.game.grid) {
            console.warn('ActionPanel: Using global game.grid reference. Consider injecting grid directly.');
            window.game.grid.updateSystemBalance(chaosDelta / 10); // Reduced effect on whole system
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
            this.showFeedback(`${action} successful: ${details}`);
        } else {
            this.showFeedback(`${action} failed: ${details}`);
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
            this.showFeedback(`Cannot ${action} to that tile - too far away`);
            return;
        }
        
        // Get target tile entity
        const tileEntity = entityManager.getEntitiesByTag(`tile_${row}_${col}`)[0];
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
            this.showFeedback(`Cannot ${action} on that tile type`);
            return;
        }
        
        // Check if player has enough energy
        if (!this.hasEnoughEnergy(playerComponent, energyCost)) {
            return;
        }
        
        // Execute the specific action
        let success = false;
        let details = '';
        
        switch (action) {
            case 'move':
                success = this.executeMoveAction(playerComponent, row, col, energyCost);
                details = `Moved to (${row}, ${col}). Energy: -${energyCost}`;
                break;
                
            case 'sense':
                success = this.executeSenseAction(playerComponent, tileComponent, row, col, energyCost);
                details = `Sensed ${tileComponent.type} tile`;
                break;
                
            case 'interact':
                success = this.executeInteractAction(playerComponent, tileComponent, row, col, energyCost);
                details = `Interacted with tile`;
                break;
                
            case 'stabilize':
                success = this.executeStabilizeAction(playerComponent, tileComponent, row, col, energyCost);
                details = `Stabilized tile`;
                break;
                
            default:
                this.showFeedback(`Unknown action: ${action}`);
                return;
        }
        
        // Provide feedback
        this.provideActionFeedback(action, success, details);
        
        // If action was successful, handle resource changes
        if (success) {
            // Use energy
            playerComponent.useEnergy(energyCost);
            
            // Use movement point
            playerComponent.useMovementPoint();
            
            // Clear action
            playerComponent.setAction(null);
            this.currentAction = null;
            
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
        
        this.showFeedback(`Sensed ${tileComponent.type} tile: ${tileComponent.getChaosDescription()} (${orderLevel}% order, ${chaosLevel}% chaos)`);
        
        // Emit event with standardized name
        eventSystem.emit('action:complete:sense', {
            player: playerComponent,
            tileComponent: tileComponent,
            row: row,
            col: col,
            chaosLevel: tileComponent.chaos,
            orderLevel: tileComponent.order
        });
        
        // Legacy event name for backward compatibility
        eventSystem.emit('senseComplete', {
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
        
        // Random effect
        const rand = Math.random();
        
        if (rand < 0.3) {
            // Reduce chaos
            const oldChaos = tileComponent.chaos;
            const newChaos = Math.max(0, oldChaos - 0.1 - Math.random() * 0.1);
            tileComponent.updateChaosLevel(newChaos - oldChaos);
            
            // Update system balance
            this.updateSystemBalance(newChaos - oldChaos);
            
            this.showFeedback(`Interaction reduced chaos slightly`);
        } else if (rand < 0.6) {
            // Increase chaos
            const oldChaos = tileComponent.chaos;
            const newChaos = Math.min(1, oldChaos + 0.1 + Math.random() * 0.1);
            tileComponent.updateChaosLevel(newChaos - oldChaos);
            
            // Update system balance
            this.updateSystemBalance(newChaos - oldChaos);
            
            this.showFeedback(`Interaction increased chaos slightly`);
        } else {
            // Change tile type
            const tileTypes = ['normal', 'forest', 'mountain', 'desert'];
            const newType = tileTypes[Math.floor(Math.random() * tileTypes.length)];
            
            if (newType !== tileComponent.type) {
                tileComponent.changeType(newType);
                this.showFeedback(`Interaction transformed tile to ${newType}`);
            } else {
                this.showFeedback(`Interaction had no effect on tile type`);
            }
        }
        
        // Emit event with standardized name
        eventSystem.emit('action:complete:interact', {
            player: playerComponent,
            tileComponent: tileComponent,
            row: row,
            col: col
        });
        
        // Legacy event name for backward compatibility
        eventSystem.emit('interactComplete', {
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
            this.showFeedback("Tile is already fully stabilized");
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
            this.showFeedback(`Stabilized tile with enhanced effect (${reductionPct}%)`);
        } else {
            this.showFeedback(`Stabilized tile, reducing chaos by ${reductionPct}%`);
        }
        
        // Emit event with standardized name
        eventSystem.emit('action:complete:stabilize', {
            player: playerComponent,
            tileComponent: tileComponent,
            row: row,
            col: col,
            oldChaos: oldChaos,
            newChaos: newChaos,
            reduction: oldChaos - newChaos
        });
        
        // Legacy event name for backward compatibility
        eventSystem.emit('stabilizeComplete', {
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
        const playerEntity = entityManager.getEntitiesByTag('player')[0];
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
     */
    showFeedback(message) {
        console.log(`Feedback: ${message}`);
        
        if (this.messageSystem) {
            this.messageSystem.showFeedbackMessage(message);
        }
    }
    
    /**
     * Format action name for display
     * @param {string} action - The action name
     * @returns {string} Formatted action name
     */
    formatActionName(action) {
        return action.charAt(0).toUpperCase() + action.slice(1);
    }
    
    /**
     * Handle turn start event
     * @param {object} data - Event data
     */
    onTurnStart(data) {
        // Reset action selection
        this.currentAction = null;
        
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
        
        // Remove event listeners
        for (let i = 0; i < this._registeredEvents.length; i++) {
            eventSystem.off(this._registeredEvents[i]);
        }
        this._registeredEvents = [];
        
        // Remove button listeners
        for (const action in this.clickHandlers) {
            const button = this.buttons[action];
            if (button && this.clickHandlers[action]) {
                button.removeEventListener('click', this.clickHandlers[action]);
            }
        }
        this.clickHandlers = {};
        
        // Clear global reference
        if (window.actionPanel === this) {
            window.actionPanel = null;
        }
    }
} 