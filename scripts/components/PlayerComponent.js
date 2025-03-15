/**
 * Player Component for Hexgrid Evolution
 * Handles player state, movement, actions, and evolution
 */
import { TileComponent } from './TileComponent.js';
import { entityManager, Component } from '../core/EntityManager.js';
import { eventSystem } from '../core/EventSystem.js';
import { EventTypes } from '../core/EventTypes.js';
import { eventMediator } from '../core/EventMediator.js';

export class PlayerComponent extends Component {
    /**
     * Create a new player component
     * @param {Entity} entity - The entity this component belongs to
     * @param {number} startRow - Starting grid row position
     * @param {number} startCol - Starting grid column position 
     */
    constructor(entity, startRow = 0, startCol = 0) {
        super(entity);
        
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
        
        // Stats tracking
        this.tilesExplored = 0;
        this.movesMade = 0;
        this.actionsPerformed = 0;
        this.turnsCompleted = 0;
        
        // DOM elements
        this.markerElement = null;
        
        // Event listeners
        this.boundEventListeners = {};
        
        // Bind methods that will be used as event handlers
        this.updateMarkerPosition = this.updateMarkerPosition.bind(this);
        this.onTurnStart = this.onTurnStart.bind(this);
        this.onTurnEnd = this.onTurnEnd.bind(this);
    }
    
    /**
     * Called after the component is attached to an entity
     */
    onAttach() {
        // Create marker element
        this.createPlayerMarker();
        
        // Add player tag if not already added
        if (!this.entity.hasTag('player')) {
            this.entity.addTag('player');
        }
    }
    
    /**
     * Called before the component is detached from an entity
     */
    onDetach() {
        // Remove event listeners
        this.clearEventListeners();
        
        // Remove marker element
        if (this.markerElement) {
            this.markerElement.remove();
            this.markerElement = null;
        }
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
        
        // First check if there's already a player marker in the DOM
        // This ensures we're maintaining a single source of truth
        const existingMarker = document.querySelector('.player-marker');
        if (existingMarker) {
            console.log('Found existing player marker, reusing it');
            this.markerElement = existingMarker;
            return;
        }
        
        // Create marker if it doesn't exist yet
        this.markerElement = document.createElement('div');
        this.markerElement.className = 'player-marker';
        this.markerElement.textContent = 'P';
        this.markerElement.dataset.entityId = this.entity.id; // Add entity ID to marker for identification
        
        // Add to grid container - this will be positioned absolutely
        const gridContainer = document.getElementById('grid-container');
        if (gridContainer) {
            gridContainer.appendChild(this.markerElement);
        } else {
            console.error('Grid container not found');
        }
    }
    
    /**
     * Register event listeners
     */
    registerEventListeners() {
        // Clear existing listeners in case this is called multiple times
        if (this._registeredEvents) {
            this.clearEventListeners();
        }
        
        // Initialize array to store registrations
        this._registeredEvents = [];
        
        // Listen for turn start/end using standardized event types
        this._registeredEvents.push(
            eventSystem.on(EventTypes.TURN_START.standard, this.onTurnStart.bind(this))
        );
        this._registeredEvents.push(
            eventSystem.on(EventTypes.TURN_END.standard, this.onTurnEnd.bind(this))
        );
        
        // Listen for window resize to update marker position
        // Note: This is a DOM event, so we handle it differently
        window.addEventListener('resize', this.updateMarkerPosition.bind(this));
        
        // Listen for grid changes with standardized event type
        this._registeredEvents.push(
            eventSystem.on(EventTypes.GRID_INITIALIZED.standard, this.updateMarkerPosition.bind(this))
        );
    }
    
    /**
     * Clear all registered event listeners
     */
    clearEventListeners() {
        if (Array.isArray(this._registeredEvents)) {
            for (const registration of this._registeredEvents) {
                if (registration) {
                    eventSystem.off(registration);
                }
            }
            this._registeredEvents = [];
        }
    }
    
    /**
     * Update player position
     * @param {number} newRow - New row position
     * @param {number} newCol - New column position
     * @returns {boolean} Whether move was successful
     */
    updatePosition(newRow, newCol) {
        // Store previous position
        const oldRow = this.row;
        const oldCol = this.col;
        
        // Update position
        this.row = newRow;
        this.col = newCol;
        
        // Update marker position with a slight delay to ensure tile exists
        setTimeout(() => {
            this.updateMarkerPosition();
        }, 50);
        
        // Track movement
        this.movesMade++;
        
        // Emit movement event (standardized)
        eventSystem.emitStandardized(
            EventTypes.PLAYER_MOVED.legacy,
            EventTypes.PLAYER_MOVED.standard,
            {
                player: this,
                row: newRow,
                col: newCol,
                fromRow: oldRow,
                fromCol: oldCol
            }
        );
        
        return true;
    }
    
    /**
     * Update marker visual position
     */
    updateMarkerPosition() {
        // Ensure we have a marker - first try to get the reference if we lost it
        if (!this.markerElement) {
            // Try to find the existing marker by entity ID before creating a new one
            const existingMarker = document.querySelector(`.player-marker[data-entity-id="${this.entity.id}"]`);
            if (existingMarker) {
                console.log('Reconnected to existing player marker');
                this.markerElement = existingMarker;
            } else {
                console.warn('Player marker element not found, creating it');
                this.createPlayerMarker();
                if (!this.markerElement) return;
            }
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
        // Skip if trying to set the same action
        if (this.currentAction === action) {
            return false;
        }
        
        console.log(`PlayerComponent.setAction called with ${action}, current action: ${this.currentAction}`);
        
        // Simply set the action, don't toggle if same action
        const oldAction = this.currentAction;
        this.currentAction = action;
        
        // Emit action changed event (standardized)
        eventSystem.emitStandardized(
            EventTypes.PLAYER_ACTION_CHANGED.legacy,
            EventTypes.PLAYER_ACTION_CHANGED.standard,
            {
                player: this,
                oldAction: oldAction,
                action: this.currentAction
            }
        );
        
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
        console.log(`PlayerComponent.useEnergy: Using ${amount} energy, current energy: ${this.energy}`);
        
        // Check if we have enough energy
        if (this.energy < amount) {
            console.warn(`Not enough energy for action: have ${this.energy}, need ${amount}`);
            return false;
        }
        
        // Use the EventMediator to handle the energy change transaction
        const result = eventMediator.handlePlayerEnergyChange({
            player: this,
            amount: -amount,  // Negative amount for consumption
            source: 'action'
        });
        
        if (!result.success) {
            console.error(`Failed to use energy: ${result.error}`);
            return false;
        }
        
        console.log(`Energy updated: ${result.oldEnergy} -> ${result.newEnergy} (delta: ${result.delta})`);
        return true;
    }
    
    /**
     * Internal method to directly update energy without using the mediator
     * Used by the EventMediator to avoid infinite recursion
     * @param {number} newValue - New energy value
     * @private
     */
    _updateEnergyDirect(newValue) {
        this.energy = Math.max(0, Math.min(this.maxEnergy, newValue));
        return this.energy;
    }
    
    /**
     * Add energy to the player
     * @param {number} amount - Amount of energy to add
     * @returns {boolean} Always returns true
     */
    addEnergy(amount) {
        console.log(`PlayerComponent.addEnergy: Adding ${amount} energy, current energy: ${this.energy}`);
        
        // Use the EventMediator to handle the energy change transaction
        const result = eventMediator.handlePlayerEnergyChange({
            player: this,
            amount: amount,  // Positive amount for addition
            source: 'restore'
        });
        
        if (!result.success) {
            console.error(`Failed to add energy: ${result.error}`);
            return false;
        }
        
        console.log(`Energy updated: ${result.oldEnergy} -> ${result.newEnergy} (delta: ${result.delta})`);
        return true;
    }
    
    /**
     * Use movement points
     * @param {number} amount - Amount of movement points to use
     * @returns {boolean} Whether enough movement points were available
     */
    useMovementPoints(amount) {
        console.log(`PlayerComponent.useMovementPoints: Using ${amount} movement points, current: ${this.movementPoints}`);
        
        // Check if we have enough movement points
        if (this.movementPoints < amount) {
            console.warn(`Not enough movement points: have ${this.movementPoints}, need ${amount}`);
            return false;
        }
        
        // Use the EventMediator to handle the movement points change transaction
        const result = eventMediator.handlePlayerMovementPointsChange({
            player: this,
            amount: -amount,  // Negative amount for consumption
            source: 'action'
        });
        
        if (!result.success) {
            console.error(`Failed to use movement points: ${result.error}`);
            return false;
        }
        
        console.log(`Movement points updated: ${result.oldMovementPoints} -> ${result.newMovementPoints} (delta: ${result.delta})`);
        return true;
    }
    
    /**
     * Internal method to directly update movement points without using the mediator
     * Used by the EventMediator to avoid infinite recursion
     * @param {number} newValue - New movement points value
     * @private
     */
    _updateMovementPointsDirect(newValue) {
        this.movementPoints = Math.max(0, Math.min(this.maxMovementPoints, newValue));
        return this.movementPoints;
    }
    
    /**
     * Add movement points to the player
     * @param {number} amount - Amount of movement points to add
     * @returns {boolean} Always returns true
     */
    addMovementPoints(amount) {
        console.log(`PlayerComponent.addMovementPoints: Adding ${amount} movement points, current: ${this.movementPoints}`);
        
        // Use the EventMediator to handle the movement points change transaction
        const result = eventMediator.handlePlayerMovementPointsChange({
            player: this,
            amount: amount,  // Positive amount for addition
            source: 'restore'
        });
        
        if (!result.success) {
            console.error(`Failed to add movement points: ${result.error}`);
            return false;
        }
        
        console.log(`Movement points updated: ${result.oldMovementPoints} -> ${result.newMovementPoints} (delta: ${result.delta})`);
        return true;
    }
    
    /**
     * Add a trait to the player
     * @param {Object} trait - Trait to add
     * @returns {boolean} Whether trait was added
     */
    addTrait(trait) {
        if (!trait || !trait.id) {
            console.error('Invalid trait:', trait);
            return false;
        }
        
        // Check if we already have this trait
        if (this.traits.some(t => t.id === trait.id)) {
            console.log(`Player already has trait ${trait.id}`);
            return false;
        }
        
        // Add trait
        this.traits.push(trait);
        
        // Apply trait effects
        this.applyTraitEffects(trait);
        
        // Emit trait added event
        eventSystem.emitStandardized(
            EventTypes.PLAYER_TRAIT_ADDED.legacy,
            EventTypes.PLAYER_TRAIT_ADDED.standard,
            {
                player: this,
                trait: trait
            }
        );
        
        console.log(`Added trait: ${trait.name} (${trait.id})`);
        return true;
    }
    
    /**
     * Apply effects from a trait
     * @param {Object} trait - Trait to apply effects from
     */
    applyTraitEffects(trait) {
        console.log(`PlayerComponent: Applying effects from trait ${trait.id} (${trait.name})`);
        
        // Apply stat changes
        if (trait.effects) {
            if (trait.effects.maxEnergy) {
                this.maxEnergy += trait.effects.maxEnergy;
                console.log(`PlayerComponent: Applied maxEnergy effect: +${trait.effects.maxEnergy}`);
            }
            if (trait.effects.maxMovementPoints) {
                this.maxMovementPoints += trait.effects.maxMovementPoints;
                console.log(`PlayerComponent: Applied maxMovementPoints effect: +${trait.effects.maxMovementPoints}`);
            }
            
            // Refill to new max
            this.energy = this.maxEnergy;
            this.movementPoints = this.maxMovementPoints;
            
            // Emit events for resource changes
            eventSystem.emitStandardized(
                EventTypes.PLAYER_ENERGY_CHANGED.legacy,
                EventTypes.PLAYER_ENERGY_CHANGED.standard,
                {
                    player: this,
                    oldEnergy: this.energy,
                    energy: this.energy,
                    delta: 0
                }
            );
            
            eventSystem.emitStandardized(
                EventTypes.PLAYER_MOVEMENT_POINTS_CHANGED.legacy,
                EventTypes.PLAYER_MOVEMENT_POINTS_CHANGED.standard,
                {
                    player: this,
                    oldMovementPoints: this.movementPoints,
                    movementPoints: this.movementPoints,
                    delta: 0
                }
            );
        }
        
        // Apply onAcquire effect if it exists (and is a function)
        if (trait.onAcquire && typeof trait.onAcquire === 'function') {
            try {
                trait.onAcquire(this);
                console.log(`PlayerComponent: Successfully executed onAcquire function for trait ${trait.id}`);
            } catch (error) {
                console.error(`PlayerComponent: Error executing onAcquire function for trait ${trait.id}:`, error);
            }
        }
    }
    
    /**
     * Add evolution points to the player
     * @param {number} chaosPoints - Amount of chaos evolution points to add
     * @param {number} flowPoints - Amount of flow evolution points to add
     * @param {number} orderPoints - Amount of order evolution points to add
     * @returns {boolean} Always returns true
     */
    addEvolutionPoints(chaosPoints, flowPoints, orderPoints) {
        const totalPoints = chaosPoints + flowPoints + orderPoints;
        console.log(`PlayerComponent.addEvolutionPoints: Adding ${totalPoints} evolution points`);
        
        // Use the EventMediator to handle the evolution points change transaction
        const result = eventMediator.handlePlayerEvolutionPointsChange({
            player: this,
            points: {
                chaos: chaosPoints,
                flow: flowPoints,
                order: orderPoints
            },
            source: 'turn'
        });
        
        if (!result.success) {
            console.error(`Failed to add evolution points: ${result.error}`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Internal method to directly update evolution points without using the mediator
     * Used by the EventMediator to avoid infinite recursion
     * @param {number} chaosPoints - New chaos points value
     * @param {number} flowPoints - New flow points value
     * @param {number} orderPoints - New order points value
     * @private
     */
    _updateEvolutionPointsDirect(chaosPoints, flowPoints, orderPoints) {
        // Add points to existing values
        this.chaosEvolutionPoints += chaosPoints;
        this.flowEvolutionPoints += flowPoints;
        this.orderEvolutionPoints += orderPoints;
        
        // Update total - make sure individual categories are included
        this.evolutionPoints = this.chaosEvolutionPoints + this.flowEvolutionPoints + this.orderEvolutionPoints;
        
        return {
            chaos: this.chaosEvolutionPoints,
            flow: this.flowEvolutionPoints,
            order: this.orderEvolutionPoints,
            total: this.evolutionPoints
        };
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
        
        // Emit movement points changed event - use standardized emission with deprecation info
        eventSystem.emitStandardized(
            EventTypes.PLAYER_MOVEMENT_POINTS_CHANGED.legacy,
            EventTypes.PLAYER_MOVEMENT_POINTS_CHANGED.standard,
            {
                player: this,
                oldMovementPoints: oldPoints,
                movementPoints: this.movementPoints,
                // Include legacy properties for backward compatibility
                oldPoints: oldPoints,
                newPoints: this.movementPoints,
                delta: this.movementPoints - oldPoints
            },
            EventTypes.PLAYER_MOVEMENT_POINTS_CHANGED.deprecation
        );
        
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
        
        // Emit energy changed event if energy changed - use standardized emission with deprecation info
        if (this.energy !== oldEnergy) {
            eventSystem.emitStandardized(
                EventTypes.PLAYER_ENERGY_CHANGED.legacy,
                EventTypes.PLAYER_ENERGY_CHANGED.standard,
                {
                    player: this,
                    oldEnergy: oldEnergy,
                    energy: this.energy,
                    // Include legacy properties for backward compatibility
                    newEnergy: this.energy,
                    delta: this.energy - oldEnergy,
                    // Include specific property for metrics tracking
                    energyRestored: finalRecovery
                },
                EventTypes.PLAYER_ENERGY_CHANGED.deprecation
            );
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
        
        // Clear current action only if it's not already null
        if (this.currentAction !== null) {
            this.setAction(null);
        }
        
        // Increment turns completed
        this.turnsCompleted++;
        
        // Note: Evolution points are now awarded in the TurnSystem
        
        // Emit stats update event using standardized format with deprecation info
        eventSystem.emitStandardized(
            EventTypes.PLAYER_STATS_UPDATED.legacy,
            EventTypes.PLAYER_STATS_UPDATED.standard,
            {
                player: this,
                tilesExplored: this.tilesExplored,
                movesMade: this.movesMade,
                actionsPerformed: this.actionsPerformed,
                turnsCompleted: this.turnsCompleted,
                // Include isStandardized flag for consistency
                isStandardized: true
            },
            EventTypes.PLAYER_STATS_UPDATED.deprecation
        );
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
        this.clearEventListeners();
        
        // Remove DOM event listener (handled separately)
        window.removeEventListener('resize', this.updateMarkerPosition);
        
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
        console.log(`PlayerComponent: Applying effects from ${this.traits ? this.traits.length : 0} traits...`);
        
        // Ensure traits is initialized
        if (!this.traits) {
            this.traits = [];
            console.warn('PlayerComponent: traits array was not initialized, creating it now');
            return; // No traits to apply
        }
        
        // Store old stat values before resetting
        const oldMaxEnergy = this.maxEnergy;
        const oldMaxMovementPoints = this.maxMovementPoints;
        const oldEnergy = this.energy;
        const oldMovementPoints = this.movementPoints;
        
        // Reset stats to base values
        this.maxEnergy = 10; // Base max energy
        this.maxMovementPoints = 3; // Base max movement points
        
        // Apply each trait's effects one by one
        for (const trait of this.traits) {
            if (!trait) continue; // Skip null or undefined traits
            
            console.log(`PlayerComponent: Applying effects from trait: ${trait.name} (${trait.id})`);
            
            // Apply static effects first
            if (trait.effects) {
                if (trait.effects.maxEnergy) {
                    this.maxEnergy += trait.effects.maxEnergy;
                    console.log(`PlayerComponent: Applied maxEnergy effect: +${trait.effects.maxEnergy}`);
                }
                
                if (trait.effects.maxMovementPoints) {
                    this.maxMovementPoints += trait.effects.maxMovementPoints;
                    console.log(`PlayerComponent: Applied maxMovementPoints effect: +${trait.effects.maxMovementPoints}`);
                }
            }
            
            // Apply immediate effects if any
            if (trait.onAcquire && typeof trait.onAcquire === 'function') {
                try {
                    trait.onAcquire(this);
                    console.log(`PlayerComponent: Successfully applied onAcquire effect for trait: ${trait.name}`);
                } catch (error) {
                    console.error(`PlayerComponent: Error applying onAcquire effect for trait: ${trait.name}`, error);
                }
            }
        }
        
        // Refill to new max values
        this.energy = this.maxEnergy;
        this.movementPoints = this.maxMovementPoints;
        
        // Emit energy changed event using standardized format with deprecation info
        eventSystem.emitStandardized(
            EventTypes.PLAYER_ENERGY_CHANGED.legacy,
            EventTypes.PLAYER_ENERGY_CHANGED.standard,
            {
                player: this,
                oldEnergy: oldEnergy,
                energy: this.energy,
                // Include legacy properties for backward compatibility
                newEnergy: this.energy,
                delta: this.energy - oldEnergy
            },
            EventTypes.PLAYER_ENERGY_CHANGED.deprecation
        );
        
        // Emit movement points changed event using standardized format with deprecation info
        eventSystem.emitStandardized(
            EventTypes.PLAYER_MOVEMENT_POINTS_CHANGED.legacy,
            EventTypes.PLAYER_MOVEMENT_POINTS_CHANGED.standard,
            {
                player: this,
                oldMovementPoints: oldMovementPoints,
                movementPoints: this.movementPoints,
                // Include legacy properties for backward compatibility
                oldPoints: oldMovementPoints,
                newPoints: this.movementPoints,
                delta: this.movementPoints - oldMovementPoints
            },
            EventTypes.PLAYER_MOVEMENT_POINTS_CHANGED.deprecation
        );
        
        // Emit stats updated event using standardized format
        eventSystem.emit(EventTypes.PLAYER_STATS_UPDATED.standard, {
            player: this,
            maxEnergy: this.maxEnergy,
            maxMovementPoints: this.maxMovementPoints,
            energy: this.energy,
            movementPoints: this.movementPoints,
            isStandardized: true
        });
        
        console.log(`PlayerComponent: Applied effects from ${this.traits.length} traits. New stats: Energy=${this.maxEnergy}, Movement=${this.maxMovementPoints}`);
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
    
    /**
     * Reset component state for reuse from pool
     * @param {number} startRow - Starting grid row position
     * @param {number} startCol - Starting grid column position
     */
    reset(startRow = 0, startCol = 0) {
        // Reset position
        this.row = startRow;
        this.col = startCol;
        
        // Reset resources
        this.energy = 10;
        this.maxEnergy = 10;
        this.movementPoints = 3;
        this.maxMovementPoints = 3;
        
        // Reset evolution
        this.evolutionPoints = 0;
        this.chaosEvolutionPoints = 0;
        this.flowEvolutionPoints = 0;
        this.orderEvolutionPoints = 0;
        this.traits = [];
        
        // Reset action state
        this.currentAction = null;
        
        // Reset stats tracking
        this.tilesExplored = 0;
        this.movesMade = 0;
        this.actionsPerformed = 0;
        this.turnsCompleted = 0;
        
        // Reset DOM elements
        this.markerElement = null;
        
        // Reset event listeners
        this.boundEventListeners = {};
        
        // Reset to enabled state
        this.enabled = true;
    }
    
    /**
     * Reset movement points to maximum value
     * @returns {number} New movement points value
     */
    resetMovementPoints() {
        // Get base max movement points
        let maxPoints = this.maxMovementPoints;
        
        // Apply trait modifiers if any
        if (Array.isArray(this.traits)) {
            for (const trait of this.traits) {
                if (trait && trait.modifiesMaxMovementPoints && typeof trait.modifiesMaxMovementPoints === 'function') {
                    maxPoints = trait.modifiesMaxMovementPoints(maxPoints);
                }
            }
        }
        
        // Set to max value
        this.movementPoints = maxPoints;
        
        // Emit event
        eventSystem.emitStandardized(
            EventTypes.PLAYER_MOVEMENT_POINTS_CHANGED.legacy,
            EventTypes.PLAYER_MOVEMENT_POINTS_CHANGED.standard,
            {
                player: this,
                movementPoints: this.movementPoints,
                isStandardized: true
            }
        );
        
        console.log(`PlayerComponent: Reset movement points to ${this.movementPoints}`);
        return this.movementPoints;
    }
    
    /**
     * Reset energy to maximum value
     * @returns {number} New energy value
     */
    resetEnergy() {
        // Get base max energy
        let maxEnergy = this.maxEnergy;
        
        // Apply trait modifiers if any
        if (Array.isArray(this.traits)) {
            for (const trait of this.traits) {
                if (trait && trait.modifiesMaxEnergy && typeof trait.modifiesMaxEnergy === 'function') {
                    maxEnergy = trait.modifiesMaxEnergy(maxEnergy);
                }
            }
        }
        
        // Set to max value
        this.energy = maxEnergy;
        
        // Emit event
        eventSystem.emitStandardized(
            EventTypes.PLAYER_ENERGY_CHANGED.legacy,
            EventTypes.PLAYER_ENERGY_CHANGED.standard,
            {
                player: this,
                energy: this.energy,
                isStandardized: true
            }
        );
        
        console.log(`PlayerComponent: Reset energy to ${this.energy}`);
        return this.energy;
    }
    
    /**
     * Get the total of all evolution points
     * @returns {number} Total evolution points
     */
    getTotalEvolutionPoints() {
        return this.chaosEvolutionPoints + this.flowEvolutionPoints + this.orderEvolutionPoints;
    }
    
    /**
     * Check if player can evolve
     * @returns {boolean} Whether player can evolve
     */
    canEvolve() {
        // Can add more complex logic here if needed, such as checking against a threshold
        return this.getTotalEvolutionPoints() > 0;
    }
    
    /**
     * Get available traits for evolution
     * @returns {Array} Array of available traits
     */
    getAvailableTraits() {
        // This would typically pull from the EvolutionSystem
        // For now, just return an empty array as placeholder
        return [];
    }
    
    /**
     * Get player statistics
     * @returns {Object} Player statistics
     */
    getStats() {
        return {
            tilesExplored: this.tilesExplored,
            movesMade: this.movesMade,
            actionsPerformed: this.actionsPerformed,
            turnsCompleted: this.turnsCompleted
        };
    }
}