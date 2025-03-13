/**
 * Grid System for Hexgrid Evolution
 * Manages the hexagonal grid, tile generation, and system balance
 */
import { RandomUtils } from '../utils/RandomUtils.js';
import { eventSystem } from './EventSystem.js';
import { EventTypes } from './EventTypes.js';

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
        
        // System balance
        this.systemChaos = 0.5;
        this.systemOrder = 0.5;
        
        // Set initial balance based on game stage
        this.setGameStageBalance(gameStage);
        
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
            
            // Set the initial balance based on game stage
            this.setGameStageBalance(this.gameStage);
            
            // Generate tiles
            this.generateTiles();
            
            // Adjust grid layout based on container size
            this.adjustGridLayout();
            
            // Add window resize listener
            window.addEventListener('resize', this.handleResize);
            
            // Emit grid initialized event
            eventSystem.emitStandardized(
                EventTypes.GRID_INITIALIZED.legacy,
                EventTypes.GRID_INITIALIZED.standard,
                {
                    rows: this.rows,
                    cols: this.cols,
                    gameStage: this.gameStage,
                    isStandardized: true
                }
            );
            
            // Emit the initial balance state
            eventSystem.emitStandardized(
                EventTypes.SYSTEM_BALANCE_CHANGED.legacy,
                EventTypes.SYSTEM_BALANCE_CHANGED.standard,
                {
                    chaos: this.systemChaos,
                    order: this.systemOrder,
                    systemChaos: this.systemChaos,
                    systemOrder: this.systemOrder
                }
            );
            
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
     * Initialize the grid and create tiles
     */
    initializeGrid() {
        console.log(`Initializing grid with ${this.rows} rows and ${this.cols} columns`);
        
        // Clear any existing grid
        if (this.gridElement) {
            this.gridElement.remove();
        }
        
        // Create grid element
        this.gridElement = document.createElement('div');
        this.gridElement.className = 'hex-grid';
        this.container.appendChild(this.gridElement);
        
        // Create floating particles for deep-sea effect
        this.createFloatingParticles();
        
        // Set up resize handler
        window.addEventListener('resize', this.handleResize);
        
        // Get tile probabilities based on game stage
        const tileProbabilities = this.getTileProbabilities();
        
        // Hex dimensions and spacing
        const hexWidth = 70;  // Width of a hex tile
        const hexHeight = 80; // Height of a hex tile
        
        // Calculate proper spacing for a honeycomb pattern
        // For pointy-top hexagons:
        // - Horizontal spacing: Slightly more than 3/4 of the width to prevent overlap
        // - Vertical spacing: Slightly less than Height * 0.865 to reduce gap between rows
        const horizSpacing = hexWidth * 1.00; // Increase from 0.75 to prevent overlap
        const vertSpacing = hexHeight * 0.74; // Decrease from 0.865 to reduce gap between rows
        
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
                
                console.log(`Creating tile at row=${row}, col=${col}, x=${xPos}, y=${yPos}`);
                
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
        eventSystem.emitStandardized(
            EventTypes.GRID_INITIALIZED.legacy,
            EventTypes.GRID_INITIALIZED.standard,
            {
                rows: this.rows,
                cols: this.cols,
                width: totalWidth,
                height: totalHeight,
                isStandardized: true
            }
        );
    }
    
    /**
     * Get tile type probabilities based on game stage
     * @returns {Object} Tile type probability mapping
     */
    getTileProbabilities() {
        // Default probabilities
        let probabilities = {
            normal: 0.7,
            energy: 0.1,
            chaotic: 0.1,
            orderly: 0.1,
            obstacle: 0.0
        };
        
        // Adjust based on game stage
        switch (this.gameStage) {
            case 'early':
                // More normal tiles, some energy, few special tiles
                probabilities = {
                    normal: 0.7,
                    energy: 0.15,
                    chaotic: 0.07,
                    orderly: 0.07,
                    obstacle: 0.01
                };
                break;
                
            case 'mid':
                // More balanced distribution
                probabilities = {
                    normal: 0.55,
                    energy: 0.15,
                    chaotic: 0.12,
                    orderly: 0.12,
                    obstacle: 0.06
                };
                break;
                
            case 'late':
                // More special tiles, fewer normal tiles
                probabilities = {
                    normal: 0.4,
                    energy: 0.15,
                    chaotic: 0.17,
                    orderly: 0.17,
                    obstacle: 0.11
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
        
        // Add a tag for easy lookup by position
        entity.addTag(`tile_${row}_${col}`);
        
        // Add entity to entity manager - use the imported entityManager
        entityManager.addEntity(entity);
        
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
            
            // Emit tile clicked event using standardized event emission
            eventSystem.emitStandardized(
                EventTypes.TILE_CLICKED.legacy,
                EventTypes.TILE_CLICKED.standard,
                {
                    row,
                    col,
                    tileEntity,
                    isStandardized: true
                }
            );
            
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
     * Update system balance based on a chaos delta
     * @param {number} chaosDelta - Change in chaos (-1 to 1)
     * @returns {Object} New system balance
     */
    updateSystemBalance(chaosDelta) {
        // Ensure chaosDelta is a valid number
        if (typeof chaosDelta !== 'number' || isNaN(chaosDelta)) {
            console.warn("Grid.updateSystemBalance: Invalid chaosDelta value:", chaosDelta);
            chaosDelta = 0;
        }
        
        // Store old values
        const oldChaos = this.systemChaos;
        const oldOrder = this.systemOrder;
        
        // Update chaos and order
        this.systemChaos = utils.clamp(this.systemChaos + chaosDelta, 0, 1);
        this.systemOrder = 1 - this.systemChaos;
        
        // Emit change event with consistent property names
        eventSystem.emitStandardized(
            EventTypes.SYSTEM_BALANCE_CHANGED.legacy,
            EventTypes.SYSTEM_BALANCE_CHANGED.standard,
            {
                oldChaos,
                oldOrder,
                systemChaos: this.systemChaos,
                systemOrder: this.systemOrder,
                chaosDelta,
                // Include simple property names for consistency
                chaos: this.systemChaos,
                order: this.systemOrder
            }
        );
        
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
        
        // Clear tiles array
        this.tiles = [];
    }
    
    /**
     * Generate tiles for the grid
     * This method delegates to initializeGrid for the actual tile generation
     */
    generateTiles() {
        console.log(`Generating tiles for ${this.rows}x${this.cols} grid`);
        return this.initializeGrid();
    }
    
    /**
     * Adjust grid layout based on container size
     */
    adjustGridLayout() {
        if (!this.gridElement) return;
        
        // Set container size
        this.setContainerSize();
    }
} 