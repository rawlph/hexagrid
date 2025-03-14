/**
 * Manages the action panel UI and action execution
 */
import { eventSystem } from '../core/EventSystem.js';
import { TileComponent } from '../components/TileComponent.js';
import { PlayerComponent } from '../components/PlayerComponent.js';
import { entityManager } from '../core/EntityManager.js';
import { EventTypes } from '../core/EventTypes.js';
import { eventMediator } from '../core/EventMediator.js';

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
        
        // Mark as initialized
        this._initialized = false;
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
        
        // Only clean up if this isn't the first initialization
        // This prevents the destroy-recreate cycle
        if (this._initialized) {
            // Clean up any previous initialization
            this.destroy();
        }
        
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
        
        // Mark as initialized
        this._initialized = true;
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
            eventSystem.on(EventTypes.TILE_CLICKED.standard, this.handleTileClick.bind(this))
        );
        
        // Listen for player movement point changes
        this._registeredEvents.push(
            eventSystem.on(EventTypes.PLAYER_MOVEMENT_POINTS_CHANGED.standard, this.updateButtonStates.bind(this))
        );
        
        // Listen for player energy changes
        this._registeredEvents.push(
            eventSystem.on(EventTypes.PLAYER_ENERGY_CHANGED.standard, this.updateButtonStates.bind(this))
        );
        
        // Listen for turn changes
        this._registeredEvents.push(
            eventSystem.on(EventTypes.TURN_START.standard, this.onTurnStart.bind(this))
        );
        
        this._registeredEvents.push(
            eventSystem.on(EventTypes.TURN_END.standard, this.onTurnEnd.bind(this))
        );
        
        // Listen for action changes
        this._registeredEvents.push(
            eventSystem.on(EventTypes.PLAYER_ACTION_CHANGED.standard, this.onPlayerActionChanged.bind(this))
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
        
        // Only clear the PlayerComponent action if it's not already null
        const playerEntity = this.entityManager ? this.entityManager.getEntitiesByTag('player')[0] : null;
        if (playerEntity) {
            const playerComponent = playerEntity.getComponent(PlayerComponent);
            if (playerComponent && playerComponent.currentAction !== null) {
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
        
        // Check if the target tile is adjacent to the player for all actions
        const isAdjacent = playerComponent.isAdjacentTo(data.row, data.col);
        
        // For move action, the target must be adjacent
        if (playerComponent.currentAction === 'move' && !isAdjacent) {
            this.showFeedback("You can only move to adjacent tiles", 'warning', 2000, false, 'action-error');
            return;
        }
        
        // Execute the action
        this.executeAction(playerComponent.currentAction, data.row, data.col, playerComponent);
    }
    
    /**
     * Update system balance
     * @param {number} chaosDelta - Change in chaos level (-1 to 1) 
     * @param {string} sourceAction - The action that caused the change (optional)
     */
    updateSystemBalance(chaosDelta, sourceAction = null) {
        if (!this.grid) return;
        
        console.log(`ActionPanel: Current balance before update: ${this.grid.getSystemBalance().chaos.toFixed(3)} Chaos / ${this.grid.getSystemBalance().order.toFixed(3)} Order`);
        
        // Skip tiny changes that wouldn't actually affect the system
        if (typeof chaosDelta !== 'number' || Math.abs(chaosDelta) < 0.001) {
            return;
        }
        
        // Apply scaling based on the action type
        let scalingFactor = 1;
        
        if (sourceAction === 'stabilize') {
            // Changed from 150 to 15 for testing - stabilize has less impact on system balance
            scalingFactor = 15; 
            console.log(`DEBUG - Stabilize: Original chaos delta: ${chaosDelta}, scaled by ${scalingFactor}`);
        } else if (sourceAction === 'sense') {
            // Sense has minor impact on system balance
            scalingFactor = 20;
        } else if (sourceAction === 'interact') {
            // Interact has moderate impact on system balance
            scalingFactor = 10;
        } else if (sourceAction === 'move') {
            // Move has minimal impact
            scalingFactor = 30;
        } else {
            // Default scaling
            scalingFactor = 5;
        }
        
        // Apply scaling
        const effectiveDelta = chaosDelta / scalingFactor;
        
        console.log(`ActionPanel: Updating system balance by ${effectiveDelta.toFixed(4)} (original: ${chaosDelta.toFixed(4)}, scaled by ${scalingFactor})`);
        
        // Update the grid's system balance
        this.grid.updateSystemBalance(effectiveDelta, sourceAction);
        
        // Verify the binary duality principle (chaos + order = 1)
        const newBalance = this.grid.getSystemBalance();
        const sum = newBalance.chaos + newBalance.order;
        if (Math.abs(sum - 1.0) > 0.001) {
            console.error(`Balance error: chaos (${newBalance.chaos}) + order (${newBalance.order}) = ${sum}, not 1.0`);
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
            this.showFeedback(`${action} failed: ${details}`, 'warning', 2000, false, 'action-failed');
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
        
        // Get target tile component
        const targetEntity = this.entityManager.getEntitiesByTag(`tile_${row}_${col}`)[0];
        
        if (!targetEntity) {
            console.error(`No tile entity found at (${row}, ${col})`);
            this.showFeedback(`Cannot ${action} - tile not found`, 'error', 2000, false, 'action-error');
            return;
        }
        
        const tileComponent = targetEntity.getComponent(TileComponent);
        
        if (!tileComponent) {
            console.error(`No tile component found at (${row}, ${col})`);
            this.showFeedback(`Cannot ${action} - invalid tile`, 'error', 2000, false, 'action-error');
            return;
        }
        
        // Check if energy cost can be paid
        const energyCost = playerComponent.getActionCost(action, row, col);
        if (energyCost < 0) {
            this.showFeedback(`Cannot ${action} here`, 'warning', 2000, false, 'action-invalid');
            return;
        }
        
        if (playerComponent.energy < energyCost) {
            this.showFeedback(`Not enough energy for ${action} (need ${energyCost})`, 'warning', 2000, false, 'resource-depleted');
            return;
        }
        
        // Check adjacency for all actions (standardizing behavior)
        const isAdjacent = playerComponent.isAdjacentTo(row, col);
        if (!isAdjacent) {
            this.showFeedback(`You can only ${action} adjacent tiles`, 'warning', 2000, false, 'action-error');
            return;
        }
        
        // Execute the specific action
        let success = false;
        const actionData = {
            player: playerComponent,
            tileComponent: tileComponent,
            row: row,
            col: col,
            energyCost: energyCost
        };
        
        // Execute the appropriate action
        switch (action) {
            case 'move':
                success = this.executeMoveAction(actionData);
                break;
                
            case 'sense':
                success = this.executeSenseAction(actionData);
                break;
                
            case 'interact':
                success = this.executeInteractAction(actionData);
                break;
                
            case 'stabilize':
                success = this.executeStabilizeAction(actionData);
                break;
                
            default:
                this.showFeedback(`Unknown action: ${action}`, 'warning', 2000, false, 'action-invalid');
                return;
        }
        
        // If action failed, show feedback and return
        if (!success) {
            this.showFeedback(`${action} action failed`, 'warning', 2000, false, 'action-failed');
            return;
        }
        
        // If action was successful, consume resources
        playerComponent.useEnergy(energyCost);
        playerComponent.useMovementPoints(1);
        
        // Check if player can continue actions
        if (playerComponent.movementPoints <= 0) {
            playerComponent.setAction(null);
            this.currentAction = null;
            this.showFeedback("No movement points left! Action deselected.", "warning", 2000, true, 'resource-depleted');
        } else if (playerComponent.energy < energyCost) {
            playerComponent.setAction(null);
            this.currentAction = null;
            this.showFeedback("Not enough energy for another action! Action deselected.", "warning", 2000, true, 'resource-depleted');
        }
        
        // Update UI
        this.updateButtonStates();
    }
    
    /**
     * Execute a move action
     * @param {Object} actionData - Data for the action
     * @param {PlayerComponent} actionData.player - Player component
     * @param {TileComponent} actionData.tileComponent - Tile component
     * @param {number} actionData.row - Target row
     * @param {number} actionData.col - Target column
     * @param {number} actionData.energyCost - Energy cost
     * @returns {boolean} True if successful
     */
    executeMoveAction(actionData) {
        const { player, tileComponent, row, col } = actionData;
        
        // Try to move the player
        const success = player.updatePosition(row, col);
        
        if (success) {
            // Update system balance (move has no chaos effect)
            this.updateSystemBalance(0, 'move');
            
            // Emit standardized event
            eventSystem.emitStandardized(
                EventTypes.ACTION_COMPLETE_MOVE.legacy,
                EventTypes.ACTION_COMPLETE_MOVE.standard,
                {
                    player: player,
                    tileComponent: tileComponent,
                    row: row,
                    col: col,
                    timestamp: Date.now(),
                    isStandardized: true
                }
            );
            
            // Show feedback
            this.showFeedback(`Moved to (${row}, ${col})`, "success", 2000, true, 'action-move');
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Execute a sense action
     * @param {Object} actionData - Data for the action
     * @param {PlayerComponent} actionData.player - Player component
     * @param {TileComponent} actionData.tileComponent - Tile component
     * @param {number} actionData.row - Target row
     * @param {number} actionData.col - Target column
     * @param {number} actionData.energyCost - Energy cost
     * @returns {boolean} True if successful
     */
    executeSenseAction(actionData) {
        const { player, tileComponent, row, col } = actionData;
        
        // Get tile info
        const tileInfo = tileComponent.getData();
        
        // Mark tile as explored
        tileComponent.markExplored();
        
        // Update system balance
        const chaosDelta = 0.05; // Sensing increases chaos slightly
        this.updateSystemBalance(chaosDelta, 'sense');
        
        // Emit standardized event
        eventSystem.emitStandardized(
            EventTypes.ACTION_COMPLETE_SENSE.legacy,
            EventTypes.ACTION_COMPLETE_SENSE.standard,
            {
                player: player,
                tileComponent: tileComponent,
                row: row,
                col: col,
                tileInfo: tileInfo,
                timestamp: Date.now(),
                isStandardized: true
            }
        );
        
        // Show feedback
        this.showFeedback(`Sensed ${tileComponent.type} tile at (${row}, ${col})`, "success", 2000, true, 'action-sense');
        
        return true;
    }
    
    /**
     * Execute an interact action
     * @param {Object} actionData - Data for the action
     * @param {PlayerComponent} actionData.player - Player component
     * @param {TileComponent} actionData.tileComponent - Tile component
     * @param {number} actionData.row - Target row
     * @param {number} actionData.col - Target column
     * @param {number} actionData.energyCost - Energy cost
     * @returns {boolean} True if successful
     */
    executeInteractAction(actionData) {
        const { player, tileComponent, row, col } = actionData;
        
        // Get tile type
        const tileType = tileComponent.type;
        
        // Handle interaction based on tile type
        let interactionResult = 'No effect';
        let chaosDelta = 0;
        
        switch (tileType) {
            case 'energy':
                // Energy tiles restore energy
                const energyRestored = 5;
                player.addEnergy(energyRestored);
                interactionResult = `Restored ${energyRestored} energy`;
                chaosDelta = 0.1; // Interacting with energy increases chaos
                
                // Emit standardized event for energy gathered from tile
                eventSystem.emitStandardized(
                    EventTypes.ENERGY_GATHERED_FROM_TILE.legacy,
                    EventTypes.ENERGY_GATHERED_FROM_TILE.standard,
                    {
                        player: player,
                        tileComponent: tileComponent,
                        row: row,
                        col: col,
                        amount: energyRestored,
                        timestamp: Date.now(),
                        isStandardized: true
                    },
                    EventTypes.ENERGY_GATHERED_FROM_TILE.deprecation
                );
                break;
                
            case 'chaotic':
                // Chaotic tiles increase system chaos when interacted with
                chaosDelta = 0.3;
                interactionResult = 'Increased chaos level';
                break;
                
            case 'orderly':
                // Orderly tiles decrease system chaos when interacted with
                chaosDelta = -0.3;
                interactionResult = 'Decreased chaos level';
                break;
                
            case 'flow':
                // Flow tiles restore movement points
                const movementRestored = 2;
                player.addMovementPoints(movementRestored);
                interactionResult = `Restored ${movementRestored} movement points`;
                chaosDelta = 0;
                break;
                
            case 'normal':
                // Normal tiles have a small chaos effect
                chaosDelta = 0.05;
                interactionResult = 'Slight chaos increase';
                break;
                
            case 'obstacle':
                // No effect for obstacles
                interactionResult = 'Cannot interact with obstacles';
                chaosDelta = 0;
                break;
                
            default:
                // No effect for other tile types
                chaosDelta = 0.05; // Small chaos increase for basic interaction
                break;
        }
        
        // Update system balance
        this.updateSystemBalance(chaosDelta, 'interact');
        
        // Emit standardized event
        eventSystem.emitStandardized(
            EventTypes.ACTION_COMPLETE_INTERACT.legacy,
            EventTypes.ACTION_COMPLETE_INTERACT.standard,
            {
                player: player,
                tileComponent: tileComponent,
                row: row,
                col: col,
                result: interactionResult,
                chaosDelta: chaosDelta,
                timestamp: Date.now(),
                isStandardized: true
            }
        );
        
        // Show feedback
        this.showFeedback(`Interacted with ${tileType} tile: ${interactionResult}`, "success", 2000, true, 'action-interact');
        
        return true;
    }
    
    /**
     * Execute a stabilize action
     * @param {Object} actionData - Data for the action
     * @param {PlayerComponent} actionData.player - Player component
     * @param {TileComponent} actionData.tileComponent - Tile component
     * @param {number} actionData.row - Target row
     * @param {number} actionData.col - Target column
     * @param {number} actionData.energyCost - Energy cost
     * @returns {boolean} True if successful
     */
    executeStabilizeAction(actionData) {
        const { player, tileComponent, row, col } = actionData;
        
        // Calculate stabilization effect
        const currentChaos = tileComponent.chaos;
        
        // Skip if chaos is already at minimum
        if (currentChaos <= 0) {
            this.showFeedback(`Tile at (${row}, ${col}) is already fully stabilized.`, "warning", 2000, false, 'action-stabilize');
            return false;
        }
        
        // Reduce chaos based on stabilization power
        // Base reduction is 30% of current chaos
        let stabilizationPower = 0.3;
        
        // Apply trait modifiers for stabilization power
        if (player.traits) {
            for (const trait of player.traits) {
                if (trait.stabilizationBonus) {
                    stabilizationPower += trait.stabilizationBonus;
                }
            }
        }
        
        // Apply stabilization with a minimum reduction of 10%
        const chaosDelta = -Math.max(currentChaos * stabilizationPower, 0.1);
        
        console.log(`ActionPanel: Stabilizing tile at (${row}, ${col}) - Current chaos: ${currentChaos.toFixed(3)}, Delta: ${chaosDelta.toFixed(3)}`);
        
        // Use the Event Mediator to handle the stabilize action
        const result = eventMediator.handleStabilizeAction({
            tileComponent: tileComponent,
            chaosDelta: chaosDelta,
            player: player,
            row: row,
            col: col,
            grid: this.grid
        });
        
        if (result.success) {
            // Create an informative feedback message using the result data
            let feedbackMessage = `Stabilized tile at (${row}, ${col}): Chaos reduced by ${result.reductionPercent}%`;
            
            // Add world balance information if available
            if (Math.abs(result.systemBalanceChange) > 0.0001) {
                const worldChangePercent = Math.abs(Math.round(result.systemBalanceChange * 1000) / 10);
                
                // Use one decimal place precision instead of rounding to integers
                const worldChaosPercent = (result.systemBalanceAfter * 100).toFixed(1);
                const worldOrderPercent = ((1 - result.systemBalanceAfter) * 100).toFixed(1);
                
                // Show both the current balance and the change
                feedbackMessage += `. World balance: ${worldChaosPercent}% Chaos / ${worldOrderPercent}% Order`;
                
                // Add the actual balance change if it's significant enough to show
                if (worldChangePercent >= 0.1) { // If at least 0.1% change
                    feedbackMessage += ` (${worldChangePercent > 0 ? '+' : '-'}${worldChangePercent}%)`;
                }
            }
            
            // Show the enhanced feedback message
            this.showFeedback(feedbackMessage, "success", 2500, true, 'action-stabilize');
            
            return true;
        } else {
            // Show error feedback
            this.showFeedback(`Failed to stabilize tile: ${result.error || 'Unknown error'}`, "error", 2000, true, 'action-error');
            return false;
        }
    }
    
    /**
     * Update button states based on player state
     */
    updateButtonStates() {
        console.log("ActionPanel: Updating button states");
        
        // Get player component
        const playerEntity = this.entityManager ? this.entityManager.getEntitiesByTag('player')[0] : null;
        if (!playerEntity) {
            console.warn("ActionPanel: No player entity found when updating button states");
            return;
        }
        
        const playerComponent = playerEntity.getComponent(PlayerComponent);
        if (!playerComponent) {
            console.warn("ActionPanel: Player entity has no PlayerComponent");
            return;
        }
        
        // Log current player resources for debugging
        console.log(`ActionPanel: Player resources - Energy: ${playerComponent.energy}, Movement: ${playerComponent.movementPoints}`);
        
        // Remove active class from all buttons
        for (const button of Object.values(this.buttons)) {
            if (button) button.classList.remove('active');
        }
        
        // Add active class to current action button
        if (playerComponent.currentAction && this.buttons[playerComponent.currentAction]) {
            this.buttons[playerComponent.currentAction].classList.add('active');
        }
        
        // Check player resources
        const hasMovementPoints = playerComponent.movementPoints > 0;
        const hasEnergy = playerComponent.energy > 0;
        
        // Update move button - requires movement points
        if (this.buttons.move) {
            this.buttons.move.disabled = !hasMovementPoints;
            
            // Add explanatory tooltip if disabled
            if (!hasMovementPoints) {
                this.buttons.move.title = "Requires movement points";
            } else {
                this.buttons.move.title = "Move to an adjacent tile";
            }
        }
        
        // Determine costs for other actions at the current player position
        let senseEnergyCost = 1;
        let interactEnergyCost = 1;
        let stabilizeEnergyCost = 1;
        
        // Get current tile costs if player is on a valid tile
        const currentTile = this.getTileAtPlayerPosition(playerComponent);
        if (currentTile) {
            const tileComponent = currentTile.getComponent(TileComponent);
            if (tileComponent) {
                senseEnergyCost = tileComponent.getActionCost('sense');
                interactEnergyCost = tileComponent.getActionCost('interact');
                stabilizeEnergyCost = tileComponent.getActionCost('stabilize');
            }
        }
        
        // Update sense button - requires energy
        if (this.buttons.sense) {
            const canSense = hasEnergy && playerComponent.energy >= senseEnergyCost;
            this.buttons.sense.disabled = !canSense;
            
            if (!hasEnergy) {
                this.buttons.sense.title = "Requires energy";
            } else if (!canSense) {
                this.buttons.sense.title = `Not enough energy (cost: ${senseEnergyCost})`;
            } else {
                this.buttons.sense.title = `Sense the environment (cost: ${senseEnergyCost} energy)`;
            }
        }
        
        // Update interact button - requires energy
        if (this.buttons.interact) {
            const canInteract = hasEnergy && playerComponent.energy >= interactEnergyCost;
            this.buttons.interact.disabled = !canInteract;
            
            if (!hasEnergy) {
                this.buttons.interact.title = "Requires energy";
            } else if (!canInteract) {
                this.buttons.interact.title = `Not enough energy (cost: ${interactEnergyCost})`;
            } else {
                this.buttons.interact.title = `Interact with tile (cost: ${interactEnergyCost} energy)`;
            }
        }
        
        // Update stabilize button - requires energy
        if (this.buttons.stabilize) {
            const canStabilize = hasEnergy && playerComponent.energy >= stabilizeEnergyCost;
            this.buttons.stabilize.disabled = !canStabilize;
            
            if (!hasEnergy) {
                this.buttons.stabilize.title = "Requires energy";
            } else if (!canStabilize) {
                this.buttons.stabilize.title = `Not enough energy (cost: ${stabilizeEnergyCost})`;
            } else {
                this.buttons.stabilize.title = `Stabilize tile chaos (cost: ${stabilizeEnergyCost} energy)`;
            }
        }
    }
    
    /**
     * Get tile entity at player position
     * @param {PlayerComponent} playerComponent - The player component
     * @returns {Entity|null} The tile entity at player position
     * @private
     */
    getTileAtPlayerPosition(playerComponent) {
        // Make sure we have a grid reference
        if (!this.grid) return null;
        
        // Make sure player component has valid position
        if (!playerComponent || typeof playerComponent.row !== 'number' || typeof playerComponent.col !== 'number') {
            return null;
        }
        
        // Get tile at player position
        return this.grid.getTileAt(playerComponent.row, playerComponent.col);
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
        
        // Only reset the PlayerComponent's action if it's not already null
        const playerEntity = this.entityManager ? this.entityManager.getEntitiesByTag('player')[0] : null;
        if (playerEntity) {
            const playerComponent = playerEntity.getComponent(PlayerComponent);
            if (playerComponent && playerComponent.currentAction !== null) {
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