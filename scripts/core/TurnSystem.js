/**
 * Turn System for Hexgrid Evolution
 * Manages game turns, victory conditions, and game stage progression
 */
import { eventSystem } from './EventSystem.js';
import { entityManager } from './EntityManager.js';
import { EventTypes } from './EventTypes.js';
import { eventMediator } from './EventMediator.js';

export class TurnSystem {
    /**
     * Create a new turn system
     * @param {string} gameStage - Game stage (early, mid, late)
     * @param {Object} options - Optional dependencies and configuration
     * @param {Object} options.grid - Grid system to use (optional)
     */
    constructor(gameStage = 'early', options = {}) {
        // Store dependencies
        this.grid = options.grid || null;
        
        // Turn tracking
        this.turnCount = 1;
        this.maxTurns = 30; // Default max turns per level
        
        // Game stage
        this.gameStage = gameStage;
        
        // Balance parameters - differ by game stage
        this.startingChaos = 0.5;
        this.startingOrder = 0.5;
        this.targetChaos = 0.5;
        this.targetOrder = 0.5;
        this.victoryThreshold = 0.1; // How close to target for victory
        
        // Evolution points parameters
        this.balanceThreshold = 0.1; // How close to 50/50 to be considered "flow"
        this.pointsMultiplier = {
            early: 1,
            mid: 2,
            late: 3
        };
        
        // Evolution threshold - points needed to evolve
        this.evolutionThreshold = {
            early: 50,   // 50 total points in early stage
            mid: 100,    // 100 total points in mid stage
            late: 150    // 150 total points in late stage
        };
        
        // Evolution state
        this.canEvolve = false;
        
        // Current level evolution points tracking
        this.currentLevelPoints = {
            chaos: 0,
            flow: 0,
            order: 0,
            total: 0
        };
        
        // Victory tracking
        this.turnsBalanced = 0;
        this.turnsToBalance = 3; // Consecutive balanced turns needed for victory
        
        // Bind methods
        this.endTurn = this.endTurn.bind(this);
        this.calculateEvolutionPoints = this.calculateEvolutionPoints.bind(this);
        this.checkEvolutionReady = this.checkEvolutionReady.bind(this);
        
        // Event registration tracking
        this._registeredEvents = [];
        
        // Set balance parameters for current game stage
        this.setGameStageBalance(gameStage);
    }
    
    /**
     * Initialize the system
     * @returns {boolean} Whether initialization was successful
     */
    init() {
        try {
            console.log(`Initializing turn system for game stage: ${this.gameStage}`);
            
            // Clean up any existing event listeners to prevent duplicates
            this.cleanupEventListeners();
            
            // Register fresh event listeners
            this.registerEventListeners();
            
            // Emit system initialized event
            eventSystem.emitStandardized(
                EventTypes.TURN_SYSTEM_INITIALIZED.legacy,
                EventTypes.TURN_SYSTEM_INITIALIZED.standard,
                {
                    gameStage: this.gameStage,
                    maxTurns: this.maxTurns,
                    balanceThreshold: this.balanceThreshold,
                    evolutionThreshold: this.evolutionThreshold[this.gameStage],
                    isStandardized: true
                }
            );
            
            // Start first turn
            this.startTurn();
            
            console.log(`Turn system initialized - turn: ${this.turnCount}`);
            return true;
        } catch (error) {
            console.error("Failed to initialize turn system:", error);
            return false;
        }
    }
    
    /**
     * Clean up existing event listeners
     * This prevents duplicate event handling when re-initializing
     */
    cleanupEventListeners() {
        // Remove all existing registered events
        for (const registration of this._registeredEvents) {
            if (registration) {
                eventSystem.off(registration);
            }
        }
        // Reset the array
        this._registeredEvents = [];
    }
    
    /**
     * Register event listeners
     */
    registerEventListeners() {
        // Track tile chaos changes to monitor system balance
        this._registeredEvents.push(
            eventSystem.on(EventTypes.TILE_CHAOS_CHANGED.standard, this.onTileChaosChanged, this)
        );
    }
    
    /**
     * Set game balance parameters based on game stage
     * @param {string} gameStage - Game stage (early, mid, late)
     */
    setGameStageBalance(gameStage) {
        this.gameStage = gameStage;
        
        switch (gameStage) {
            case 'early':
                // Early game: simple balance, more turns allowed
                this.startingChaos = 0.6;
                this.startingOrder = 0.4;
                this.targetChaos = 0.5;
                this.targetOrder = 0.5;
                this.victoryThreshold = 0.1;
                this.turnsToBalance = 3;
                this.maxTurns = 30;
                break;
                
            case 'mid':
                // Mid game: tighter balance requirements
                this.startingChaos = 0.7;
                this.startingOrder = 0.3;
                this.targetChaos = 0.45;
                this.targetOrder = 0.55;
                this.victoryThreshold = 0.08;
                this.turnsToBalance = 4;
                this.maxTurns = 25;
                break;
                
            case 'late':
                // Late game: precise balance needed
                this.startingChaos = 0.8;
                this.startingOrder = 0.2;
                this.targetChaos = 0.4;
                this.targetOrder = 0.6;
                this.victoryThreshold = 0.05;
                this.turnsToBalance = 5;
                this.maxTurns = 20;
                break;
        }
    }
    
    /**
     * Start a new turn
     */
    startTurn() {
        console.log(`Starting turn ${this.turnCount}`);
        
        // Emit turn start event using standardized format
        eventSystem.emitStandardized(
            EventTypes.TURN_START.legacy,
            EventTypes.TURN_START.standard,
            {
                turnCount: this.turnCount,
                gameStage: this.gameStage,
                isStandardized: true
            }
        );
    }
    
    /**
     * End the current turn
     */
    endTurn() {
        console.log(`Ending turn ${this.turnCount} in TurnSystem.endTurn()`);
        
        // Calculate and award evolution points before victory check
        this.awardEvolutionPoints();
        
        // Skip victory and game over checks for testing
        /*
        // Check for victory before ending turn
        if (this.checkVictory()) {
            this.triggerVictory();
            return;
        }
        
        // Check for game over (exceeding max turns)
        if (this.turnCount >= this.maxTurns) {
            this.triggerGameOver('Too many turns taken');
            return;
        }
        */
        
        // Emit turn end event using standardized format
        eventSystem.emitStandardized(
            EventTypes.TURN_END.legacy,
            EventTypes.TURN_END.standard,
            {
                turnCount: this.turnCount,
                gameStage: this.gameStage,
                isStandardized: true
            }
        );
        
        // Increment turn count
        this.turnCount++;
        console.log(`Turn count incremented to ${this.turnCount}`);
        
        // Start next turn
        this.startTurn();
    }
    
    /**
     * Check if victory conditions are met
     * @returns {boolean} Whether victory conditions are met
     */
    checkVictory() {
        // Get current system balance
        const { chaos, order } = this.getSystemBalance();
        
        console.log(`Checking victory. Balance: chaos=${chaos}, order=${order}`);
        console.log(`Target: chaos=${this.targetChaos}, order=${this.targetOrder}, threshold=${this.victoryThreshold}`);
        
        // Check if balance is within victory threshold
        const chaosDiff = Math.abs(chaos - this.targetChaos);
        const orderDiff = Math.abs(order - this.targetOrder);
        
        // For debugging - disable victory checks temporarily
        // Commented out the return false to make the rest of the function reachable
        // return false; // Temporarily disable victory check for testing
        
        if (chaosDiff <= this.victoryThreshold && orderDiff <= this.victoryThreshold) {
            // Balance is good this turn, increment counter
            this.turnsBalanced++;
            
            console.log(`Balance is good! Turns balanced: ${this.turnsBalanced}/${this.turnsToBalance}`);
            
            // Check if we've been balanced for enough consecutive turns
            return this.turnsBalanced >= this.turnsToBalance;
        } else {
            // Balance lost, reset counter
            this.turnsBalanced = 0;
            return false;
        }
    }
    
    /**
     * Trigger victory
     */
    triggerVictory() {
        // Get game state
        const gameState = this.getGameState();
        
        // Emit victory event using standardized format
        eventSystem.emitStandardized(
            EventTypes.GAME_VICTORY.legacy,
            EventTypes.GAME_VICTORY.standard,
            {
                turnCount: this.turnCount,
                gameStage: this.gameStage,
                gameState,
                isStandardized: true
            }
        );
        
        // Prepare for next stage if appropriate
        this.advanceGameStage();
    }
    
    /**
     * Trigger game over
     * @param {string} reason - Reason for game over
     */
    triggerGameOver(reason) {
        // Get game state
        const gameState = this.getGameState();
        
        // Emit game over event using standardized format
        eventSystem.emitStandardized(
            EventTypes.GAME_OVER.legacy,
            EventTypes.GAME_OVER.standard,
            {
                turnCount: this.turnCount,
                gameStage: this.gameStage,
                reason,
                gameState,
                isStandardized: true
            }
        );
    }
    
    /**
     * Handle tile chaos changed event
     * @param {object} data - Event data
     */
    onTileChaosChanged(data) {
        // Only proceed if we have valid data
        if (!data) {
            console.warn("TurnSystem.onTileChaosChanged: Missing data");
            return;
        }
        
        // If this event was triggered by a stabilize action, we don't need
        // to re-emit system balance changes as ActionPanel already handles this
        if (data.sourceAction === 'stabilize') {
            // We still need to check victory conditions
            const systemChaos = this.grid ? this.grid.getSystemBalance().chaos : null;
            if (systemChaos !== null) {
                this.checkVictoryConditions(systemChaos);
            }
            return;
        }
        
        // Get the tile's chaos data - we don't use this directly for system balance
        // as Grid.getSystemBalance() is the single source of truth
        const tileChaos = data.newChaos;
        const tileChaosDelta = data.chaosDelta;
        
        // Skip if we don't have the grid reference
        if (!this.grid) return;
        
        // Get current system balance from the grid (single source of truth)
        const currentBalance = this.grid.getSystemBalance();
        const systemChaos = currentBalance.chaos;
        
        // No need to update system chaos based on tile changes anymore
        // That's handled by ActionPanel's updateSystemBalance
        
        // Check for victory conditions
        this.checkVictoryConditions(systemChaos);
    }
    
    /**
     * Check if victory conditions are met
     * @param {number} systemChaos - Current system chaos
     * @private
     */
    checkVictoryConditions(systemChaos) {
        // Enforce binary duality - order is always 1 - chaos
        const systemOrder = 1 - systemChaos;
        
        // Check for balance changes that might lead to victory/defeat
        const chaosDiff = Math.abs(systemChaos - this.targetChaos);
        const orderDiff = Math.abs(systemOrder - this.targetOrder);
        
        // Log if we're close to victory
        if (chaosDiff <= this.victoryThreshold && orderDiff <= this.victoryThreshold) {
            console.log(`TurnSystem: System balance close to target (diff: ${chaosDiff.toFixed(3)}, threshold: ${this.victoryThreshold})`);
        }
    }
    
    /**
     * Advance to the next game stage
     */
    advanceGameStage() {
        let nextStage = this.gameStage;
        
        // Determine next stage
        switch (this.gameStage) {
            case 'early':
                nextStage = 'mid';
                break;
                
            case 'mid':
                nextStage = 'late';
                break;
                
            case 'late':
                // No next stage after late game
                nextStage = 'complete';
                break;
        }
        
        // Emit level completed event with current stage info using standardized format
        eventSystem.emitStandardized(
            EventTypes.LEVEL_COMPLETED.legacy,
            EventTypes.LEVEL_COMPLETED.standard,
            {
                turnCount: this.turnCount,
                gameStage: this.gameStage,
                nextStage,
                isStandardized: true
            }
        );
    }
    
    /**
     * Get the current system balance
     * @returns {Object} Object with chaos and order properties
     */
    getSystemBalance() {
        // If grid is injected, use its balance
        if (this.grid) {
            return this.grid.getSystemBalance();
        }
        
        // If grid is not injected, but available in window.game, use that as fallback
        if (window.game && window.game.grid) {
            console.warn('TurnSystem: Using global grid reference. Consider injecting grid directly.');
            return window.game.grid.getSystemBalance();
        }
        
        // Fallback to our own values if grid not available
        console.warn('TurnSystem: Grid not available, using fallback balance values.');
        return {
            chaos: this.startingChaos,
            order: this.startingOrder
        };
    }
    
    /**
     * Get current game state for serialization
     * @returns {Object} Game state object
     */
    getGameState() {
        return {
            turnCount: this.turnCount,
            gameStage: this.gameStage,
            targetChaos: this.targetChaos,
            targetOrder: this.targetOrder,
            balance: this.getSystemBalance()
        };
    }
    
    /**
     * Calculate evolution points based on current chaos/order balance
     * @returns {Object} Object containing evolution points breakdown
     */
    calculateEvolutionPoints() {
        // Get current system balance
        const { chaos, order } = this.getSystemBalance();
        console.log(`Calculating evolution points. Current balance: chaos=${chaos.toFixed(2)}, order=${order.toFixed(2)}`);
        
        // Define base points for each category
        let chaosPoints = 0;
        let flowPoints = 0;
        let orderPoints = 0;
        
        // Determine multiplier based on game stage
        const multiplier = this.pointsMultiplier[this.gameStage] || 1;
        
        // Parameters for points distribution
        const perfectBalance = 0.5;          // 50% chaos is perfect balance
        const balanceThreshold = 0.05;       // ±5% around 50% is considered balanced
        const specializationThreshold = 0.52; // Lower threshold to 52% (from 55%) for chaos/order specialization
        
        // Calculate balance deviation from perfect 50/50
        const balanceDeviation = Math.abs(chaos - perfectBalance);
        
        // Always calculate flow points - highest at perfect balance, declining as we move away
        if (balanceDeviation <= balanceThreshold) {
            // Within balanced range (45-55% chaos)
            // Highest flow points at perfect 50/50, linearly decreasing as we approach thresholds
            const flowFactor = 1 - (balanceDeviation / balanceThreshold);
            flowPoints = Math.round((6 * flowFactor + 3) * multiplier); // Scale from 3-9 based on proximity to perfect balance
        } else {
            // Outside balanced range but still give some flow points
            // Base flow points decrease the further we get from balance
            const flowBase = Math.max(0, 3 - (balanceDeviation - balanceThreshold) * 10);
            flowPoints = Math.max(1, Math.round(flowBase * multiplier)); // Minimum 1 flow point
        }
        
        // Calculate chaos points - only when chaos > specializationThreshold
        if (chaos > specializationThreshold) {
            // How far into chaos territory we are
            const chaosDepth = chaos - specializationThreshold;
            // More chaos = more chaos points, up to 8 at 100% chaos
            chaosPoints = Math.round((chaosDepth * 20) * multiplier); // Increased multiplier from 18 to 20
        }
        
        // Calculate order points - only when order > specializationThreshold
        if (order > specializationThreshold) {
            // How far into order territory we are
            const orderDepth = order - specializationThreshold;
            // More order = more order points, up to 8 at 100% order
            orderPoints = Math.round((orderDepth * 18) * multiplier);
        }
        
        // Ensure minimum 1 point total is always awarded
        const totalPoints = chaosPoints + flowPoints + orderPoints;
        if (totalPoints < 1) {
            flowPoints = 1;
        }
        
        return {
            chaos: chaosPoints,
            flow: flowPoints,
            order: orderPoints,
            total: chaosPoints + flowPoints + orderPoints
        };
    }
    
    /**
     * Award evolution points to the player based on current balance
     * @returns {boolean} Whether points were successfully awarded
     */
    awardEvolutionPoints() {
        // Check if entityManager is available
        if (!entityManager) {
            console.error("TurnSystem: EntityManager is not available");
            return false;
        }
        
        // Get player entity
        const playerEntities = entityManager.getEntitiesByTag('player');
        if (!playerEntities || playerEntities.length === 0) {
            console.error("TurnSystem: Player entity not found, cannot award evolution points");
            return false;
        }
        
        const playerEntity = playerEntities[0];
        
        // Try to import PlayerComponent if the window.PlayerComponent is not available
        const PlayerComponentClass = window.PlayerComponent || 
            (typeof PlayerComponent !== 'undefined' ? PlayerComponent : null);
            
        if (!PlayerComponentClass) {
            console.error("TurnSystem: PlayerComponent class is not available");
            return false;
        }
        
        const playerComponent = playerEntity.getComponent(PlayerComponentClass);
        if (!playerComponent) {
            console.error("TurnSystem: Player entity does not have PlayerComponent attached");
            return false;
        }
        
        // Calculate points to award
        const pointsToAward = this.calculateEvolutionPoints();
        
        // Update current level points tracking
        this.currentLevelPoints.chaos += pointsToAward.chaos;
        this.currentLevelPoints.flow += pointsToAward.flow;
        this.currentLevelPoints.order += pointsToAward.order;
        this.currentLevelPoints.total += pointsToAward.total;
        
        // Award the points through EventMediator
        const result = eventMediator.handlePlayerEvolutionPointsChange({
            player: playerComponent,
            points: {
                chaos: pointsToAward.chaos,
                flow: pointsToAward.flow,
                order: pointsToAward.order
            },
            source: 'turn'
        });
        
        if (!result.success) {
            console.error(`Failed to award evolution points: ${result.error}`);
            return;
        }
        
        // Now emit the evolution points awarded event (separate from points changed)
        eventSystem.emitStandardized(
            EventTypes.EVOLUTION_POINTS_AWARDED.legacy,
            EventTypes.EVOLUTION_POINTS_AWARDED.standard,
            {
                player: playerComponent,
                chaosPoints: pointsToAward.chaos,
                flowPoints: pointsToAward.flow,
                orderPoints: pointsToAward.order,
                totalPoints: pointsToAward.total,
                turnCount: this.turnCount,
                balance: this.getSystemBalance(),
                isBalanced: this.isBalanced,
                consecutiveBalancedTurns: this.consecutiveBalancedTurns
            }
        );
        
        console.log(`Evolution points awarded: Chaos=${pointsToAward.chaos}, Flow=${pointsToAward.flow}, Order=${pointsToAward.order}`);
        console.log(`Current level points: ${JSON.stringify(this.currentLevelPoints)}`);
        
        // Check if player has enough points to evolve
        this.checkEvolutionReady(playerComponent);
        
        return true;
    }
    
    /**
     * Check if player has enough evolution points to evolve
     * @param {PlayerComponent} playerComponent - The player component
     */
    checkEvolutionReady(playerComponent) {
        // Get the threshold for the current game stage
        const threshold = this.evolutionThreshold[this.gameStage] || 50;
        
        // Check if current level evolution points exceed the threshold
        // Use currentLevelPoints instead of total accumulated points
        const currentLevelTotal = this.currentLevelPoints.total;
        const canEvolveNow = currentLevelTotal >= threshold;
        
        // Only emit event if the state changes
        if (canEvolveNow !== this.canEvolve) {
            this.canEvolve = canEvolveNow;
            
            // Emit evolution ready event
            eventSystem.emitStandardized(
                EventTypes.EVOLUTION_READY.legacy,
                EventTypes.EVOLUTION_READY.standard,
                {
                    canEvolve: this.canEvolve,
                    currentLevelTotal: currentLevelTotal,
                    totalPoints: playerComponent.getTotalEvolutionPoints(),
                    threshold: threshold,
                    gameStage: this.gameStage,
                    isStandardized: true
                }
            );
            
            console.log(`Evolution ready state changed: ${this.canEvolve ? 'Ready to evolve!' : 'Not ready yet'}`);
            console.log(`Current level points: ${currentLevelTotal}/${threshold}, Total accumulated: ${playerComponent.getTotalEvolutionPoints()}`);
        }
    }
    
    /**
     * Reset current level points tracking
     * Should be called when starting a new level
     */
    resetCurrentLevelPoints() {
        this.currentLevelPoints = {
            chaos: 0,
            flow: 0,
            order: 0,
            total: 0
        };
        this.canEvolve = false;
        console.log("Reset current level evolution points");
    }
    
    /**
     * Destroy the turn system, removing event listeners
     */
    destroy() {
        console.log('Destroying turn system');
        
        // Clean up event listeners
        try {
            eventSystem.off('tileChaosChanged');
        } catch (error) {
            console.warn('Error removing event listeners:', error);
        }
    }
    
    /**
     * Set the grid system to use
     * @param {Object} grid - The grid system
     */
    setGrid(grid) {
        this.grid = grid;
    }
} 