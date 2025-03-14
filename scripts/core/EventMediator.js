/**
 * Event Mediator for Hexgrid Evolution
 * Provides centralized event coordination and event sequence management
 * to ensure consistency between related events and prevent race conditions.
 */
import { eventSystem } from './EventSystem.js';
import { EventTypes } from './EventTypes.js';

export class EventMediator {
    /**
     * Create a new event mediator
     */
    constructor() {
        // Event sequence definitions - specifies order for related events
        this.eventSequences = {
            'stabilize': [
                'tile:chaos:changed',
                'system:balance:changed',
                'action:complete:stabilize'
            ],
            'interact': [
                'tile:interaction',
                'system:balance:changed',
                'action:complete:interact',
                'energy:gathered:from:tile' // Optional event for energy tiles
            ],
            'sense': [
                'tile:explored', // We use this event name in handleSenseAction
                'system:balance:changed',
                'action:complete:sense'
            ],
            'move': [
                'player:moved',
                'system:balance:changed',
                'action:complete:move'
            ],
            // New event sequences for player resource changes
            'player:energy:change': [
                'player:resource:changed:energy',
                'player:stats:updated'
            ],
            'player:movement:change': [
                'player:resource:changed:movement',
                'player:stats:updated'
            ],
            'player:evolution:points:change': [
                'player:evolution:points:changed',
                'player:stats:updated',
                'evolution:ready' // Optional event if player can evolve
            ]
        };
        
        // Active transactions
        this.activeTransactions = new Map();
        
        // Debug mode
        this.debugMode = false;
        
        // Register with event system to intercept events for managed sequences
        this._registerEventInterceptors();
    }
    
    /**
     * Begin a transaction to coordinate related events
     * @param {string} transactionType - The type of transaction (e.g., 'stabilize', 'move')
     * @param {Object} initialData - Initial data for the transaction
     * @returns {string} Transaction ID
     */
    beginTransaction(transactionType, initialData = {}) {
        // Generate a unique transaction ID
        const transactionId = `${transactionType}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        
        if (this.debugMode) {
            console.log(`EventMediator: Beginning transaction ${transactionId} of type ${transactionType}`);
        }
        
        // Get the event sequence for this transaction type
        const sequence = this.eventSequences[transactionType] || [];
        
        // Initialize the transaction
        this.activeTransactions.set(transactionId, {
            type: transactionType,
            status: 'pending',
            startTime: Date.now(),
            sequence: sequence,
            pendingEvents: [...sequence], // Clone the sequence
            completedEvents: [],
            eventData: {}, // Data for each emitted event
            initialData: initialData,
            errors: []
        });
        
        return transactionId;
    }
    
    /**
     * Record an event as part of a transaction
     * @param {string} transactionId - Transaction ID
     * @param {string} eventType - Event type
     * @param {Object} eventData - Event data
     */
    recordEvent(transactionId, eventType, eventData) {
        const transaction = this.activeTransactions.get(transactionId);
        if (!transaction) {
            console.error(`EventMediator: No active transaction found with ID ${transactionId}`);
            return;
        }
        
        if (this.debugMode) {
            console.log(`EventMediator: Recording event ${eventType} for transaction ${transactionId}`);
        }
        
        // Store event data
        transaction.eventData[eventType] = eventData;
        
        // Check if this event is part of the sequence
        const eventIndex = transaction.pendingEvents.indexOf(eventType);
        if (eventIndex !== -1) {
            // Remove from pending and add to completed
            transaction.pendingEvents.splice(eventIndex, 1);
            transaction.completedEvents.push(eventType);
        }
    }
    
    /**
     * Commit a transaction, emitting all events in the defined sequence
     * @param {string} transactionId - Transaction ID
     * @returns {boolean} True if the transaction was committed successfully
     */
    commitTransaction(transactionId) {
        const transaction = this.activeTransactions.get(transactionId);
        if (!transaction) {
            console.error(`EventMediator: No active transaction found with ID ${transactionId}`);
            return false;
        }
        
        if (this.debugMode) {
            console.log(`EventMediator: Committing transaction ${transactionId}`);
        }
        
        try {
            // Emit events in sequence order
            for (const eventType of transaction.sequence) {
                const eventData = transaction.eventData[eventType];
                if (eventData) {
                    // Add standard event data
                    const enrichedData = {
                        ...eventData,
                        transactionId,
                        timestamp: Date.now(),
                        isStandardized: true,
                        isManaged: true
                    };
                    
                    // For chaotic actions, add the combined world state
                    if (eventType === 'action:complete:stabilize' || 
                        eventType === 'system:balance:changed') {
                        enrichedData.worldState = this._getWorldState(transaction);
                    }
                    
                    // Emit through the event system
                    eventSystem.emit(eventType, enrichedData);
                    
                    if (this.debugMode) {
                        console.log(`EventMediator: Emitted event ${eventType} for transaction ${transactionId}`);
                    }
                }
            }
            
            // Mark transaction as completed
            transaction.status = 'completed';
            transaction.endTime = Date.now();
            
            if (this.debugMode) {
                console.log(`EventMediator: Transaction ${transactionId} completed successfully`);
            }
            
            return true;
        } catch (error) {
            // Handle transaction failure
            transaction.status = 'failed';
            transaction.endTime = Date.now();
            transaction.errors.push(error.message);
            
            console.error(`EventMediator: Transaction ${transactionId} failed:`, error);
            return false;
        } finally {
            // Clean up the transaction after a delay to allow for any post-commit operations
            setTimeout(() => {
                this.activeTransactions.delete(transactionId);
            }, 1000);
        }
    }
    
    /**
     * Roll back a transaction, canceling all pending events
     * @param {string} transactionId - Transaction ID
     * @returns {boolean} True if the rollback was successful
     */
    rollbackTransaction(transactionId) {
        const transaction = this.activeTransactions.get(transactionId);
        if (!transaction) {
            console.error(`EventMediator: No active transaction found with ID ${transactionId}`);
            return false;
        }
        
        if (this.debugMode) {
            console.log(`EventMediator: Rolling back transaction ${transactionId}`);
        }
        
        // Mark transaction as rolled back
        transaction.status = 'rolledback';
        transaction.endTime = Date.now();
        
        // Emit a rollback event
        eventSystem.emit('transaction:rolledback', {
            transactionId,
            transactionType: transaction.type,
            timestamp: Date.now()
        });
        
        // Clean up the transaction
        this.activeTransactions.delete(transactionId);
        
        return true;
    }
    
    /**
     * Get combined world state data from a transaction
     * @param {Object} transaction - Transaction object
     * @returns {Object} World state data
     * @private
     */
    _getWorldState(transaction) {
        const worldState = {};
        
        // Combine data from system:balance:changed and tile:chaos:changed events
        const systemBalanceData = transaction.eventData['system:balance:changed'];
        const tileChaosData = transaction.eventData['tile:chaos:changed'];
        
        if (systemBalanceData) {
            worldState.systemChaos = systemBalanceData.chaos;
            worldState.systemOrder = systemBalanceData.order;
            worldState.systemChaosDelta = systemBalanceData.chaosDelta;
        }
        
        if (tileChaosData) {
            worldState.tileChaos = tileChaosData.chaos;
            worldState.tileOrder = tileChaosData.order;
            worldState.tileChaosDelta = tileChaosData.chaosDelta;
            worldState.tilePosition = {
                row: tileChaosData.row,
                col: tileChaosData.col
            };
        }
        
        return worldState;
    }
    
    /**
     * Register event interceptors for managed event sequences
     * @private
     */
    _registerEventInterceptors() {
        // Flatten all event sequences into a set of unique event types
        const managedEventTypes = new Set();
        Object.values(this.eventSequences).forEach(sequence => {
            sequence.forEach(eventType => managedEventTypes.add(eventType));
        });
        
        // We don't need to intercept events at this stage
        // This is a placeholder for future expansion if needed
    }
    
    /**
     * Handle a chaos-order stabilization action through the mediator
     * @param {Object} actionData - Data for the stabilization action
     * @param {TileComponent} actionData.tileComponent - Tile component being stabilized
     * @param {number} actionData.chaosDelta - Change in chaos level
     * @param {PlayerComponent} actionData.player - Player component performing the action
     * @param {number} actionData.row - Target row
     * @param {number} actionData.col - Target column
     * @param {Grid} actionData.grid - Grid system for updating balance
     * @returns {Object} Result of the operation
     */
    handleStabilizeAction(actionData) {
        // Extract data from the action
        const { tileComponent, chaosDelta, player, row, col, grid } = actionData;
        
        if (this.debugMode) {
            console.log(`EventMediator: Handling stabilize action at (${row}, ${col}) with delta ${chaosDelta}`);
        }
        
        // Begin a transaction for this action
        const transactionId = this.beginTransaction('stabilize', actionData);
        
        try {
            // Store the original values for potential rollback
            const originalTileChaos = tileComponent.chaos;
            const originalSystemChaos = grid.getSystemBalance().chaos;
            
            // Update tile chaos level
            const actualDelta = tileComponent.updateChaosLevel(chaosDelta, 'stabilize');
            
            // Record the tile chaos changed event
            this.recordEvent(transactionId, 'tile:chaos:changed', {
                row: row,
                col: col,
                oldChaos: originalTileChaos,
                newChaos: tileComponent.chaos,
                chaosDelta: actualDelta,
                tile: tileComponent,
                sourceAction: 'stabilize',
                chaos: tileComponent.chaos,
                order: tileComponent.order
            });
            
            // Calculate the system balance change using the relevant scaling factor
            const scalingFactor = 15; // Using the value from ActionPanel
            const effectiveDelta = actualDelta / scalingFactor;
            
            // Update system balance
            const newBalance = grid.updateSystemBalance(effectiveDelta, 'stabilize');
            
            // Record the system balance changed event
            this.recordEvent(transactionId, 'system:balance:changed', {
                oldChaos: originalSystemChaos,
                oldOrder: 1 - originalSystemChaos,
                systemChaos: newBalance.chaos,
                systemOrder: newBalance.order,
                chaosDelta: effectiveDelta,
                sourceAction: 'stabilize',
                chaos: newBalance.chaos,
                order: newBalance.order
            });
            
            // Calculate the percentage reduction for feedback
            const reductionPercent = Math.round(-actualDelta * 100);
            
            // Record the action completion event
            this.recordEvent(transactionId, 'action:complete:stabilize', {
                player: player,
                tileComponent: tileComponent,
                row: row,
                col: col,
                chaosDelta: actualDelta,
                reductionPercent: reductionPercent,
                systemBalanceChange: newBalance.chaos - originalSystemChaos,
                prevWorldBalance: originalSystemChaos,
                newWorldBalance: newBalance.chaos,
                sourceAction: 'stabilize'
            });
            
            // Commit the transaction, which will emit all events in sequence
            const committed = this.commitTransaction(transactionId);
            
            if (committed) {
                // Return success with data
                return {
                    success: true,
                    transactionId: transactionId,
                    actualDelta: actualDelta,
                    reductionPercent: reductionPercent,
                    systemBalanceBefore: originalSystemChaos,
                    systemBalanceAfter: newBalance.chaos,
                    systemBalanceChange: newBalance.chaos - originalSystemChaos
                };
            } else {
                console.error(`EventMediator: Failed to commit transaction ${transactionId}`);
                return { success: false, error: 'Transaction commit failed' };
            }
        } catch (error) {
            // Handle any errors during the operation
            console.error(`EventMediator: Error in stabilize action:`, error);
            
            // Roll back the transaction
            this.rollbackTransaction(transactionId);
            
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Handle a move action through the mediator
     * @param {Object} actionData - Data for the move action
     * @param {PlayerComponent} actionData.player - Player component performing the action
     * @param {TileComponent} actionData.tileComponent - Target tile component
     * @param {number} actionData.row - Target row
     * @param {number} actionData.col - Target column
     * @param {Grid} actionData.grid - Grid system for updating balance
     * @returns {Object} Result of the operation
     */
    handleMoveAction(actionData) {
        // Extract data from the action
        const { player, tileComponent, row, col, grid } = actionData;
        
        if (this.debugMode) {
            console.log(`EventMediator: Handling move action to (${row}, ${col})`);
        }
        
        // Begin a transaction for this action
        const transactionId = this.beginTransaction('move', actionData);
        
        try {
            // Store the original values for potential rollback
            const originalPlayerRow = player.row;
            const originalPlayerCol = player.col;
            const originalSystemChaos = grid.getSystemBalance().chaos;
            
            // Try to move the player
            const moveSuccess = player.updatePosition(row, col);
            
            if (!moveSuccess) {
                throw new Error("Failed to update player position");
            }
            
            // Record the player moved event
            this.recordEvent(transactionId, 'player:moved', {
                player: player,
                oldRow: originalPlayerRow,
                oldCol: originalPlayerCol,
                row: row,
                col: col,
                sourceAction: 'move'
            });
            
            // Moving has minimal/no effect on system chaos, but we still update
            const scalingFactor = 30; // Using the value from ActionPanel
            const chaosDelta = 0; // Move doesn't affect chaos directly
            const effectiveDelta = chaosDelta / scalingFactor;
            
            // Update system balance
            const newBalance = grid.updateSystemBalance(effectiveDelta, 'move');
            
            // Record the system balance changed event
            this.recordEvent(transactionId, 'system:balance:changed', {
                oldChaos: originalSystemChaos,
                oldOrder: 1 - originalSystemChaos,
                systemChaos: newBalance.chaos,
                systemOrder: newBalance.order,
                chaosDelta: effectiveDelta,
                sourceAction: 'move',
                chaos: newBalance.chaos,
                order: newBalance.order
            });
            
            // Record the action completion event
            this.recordEvent(transactionId, 'action:complete:move', {
                player: player,
                tileComponent: tileComponent,
                row: row,
                col: col,
                sourceAction: 'move'
            });
            
            // Commit the transaction, which will emit all events in sequence
            const committed = this.commitTransaction(transactionId);
            
            if (committed) {
                // Return success with data
                return {
                    success: true,
                    transactionId: transactionId,
                    newRow: row,
                    newCol: col,
                    previousRow: originalPlayerRow,
                    previousCol: originalPlayerCol
                };
            } else {
                console.error(`EventMediator: Failed to commit transaction ${transactionId}`);
                return { success: false, error: 'Transaction commit failed' };
            }
        } catch (error) {
            // Handle any errors during the operation
            console.error(`EventMediator: Error in move action:`, error);
            
            // Roll back the transaction
            this.rollbackTransaction(transactionId);
            
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Handle a sense action through the mediator
     * @param {Object} actionData - Data for the sense action
     * @param {PlayerComponent} actionData.player - Player component performing the action
     * @param {TileComponent} actionData.tileComponent - Target tile component
     * @param {number} actionData.row - Target row
     * @param {number} actionData.col - Target column
     * @param {Grid} actionData.grid - Grid system for updating balance
     * @returns {Object} Result of the operation
     */
    handleSenseAction(actionData) {
        // Extract data from the action
        const { player, tileComponent, row, col, grid } = actionData;
        
        if (this.debugMode) {
            console.log(`EventMediator: Handling sense action at (${row}, ${col})`);
        }
        
        // Begin a transaction for this action
        const transactionId = this.beginTransaction('sense', actionData);
        
        try {
            // Store the original values for potential rollback
            const wasExplored = tileComponent.explored;
            const originalSystemChaos = grid.getSystemBalance().chaos;
            
            // Mark tile as explored and get its data
            tileComponent.markExplored();
            const tileInfo = tileComponent.getData();
            
            // Record the tile explored event
            this.recordEvent(transactionId, 'tile:explored', {
                row: row,
                col: col,
                wasExplored: wasExplored,
                isExplored: true,
                tileComponent: tileComponent,
                tileInfo: tileInfo,
                type: tileComponent.type,
                sourceAction: 'sense'
            });
            
            // Sensing has a small effect on system chaos
            const scalingFactor = 20; // Using the value from ActionPanel
            const chaosDelta = 0.05; // Sensing increases chaos slightly
            const effectiveDelta = chaosDelta / scalingFactor;
            
            // Update system balance
            const newBalance = grid.updateSystemBalance(effectiveDelta, 'sense');
            
            // Record the system balance changed event
            this.recordEvent(transactionId, 'system:balance:changed', {
                oldChaos: originalSystemChaos,
                oldOrder: 1 - originalSystemChaos,
                systemChaos: newBalance.chaos,
                systemOrder: newBalance.order,
                chaosDelta: effectiveDelta,
                sourceAction: 'sense',
                chaos: newBalance.chaos,
                order: newBalance.order
            });
            
            // Record the action completion event
            this.recordEvent(transactionId, 'action:complete:sense', {
                player: player,
                tileComponent: tileComponent,
                row: row,
                col: col,
                tileInfo: tileInfo,
                sourceAction: 'sense'
            });
            
            // Commit the transaction, which will emit all events in sequence
            const committed = this.commitTransaction(transactionId);
            
            if (committed) {
                // Return success with data
                return {
                    success: true,
                    transactionId: transactionId,
                    tileInfo: tileInfo,
                    tileType: tileComponent.type
                };
            } else {
                console.error(`EventMediator: Failed to commit transaction ${transactionId}`);
                return { success: false, error: 'Transaction commit failed' };
            }
        } catch (error) {
            // Handle any errors during the operation
            console.error(`EventMediator: Error in sense action:`, error);
            
            // Roll back the transaction
            this.rollbackTransaction(transactionId);
            
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Handle an interact action through the mediator
     * @param {Object} actionData - Data for the interact action
     * @param {PlayerComponent} actionData.player - Player component performing the action
     * @param {TileComponent} actionData.tileComponent - Target tile component
     * @param {number} actionData.row - Target row
     * @param {number} actionData.col - Target column
     * @param {Grid} actionData.grid - Grid system for updating balance
     * @returns {Object} Result of the operation
     */
    handleInteractAction(actionData) {
        // Extract data from the action
        const { player, tileComponent, row, col, grid } = actionData;
        
        if (this.debugMode) {
            console.log(`EventMediator: Handling interact action at (${row}, ${col})`);
        }
        
        // Begin a transaction for this action
        const transactionId = this.beginTransaction('interact', actionData);
        
        try {
            // Store the original values for potential rollback
            const originalSystemChaos = grid.getSystemBalance().chaos;
            const originalPlayerEnergy = player.energy;
            const originalPlayerMovementPoints = player.movementPoints;
            
            // Determine interaction effects based on tile type
            let interactionResult = 'No effect';
            let chaosDelta = 0;
            let energyRestored = 0;
            let movementRestored = 0;
            
            // Process tile interaction based on type
            switch (tileComponent.type) {
                case 'energy':
                    // Energy tiles restore energy
                    energyRestored = 5;
                    // Use direct update instead of addEnergy to avoid recursion
                    const newEnergy = Math.min(player.maxEnergy, originalPlayerEnergy + energyRestored);
                    player._updateEnergyDirect(newEnergy);
                    interactionResult = `Restored ${energyRestored} energy`;
                    chaosDelta = 0.1; // Interacting with energy increases chaos
                    break;
                    
                case 'chaotic':
                    // Chaotic tiles increase system chaos
                    chaosDelta = 0.3;
                    interactionResult = 'Increased chaos level';
                    break;
                    
                case 'orderly':
                    // Orderly tiles decrease system chaos
                    chaosDelta = -0.3;
                    interactionResult = 'Decreased chaos level';
                    break;
                    
                case 'flow':
                    // Flow tiles restore movement points
                    movementRestored = 2;
                    // Use direct update instead of addMovementPoints to avoid recursion
                    const newMovementPoints = Math.min(player.maxMovementPoints, originalPlayerMovementPoints + movementRestored);
                    player._updateMovementPointsDirect(newMovementPoints);
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
            
            // Record the tile interaction event
            this.recordEvent(transactionId, 'tile:interaction', {
                tileComponent: tileComponent,
                player: player,
                row: row,
                col: col,
                result: interactionResult,
                energyRestored: energyRestored,
                movementRestored: movementRestored,
                tileType: tileComponent.type,
                sourceAction: 'interact'
            });
            
            // Calculate system balance change
            const scalingFactor = 10; // Using the value from ActionPanel
            const effectiveDelta = chaosDelta / scalingFactor;
            
            // Update system balance
            const newBalance = grid.updateSystemBalance(effectiveDelta, 'interact');
            
            // Record the system balance changed event
            this.recordEvent(transactionId, 'system:balance:changed', {
                oldChaos: originalSystemChaos,
                oldOrder: 1 - originalSystemChaos,
                systemChaos: newBalance.chaos,
                systemOrder: newBalance.order,
                chaosDelta: effectiveDelta,
                sourceAction: 'interact',
                chaos: newBalance.chaos,
                order: newBalance.order
            });
            
            // Record the action completion event
            this.recordEvent(transactionId, 'action:complete:interact', {
                player: player,
                tileComponent: tileComponent,
                row: row,
                col: col,
                result: interactionResult,
                chaosDelta: chaosDelta,
                energyRestored: energyRestored,
                movementRestored: movementRestored,
                sourceAction: 'interact'
            });
            
            // If energy was restored, record a special event for that
            if (energyRestored > 0) {
                this.recordEvent(transactionId, 'energy:gathered:from:tile', {
                    player: player,
                    tileComponent: tileComponent,
                    row: row,
                    col: col,
                    amount: energyRestored,
                    oldEnergy: originalPlayerEnergy,
                    newEnergy: player.energy,
                    sourceAction: 'interact'
                });
            }
            
            // Commit the transaction, which will emit all events in sequence
            const committed = this.commitTransaction(transactionId);
            
            if (committed) {
                // Return success with data
                return {
                    success: true,
                    transactionId: transactionId,
                    interactionResult: interactionResult,
                    energyRestored: energyRestored,
                    movementRestored: movementRestored,
                    chaosDelta: chaosDelta,
                    effectiveDelta: effectiveDelta,
                    tileType: tileComponent.type
                };
            } else {
                console.error(`EventMediator: Failed to commit transaction ${transactionId}`);
                return { success: false, error: 'Transaction commit failed' };
            }
        } catch (error) {
            // Handle any errors during the operation
            console.error(`EventMediator: Error in interact action:`, error);
            
            // Roll back the transaction
            this.rollbackTransaction(transactionId);
            
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Handle a player energy change through the mediator
     * @param {Object} changeData - Data for the energy change
     * @param {PlayerComponent} changeData.player - Player component whose energy is changing
     * @param {number} changeData.amount - Amount of energy to add (positive) or remove (negative)
     * @param {string} changeData.source - Source of the energy change (e.g., 'action', 'turn', 'tile')
     * @returns {Object} Result of the operation
     */
    handlePlayerEnergyChange(changeData) {
        // Extract data for the energy change
        const { player, amount, source } = changeData;
        
        if (this.debugMode) {
            console.log(`EventMediator: Handling player energy change of ${amount} from source '${source}'`);
        }
        
        // Begin a transaction for this change
        const transactionId = this.beginTransaction('player:energy:change', changeData);
        
        try {
            // Store original values for potential rollback
            const originalEnergy = player.energy;
            
            // Calculate new energy value - clamped at min 0, max maxEnergy
            let newEnergy;
            if (amount > 0) {
                // Adding energy, can't exceed max
                newEnergy = Math.min(player.maxEnergy, originalEnergy + amount);
            } else {
                // Using energy, can't go below 0
                // First check if there's enough energy
                if (originalEnergy < Math.abs(amount)) {
                    throw new Error(`Not enough energy: have ${originalEnergy}, need ${Math.abs(amount)}`);
                }
                newEnergy = Math.max(0, originalEnergy + amount); // amount is negative here
            }
            
            // Use the direct update method to avoid recursion
            player._updateEnergyDirect(newEnergy);
            
            // Record the energy changed event
            this.recordEvent(transactionId, 'player:resource:changed:energy', {
                player: player,
                oldValue: originalEnergy,
                newValue: player.energy,
                delta: player.energy - originalEnergy,
                source: source
            });
            
            // Record the player stats updated event
            this.recordEvent(transactionId, 'player:stats:updated', {
                player: player,
                energy: player.energy,
                movementPoints: player.movementPoints,
                evolutionPoints: {
                    chaos: player.chaosEvolutionPoints,
                    flow: player.flowEvolutionPoints,
                    order: player.orderEvolutionPoints
                },
                traits: player.traits,
                stats: player.getStats ? player.getStats() : {
                    energy: player.energy,
                    maxEnergy: player.maxEnergy,
                    movementPoints: player.movementPoints,
                    maxMovementPoints: player.maxMovementPoints
                }
            });
            
            // Commit the transaction
            const committed = this.commitTransaction(transactionId);
            
            if (committed) {
                // Return success with data
                return {
                    success: true,
                    transactionId: transactionId,
                    oldEnergy: originalEnergy,
                    newEnergy: player.energy,
                    delta: player.energy - originalEnergy
                };
            } else {
                console.error(`EventMediator: Failed to commit transaction ${transactionId}`);
                return { success: false, error: 'Transaction commit failed' };
            }
        } catch (error) {
            // Handle any errors during the operation
            console.error(`EventMediator: Error in player energy change:`, error);
            
            // Roll back the transaction
            this.rollbackTransaction(transactionId);
            
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Handle a player movement points change through the mediator
     * @param {Object} changeData - Data for the movement points change
     * @param {PlayerComponent} changeData.player - Player component whose movement points are changing
     * @param {number} changeData.amount - Amount of movement points to add (positive) or remove (negative)
     * @param {string} changeData.source - Source of the movement points change (e.g., 'action', 'turn', 'trait')
     * @returns {Object} Result of the operation
     */
    handlePlayerMovementPointsChange(changeData) {
        // Extract data for the movement points change
        const { player, amount, source } = changeData;
        
        if (this.debugMode) {
            console.log(`EventMediator: Handling player movement points change of ${amount} from source '${source}'`);
        }
        
        // Begin a transaction for this change
        const transactionId = this.beginTransaction('player:movement:change', changeData);
        
        try {
            // Store original values for potential rollback
            const originalMovementPoints = player.movementPoints;
            
            // Calculate new movement points value - clamped at min 0, max maxMovementPoints
            let newMovementPoints;
            if (amount > 0) {
                // Adding movement points, can't exceed max
                newMovementPoints = Math.min(player.maxMovementPoints, originalMovementPoints + amount);
            } else {
                // Using movement points, can't go below 0
                // First check if there's enough movement points
                if (originalMovementPoints < Math.abs(amount)) {
                    throw new Error(`Not enough movement points: have ${originalMovementPoints}, need ${Math.abs(amount)}`);
                }
                newMovementPoints = Math.max(0, originalMovementPoints + amount); // amount is negative here
            }
            
            // Use the direct update method to avoid recursion
            player._updateMovementPointsDirect(newMovementPoints);
            
            // Record the movement points changed event
            this.recordEvent(transactionId, 'player:resource:changed:movement', {
                player: player,
                oldValue: originalMovementPoints,
                newValue: player.movementPoints,
                delta: player.movementPoints - originalMovementPoints,
                source: source
            });
            
            // Record the player stats updated event
            this.recordEvent(transactionId, 'player:stats:updated', {
                player: player,
                energy: player.energy,
                movementPoints: player.movementPoints,
                evolutionPoints: {
                    chaos: player.chaosEvolutionPoints,
                    flow: player.flowEvolutionPoints,
                    order: player.orderEvolutionPoints
                },
                traits: player.traits,
                stats: player.getStats ? player.getStats() : {
                    energy: player.energy,
                    maxEnergy: player.maxEnergy,
                    movementPoints: player.movementPoints,
                    maxMovementPoints: player.maxMovementPoints
                }
            });
            
            // Commit the transaction
            const committed = this.commitTransaction(transactionId);
            
            if (committed) {
                // Return success with data
                return {
                    success: true,
                    transactionId: transactionId,
                    oldMovementPoints: originalMovementPoints,
                    newMovementPoints: player.movementPoints,
                    delta: player.movementPoints - originalMovementPoints
                };
            } else {
                console.error(`EventMediator: Failed to commit transaction ${transactionId}`);
                return { success: false, error: 'Transaction commit failed' };
            }
        } catch (error) {
            // Handle any errors during the operation
            console.error(`EventMediator: Error in player movement points change:`, error);
            
            // Roll back the transaction
            this.rollbackTransaction(transactionId);
            
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Handle a player evolution points change through the mediator
     * @param {Object} changeData - Data for the evolution points change
     * @param {PlayerComponent} changeData.player - Player component whose evolution points are changing
     * @param {Object} changeData.points - Evolution points to add by type {chaos, flow, order}
     * @param {string} changeData.source - Source of the evolution points change (e.g., 'turn', 'objective')
     * @returns {Object} Result of the operation
     */
    handlePlayerEvolutionPointsChange(changeData) {
        // Extract data for the evolution points change
        const { player, points, source } = changeData;
        
        if (this.debugMode) {
            console.log(`EventMediator: Handling player evolution points change from source '${source}'`);
        }
        
        // Begin a transaction for this change
        const transactionId = this.beginTransaction('player:evolution:points:change', changeData);
        
        try {
            // Store original values for potential rollback
            const originalPoints = {
                chaos: player.chaosEvolutionPoints,
                flow: player.flowEvolutionPoints,
                order: player.orderEvolutionPoints
            };
            
            // Use the direct update method to avoid recursion
            const newPoints = player._updateEvolutionPointsDirect(
                points.chaos || 0, 
                points.flow || 0, 
                points.order || 0
            );
            
            // Record the evolution points changed event
            this.recordEvent(transactionId, 'player:evolution:points:changed', {
                player: player,
                oldValues: originalPoints,
                newValues: newPoints,
                delta: {
                    chaos: newPoints.chaos - originalPoints.chaos,
                    flow: newPoints.flow - originalPoints.flow,
                    order: newPoints.order - originalPoints.order
                },
                source: source
            });
            
            // Record the player stats updated event
            this.recordEvent(transactionId, 'player:stats:updated', {
                player: player,
                energy: player.energy,
                movementPoints: player.movementPoints,
                evolutionPoints: newPoints,
                traits: player.traits,
                stats: player.getStats ? player.getStats() : {
                    energy: player.energy,
                    maxEnergy: player.maxEnergy,
                    movementPoints: player.movementPoints,
                    maxMovementPoints: player.maxMovementPoints
                }
            });
            
            // Check if player can evolve and record the evolution ready event if so
            if (player.canEvolve && typeof player.canEvolve === 'function' && player.canEvolve()) {
                this.recordEvent(transactionId, 'evolution:ready', {
                    player: player,
                    evolutionPoints: newPoints,
                    availableTraits: player.getAvailableTraits ? player.getAvailableTraits() : []
                });
            }
            
            // Commit the transaction
            const committed = this.commitTransaction(transactionId);
            
            if (committed) {
                // Return success with data
                return {
                    success: true,
                    transactionId: transactionId,
                    oldPoints: originalPoints,
                    newPoints: newPoints,
                    delta: {
                        chaos: newPoints.chaos - originalPoints.chaos,
                        flow: newPoints.flow - originalPoints.flow,
                        order: newPoints.order - originalPoints.order
                    },
                    canEvolve: player.canEvolve && typeof player.canEvolve === 'function' ? player.canEvolve() : false
                };
            } else {
                console.error(`EventMediator: Failed to commit transaction ${transactionId}`);
                return { success: false, error: 'Transaction commit failed' };
            }
        } catch (error) {
            // Handle any errors during the operation
            console.error(`EventMediator: Error in player evolution points change:`, error);
            
            // Roll back the transaction
            this.rollbackTransaction(transactionId);
            
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Whether debug mode should be enabled
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

// Create and export a singleton instance
export const eventMediator = new EventMediator(); 