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
     * @returns {number|boolean} Energy value if this is an energy tile, false if already explored
     */
    markExplored() {
        if (this.explored) return false;
        
        this.explored = true;
        
        // Return energy value if this is an energy tile
        return this.type === 'energy' ? this.energyValue : 0;
    }
    
    /**
     * Change the tile type
     * @param {string} newType - New tile type
     * @returns {boolean} True if the type was changed, false if it was already the same type
     */
    changeType(newType) {
        if (!newType) {
            console.error('TileComponent: Cannot change to undefined type');
            return false;
        }
        
        if (this.type === newType) return false;
        
        this.type = newType;
        this.initializeByType();
        
        return true;
    }
    
    /**
     * Update the chaos level of the tile
     * @param {number} chaosDelta - Change in chaos level (-1 to 1)
     * @returns {number} The actual change in chaos level
     */
    updateChaosLevel(chaosDelta) {
        if (typeof chaosDelta !== 'number') {
            console.error('TileComponent: chaosDelta must be a number');
            return 0;
        }
        
        const oldChaos = this.chaos;
        this.chaos = Math.max(0, Math.min(1, this.chaos + chaosDelta));
        this.order = 1 - this.chaos;
        
        // Update costs when chaos changes
        this.updateActionCosts();
        
        return this.chaos - oldChaos; // Return the actual change
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
} 