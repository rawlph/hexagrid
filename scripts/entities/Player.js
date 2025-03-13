/**
 * Player entity for Hexgrid Evolution
 * Represents the player character in the game
 */
import { eventSystem } from '../core/EventSystem.js';
import { Entity } from '../core/EntityManager.js';
import { TileComponent } from '../components/TileComponent.js';
import { EventTypes } from '../core/EventTypes.js';
import { EntityComponentSystem } from '../core/EntityComponentSystem.js';

/**
 * Represents the player character
 */
class PlayerComponent extends Component {
    /**
     * Create a new player component
     * @param {Entity} entity - The entity this component belongs to
     * @param {number} startRow - Starting row position
     * @param {number} startCol - Starting column position
     */
    constructor(entity, startRow = 0, startCol = 0) {
        super(entity);
        
        // Position
        this.row = startRow;
        this.col = startCol;
        
        // Resources
        this.energy = 20;
        this.maxEnergy = 20;
        
        // Movement
        this.movementPoints = 1;
        this.maxMovementPoints = 1;
        
        // Action state
        this.currentAction = null;
        
        // Character token element
        this.characterToken = null;
        
        // Stats and progression
        this.exploredTiles = 0;
        this.tilesStabilized = 0;
        this.tilesDestabilized = 0;
        this.movesMade = 0;
        this.energyUsed = 0;
        
        // Traits and abilities (unlocked through evolution)
        this.traits = [];
        this.abilities = [];
        
        // Evolution points
        this.evolutionPoints = 0;
        this.chaosEvolutionPoints = 0;
        this.flowEvolutionPoints = 0;
        this.orderEvolutionPoints = 0;
    }
    
    /**
     * Initialize the player
     */
    init() {
        // Add player tag
        this.entity.addTag('player');
        
        // Create and position character token
        this.createCharacterToken();
        
        // Register for turn events
        eventSystem.on('turnStart', this.onTurnStart.bind(this));
    }
    
    /**
     * Create the character token
     */
    createCharacterToken() {
        // Get the tile element at player position
        const tileElement = this.getCurrentTileElement();
        if (!tileElement) return;
        
        // Create token if it doesn't exist
        if (!this.characterToken) {
            this.characterToken = document.createElement('div');
            this.characterToken.className = 'character-token';
        }
        
        // Add token to tile
        tileElement.appendChild(this.characterToken);
        
        // Mark starting tile as explored
        const tileEntity = this.getCurrentTileEntity();
        if (tileEntity) {
            const tileComponent = tileEntity.getComponent(TileComponent);
            if (tileComponent) {
                tileComponent.markExplored();
            }
        }
    }
    
    /**
     * Get the DOM element for the current tile
     * @returns {HTMLElement|null} The tile element or null if not found
     */
    getCurrentTileElement() {
        return document.querySelector(`.hex-tile[data-row="${this.row}"][data-col="${this.col}"]`);
    }
    
    /**
     * Get the entity for the current tile
     * @returns {Entity|null} The tile entity or null if not found
     */
    getCurrentTileEntity() {
        const entities = entityManager.getEntitiesByTag(`tile_${this.row}_${this.col}`);
        return entities.length > 0 ? entities[0] : null;
    }
    
    /**
     * Move the player to a new tile
     * @param {number} row - The target row
     * @param {number} col - The target column
     * @param {EntityComponentSystem} eventSystem - The event system to emit events
     * @returns {boolean} True if move was successful
     */
    moveTo(row, col, eventSystem) {
        const oldRow = this.row;
        const oldCol = this.col;
        
        this.row = row;
        this.col = col;
        
        // Emit moved event if we have an event system
        if (eventSystem) {
            eventSystem.emitStandardized(
                EventTypes.PLAYER_MOVED.legacy, 
                EventTypes.PLAYER_MOVED.standard,
                {
                    oldRow,
                    oldCol,
                    newRow: row,
                    newCol: col,
                    entity: this,
                    isStandardized: true
                }
            );
        }
        
        return true;
    }
    
    /**
     * Set the current action
     * @param {string|null} action - The action to set (move, sense, interact, stabilize) or null to clear
     * @param {EntityComponentSystem} eventSystem - The event system to emit events
     */
    setAction(action, eventSystem) {
        // Clear previous action
        if (this.currentAction) {
            // Remove any highlighting from previous action
            this.clearActionHighlights();
        }
        
        // Set new action
        this.currentAction = action;
        
        // Apply highlighting for new action if any
        if (action) {
            this.highlightActionTiles();
        }
        
        // Emit action changed event if we have an event system
        if (eventSystem) {
            eventSystem.emitStandardized(
                EventTypes.PLAYER_ACTION_CHANGED.legacy,
                EventTypes.PLAYER_ACTION_CHANGED.standard,
                {
                    action: action,
                    entity: this,
                    isStandardized: true
                }
            );
        }
    }
    
    /**
     * Clear action highlights from the grid
     */
    clearActionHighlights() {
        // Remove highlight classes from all hex cells
        document.querySelectorAll('.hex-tile').forEach(cell => {
            cell.classList.remove(
                'highlight-move',
                'highlight-sense',
                'highlight-interact',
                'highlight-stabilize'
            );
        });
    }
    
    /**
     * Highlight tiles based on current action
     */
    highlightActionTiles() {
        if (!this.currentAction) return;
        
        const highlightClass = `highlight-${this.currentAction}`;
        
        // Get adjacent tiles for highlighting
        const adjacentPositions = this.getAdjacentPositions();
        
        // Highlight adjacent tiles
        adjacentPositions.forEach(pos => {
            const cell = document.querySelector(`.hex-tile[data-row="${pos.row}"][data-col="${pos.col}"]`);
            if (!cell) return;
            
            // For move action, only highlight walkable tiles
            if (this.currentAction === 'move') {
                const tileEntity = entityManager.getEntitiesByTag(`tile_${pos.row}_${pos.col}`)[0];
                if (!tileEntity) return;
                
                const tileComponent = tileEntity.getComponent(TileComponent);
                if (!tileComponent) return;
                
                // Don't highlight water or blocked tiles for movement
                if (tileComponent.type === 'water' || tileComponent.type === 'blocked') {
                    return;
                }
            }
            
            cell.classList.add(highlightClass);
        });
        
        // For non-move actions, also highlight current tile
        if (this.currentAction !== 'move') {
            const currentCell = this.getCurrentTileElement();
            if (currentCell) {
                currentCell.classList.add(highlightClass);
            }
        }
    }
    
    /**
     * Get adjacent positions
     * @returns {Array} Array of adjacent positions {row, col}
     */
    getAdjacentPositions() {
        return HexUtils.getAdjacentHexes(this.row, this.col);
    }
    
    /**
     * Check if a position is adjacent to the player
     * @param {number} row - Row to check
     * @param {number} col - Column to check
     * @returns {boolean} True if the position is adjacent
     */
    isAdjacentTo(row, col) {
        return HexUtils.areHexesAdjacent(this.row, this.col, row, col);
    }
    
    /**
     * Use energy for an action
     * @param {number} amount - Amount of energy to use
     * @returns {boolean} True if the player had enough energy
     */
    useEnergy(amount) {
        if (this.energy < amount) {
            return false;
        }
        
        this.energy -= amount;
        this.energyUsed += amount;
        
        // Emit energy changed event
        eventSystem.emitStandardized(
            EventTypes.PLAYER_ENERGY_CHANGED.legacy,
            EventTypes.PLAYER_ENERGY_CHANGED.standard,
            {
                player: this,
                oldEnergy: this.energy + amount,
                newEnergy: this.energy,
                energy: this.energy,
                delta: -amount,
                isStandardized: true
            }
        );
        
        return true;
    }
    
    /**
     * Use a movement point
     * @returns {boolean} True if the player had a movement point
     */
    useMovementPoint() {
        if (this.movementPoints <= 0) {
            return false;
        }
        
        this.movementPoints--;
        
        // Emit movement points changed event
        eventSystem.emitStandardized(
            EventTypes.PLAYER_MOVEMENT_POINTS_CHANGED.legacy,
            EventTypes.PLAYER_MOVEMENT_POINTS_CHANGED.standard,
            {
                player: this,
                oldMovementPoints: this.movementPoints + 1,
                movementPoints: this.movementPoints,
                delta: -1,
                isStandardized: true
            }
        );
        
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
        // Get target tile
        const tileEntity = entityManager.getEntitiesByTag(`tile_${targetRow}_${targetCol}`)[0];
        if (!tileEntity) return -1;
        
        const tileComponent = tileEntity.getComponent(TileComponent);
        if (!tileComponent) return -1;
        
        // Get base cost from tile
        let cost = tileComponent.getActionCost(action);
        
        // Apply trait modifiers
        for (const trait of this.traits) {
            if (trait.modifiesActionCost && typeof trait.modifiesActionCost === 'function') {
                cost = trait.modifiesActionCost(action, cost, tileComponent);
            }
        }
        
        return Math.max(0, cost);
    }
    
    /**
     * Add a trait to the player
     * @param {object} trait - Trait object with name and effects
     */
    addTrait(trait) {
        this.traits.push(trait);
        
        // Apply immediate effects if any
        if (trait.onAcquire && typeof trait.onAcquire === 'function') {
            trait.onAcquire(this);
        }
        
        // Emit event
        eventSystem.emitStandardized(
            EventTypes.PLAYER_TRAIT_ADDED.legacy,
            EventTypes.PLAYER_TRAIT_ADDED.standard,
            {
                player: this,
                trait: trait,
                isStandardized: true
            }
        );
    }
    
    /**
     * Add evolution points
     * @param {string|number} type - Type of points ('chaos', 'flow', 'order') or amount if legacy call
     * @param {number} amount - Number of points to add
     * @param {boolean} suppressEvent - Whether to suppress the event emission
     */
    addEvolutionPoints(type, amount, suppressEvent = false) {
        // Check if this is a legacy call with just a number
        if (typeof type === 'number' && amount === undefined) {
            amount = type;
            type = 'legacy';
        }
        
        // Validate the amount
        if (!amount || amount <= 0) {
            return;
        }
        
        // Update the appropriate point type
        if (type === 'chaos') {
            this.chaosEvolutionPoints += amount;
        } else if (type === 'flow') {
            this.flowEvolutionPoints += amount;
        } else if (type === 'order') {
            this.orderEvolutionPoints += amount;
        } else {
            // Legacy support - add to total points
            this.evolutionPoints += amount;
        }
        
        // Update total points
        this.evolutionPoints = this.chaosEvolutionPoints + this.flowEvolutionPoints + this.orderEvolutionPoints;
        
        // Emit event if not suppressed
        if (!suppressEvent) {
            eventSystem.emitStandardized(
                EventTypes.PLAYER_EVOLUTION_POINTS_CHANGED.legacy,
                EventTypes.PLAYER_EVOLUTION_POINTS_CHANGED.standard,
                {
                    player: this,
                    type: type,
                    points: amount,
                    total: this.evolutionPoints,
                    isStandardized: true
                }
            );
        }
        
        console.log(`Added ${amount} ${type} evolution points. Total: ${this.evolutionPoints}`);
    }
    
    /**
     * Handler for turn start event
     * @param {object} data - Event data
     */
    onTurnStart(data) {
        // Restore movement points
        this.movementPoints = this.maxMovementPoints;
        
        // Restore some energy
        const energyRestore = 2 + Math.floor(this.traits.length / 2);
        this.energy = Math.min(this.maxEnergy, this.energy + energyRestore);
        
        // Emit events
        eventSystem.emitStandardized(
            EventTypes.PLAYER_MOVEMENT_POINTS_CHANGED.legacy,
            EventTypes.PLAYER_MOVEMENT_POINTS_CHANGED.standard,
            {
                player: this,
                oldMovementPoints: this.movementPoints + 1,
                movementPoints: this.movementPoints,
                delta: 0,
                isStandardized: true
            }
        );
        
        eventSystem.emitStandardized(
            EventTypes.PLAYER_ENERGY_CHANGED.legacy,
            EventTypes.PLAYER_ENERGY_CHANGED.standard,
            {
                player: this,
                oldEnergy: this.energy - energyRestore,
                newEnergy: this.energy,
                energy: this.energy,
                delta: energyRestore,
                isStandardized: true
            }
        );
    }
    
    /**
     * Clean up when the component is destroyed
     */
    destroy() {
        // Remove event listeners
        eventSystem.off(this._turnStartListener);
        
        // Remove character token
        if (this.characterToken && this.characterToken.parentNode) {
            this.characterToken.parentNode.removeChild(this.characterToken);
        }
        
        this.characterToken = null;
    }
} 