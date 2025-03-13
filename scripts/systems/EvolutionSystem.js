/**
 * Manages player evolution, traits, and abilities
 */
import { MetricsSystem } from './MetricsSystem.js';
import { entityManager } from '../core/EntityManager.js';

export class EvolutionSystem {
    constructor() {
        // Available traits by category
        this.availableTraits = {
            movement: [
                {
                    id: 'swift',
                    name: 'Swift Movement',
                    description: 'Increases movement points by 1',
                    cost: 2,
                    category: 'movement',
                    onAcquire: (player) => {
                        player.maxMovementPoints += 1;
                        player.movementPoints += 1;
                    },
                    modifiesActionCost: null
                },
                {
                    id: 'efficient_movement',
                    name: 'Efficient Movement',
                    description: 'Reduces energy cost of movement by 1',
                    cost: 3,
                    category: 'movement',
                    onAcquire: null,
                    modifiesActionCost: (action, cost, tile) => {
                        if (action === 'move') {
                            return Math.max(1, cost - 1);
                        }
                        return cost;
                    }
                }
            ],
            
            sense: [
                {
                    id: 'enhanced_senses',
                    name: 'Enhanced Senses',
                    description: 'Reduces energy cost of sensing by 1',
                    cost: 2,
                    category: 'sense',
                    onAcquire: null,
                    modifiesActionCost: (action, cost, tile) => {
                        if (action === 'sense') {
                            return Math.max(1, cost - 1);
                        }
                        return cost;
                    }
                },
                {
                    id: 'deep_insight',
                    name: 'Deep Insight',
                    description: 'Sense actions provide more information about tiles',
                    cost: 3,
                    category: 'sense',
                    onAcquire: null,
                    // This has a special effect handled in UI
                    modifiesActionCost: null
                }
            ],
            
            manipulation: [
                {
                    id: 'powerful_stabilizer',
                    name: 'Powerful Stabilizer',
                    description: 'Stabilize actions have 50% more effect',
                    cost: 4,
                    category: 'manipulation',
                    onAcquire: null,
                    // Special effect handled in action logic
                    modifiesActionCost: null
                },
                {
                    id: 'efficient_manipulation',
                    name: 'Efficient Manipulation',
                    description: 'Reduces energy cost of interact and stabilize by 1',
                    cost: 3,
                    category: 'manipulation',
                    onAcquire: null,
                    modifiesActionCost: (action, cost, tile) => {
                        if (action === 'interact' || action === 'stabilize') {
                            return Math.max(1, cost - 1);
                        }
                        return cost;
                    }
                }
            ],
            
            adaptation: [
                {
                    id: 'aquatic',
                    name: 'Aquatic Adaptation',
                    description: 'Can move through water tiles',
                    cost: 5,
                    category: 'adaptation',
                    onAcquire: null,
                    // Special effect handled in movement logic
                    modifiesActionCost: null
                },
                {
                    id: 'mountaineer',
                    name: 'Mountaineer',
                    description: 'Reduced movement cost on mountain tiles',
                    cost: 3,
                    category: 'adaptation',
                    onAcquire: null,
                    modifiesActionCost: (action, cost, tile) => {
                        if (action === 'move' && tile && tile.type === 'mountain') {
                            return Math.max(1, cost - 2);
                        }
                        return cost;
                    }
                }
            ],
            
            survival: [
                {
                    id: 'energy_efficiency',
                    name: 'Energy Efficiency',
                    description: 'Gain 1 extra energy each turn',
                    cost: 4,
                    category: 'survival',
                    onAcquire: null,
                    // Special effect handled in turn system
                    modifiesActionCost: null
                },
                {
                    id: 'regeneration',
                    name: 'Regeneration',
                    description: 'Recover 1 energy when exploring a new tile',
                    cost: 3,
                    category: 'survival',
                    onAcquire: null,
                    // Special effect handled in exploration logic
                    modifiesActionCost: null
                }
            ]
        };
        
        // Player's acquired traits by ID
        this.acquiredTraits = {};
        
        // Evolution points available
        this.availablePoints = 0;
        
        // Event listeners
        this._registeredEvents = [];
    }
    
    /**
     * Initialize the evolution system
     */
    init() {
        console.log("Initializing evolution system");
        
        // Set initial evolution points
        this.availablePoints = 0;
        
        // Register event listeners
        this._registeredEvents.push(
            eventSystem.on('gameVictory', this.onLevelCompleted.bind(this))
        );
        
        this._registeredEvents.push(
            eventSystem.on('playerEvolutionPointsChanged', this.onEvolutionPointsChanged.bind(this))
        );
    }
    
    /**
     * Get all available traits
     * @returns {Array} Array of all available traits
     */
    getAllTraits() {
        let allTraits = [];
        
        // Flatten the traits by category
        for (const category in this.availableTraits) {
            allTraits = allTraits.concat(this.availableTraits[category]);
        }
        
        return allTraits;
    }
    
    /**
     * Get traits by category
     * @param {string} category - The trait category
     * @returns {Array} Array of traits in the category
     */
    getTraitsByCategory(category) {
        return this.availableTraits[category] || [];
    }
    
    /**
     * Get trait by ID
     * @param {string} traitId - The trait ID
     * @returns {object|null} The trait object or null if not found
     */
    getTraitById(traitId) {
        for (const category in this.availableTraits) {
            const trait = this.availableTraits[category].find(t => t.id === traitId);
            if (trait) return trait;
        }
        return null;
    }
    
    /**
     * Check if a trait is available for purchase
     * @param {string} traitId - The trait ID
     * @returns {boolean} True if the trait can be purchased
     */
    isTraitAvailable(traitId) {
        // Check if the trait exists
        const trait = this.getTraitById(traitId);
        if (!trait) return false;
        
        // Check if already acquired
        if (this.acquiredTraits[traitId]) return false;
        
        // Check if enough points
        return this.availablePoints >= trait.cost;
    }
    
    /**
     * Purchase a trait for the player
     * @param {string} traitId - The trait ID
     * @returns {boolean} True if the purchase was successful
     */
    purchaseTrait(traitId) {
        // Check if available
        if (!this.isTraitAvailable(traitId)) {
            console.error(`Trait ${traitId} is not available for purchase`);
            return false;
        }
        
        // Get the trait
        const trait = this.getTraitById(traitId);
        
        // Deduct points
        this.availablePoints -= trait.cost;
        
        // Mark as acquired
        this.acquiredTraits[traitId] = true;
        
        // Get the player
        const playerEntity = entityManager.getEntitiesByTag('player')[0];
        if (!playerEntity) {
            console.error("Cannot find player entity to apply trait");
            return false;
        }
        
        // Get player component
        try {
            const PlayerComponentClass = window.PlayerComponent || 
                (typeof PlayerComponent !== 'undefined' ? PlayerComponent : null);
                
            if (!PlayerComponentClass) {
                console.error("PlayerComponent class is not available");
                return false;
            }
            
            const playerComponent = playerEntity.getComponent(PlayerComponentClass);
            if (!playerComponent) {
                console.error("Player entity does not have PlayerComponent");
                return false;
            }
            
            // Add trait to player using the proper method
            const added = playerComponent.addTrait(trait);
            
            // Emit trait purchased event regardless of whether the trait was added
            // (if the player already has the trait, we still deducted points)
            eventSystem.emit('traitPurchased', {
                trait: trait,
                player: playerComponent
            });
            
            return added;
        } catch (error) {
            console.error("Error applying trait to player:", error);
            return false;
        }
    }
    
    /**
     * Acquire a trait for a specific player component
     * @param {Object} trait - The trait to acquire
     * @param {PlayerComponent} playerComponent - The player component to apply the trait to
     * @returns {boolean} Whether the trait was successfully acquired
     */
    acquireTrait(trait, playerComponent) {
        if (!trait || !playerComponent) {
            console.error("Cannot acquire trait: missing trait or player component");
            return false;
        }
        
        // Add trait to player - use the consistent addTrait method
        const added = playerComponent.addTrait(trait);
        
        // Mark the trait as acquired in our tracking
        if (added && trait.id) {
            this.acquiredTraits[trait.id] = true;
        }
        
        // If player already had the trait, we'll get false from addTrait,
        // but we should still mark it as acquired in our tracking system
        if (!added && trait.id && !this.acquiredTraits[trait.id]) {
            this.acquiredTraits[trait.id] = true;
            console.log(`Evolution System: Marked trait ${trait.id} as acquired (player already had it)`);
        }
        
        return added;
    }
    
    /**
     * Award evolution points to the player
     * @param {number} points - Number of points to award
     */
    awardEvolutionPoints(points) {
        this.availablePoints += points;
        
        // Get the player
        const playerEntity = entityManager.getEntitiesByTag('player')[0];
        if (!playerEntity) return;
        
        const playerComponent = playerEntity.getComponent(PlayerComponent);
        if (!playerComponent) return;
        
        // Update player evolution points
        playerComponent.addEvolutionPoints(points);
        
        // Emit event
        eventSystem.emit('evolutionPointsAwarded', {
            points: points,
            totalPoints: this.availablePoints
        });
    }
    
    /**
     * Calculate evolution points earned based on level metrics
     * @param {object} metrics - Level metrics
     * @returns {number} Points earned
     */
    calculateEvolutionPoints(metrics) {
        let points = 0;
        
        // Base points for completing a level
        points += 2;
        
        // Points based on exploration percentage
        const explorationRate = metrics.tilesExplored / metrics.totalTiles || 0;
        if (explorationRate > 0.9) points += 2;
        else if (explorationRate > 0.7) points += 1;
        
        // Points based on order balance achieved
        if (metrics.systemOrder > 0.7) points += 3;
        else if (metrics.systemOrder > 0.5) points += 2;
        else if (metrics.systemOrder > 0.3) points += 1;
        
        // Points based on efficiency (turns taken)
        if (metrics.turnsTaken < 10) points += 2;
        else if (metrics.turnsTaken < 20) points += 1;
        
        return points;
    }
    
    /**
     * Handle level completion event
     * @param {object} data - Event data
     */
    onLevelCompleted(data) {
        // Get metrics for the completed level
        const metricsSystem = new MetricsSystem(); // Assuming this is available
        const metrics = metricsSystem.getMetrics();
        
        // Calculate evolution points earned
        const points = this.calculateEvolutionPoints({
            tilesExplored: metrics.movement.tilesExplored,
            totalTiles: entityManager.getEntitiesByTag('tile').length,
            systemOrder: data.systemOrder || 0.5,
            turnsTaken: metrics.game.turnsTaken
        });
        
        // Award points
        this.awardEvolutionPoints(points);
    }
    
    /**
     * Handle evolution points changed event
     * @param {object} data - Event data
     */
    onEvolutionPointsChanged(data) {
        // Update available points
        if (data.points) {
            this.availablePoints = data.points;
        }
    }
    
    /**
     * Get all acquired traits
     * @returns {Array} Array of acquired trait objects
     */
    getAcquiredTraits() {
        const traits = [];
        
        for (const traitId in this.acquiredTraits) {
            if (this.acquiredTraits[traitId]) {
                const trait = this.getTraitById(traitId);
                if (trait) traits.push(trait);
            }
        }
        
        return traits;
    }
    
    /**
     * Reset the evolution system
     * @param {boolean} keepTraits - Whether to keep acquired traits
     */
    reset(keepTraits = true) {
        // Reset points
        this.availablePoints = 0;
        
        // Reset acquired traits if not keeping them
        if (!keepTraits) {
            this.acquiredTraits = {};
        }
        
        // Emit event
        eventSystem.emit('evolutionSystemReset', {
            keepTraits: keepTraits
        });
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
     * Get the acquired traits as an object
     * @returns {Object} Object with trait IDs as keys and boolean values
     */
    getAcquiredTraitsData() {
        return { ...this.acquiredTraits };
    }
    
    /**
     * Set the acquired traits from saved data
     * @param {Object} traitsData - Object with trait IDs as keys and boolean values
     */
    setAcquiredTraitsData(traitsData) {
        if (!traitsData) return;
        
        this.acquiredTraits = { ...traitsData };
        
        console.log(`Restored ${Object.keys(traitsData).length} acquired traits in EvolutionSystem`);
    }
} 