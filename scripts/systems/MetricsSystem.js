/**
 * Tracks player metrics and achievements throughout the game
 */
import { eventSystem } from '../core/EventSystem.js';

export class MetricsSystem {
    constructor() {
        // Movement metrics
        this.movesMade = 0;
        this.tilesExplored = 0;
        this.totalDistanceMoved = 0;
        
        // Resource metrics
        this.energyUsed = 0;
        this.energyGained = 0;
        this.movementPointsUsed = 0;
        
        // Action metrics
        this.sensesPerformed = 0;
        this.interactionsPerformed = 0;
        this.stabilizationsPerformed = 0;
        
        // Chaos/Order metrics
        this.chaosCreated = 0;
        this.chaosReduced = 0;
        this.netChaosChange = 0;
        
        // Evolution metrics
        this.evolutionPointsEarned = 0;
        this.traitsAcquired = 0;
        
        // Turn metrics
        this.turnsTaken = 0;
        this.averageActionsPerTurn = 0;
        
        // Game completion metrics
        this.levelsCompleted = 0;
        this.totalPlayTime = 0;
        this.gameStartTime = null;
        
        // Play style metrics (calculated values)
        this.explorerRating = 0;    // How much of the map is explored
        this.balancerRating = 0;    // How well chaos/order is balanced
        this.efficientRating = 0;   // How efficiently resources are used
        
        // Achievement tracking
        this.achievements = {};
        
        // Event listeners
        this._registeredEvents = [];
    }
    
    /**
     * Initialize the metrics system
     */
    init() {
        console.log("Initializing metrics system");
        
        // Start tracking play time
        this.gameStartTime = Date.now();
        
        // Register event listeners
        this.registerEventListeners();
        
        // Initialize achievement definitions
        this.initAchievements();
    }
    
    /**
     * Register event listeners for tracking metrics
     */
    registerEventListeners() {
        // Player movement
        this._registeredEvents.push(
            eventSystem.on('playerMoved', this.onPlayerMoved.bind(this))
        );
        
        // Tile exploration
        this._registeredEvents.push(
            eventSystem.on('tileExplored', this.onTileExplored.bind(this))
        );
        
        // Actions - remove legacy event listeners
        // Only keep standardized event listeners
        this._registeredEvents.push(
            eventSystem.on('action:complete:sense', this.onSenseComplete.bind(this))
        );
        
        this._registeredEvents.push(
            eventSystem.on('action:complete:interact', this.onInteractComplete.bind(this))
        );
        
        this._registeredEvents.push(
            eventSystem.on('action:complete:stabilize', this.onStabilizeComplete.bind(this))
        );
        
        this._registeredEvents.push(
            eventSystem.on('action:complete:move', this.onPlayerMoved.bind(this))
        );
        
        // Resource usage
        this._registeredEvents.push(
            eventSystem.on('playerEnergyChanged', this.onPlayerEnergyChanged.bind(this))
        );
        
        this._registeredEvents.push(
            eventSystem.on('playerMovementPointsChanged', this.onPlayerMovementPointsChanged.bind(this))
        );
        
        // Chaos/Order changes
        this._registeredEvents.push(
            eventSystem.on('tileChaosChanged', this.onTileChaosChanged.bind(this))
        );
        
        // Turn tracking
        this._registeredEvents.push(
            eventSystem.on('turnEnd', this.onTurnEnd.bind(this))
        );
        
        // Evolution
        this._registeredEvents.push(
            eventSystem.on('playerEvolutionPointsChanged', this.onPlayerEvolutionPointsChanged.bind(this))
        );
        
        this._registeredEvents.push(
            eventSystem.on('playerTraitAdded', this.onPlayerTraitAdded.bind(this))
        );
        
        // Game completion
        this._registeredEvents.push(
            eventSystem.on('gameVictory', this.onGameVictory.bind(this))
        );
    }
    
    /**
     * Initialize achievement definitions
     */
    initAchievements() {
        this.achievements = {
            explorer: {
                name: "Explorer",
                description: "Explore 90% of a level",
                progress: 0,
                threshold: 0.9,
                completed: false
            },
            balancer: {
                name: "Balancer",
                description: "Reach perfect 50/50 balance of chaos and order",
                progress: 0,
                threshold: 0.95, // How close to 0.5/0.5
                completed: false
            },
            efficient: {
                name: "Efficient",
                description: "Complete a level using less than 50 energy",
                progress: 0,
                threshold: 50,
                completed: false,
                inverted: true // Lower is better
            },
            quickWin: {
                name: "Quick Win",
                description: "Complete a level in under 15 turns",
                progress: 0,
                threshold: 15,
                completed: false,
                inverted: true // Lower is better
            }
        };
    }
    
    /**
     * Handle player moved event
     * @param {object} data - Event data
     */
    onPlayerMoved(data) {
        // Increment move counter
        this.movesMade++;
        
        // Calculate distance for this move (simplified - just 1 unit per move)
        const distanceForMove = 1;
        this.totalDistanceMoved += distanceForMove;
        
        // Check for achievements
        this.checkAchievements();
    }
    
    /**
     * Handle tile explored event
     * @param {object} data - Event data
     */
    onTileExplored(data) {
        this.tilesExplored++;
        
        // Calculate explorer rating
        const totalTiles = entityManager.getEntitiesByTag('tile').length;
        this.explorerRating = this.tilesExplored / totalTiles;
        
        // Update explorer achievement
        this.achievements.explorer.progress = this.explorerRating;
        
        // Check for achievements
        this.checkAchievements();
    }
    
    /**
     * Handle sense action completed
     * @param {object} data - Event data
     */
    onSenseComplete(data) {
        this.sensesPerformed++;
    }
    
    /**
     * Handle interact action completed
     * @param {object} data - Event data
     */
    onInteractComplete(data) {
        this.interactionsPerformed++;
    }
    
    /**
     * Handle stabilize action completed
     * @param {object} data - Event data
     */
    onStabilizeComplete(data) {
        this.stabilizationsPerformed++;
    }
    
    /**
     * Handle player energy changed
     * @param {object} data - Event data
     */
    onPlayerEnergyChanged(data) {
        if (data.energyUsed) {
            this.energyUsed += data.energyUsed;
        }
        
        if (data.energyRestored) {
            this.energyGained += data.energyRestored;
        }
        
        // Update efficient achievement
        this.achievements.efficient.progress = this.energyUsed;
        
        // Check for achievements
        this.checkAchievements();
    }
    
    /**
     * Handle player movement points changed
     * @param {object} data - Event data
     */
    onPlayerMovementPointsChanged(data) {
        // Track movement points used (by comparing previous and current)
        if (data.previousPoints && data.previousPoints > data.currentPoints) {
            this.movementPointsUsed += (data.previousPoints - data.currentPoints);
        }
    }
    
    /**
     * Handle tile chaos changed
     * @param {object} data - Event data
     */
    onTileChaosChanged(data) {
        // Track chaos changes
        if (data.chaosDelta > 0) {
            this.chaosCreated += data.chaosDelta;
        } else if (data.chaosDelta < 0) {
            this.chaosReduced += Math.abs(data.chaosDelta);
        }
        
        this.netChaosChange = this.chaosCreated - this.chaosReduced;
        
        // Check balance rating (how close to 50/50)
        const systemBalance = data.newChaos || 0.5; // Default to 0.5 if not provided
        this.balancerRating = 1 - Math.abs(0.5 - systemBalance) * 2; // 1 at perfect balance, 0 at extreme
        
        // Update balancer achievement
        this.achievements.balancer.progress = this.balancerRating;
        
        // Check for achievements
        this.checkAchievements();
    }
    
    /**
     * Handle turn end
     * @param {object} data - Event data
     */
    onTurnEnd(data) {
        this.turnsTaken++;
        
        // Calculate average actions per turn
        const totalActions = this.movesMade + this.sensesPerformed + 
                            this.interactionsPerformed + this.stabilizationsPerformed;
        this.averageActionsPerTurn = totalActions / this.turnsTaken;
        
        // Update quick win achievement
        this.achievements.quickWin.progress = this.turnsTaken;
        
        // Check for achievements
        this.checkAchievements();
    }
    
    /**
     * Handle player evolution points changed
     * @param {object} data - Event data
     */
    onPlayerEvolutionPointsChanged(data) {
        if (data.added) {
            this.evolutionPointsEarned += data.added;
        }
    }
    
    /**
     * Handle player trait added
     * @param {object} data - Event data
     */
    onPlayerTraitAdded(data) {
        this.traitsAcquired++;
    }
    
    /**
     * Handle game victory
     * @param {object} data - Event data
     */
    onGameVictory(data) {
        this.levelsCompleted++;
        this.totalPlayTime = (Date.now() - this.gameStartTime) / 1000; // In seconds
        
        // Save metrics for the completed level
        this.saveLevelMetrics(data.gameStage);
        
        // Check all achievements one last time
        this.checkAchievements();
    }
    
    /**
     * Save metrics for a completed level
     * @param {string} gameStage - The game stage of the completed level
     */
    saveLevelMetrics(gameStage) {
        const metrics = {
            timestamp: Date.now(),
            gameStage: gameStage,
            turns: this.turnsTaken,
            energyUsed: this.energyUsed,
            tilesExplored: this.tilesExplored,
            movesMade: this.movesMade,
            sensesPerformed: this.sensesPerformed,
            interactionsPerformed: this.interactionsPerformed,
            stabilizationsPerformed: this.stabilizationsPerformed,
            chaosCreated: this.chaosCreated,
            chaosReduced: this.chaosReduced,
            netChaosChange: this.netChaosChange,
            playTime: this.totalPlayTime
        };
        
        // Save to local storage
        let savedMetrics = JSON.parse(localStorage.getItem('levelMetrics') || '[]');
        savedMetrics.push(metrics);
        localStorage.setItem('levelMetrics', JSON.stringify(savedMetrics));
        
        // Also emit an event
        eventSystem.emit('levelMetricsSaved', { metrics });
    }
    
    /**
     * Check all achievements for completion
     */
    checkAchievements() {
        let newlyCompleted = [];
        
        for (const key in this.achievements) {
            const achievement = this.achievements[key];
            
            if (achievement.completed) continue;
            
            // Check if achievement is completed
            let isCompleted = false;
            
            if (achievement.inverted) {
                // For inverted achievements (lower is better)
                isCompleted = achievement.progress <= achievement.threshold;
            } else {
                // For normal achievements (higher is better)
                isCompleted = achievement.progress >= achievement.threshold;
            }
            
            if (isCompleted) {
                achievement.completed = true;
                newlyCompleted.push(achievement);
            }
        }
        
        // Emit event for newly completed achievements
        if (newlyCompleted.length > 0) {
            eventSystem.emit('achievementsCompleted', { achievements: newlyCompleted });
        }
    }
    
    /**
     * Get all current metrics
     * @returns {object} The metrics data
     */
    getMetrics() {
        return {
            movement: {
                movesMade: this.movesMade,
                tilesExplored: this.tilesExplored,
                totalDistanceMoved: this.totalDistanceMoved
            },
            resources: {
                energyUsed: this.energyUsed,
                energyGained: this.energyGained,
                movementPointsUsed: this.movementPointsUsed
            },
            actions: {
                sensesPerformed: this.sensesPerformed,
                interactionsPerformed: this.interactionsPerformed,
                stabilizationsPerformed: this.stabilizationsPerformed
            },
            chaos: {
                chaosCreated: this.chaosCreated,
                chaosReduced: this.chaosReduced,
                netChaosChange: this.netChaosChange
            },
            evolution: {
                evolutionPointsEarned: this.evolutionPointsEarned,
                traitsAcquired: this.traitsAcquired
            },
            game: {
                turnsTaken: this.turnsTaken,
                averageActionsPerTurn: this.averageActionsPerTurn,
                levelsCompleted: this.levelsCompleted,
                totalPlayTime: this.totalPlayTime
            },
            ratings: {
                explorerRating: this.explorerRating,
                balancerRating: this.balancerRating,
                efficientRating: this.efficientRating
            },
            achievements: this.achievements
        };
    }
    
    /**
     * Reset all metrics
     */
    reset() {
        // Reset all metrics except level completion count
        const levelsCompleted = this.levelsCompleted;
        
        // Movement metrics
        this.movesMade = 0;
        this.tilesExplored = 0;
        this.totalDistanceMoved = 0;
        
        // Resource metrics
        this.energyUsed = 0;
        this.energyGained = 0;
        this.movementPointsUsed = 0;
        
        // Action metrics
        this.sensesPerformed = 0;
        this.interactionsPerformed = 0;
        this.stabilizationsPerformed = 0;
        
        // Chaos/Order metrics
        this.chaosCreated = 0;
        this.chaosReduced = 0;
        this.netChaosChange = 0;
        
        // Evolution metrics (don't reset these between levels)
        // this.evolutionPointsEarned = 0;
        // this.traitsAcquired = 0;
        
        // Turn metrics
        this.turnsTaken = 0;
        this.averageActionsPerTurn = 0;
        
        // Game completion metrics
        this.levelsCompleted = levelsCompleted; // Restore levels completed
        this.totalPlayTime = 0;
        this.gameStartTime = Date.now();
        
        // Play style metrics
        this.explorerRating = 0;
        this.balancerRating = 0;
        this.efficientRating = 0;
        
        // Re-initialize achievements
        this.initAchievements();
        
        // Emit event
        eventSystem.emit('metricsReset');
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Remove all event listeners
        for (const registration of this._registeredEvents) {
            eventSystem.off(registration);
        }
        
        this._registeredEvents = [];
    }
    
    /**
     * Get all metrics data for saving
     * @returns {Object} Complete metrics data
     */
    getData() {
        return {
            // Movement metrics
            movesMade: this.movesMade,
            tilesExplored: this.tilesExplored,
            totalDistanceMoved: this.totalDistanceMoved,
            
            // Resource metrics
            energyUsed: this.energyUsed,
            energyGained: this.energyGained,
            movementPointsUsed: this.movementPointsUsed,
            
            // Action metrics
            sensesPerformed: this.sensesPerformed,
            interactionsPerformed: this.interactionsPerformed,
            stabilizationsPerformed: this.stabilizationsPerformed,
            
            // Chaos metrics
            chaosCreated: this.chaosCreated,
            chaosReduced: this.chaosReduced,
            netChaosChange: this.netChaosChange,
            
            // Game metrics
            turnsTaken: this.turnsTaken,
            averageActionsPerTurn: this.averageActionsPerTurn,
            levelsCompleted: this.levelsCompleted,
            totalPlayTime: this.totalPlayTime,
            
            // Evolution metrics
            evolutionPointsEarned: this.evolutionPointsEarned,
            traitsAcquired: this.traitsAcquired,
            
            // Ratings
            explorerRating: this.explorerRating,
            balancerRating: this.balancerRating,
            efficientRating: this.efficientRating,
            
            // Achievements
            achievements: JSON.parse(JSON.stringify(this.achievements))
        };
    }
    
    /**
     * Set metrics data from saved data
     * @param {Object} data - Data from getData()
     */
    setData(data) {
        if (!data) return;
        
        // Copy all metrics data from the saved object
        Object.keys(data).forEach(key => {
            if (typeof data[key] !== 'undefined') {
                this[key] = data[key];
            }
        });
        
        console.log('MetricsSystem: Restored metrics data');
    }
} 