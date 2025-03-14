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
                'action:complete:interact'
            ],
            'sense': [
                'tile:explored',
                'system:balance:changed',
                'action:complete:sense'
            ],
            'move': [
                'player:moved',
                'system:balance:changed',
                'action:complete:move'
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
     * Enable or disable debug mode
     * @param {boolean} enabled - Whether debug mode should be enabled
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

// Create and export a singleton instance
export const eventMediator = new EventMediator(); 