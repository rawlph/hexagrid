/**
 * Grid System for Hexgrid Evolution
 * Manages the hexagonal grid, tile generation, and system balance
 */
import { RandomUtils } from '../utils/RandomUtils.js';
import { eventSystem } from './EventSystem.js';
import { EventTypes } from './EventTypes.js';
import { Entity, entityManager } from './EntityManager.js';
import { TileComponent } from '../components/TileComponent.js';
import { PlayerComponent } from '../components/PlayerComponent.js';

/**
 * Spatial hash for efficiently querying entities in a grid by position
 */
class SpatialHash {
    /**
     * Create a new spatial hash
     * @param {number} cellSize - Size of each spatial cell in grid units (usually 1)
     */
    constructor(cellSize = 1) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }
    
    /**
     * Get cell key for a position
     * @param {number} row - Row position
     * @param {number} col - Column position
     * @returns {string} Cell key
     */
    getCellKey(row, col) {
        const cellRow = Math.floor(row / this.cellSize);
        const cellCol = Math.floor(col / this.cellSize);
        return `${cellRow},${cellCol}`;
    }
    
    /**
     * Add an entity to the spatial hash
     * @param {Entity} entity - Entity to add
     * @param {number} row - Row position
     * @param {number} col - Column position
     */
    add(entity, row, col) {
        const key = this.getCellKey(row, col);
        if (!this.cells.has(key)) {
            this.cells.set(key, new Set());
        }
        this.cells.get(key).add(entity);
    }
    
    /**
     * Remove an entity from the spatial hash
     * @param {Entity} entity - Entity to remove
     * @param {number} row - Row position
     * @param {number} col - Column position
     */
    remove(entity, row, col) {
        const key = this.getCellKey(row, col);
        if (this.cells.has(key)) {
            const cell = this.cells.get(key);
            cell.delete(entity);
            if (cell.size === 0) {
                this.cells.delete(key);
            }
        }
    }
    
    /**
     * Get entities in a specific cell
     * @param {number} row - Row position
     * @param {number} col - Column position
     * @returns {Array} Array of entities in the cell
     */
    getEntitiesAt(row, col) {
        const key = this.getCellKey(row, col);
        const cell = this.cells.get(key);
        return cell ? Array.from(cell) : [];
    }
    
    /**
     * Get entities in a radius around a position
     * @param {number} row - Center row
     * @param {number} col - Center column
     * @param {number} radius - Search radius in grid units
     * @returns {Array} Array of entities within radius
     */
    getEntitiesInRadius(row, col, radius) {
        const result = new Set();
        
        // Calculate cell range to check
        const cellRadius = Math.ceil(radius / this.cellSize);
        const startCellRow = Math.floor((row - radius) / this.cellSize);
        const endCellRow = Math.floor((row + radius) / this.cellSize);
        const startCellCol = Math.floor((col - radius) / this.cellSize);
        const endCellCol = Math.floor((col + radius) / this.cellSize);
        
        // Gather entities from all cells in range
        for (let cellRow = startCellRow; cellRow <= endCellRow; cellRow++) {
            for (let cellCol = startCellCol; cellCol <= endCellCol; cellCol++) {
                const key = `${cellRow},${cellCol}`;
                const cell = this.cells.get(key);
                if (cell) {
                    for (const entity of cell) {
                        result.add(entity);
                    }
                }
            }
        }
        
        return Array.from(result);
    }
    
    /**
     * Clear all entities from the spatial hash
     */
    clear() {
        this.cells.clear();
    }
}

export class Grid {
    /**
     * Create a new grid
     * @param {number} rows - Number of rows in the grid
     * @param {number} cols - Number of columns in the grid
     * @param {string} gameStage - Current game stage (early, mid, late)
     */
    constructor(rows = 5, cols = 5, gameStage = 'early') {
        // Grid dimensions
        this.rows = rows;
        this.cols = cols;
        
        // Game stage affects tile distribution
        this.gameStage = gameStage;
        
        // Grid container element
        this.container = document.getElementById('grid-container');
        this.gridElement = null;
        
        // Tile entities by position
        this.tiles = Array(rows).fill().map(() => Array(cols).fill(null));
        
        // Spatial hash for efficient position queries
        this.spatialHash = new SpatialHash(1);
        
        // System balance - will be initialized during init()
        this.systemChaos = 0;
        this.systemOrder = 0;
        
        // Bind methods
        this.handleResize = this.handleResize.bind(this);
    }
    
    /**
     * Initialize the grid
     * @returns {boolean} Whether initialization was successful
     */
    init() {
        try {
            console.log(`Initializing grid with ${this.rows}x${this.cols} dimensions`);
            
            // Create grid element if not already created
            if (!this.gridElement) {
                this.gridElement = document.createElement('div');
                this.gridElement.className = 'hex-grid';
                this.container.appendChild(this.gridElement);
            } else {
                // Clear existing grid
                this.gridElement.innerHTML = '';
            }
            
            // Create floating particles for deep-sea effect
            this.createFloatingParticles();
            
            // Set up resize handler
            window.addEventListener('resize', this.handleResize);
            
            // Set the initial balance based on game stage
            this.setGameStageBalance(this.gameStage);
            
            // Get tile probabilities based on game stage
            const tileProbabilities = this.getTileProbabilities();
            
            // Get dimensions from CSS variables to ensure consistency
            const computedStyle = getComputedStyle(document.documentElement);
            const hexWidth = parseInt(computedStyle.getPropertyValue('--tile-size') || '80', 10);
            const hexHeightRatio = parseFloat(computedStyle.getPropertyValue('--tile-height-ratio') || '1.15');
            const hexHeight = hexWidth * hexHeightRatio;
            
            // Calculate proper spacing for a honeycomb pattern
            const horizSpacing = hexWidth * 1.00;
            const vertSpacing = hexHeight * 0.74;
            
            // Calculate total width and height of the grid
            const totalWidth = this.cols * horizSpacing + (hexWidth / 4);
            const totalHeight = (this.rows * vertSpacing) + (hexHeight / 2);
            
            // Set grid dimensions and center it
            this.gridElement.style.width = `${totalWidth}px`;
            this.gridElement.style.height = `${totalHeight}px`;
            this.gridElement.style.position = 'absolute';
            this.gridElement.style.left = '50%';
            this.gridElement.style.top = '50%';
            this.gridElement.style.transform = 'translate(-50%, -50%)';
            
            console.log(`Creating interlocking hex grid with dimensions: ${totalWidth}px x ${totalHeight}px`);
            
            // Create tiles with absolute positioning
            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.cols; col++) {
                    // Calculate hex position with proper offset for odd rows
                    let xPos = col * horizSpacing;
                    let yPos = row * vertSpacing;
                    
                    // Offset odd rows to create interlocking pattern
                    if (row % 2 === 1) {
                        xPos += horizSpacing / 2;
                    }
                    
                    // Create visual hex cell
                    const hexCell = this.createHexCell(row, col);
                    hexCell.style.left = `${xPos}px`;
                    hexCell.style.top = `${yPos}px`;
                    hexCell.style.position = 'absolute';
                    
                    // Create entity for this position with the appropriate component
                    const tileEntity = this.createTileEntity(row, col, hexCell, tileProbabilities);
                    
                    // Store reference to tile entity
                    this.tiles[row][col] = tileEntity;
                    
                    // Set up event handling for this cell
                    this.setupHexCellEvents(hexCell, row, col, tileEntity);
                }
            }
            
            // Emit grid initialized event
            eventSystem.emit(EventTypes.GRID_INITIALIZED.standard, {
                rows: this.rows,
                cols: this.cols,
                width: totalWidth,
                height: totalHeight,
                gameStage: this.gameStage,
                systemChaos: this.systemChaos,
                systemOrder: this.systemOrder
            });
            
            console.log(`Grid initialized with ${this.rows}x${this.cols} tiles`);
            return true;
        } catch (error) {
            console.error("Failed to initialize grid:", error);
            return false;
        }
    }
    
    /**
     * Set initial balance based on game stage
     * @param {string} gameStage - Game stage (early, mid, late)
     */
    setGameStageBalance(gameStage) {
        switch (gameStage) {
            case 'early':
                this.systemChaos = 0.8;
                this.systemOrder = 0.2;
                break;
                
            case 'mid':
                this.systemChaos = 0.5;
                this.systemOrder = 0.5;
                break;
                
            case 'late':
                this.systemChaos = 0.3;
                this.systemOrder = 0.7;
                break;
                
            default:
                // Default to 80/20 split for early game if unspecified
                this.systemChaos = 0.8;
                this.systemOrder = 0.2;
        }
        
        console.log(`Grid: Set initial balance for ${gameStage} stage - Chaos: ${this.systemChaos.toFixed(2)}, Order: ${this.systemOrder.toFixed(2)}`);
    }
    
    /**
     * Get tile type probabilities based on game stage
     * @returns {Object} Tile type probability mapping
     */
    getTileProbabilities() {
        // Default probabilities
        let probabilities = {
            normal: 0.65,
            energy: 0.1,
            chaotic: 0.07,
            orderly: 0.07,
            obstacle: 0.01,
            mountain: 0.05,
            water: 0.05
        };
        
        // Adjust based on game stage
        switch (this.gameStage) {
            case 'early':
                // More normal tiles, some energy, few special tiles
                probabilities = {
                    normal: 0.65,
                    energy: 0.15,
                    chaotic: 0.05,
                    orderly: 0.05,
                    obstacle: 0.01,
                    mountain: 0.05,
                    water: 0.04
                };
                break;
                
            case 'mid':
                // More balanced distribution
                probabilities = {
                    normal: 0.50,
                    energy: 0.12,
                    chaotic: 0.10,
                    orderly: 0.10,
                    obstacle: 0.05,
                    mountain: 0.07,
                    water: 0.06
                };
                break;
                
            case 'late':
                // More special tiles, fewer normal tiles
                probabilities = {
                    normal: 0.35,
                    energy: 0.12,
                    chaotic: 0.15,
                    orderly: 0.15,
                    obstacle: 0.08,
                    mountain: 0.08,
                    water: 0.07
                };
                break;
        }
        
        return probabilities;
    }
    
    /**
     * Create a hex cell element
     * @param {number} row - Row position
     * @param {number} col - Column position
     * @returns {HTMLElement} Created hex cell element
     */
    createHexCell(row, col) {
        // Create hex cell
        const hexCell = document.createElement('div');
        hexCell.className = 'hex-tile unexplored';
        hexCell.dataset.row = row;
        hexCell.dataset.col = col;
        
        // Create content container
        const content = document.createElement('div');
        content.className = 'hex-tile-content';
        
        // Add coordinates for debugging
        const coords = document.createElement('div');
        coords.className = 'hex-coordinates';
        coords.textContent = `${row},${col}`;
        content.appendChild(coords);
        
        // Add content to hex cell
        hexCell.appendChild(content);
        
        // Add to grid
        this.gridElement.appendChild(hexCell);
        
        return hexCell;
    }
    
    /**
     * Create a tile entity for a hex cell
     * @param {number} row - Row position
     * @param {number} col - Column position
     * @param {HTMLElement} hexCell - Hex cell element
     * @param {Object} tileProbabilities - Tile type probabilities
     * @returns {Entity} Created tile entity
     */
    createTileEntity(row, col, hexCell, tileProbabilities) {
        // Select a tile type based on probabilities using RandomUtils
        const tileType = RandomUtils.getWeightedRandomTileType(tileProbabilities);
        
        // Create a chaos value for this tile based on game stage and position
        // Use the RandomUtils method for consistent generation
        let chaos = RandomUtils.generateChaosByGameStage(
            this.gameStage, 
            row, 
            col, 
            this.rows, 
            this.cols
        );
        
        // Ensure chaos is within valid range
        chaos = utils.clamp(chaos, 0.1, 0.9);
        
        // Create the entity using the imported Entity class
        const entity = new Entity();
        
        // Add tile component with position and type
        // Note: The component constructor will now receive the entity as first parameter
        const tileComponent = entity.addComponent(TileComponent, tileType, row, col, chaos);
        
        // Attach DOM element to component
        tileComponent.element = hexCell;
        
        // Initialize visual state based on tile properties
        tileComponent.updateVisualState();
        
        // Add a tag for easy lookup by position
        entity.addTag(`tile_${row}_${col}`);
        
        // Add entity to entity manager - use the imported entityManager
        entityManager.addEntity(entity);
        
        // Add to spatial hash for efficient position queries
        this.spatialHash.add(entity, row, col);
        
        // Store the entity in our tiles array for easy access
        this.tiles[row][col] = entity;
        
        return entity;
    }
    
    /**
     * Set up event handling for a hex cell
     * @param {HTMLElement} hexCell - Hex cell element
     * @param {number} row - Row position
     * @param {number} col - Column position
     * @param {Entity} tileEntity - Tile entity
     */
    setupHexCellEvents(hexCell, row, col, tileEntity) {
        // Handle click
        hexCell.addEventListener('click', (e) => {
            console.log(`Tile clicked at (${row}, ${col})`);
            
            // Emit tile clicked event
            eventSystem.emit(EventTypes.TILE_CLICKED.standard, {
                row,
                col,
                tileEntity
            });
            
            // Prevent event bubbling
            e.stopPropagation();
        });
    }
    
    /**
     * Set the grid container size
     */
    setContainerSize() {
        if (!this.gridElement) return;
        
        // Let the flex layout handle the sizing
        this.gridElement.style.maxWidth = '100%';
        this.gridElement.style.maxHeight = '100%';
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        // Update grid size when window resizes
        this.setContainerSize();
        
        // Update player marker position
        const playerEntity = entityManager.getEntitiesByTag('player')[0];
        if (playerEntity) {
            const playerComponent = playerEntity.getComponent(PlayerComponent);
            if (playerComponent) {
                playerComponent.updateMarkerPosition();
            }
        }
    }
    
    /**
     * Get tile entity at position
     * @param {number} row - Row position
     * @param {number} col - Column position
     * @returns {Entity} Tile entity or null
     */
    getTileAt(row, col) {
        // Check if position is valid
        if (!this.isPositionInGrid(row, col)) {
            return null;
        }
        
        return this.tiles[row][col];
    }
    
    /**
     * Check if position is within grid bounds
     * @param {number} row - Row position
     * @param {number} col - Column position
     * @returns {boolean} Whether position is valid
     */
    isPositionInGrid(row, col) {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }
    
    /**
     * Get adjacent tiles to a position
     * @param {number} row - Row position
     * @param {number} col - Column position
     * @returns {Array} Array of adjacent tile entities
     */
    getAdjacentTiles(row, col) {
        const adjacentPositions = utils.getAdjacentCoordinates(row, col, this.rows, this.cols);
        
        return adjacentPositions.map(([adjRow, adjCol]) => 
            this.getTileAt(adjRow, adjCol)
        ).filter(tile => tile !== null);
    }
    
    /**
     * Get current system balance
     * @returns {Object} System balance object with chaos and order values
     */
    getSystemBalance() {
        return {
            chaos: this.systemChaos,
            order: this.systemOrder
        };
    }
    
    /**
     * Update system-wide chaos/order balance
     * @param {number} chaosDelta - Change in chaos level (-1 to 1)
     * @param {string} sourceAction - The action that caused the change (optional)
     * @returns {Object} Object with updated chaos and order values
     */
    updateSystemBalance(chaosDelta, sourceAction = null) {
        // Ensure chaosDelta is a valid number
        if (typeof chaosDelta !== 'number' || isNaN(chaosDelta)) {
            console.warn("Grid.updateSystemBalance: Invalid chaosDelta value:", chaosDelta);
            chaosDelta = 0;
        }
        
        // Store old values for comparison
        const oldChaos = this.systemChaos;
        const oldOrder = this.systemOrder;
        
        // Verify that current values follow the chaos+order=1 rule
        if (Math.abs(oldChaos + oldOrder - 1) > 0.001) {
            console.error(`Grid.updateSystemBalance: Invalid initial state! Chaos (${oldChaos}) + Order (${oldOrder}) != 1.0`);
            // Correct the imbalance by resetting order based on chaos
            this.systemOrder = 1 - this.systemChaos;
            console.log(`Grid.updateSystemBalance: Corrected order value to ${this.systemOrder}`);
        }
        
        // Update chaos, ensuring it stays within valid range
        this.systemChaos = utils.clamp(this.systemChaos + chaosDelta, 0, 1);
        
        // Order is ALWAYS calculated as 1 - chaos (per ChaosOrderSystem.md)
        this.systemOrder = 1 - this.systemChaos;
        
        // Log significant changes for debugging
        if (Math.abs(chaosDelta) > 0.01) {
            console.log(`Grid.updateSystemBalance: Chaos ${chaosDelta > 0 ? 'increased' : 'decreased'} by ${Math.abs(chaosDelta).toFixed(3)}`);
            console.log(`Grid.updateSystemBalance: New balance - Chaos: ${this.systemChaos.toFixed(2)}, Order: ${this.systemOrder.toFixed(2)}`);
            
            // Log the source action if provided
            if (sourceAction) {
                console.log(`Grid.updateSystemBalance: Change caused by '${sourceAction}' action`);
            }
        }
        
        // Emit the standardized event
        eventSystem.emit(EventTypes.SYSTEM_BALANCE_CHANGED.standard, {
            oldChaos,
            oldOrder,
            systemChaos: this.systemChaos,
            systemOrder: this.systemOrder,
            chaosDelta,
            sourceAction
        });
        
        return this.getSystemBalance();
    }
    
    /**
     * Create floating particles for the deep-sea effect
     */
    createFloatingParticles() {
        // Clean up any existing particles
        const existingParticles = this.container.querySelectorAll('.floating-particle');
        existingParticles.forEach(particle => particle.remove());
        
        // Number of particles scales with grid size
        const numParticles = Math.min(20, Math.max(8, Math.floor((this.rows * this.cols) / 4)));
        
        // Create and position particles
        for (let i = 0; i < numParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'floating-particle';
            
            // Random position within container
            const randomX = Math.random() * 100;
            const randomY = Math.random() * 100;
            
            particle.style.left = `${randomX}%`;
            particle.style.top = `${randomY}%`;
            
            // Random animation delay
            particle.style.animationDelay = `${Math.random() * 15}s`;
            
            // Add to container
            this.container.appendChild(particle);
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        
        // Clean up grid element
        if (this.gridElement) {
            this.gridElement.remove();
            this.gridElement = null;
        }
        
        // Clean up floating particles
        const particles = document.querySelectorAll('.floating-particle');
        particles.forEach(particle => particle.remove());
        
        // Clear spatial hash
        this.spatialHash.clear();
        
        // Clear tiles array
        this.tiles = [];
    }
    
    /**
     * Get tiles within a certain radius of a position using spatial hash
     * @param {number} row - Center row
     * @param {number} col - Center column
     * @param {number} radius - Search radius
     * @returns {Array} Array of tile entities within radius
     */
    getTilesInRadius(row, col, radius) {
        // Use the spatial hash for efficient radius queries
        return this.spatialHash.getEntitiesInRadius(row, col, radius)
            .filter(entity => entity.hasComponent(TileComponent));
    }
} 