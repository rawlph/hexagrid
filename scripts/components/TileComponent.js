/**
 * Tile Component for Hexgrid Evolution
 * Handles properties and behavior of hex grid tiles
 */
import { Component } from '../core/EntityManager.js';

export class TileComponent extends Component {
    /**
     * Create a new tile component
     * @param {Entity} entity - The entity this component belongs to
     * @param {string} type - Type of tile (normal, energy, chaotic, orderly, obstacle)
     * @param {number} row - Grid row position
     * @param {number} col - Grid column position
     * @param {number} chaos - Initial chaos level (0-1)
     */
    constructor(entity, type = 'normal', row, col, chaos = 0.5) {
        super(entity);
        
        this.type = type;
        this.row = row;
        this.col = col;
        this.chaos = chaos;
        this.order = 1 - chaos;
        this.explored = false;
        this.element = null;
        
        // Action costs for this tile
        this.actionCosts = {
            move: 1,
            sense: 1,
            interact: 1,
            stabilize: 1
        };
        
        // Special properties based on tile type
        this.energyValue = 0;
        this.stabilizeEffect = 0;
        this.interactEffect = 0;
        this.isBlocked = false;
        
        // Initialize based on type
        this.initializeByType();
    }
    
    /**
     * Called after the component is attached to an entity
     * This happens after constructor but before init
     */
    onAttach() {
        // Register with any global systems if needed
        // This is called automatically by Entity.addComponent
    }
    
    /**
     * Called before the component is detached from an entity
     * This happens before destroy when removing a component
     */
    onDetach() {
        // Clean up any external references
        // Release DOM elements if we're keeping references
        if (this.element) {
            // Don't actually remove the element, just clean up references
            // The element might be managed elsewhere
        }
    }
    
    /**
     * Initialize the component
     * Called by entity.init()
     */
    init() {
        // Apply visual styles based on type
        this.updateVisualState();
    }
    
    /**
     * Called when component is enabled
     */
    onEnable() {
        // Update visual state when enabled
        this.enabled = true;
        this.updateVisualState();
    }
    
    /**
     * Called when component is disabled
     */
    onDisable() {
        // Update visual state when disabled
        this.enabled = false;
        this.updateVisualState();
    }
    
    /**
     * Reset component state for reuse from pool
     * @param {string} type - Type of tile
     * @param {number} row - Grid row position
     * @param {number} col - Grid column position
     * @param {number} chaos - Initial chaos level
     */
    reset(type = 'normal', row, col, chaos = 0.5) {
        this.type = type;
        this.row = row;
        this.col = col;
        this.chaos = chaos;
        this.order = 1 - chaos;
        this.explored = false;
        this.element = null;
        
        // Reset action costs
        this.actionCosts = {
            move: 1,
            sense: 1,
            interact: 1,
            stabilize: 1
        };
        
        // Reset special properties
        this.energyValue = 0;
        this.stabilizeEffect = 0;
        this.interactEffect = 0;
        this.isBlocked = false;
        
        // Re-initialize based on type
        this.initializeByType();
        
        // Reset to enabled state
        this.enabled = true;
    }
    
    /**
     * Clean up the component
     * Called by entity.destroy() or entity.removeComponent()
     */
    destroy() {
        // Clean up any non-DOM resources
        // DOM elements are cleaned up in onDetach
    }
    
    /**
     * Initialize tile properties based on its type
     */
    initializeByType() {
        switch (this.type) {
            case 'normal':
                this.actionCosts.move = 1;
                this.actionCosts.interact = 2;
                break;
                
            case 'energy':
                this.energyValue = Math.floor(Math.random() * 3) + 1;
                this.actionCosts.interact = 1;
                break;
                
            case 'chaotic':
                this.chaos = Math.min(this.chaos + 0.2, 1);
                this.order = 1 - this.chaos;
                this.interactEffect = 0.2;
                break;
                
            case 'orderly':
                this.chaos = Math.max(this.chaos - 0.2, 0);
                this.order = 1 - this.chaos;
                this.interactEffect = -0.2;
                break;
                
            case 'obstacle':
                this.isBlocked = true;
                this.actionCosts.move = 999; // Cannot move here
                break;
                
            case 'mountain':
                this.actionCosts.move = 3; // More difficult to move through mountains
                this.actionCosts.interact = 2;
                break;
                
            case 'water':
                this.actionCosts.move = 4; // Very difficult to move through water without adaptation
                this.actionCosts.interact = 3;
                break;
        }
        
        // Adjust action costs based on chaos level
        this.updateActionCosts();
    }
    
    /**
     * Update action costs based on chaos level
     */
    updateActionCosts() {
        // High chaos increases costs
        const chaosFactor = 1 + (this.chaos * 0.5);
        
        // Apply chaos factor to all actions except move
        if (this.type !== 'obstacle') {
            this.actionCosts.sense *= chaosFactor;
            this.actionCosts.interact *= chaosFactor;
            this.actionCosts.stabilize *= chaosFactor;
        }
        
        // Round costs to nearest integer
        for (const action in this.actionCosts) {
            this.actionCosts[action] = Math.max(1, Math.round(this.actionCosts[action]));
        }
    }
    
    /**
     * Mark tile as explored
     * @param {string} sourceAction - Action that caused the exploration (optional)
     * @returns {number|boolean} Energy value if this is an energy tile, false if already explored
     */
    markExplored(sourceAction = null) {
        if (this.explored) return false;
        
        this.explored = true;
        
        // Update visual state to remove the 'unexplored' class
        this.updateVisualState();
        
        // Emit tile explored event
        const eventSystem = window.eventSystem || (window.game && window.game.eventSystem);
        if (eventSystem && eventSystem.emitStandardized) {
            eventSystem.emitStandardized(
                'tileExplored', // Legacy event name
                'tile:explored', // Standard event name
                {
                    row: this.row,
                    col: this.col,
                    wasExplored: false,
                    isExplored: true,
                    tileComponent: this,
                    tileInfo: this.getData(),
                    type: this.type,
                    sourceAction: sourceAction,
                    isStandardized: true
                }
            );
        }
        
        // Return energy value if this is an energy tile
        return this.type === 'energy' ? this.energyValue : 0;
    }
    
    /**
     * Change the tile type
     * @param {string} newType - New tile type
     * @param {string} sourceAction - Action that caused the type change (optional)
     * @returns {boolean} True if the type was changed, false if it was already the same type
     */
    changeType(newType, sourceAction = null) {
        if (!newType) {
            console.error('TileComponent: Cannot change to undefined type');
            return false;
        }
        
        if (this.type === newType) return false;
        
        const oldType = this.type;
        this.type = newType;
        this.initializeByType();
        
        // Update visual state to reflect the new type
        this.updateVisualState();
        
        // Emit tile type changed event
        const eventSystem = window.eventSystem || (window.game && window.game.eventSystem);
        if (eventSystem && eventSystem.emitStandardized) {
            eventSystem.emitStandardized(
                'tileTypeChanged', // Legacy event name
                'tile:type:changed', // Standard event name
                {
                    row: this.row,
                    col: this.col,
                    oldType: oldType,
                    newType: this.type,
                    tile: this,
                    sourceAction: sourceAction,
                    isStandardized: true
                }
            );
        }
        
        return true;
    }
    
    /**
     * Update the chaos level of the tile
     * @param {number} chaosDelta - Change in chaos level (-1 to 1)
     * @param {string} sourceAction - The action that caused the chaos change (optional)
     * @returns {number} The actual change in chaos level
     */
    updateChaosLevel(chaosDelta, sourceAction = null) {
        if (typeof chaosDelta !== 'number') {
            console.error('TileComponent: chaosDelta must be a number');
            return 0;
        }
        
        const oldChaos = this.chaos;
        
        // Apply the delta and ensure chaos stays in valid range
        this.chaos = Math.max(0, Math.min(1, this.chaos + chaosDelta));
        
        // Order is ALWAYS 1 - chaos (following the binary duality rule)
        this.order = 1 - this.chaos;
        
        // Calculate the actual delta (may differ if clamping occurred)
        const actualDelta = this.chaos - oldChaos;
        
        // Log significant changes
        if (Math.abs(actualDelta) > 0.05) {
            console.log(`TileComponent: Chaos ${actualDelta > 0 ? 'increased' : 'decreased'} from ${oldChaos.toFixed(2)} to ${this.chaos.toFixed(2)} at (${this.row},${this.col})`);
            
            // If this was from a stabilize action, add extra debug info
            if (sourceAction === 'stabilize') {
                console.log(`TileComponent: STABILIZE - Reduced chaos by ${Math.abs(actualDelta).toFixed(3)} (${Math.round(Math.abs(actualDelta) * 100)}%) at (${this.row},${this.col})`);
            }
        }
        
        // Update costs when chaos changes
        this.updateActionCosts();
        
        // Emit an event with complete data when chaos changes
        if (actualDelta !== 0) {
            const eventSystem = window.eventSystem || (window.game && window.game.eventSystem);
            if (eventSystem && eventSystem.emitStandardized) {
                eventSystem.emitStandardized(
                    'tileChaosChanged', // Legacy event name
                    'tile:chaos:changed', // Standard event name
                    {
                        row: this.row,
                        col: this.col,
                        oldChaos: oldChaos,
                        newChaos: this.chaos,
                        chaosDelta: actualDelta,
                        tile: this,
                        // Always include the source action if provided
                        sourceAction: sourceAction,
                        // Include these properties for consistency
                        chaos: this.chaos,
                        order: this.order,
                        isStandardized: true
                    }
                );
            }
        }
        
        return actualDelta; // Return the actual change
    }
    
    /**
     * Get cost for a specific action on this tile
     * @param {string} action - Action name (move, sense, interact, stabilize)
     * @returns {number} Action cost
     */
    getActionCost(action) {
        if (!action || !this.actionCosts[action]) {
            console.warn(`TileComponent: Invalid action "${action}" requested, returning default cost of 1`);
            return 1;
        }
        return this.actionCosts[action] || 1;
    }
    
    /**
     * Get chaos level description
     * @returns {string} Description of chaos level
     */
    getChaosDescription() {
        if (this.chaos < 0.2) return 'Highly Orderly';
        if (this.chaos < 0.4) return 'Orderly';
        if (this.chaos < 0.6) return 'Balanced';
        if (this.chaos < 0.8) return 'Chaotic';
        return 'Highly Chaotic';
    }
    
    /**
     * Get tile data for serialization
     * @returns {Object} Tile data object
     */
    getData() {
        return {
            type: this.type,
            row: this.row,
            col: this.col,
            chaos: this.chaos,
            explored: this.explored,
            energyValue: this.energyValue
        };
    }
    
    /**
     * Apply a visual effect to the tile
     * @param {string} effectClass - CSS class for the effect
     * @returns {boolean} True if the effect was applied, false if the element doesn't exist
     */
    applyVisualEffect(effectClass) {
        if (!this.element) {
            console.warn('TileComponent: Cannot apply effect - element is not defined');
            return false;
        }
        
        // Add effect class
        this.element.classList.add(effectClass);
        
        // Remove after animation completes
        setTimeout(() => {
            if (this.element) {
                this.element.classList.remove(effectClass);
            }
        }, 1000);
        
        return true;
    }
    
    /**
     * Update the visual state of the tile based on its properties
     * Called whenever the tile's properties change and the visual needs to be updated
     */
    updateVisualState() {
        if (!this.element) {
            console.warn('TileComponent: Cannot update visual state - element is not defined');
            return;
        }
        
        // Clear existing type classes
        this.element.classList.remove('normal', 'energy', 'chaotic', 'orderly', 'obstacle');
        
        // Add the current type class
        this.element.classList.add(this.type);
        
        // Update explored/unexplored state
        if (this.explored) {
            this.element.classList.remove('unexplored');
        } else {
            this.element.classList.add('unexplored');
        }
        
        // Update enabled/disabled state
        if (this.enabled) {
            this.element.classList.remove('disabled');
        } else {
            this.element.classList.add('disabled');
        }
    }
} 