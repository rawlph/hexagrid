/**
 * Player Component for Hexgrid Evolution
 * Handles player state, movement, actions, and evolution
 */
import { TileComponent } from './TileComponent.js';
import { entityManager } from '../core/EntityManager.js';

export class PlayerComponent {
    /**
     * Create a new player component
     * @param {number} startRow - Starting grid row position
     * @param {number} startCol - Starting grid column position 
     */
    constructor(startRow = 0, startCol = 0) {
        // Position
        this.row = startRow;
        this.col = startCol;
        
        // Resources
        this.energy = 10;
        this.maxEnergy = 10;
        this.movementPoints = 3;
        this.maxMovementPoints = 3;
        
        // Evolution
        this.evolutionPoints = 0; // Legacy total points
        this.chaosEvolutionPoints = 0;
        this.flowEvolutionPoints = 0;
        this.orderEvolutionPoints = 0;
        this.traits = []; // Always initialize as empty array
        
        // Action state
        this.currentAction = null;
        this.markerElement = null;
        
        // Stats tracking
        this.tilesExplored = 0;
        this.movesMade = 0;
        this.actionsPerformed = 0;
        this.turnsCompleted = 0;
        
        // Bind methods that will be used as event handlers
        this.updateMarkerPosition = this.updateMarkerPosition.bind(this);
        this.onTurnStart = this.onTurnStart.bind(this);
        this.onTurnEnd = this.onTurnEnd.bind(this);
    }
    
    /**
     * Initialize the player component
     */
    init() {
        console.log('Initializing player component');
        
        // Create visual marker
        this.createPlayerMarker();
        
        // Register event listeners
        this.registerEventListeners();
        
        // Place on starting tile
        this.updatePosition(this.row, this.col);
    }
    
    /**
     * Create the player marker element
     */
    createPlayerMarker() {
        console.log('Creating player marker');
        
        // Create marker if it doesn't exist yet
        if (!this.markerElement) {
            this.markerElement = document.createElement('div');
            this.markerElement.className = 'player-marker';
            this.markerElement.textContent = 'P';
            
            // Add to grid container - this will be positioned absolutely
            const gridContainer = document.getElementById('grid-container');
            if (gridContainer) {
                gridContainer.appendChild(this.markerElement);
            } else {
                console.error('Grid container not found');
            }
        }
    }
    
    /**
     * Register event listeners
     */
    registerEventListeners() {
        // Listen for turn start/end
        eventSystem.on('turnStart', this.onTurnStart);
        eventSystem.on('turnEnd', this.onTurnEnd);
        
        // Listen for window resize to update marker position
        window.addEventListener('resize', this.updateMarkerPosition);
        
        // Listen for grid changes
        eventSystem.on('gridInitialized', this.updateMarkerPosition);
    }
    
    /**
     * Update player position
     * @param {number} newRow - New row position
     * @param {number} newCol - New column position
     * @returns {boolean} Whether the move was successful
     */
    updatePosition(newRow, newCol) {
        console.log(`Moving player from (${this.row},${this.col}) to (${newRow},${newCol})`);
        
        // Update position
        this.row = newRow;
        this.col = newCol;
        
        // Update marker position with a slight delay to ensure tile exists
        setTimeout(() => {
            this.updateMarkerPosition();
        }, 50);
        
        // Track movement
        this.movesMade++;
        
        // Emit movement event
        eventSystem.emit('playerMoved', {
            player: this,
            row: newRow,
            col: newCol
        });
        
        return true;
    }
    
    /**
     * Update marker visual position
     */
    updateMarkerPosition() {
        // Ensure we have a marker
        if (!this.markerElement) {
            console.warn('Player marker element not found, creating it');
            this.createPlayerMarker();
            if (!this.markerElement) return;
        }
        
        // Find the current tile element
        const tileElement = document.querySelector(`.hex-tile[data-row="${this.row}"][data-col="${this.col}"]`);
        
        if (tileElement) {
            console.log(`Found tile at position (${this.row},${this.col})`);
            
            // Get the grid container's position
            const gridContainer = document.getElementById('grid-container');
            if (!gridContainer) {
                console.error("Grid container not found");
                return;
            }
            
            const gridRect = gridContainer.getBoundingClientRect();
            const tileRect = tileElement.getBoundingClientRect();
            
            // Calculate position relative to the grid container
            const relativeLeft = tileRect.left - gridRect.left + (tileRect.width / 2);
            const relativeTop = tileRect.top - gridRect.top + (tileRect.height / 2);
            
            // Position marker
            this.markerElement.style.position = 'absolute';
            this.markerElement.style.left = `${relativeLeft}px`;
            this.markerElement.style.top = `${relativeTop}px`;
            this.markerElement.style.zIndex = '50';
            this.markerElement.style.display = 'flex';
            
            console.log(`Updated marker position to ${relativeLeft}px, ${relativeTop}px`);
        } else {
            console.warn(`Tile element not found for position (${this.row},${this.col})`);
            
            // Try to find the tile again after a slight delay
            setTimeout(() => {
                const retryTileElement = document.querySelector(`.hex-tile[data-row="${this.row}"][data-col="${this.col}"]`);
                if (retryTileElement) {
                    console.log("Found tile on retry");
                    this.updateMarkerPosition();
                } else {
                    // Hide marker if tile still not found
                    this.markerElement.style.display = 'none';
                    console.error(`Tile still not found at (${this.row},${this.col})`);
                }
            }, 200);  // Increased delay
        }
    }
    
    /**
     * Set the current player action
     * @param {string} action - Action to set (move, sense, interact, stabilize)
     * @returns {boolean} Whether the action was set
     */
    setAction(action) {
        console.log(`PlayerComponent.setAction called with ${action}, current action: ${this.currentAction}`);
        
        // Simply set the action, don't toggle if same action
        const oldAction = this.currentAction;
        this.currentAction = action;
        
        // Emit action changed event
        eventSystem.emit('playerActionChanged', {
            oldAction: oldAction,
            action: this.currentAction
        });
        
        return true;
    }
    
    /**
     * Get adjacent positions to the player
     * @returns {Array} Array of [row, col] arrays representing adjacent positions
     */
    getAdjacentPositions() {
        return utils.getAdjacentCoordinates(this.row, this.col, 100, 100); // Using large limits as we don't know grid size here
    }
    
    /**
     * Check if a position is adjacent to the player
     * @param {number} row - Row to check
     * @param {number} col - Column to check
     * @returns {boolean} Whether the position is adjacent
     */
    isAdjacentTo(row, col) {
        console.log(`Checking if (${row},${col}) is adjacent to player at (${this.row},${this.col})`);
        
        // Check if the same tile
        if (row === this.row && col === this.col) {
            console.log("Same tile, not adjacent");
            return false;
        }
        
        // Calculate the distance between cells
        const rowDiff = Math.abs(row - this.row);
        const colDiff = Math.abs(col - this.col);
        
        // Get adjacent coordinates
        const adjacentCoords = utils.getAdjacentCoordinates(this.row, this.col, 100, 100);
        
        // Check if coordinates match any of the adjacent positions
        const isAdjacent = adjacentCoords.some(([adjRow, adjCol]) => 
            adjRow === row && adjCol === col
        );
        
        console.log(`Is adjacent: ${isAdjacent}`);
        console.log(`Adjacent coordinates:`, adjacentCoords);
        
        return isAdjacent;
    }
    
    /**
     * Use energy for an action
     * @param {number} amount - Amount of energy to use
     * @returns {boolean} Whether enough energy was available
     */
    useEnergy(amount) {
        // Check if we have enough energy
        if (this.energy < amount) return false;
        
        // Store old energy value
        const oldEnergy = this.energy;
        
        // Deduct energy
        this.energy = Math.max(0, this.energy - amount);
        
        // Emit energy changed event
        eventSystem.emit('playerEnergyChanged', {
            player: this,
            oldEnergy: oldEnergy,
            newEnergy: this.energy,
            delta: this.energy - oldEnergy
        });
        
        return true;
    }
    
    /**
     * Use a movement point
     * @returns {boolean} Whether a movement point was available
     */
    useMovementPoint() {
        // Check if we have movement points
        if (this.movementPoints <= 0) return false;
        
        // Store old value
        const oldPoints = this.movementPoints;
        
        // Deduct point
        this.movementPoints--;
        
        // Emit movement points changed event
        eventSystem.emit('playerMovementPointsChanged', {
            player: this,
            oldPoints: oldPoints,
            newPoints: this.movementPoints,
            delta: -1
        });
        
        return true;
    }
    
    /**
     * Add a trait to the player
     * @param {Object} trait - Trait object to add
     * @returns {boolean} Whether the trait was added
     */
    addTrait(trait) {
        // Ensure traits is initialized
        if (!this.traits) {
            this.traits = [];
            console.warn('PlayerComponent: traits array was not initialized, creating it now');
        }
        
        // Validate trait object
        if (!trait || !trait.id) {
            console.error('PlayerComponent: Cannot add invalid trait without id');
            return false;
        }
        
        // Check if we already have this trait
        if (this.traits.some(t => t && t.id === trait.id)) return false;
        
        // Add trait
        this.traits.push(trait);
        
        // Apply trait effects
        this.applyTraitEffects(trait);
        
        // Emit trait added event
        eventSystem.emit('playerTraitAdded', {
            player: this,
            trait: trait
        });
        
        return true;
    }
    
    /**
     * Apply effects from a trait
     * @param {Object} trait - Trait to apply effects from
     */
    applyTraitEffects(trait) {
        // Apply stat changes
        if (trait.effects) {
            if (trait.effects.maxEnergy) this.maxEnergy += trait.effects.maxEnergy;
            if (trait.effects.maxMovementPoints) this.maxMovementPoints += trait.effects.maxMovementPoints;
            
            // Refill to new max
            this.energy = this.maxEnergy;
            this.movementPoints = this.maxMovementPoints;
        }
    }
    
    /**
     * Add evolution points of a specific type
     * @param {string} type - Type of evolution points ('chaos', 'flow', or 'order')
     * @param {number} amount - Amount of points to add
     */
    addEvolutionPoints(type, amount) {
        if (amount <= 0) return;
        
        switch (type) {
            case 'chaos':
                this.chaosEvolutionPoints += amount;
                break;
            case 'flow':
                this.flowEvolutionPoints += amount;
                break;
            case 'order':
                this.orderEvolutionPoints += amount;
                break;
            default:
                // Legacy support for general evolution points
                this.evolutionPoints += amount;
                break;
        }
        
        // For backwards compatibility, also update total points
        this.evolutionPoints = this.chaosEvolutionPoints + this.flowEvolutionPoints + this.orderEvolutionPoints;
        
        // Emit an event about the evolution points change
        eventSystem.emit('playerEvolutionPointsChanged', {
            player: this,
            type: type,
            amount: amount,
            chaosPoints: this.chaosEvolutionPoints,
            flowPoints: this.flowEvolutionPoints,
            orderPoints: this.orderEvolutionPoints,
            totalPoints: this.evolutionPoints
        });
        
        console.log(`Added ${amount} ${type} evolution points. Total ${type}: ${this[type + 'EvolutionPoints']}`);
    }
    
    /**
     * Get the total of all evolution points
     * @returns {number} Total evolution points
     */
    getTotalEvolutionPoints() {
        return this.chaosEvolutionPoints + this.flowEvolutionPoints + this.orderEvolutionPoints;
    }
    
    /**
     * Handle turn start event
     * @param {Object} data - Event data
     */
    onTurnStart(data) {
        console.log(`Turn start event received with turn count: ${data.turnCount}`);
        
        // Refresh movement points
        const oldPoints = this.movementPoints;
        this.movementPoints = this.maxMovementPoints;
        
        // Emit movement points changed event
        eventSystem.emit('playerMovementPointsChanged', {
            player: this,
            oldPoints: oldPoints,
            newPoints: this.movementPoints,
            delta: this.movementPoints - oldPoints
        });
        
        // Apply energy recovery - fixed to match documentation (was +2, should be +5)
        const oldEnergy = this.energy;
        const energyRecovery = 5; // Base recovery amount as per documentation
        
        // Check if the player has energy efficiency trait which could modify this
        let finalRecovery = energyRecovery;
        if (Array.isArray(this.traits)) {
            for (const trait of this.traits) {
                if (trait && trait.id === 'energy_efficiency') {
                    // Apply energy efficiency bonus if the trait exists
                    finalRecovery += 2; // Additional energy from trait
                    console.log('Energy Efficiency trait applied: +2 additional energy');
                    break;
                }
            }
        }
        
        this.energy = Math.min(this.maxEnergy, this.energy + finalRecovery);
        
        // Emit energy changed event if energy changed
        if (this.energy !== oldEnergy) {
            eventSystem.emit('playerEnergyChanged', {
                player: this,
                oldEnergy: oldEnergy,
                newEnergy: this.energy,
                delta: this.energy - oldEnergy
            });
        }
        
        // Make sure marker is visible and positioned correctly
        this.updateMarkerPosition();
    }
    
    /**
     * Handle turn end event
     * @param {Object} data - Event data
     */
    onTurnEnd(data) {
        console.log(`Turn end event received with turn count: ${data.turnCount}`);
        
        // Clear current action
        this.setAction(null);
        
        // Increment turns completed
        this.turnsCompleted++;
        
        // Note: Evolution points are now awarded in the TurnSystem
        
        // Emit stats update event
        eventSystem.emit('playerStatsUpdated', {
            player: this,
            tilesExplored: this.tilesExplored,
            movesMade: this.movesMade,
            actionsPerformed: this.actionsPerformed,
            turnsCompleted: this.turnsCompleted
        });
    }
    
    /**
     * Get player data for serialization
     * @returns {Object} Player data
     */
    getData() {
        return {
            position: {
                row: this.row,
                col: this.col
            },
            resources: {
                energy: this.energy,
                maxEnergy: this.maxEnergy,
                movementPoints: this.movementPoints,
                maxMovementPoints: this.maxMovementPoints,
                evolutionPoints: this.evolutionPoints
            },
            traits: this.traits.map(t => t.id),
            stats: {
                tilesExplored: this.tilesExplored,
                movesMade: this.movesMade,
                actionsPerformed: this.actionsPerformed,
                turnsCompleted: this.turnsCompleted
            }
        };
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        eventSystem.off('turnStart', this.onTurnStart);
        eventSystem.off('turnEnd', this.onTurnEnd);
        window.removeEventListener('resize', this.updateMarkerPosition);
        eventSystem.off('gridInitialized', this.updateMarkerPosition);
        
        // Remove marker element
        if (this.markerElement) {
            this.markerElement.remove();
            this.markerElement = null;
        }
    }
    
    /**
     * Apply effects from all traits
     * This is useful when restoring traits after level transitions
     */
    applyAllTraitEffects() {
        console.log(`Applying effects from ${this.traits ? this.traits.length : 0} traits...`);
        
        // Ensure traits is initialized
        if (!this.traits) {
            this.traits = [];
            console.warn('PlayerComponent: traits array was not initialized, creating it now');
            return; // No traits to apply
        }
        
        // Reset stats to base values
        this.maxEnergy = 10; // Base max energy
        this.maxMovementPoints = 3; // Base max movement points
        
        // Apply each trait's effects one by one
        for (const trait of this.traits) {
            if (!trait) continue; // Skip null or undefined traits
            
            console.log(`Applying effects from trait: ${trait.name} (${trait.id})`);
            
            // Apply immediate effects if any
            if (trait.onAcquire && typeof trait.onAcquire === 'function') {
                try {
                    trait.onAcquire(this);
                    console.log(`Successfully applied onAcquire effect for trait: ${trait.name}`);
                } catch (error) {
                    console.error(`Error applying onAcquire effect for trait: ${trait.name}`, error);
                }
            }
            
            // Apply static effects
            if (trait.effects) {
                if (trait.effects.maxEnergy) {
                    this.maxEnergy += trait.effects.maxEnergy;
                    console.log(`Applied maxEnergy effect: +${trait.effects.maxEnergy}`);
                }
                
                if (trait.effects.maxMovementPoints) {
                    this.maxMovementPoints += trait.effects.maxMovementPoints;
                    console.log(`Applied maxMovementPoints effect: +${trait.effects.maxMovementPoints}`);
                }
            }
        }
        
        // Refill to new max values
        this.energy = this.maxEnergy;
        this.movementPoints = this.maxMovementPoints;
        
        console.log(`Applied effects from ${this.traits.length} traits. New stats: Energy=${this.maxEnergy}, Movement=${this.maxMovementPoints}`);
    }
    
    /**
     * Add a trait without applying its effects immediately
     * Useful for when we want to add multiple traits and apply their effects all at once
     * @param {Object} trait - Trait to add
     * @returns {boolean} Whether trait was added successfully
     */
    addTraitWithoutEffect(trait) {
        // Check if we already have this trait
        if (this.traits.some(t => t.id === trait.id)) return false;
        
        // Add trait to the array
        this.traits.push(trait);
        
        // Emit trait added event
        eventSystem.emit('playerTraitAdded', {
            player: this,
            trait: trait
        });
        
        return true;
    }
    
    /**
     * Get energy cost for an action on a specific tile
     * @param {string} action - The action type
     * @param {number} targetRow - Target row
     * @param {number} targetCol - Target column
     * @returns {number} The energy cost or -1 if action is not possible
     */
    getActionCost(action, targetRow, targetCol) {
        // Validate parameters
        if (!action) {
            console.error('PlayerComponent: Cannot calculate cost for undefined action');
            return -1;
        }
        
        // Get target tile
        const tileEntity = entityManager.getEntitiesByTag(`tile_${targetRow}_${targetCol}`)[0];
        if (!tileEntity) {
            console.error(`PlayerComponent: No tile entity found at (${targetRow}, ${targetCol})`);
            return -1;
        }
        
        const tileComponent = tileEntity.getComponent(TileComponent);
        if (!tileComponent) {
            console.error(`PlayerComponent: Tile at (${targetRow}, ${targetCol}) has no TileComponent`);
            return -1;
        }
        
        // Get base cost from tile
        let cost = tileComponent.getActionCost(action);
        
        // Ensure traits is initialized
        if (!this.traits) {
            this.traits = [];
            console.warn('PlayerComponent: traits array was not initialized, creating it now');
        }
        
        // Apply trait modifiers
        for (const trait of this.traits) {
            if (trait && trait.modifiesActionCost && typeof trait.modifiesActionCost === 'function') {
                cost = trait.modifiesActionCost(action, cost, tileComponent);
            }
        }
        
        return Math.max(0, cost);
    }
} 