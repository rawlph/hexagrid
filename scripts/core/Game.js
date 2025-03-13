/**
 * Main game controller for Hexgrid Evolution
 * Integrates all systems and manages the game lifecycle
 */
import { MetricsSystem } from '../systems/MetricsSystem.js';
import { UIManager } from '../ui/UIManager.js';
import { EvolutionSystem } from '../systems/EvolutionSystem.js';
import { TileComponent } from '../components/TileComponent.js';
import { PlayerComponent } from '../components/PlayerComponent.js';
import { Grid } from './Grid.js';
import { TurnSystem } from './TurnSystem.js';
import { entityManager } from './EntityManager.js';
import { eventSystem } from './EventSystem.js';
import { Entity } from './Entity.js';
import { EventTypes } from './EventTypes.js';

export class Game {
    /**
     * Create a new Game instance
     * @param {Object} dependencies - Optional dependencies
     * @param {Object} dependencies.entityManager - Entity manager instance
     * @param {Object} dependencies.eventSystem - Event system instance
     */
    constructor(dependencies = {}) {
        // Store dependencies
        this.entityManager = dependencies.entityManager || (window.entityManager || null);
        this.eventSystem = dependencies.eventSystem || (window.eventSystem || null);
        
        // Validate critical dependencies
        if (!this.entityManager) {
            console.error('EntityManager not provided to Game constructor and not found globally');
        }
        
        if (!this.eventSystem) {
            console.error('EventSystem not provided to Game constructor and not found globally');
        }
        
        // Game configuration
        this.config = {
            defaultGridSize: 5,
            defaultGameStage: 'early'
        };
        
        // Core systems
        this.grid = null;
        this.turnSystem = null;
        this.evolutionSystem = null;
        this.uiManager = null;
        this.metricsSystem = null;
        
        // Game state
        this.isInitialized = false;
        
        // Bind methods
        this.update = this.update.bind(this);
        this.handleTileClick = this.handleTileClick.bind(this);
        this.endTurn = this.endTurn.bind(this);
        
        // Event registration tracking
        this._registeredEvents = [];
        
        // Cache for level completion data for transitions between levels
        this.currentCompletionData = null;
    }
    
    /**
     * Initialize the game
     * @param {number} rows - Number of grid rows
     * @param {number} cols - Number of grid columns
     * @param {string} gameStage - Game stage (early, mid, late) 
     * @returns {boolean} - Whether initialization was successful
     */
    init(rows = this.config.defaultGridSize, cols = this.config.defaultGridSize, gameStage = 'early') {
        console.log(`Initializing game with ${rows}x${cols} grid at ${gameStage} stage`);
        
        try {
            // Check critical dependencies before proceeding
            if (!this.entityManager || !this.eventSystem) {
                throw new Error('Cannot initialize game: missing critical dependencies');
            }
            
            // Clear any existing entities
            this.entityManager.clear();
            
            // Create game objects
            this.grid = new Grid(rows, cols, gameStage);
            this.turnSystem = new TurnSystem(gameStage, { grid: this.grid });
            this.evolutionSystem = new EvolutionSystem(); // Initialize evolution system
            this.evolutionSystem.init(); // Make sure to call init
            
            // Initialize the grid with default tiles
            this.grid.init();
            
            // Initialize turn system
            this.turnSystem.init();
            
            // Initialize metrics system
            this.metricsSystem = new MetricsSystem();
            this.metricsSystem.reset();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Create player entity
            this.createPlayer();
            
            // Initialize UI manager
            this.uiManager = new UIManager({
                grid: this.grid,
                turnSystem: this.turnSystem
            });
            this.uiManager.init();
            
            // Make sure our UI shows the correct balance values
            const balance = this.grid.getSystemBalance();
            eventSystem.emitStandardized(
                EventTypes.SYSTEM_BALANCE_CHANGED.legacy,
                EventTypes.SYSTEM_BALANCE_CHANGED.standard,
                {
                    chaos: balance.chaos,
                    order: balance.order,
                    systemChaos: balance.chaos,
                    systemOrder: balance.order,
                    chaosDelta: 0
                }
            );
            
            // Add feedback wrapper element if it doesn't exist yet
            if (!document.getElementById('feedback-message')) {
                const feedbackEl = document.createElement('div');
                feedbackEl.id = 'feedback-message';
                document.body.appendChild(feedbackEl);
            }
            
            // Make sure evolve button is hidden at game start
            const evolveBtn = document.getElementById('evolve-btn');
            if (evolveBtn) {
                evolveBtn.classList.add('hidden');
            }
            
            // Initial visibility update for player's starting location
            const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
            if (playerEntity) {
                const playerComponent = playerEntity.getComponent(PlayerComponent);
                if (playerComponent) {
                    // Instead of calling non-existent method, we'll mark the starting tile as explored
                    const startRow = playerComponent.row;
                    const startCol = playerComponent.col;
                    const tileEntity = this.entityManager.getEntitiesByTag(`tile_${startRow}_${startCol}`)[0];
                    
                    if (tileEntity) {
                        const tileComponent = tileEntity.getComponent(TileComponent);
                        if (tileComponent) {
                            tileComponent.markExplored();
                            playerComponent.tilesExplored++;
                        }
                    }
                    
                    // Make sure the player marker is positioned correctly
                    playerComponent.updateMarkerPosition();
                }
            }
            
            // Mark game as initialized
            this.isInitialized = true;
            
            // Emit game initialized event
            this.eventSystem.emit('gameInitialized', {
                rows,
                cols,
                gameStage
            });
            
            return true;
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.isInitialized = false;
            return false;
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        console.log("Setting up Game event listeners");
        
        // Listen for tile clicks - using context-based binding
        this.eventSystem.on('tileClicked', this.handleTileClick, this);
        
        // Listen for turn end action - Only set up if ActionPanel isn't handling it
        if (!window.actionPanel || !window.actionPanel._initialized) {
            const endTurnBtn = document.getElementById('end-turn-btn');
            if (endTurnBtn) {
                console.log("Setting up end turn button listener (fallback)");
                
                // Remove any existing listeners by cloning the button
                const newEndTurnBtn = endTurnBtn.cloneNode(true);
                endTurnBtn.parentNode.replaceChild(newEndTurnBtn, endTurnBtn);
                
                // Add the listener - use a simple function that calls our endTurn method
                newEndTurnBtn.addEventListener('click', () => {
                    console.log('End turn button clicked (fallback handler)');
                    this.endTurn();
                });
            } else {
                console.warn("End turn button not found");
            }
        } else {
            console.log("ActionPanel is handling the end turn button, skipping fallback setup");
        }
        
        // NOTE: We've moved UI update event listeners to UIManager to avoid duplicates
        // The Game class will no longer directly listen for these events:
        // - playerEnergyChanged
        // - playerMovementPointsChanged 
        // - turnStart (for display updates)
        // - systemBalanceChanged
        // - playerEvolutionPointsChanged
        
        // However, we'll still listen for evolutionPointsAwarded for game logic
        this.eventSystem.on('evolutionPointsAwarded', this.showEvolutionPointsMessage.bind(this));
        
        // Listen for evolution ready state
        this.eventSystem.on('evolutionReady', this.handleEvolutionReady.bind(this));
        
        // Listen for ActionPanel ready event to reconfigure buttons if needed
        this.eventSystem.on('actionPanelReady', (data) => {
            console.log("ActionPanel is now ready, button handling is fully delegated");
            // Buttons are automatically set up by ActionPanel, no need to reconfigure
        });
        
        // Set up new game button
        const newGameBtn = document.getElementById('new-game-btn');
        if (newGameBtn) {
            const newNewGameBtn = newGameBtn.cloneNode(true);
            newGameBtn.parentNode.replaceChild(newNewGameBtn, newGameBtn);
            
            newNewGameBtn.addEventListener('click', () => {
                console.log('New game button clicked');
                this.restart();
            });
        }
        
        // Set up action buttons
        this.setupActionButtons();
        
        // Set up evolve button
        this.setupEvolveButton();
    }
    
    /**
     * Set up action buttons
     */
    setupActionButtons() {
        // We now delegate action button handling to ActionPanel
        // This method is kept for compatibility but no longer directly sets up button handlers
        console.log("Action button handling delegated to ActionPanel");
        
        // Only use fallback if ActionPanel is truly not available
        // Check for both existence and initialization flag
        if (!window.actionPanel || !window.actionPanel._initialized) {
            console.log("ActionPanel not initialized yet during Game startup - using temporary fallback button setup. ActionPanel will take over shortly.");
            const actions = ['move', 'sense', 'interact', 'stabilize'];
            
            // First remove any existing listeners from ALL buttons
            actions.forEach(action => {
                const button = document.getElementById(`${action}-btn`);
                if (button) {
                    // Clone the button to remove all event listeners
                    const newButton = button.cloneNode(true);
                    button.parentNode.replaceChild(newButton, button);
                    
                    // Add fresh listener with direct handler
                    newButton.addEventListener('click', function() {
                        console.log(`${action} button clicked directly`);
                        
                        // Get the game instance and call setPlayerAction
                        if (window.game) {
                            window.game.setPlayerAction(action);
                        }
                    });
                }
            });
        } else {
            console.log("Using ActionPanel for button handling, skipping fallback setup");
        }
    }
    
    /**
     * Set up the evolve button
     */
    setupEvolveButton() {
        const evolveBtn = document.getElementById('evolve-btn');
        if (evolveBtn) {
            // Clone to remove any existing listeners
            const newEvolveBtn = evolveBtn.cloneNode(true);
            evolveBtn.parentNode.replaceChild(newEvolveBtn, evolveBtn);
            
            // Add click handler
            newEvolveBtn.addEventListener('click', () => {
                console.log('Evolve button clicked');
                this.showCompletionScreen();
            });
        } else {
            console.warn("Evolve button not found");
        }
    }
    
    /**
     * End the current turn
     * @returns {boolean} Whether the turn was successfully ended
     */
    endTurn() {
        console.log('End turn method called');
        
        try {
            // Get the ActionPanel if available
            const actionPanel = window.actionPanel;
            
            // Use ActionPanel's end turn handler if available
            if (actionPanel && typeof actionPanel.handleEndTurnClick === 'function') {
                actionPanel.handleEndTurnClick();
                return true;
            }
            
            // Fallback: Direct approach if ActionPanel is not available
            // Get player entity and ensure its action is cleared
            const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
            if (playerEntity) {
                const playerComponent = playerEntity.getComponent(PlayerComponent);
                if (playerComponent) {
                    // Clear the action
                    playerComponent.setAction(null);
                }
            }
            
            // End the turn in the turn system
            if (this.turnSystem) {
                this.turnSystem.endTurn();
                return true;
            } else {
                console.error("Turn system is null, cannot end turn");
                return false;
            }
        } catch (error) {
            console.error("Error ending turn:", error);
            return false;
        }
    }
    
    /**
     * Update the UI with current values
     */
    updateUI() {
        // Skip if UI Manager isn't ready
        if (!this.uiManager) {
            console.warn("Cannot update UI: UIManager not initialized");
            return;
        }
        
        // Get player entity
        const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
        if (playerEntity) {
            const playerComponent = playerEntity.getComponent(PlayerComponent);
            if (playerComponent) {
                // Update energy display via UIManager
                this.uiManager.updateEnergyDisplay({
                    energy: playerComponent.energy,
                    // Legacy property for backward compatibility
                    currentEnergy: playerComponent.energy,
                    maxEnergy: playerComponent.maxEnergy
                });
                
                // Update movement points display via UIManager
                this.uiManager.updateMovementPointsDisplay({
                    newPoints: playerComponent.movementPoints,
                    maxPoints: playerComponent.maxMovementPoints
                });
                
                // Update evolution points display via UIManager
                this.uiManager.updateEvolutionPointsDisplay({
                    chaosPoints: playerComponent.chaosEvolutionPoints,
                    flowPoints: playerComponent.flowEvolutionPoints,
                    orderPoints: playerComponent.orderEvolutionPoints
                });
            }
        }
        
        // Update turn display via UIManager
        this.uiManager.updateTurnDisplay({
            turnCount: this.turnSystem.turnCount,
            maxTurns: this.turnSystem.maxTurns
        });
        
        // Update balance display via UIManager
        const balance = this.grid.getSystemBalance();
        this.uiManager.updateBalanceDisplay({
            chaos: balance.chaos,
            order: balance.order
        });
    }
    
    /**
     * Show evolution points message
     * @param {object} data - Evolution points data
     */
    showEvolutionPointsMessage(data) {
        if (!data || !data.pointsAwarded) return;
        
        const { chaos = 0, flow = 0, order = 0 } = data.pointsAwarded;
        const totalPoints = chaos + flow + order;
        
        if (totalPoints <= 0) return;
        
        // Create formatted HTML message for the popup
        let message = '<span style="color: #64dfdf;">Evolution Points Awarded:</span><br>';
        
        if (chaos > 0) {
            message += `<span style="color: #ff5a5f;">Chaos: +${chaos}</span>`;
            
            if (flow > 0 || order > 0) {
                message += ' | ';
            }
        }
        
        if (flow > 0) {
            message += `<span style="color: #f9c80e;">Flow: +${flow}</span>`;
            
            if (order > 0) {
                message += ' | ';
            }
        }
        
        if (order > 0) {
            message += `<span style="color: #44ccff;">Order: +${order}</span>`;
        }
        
        // Use the new message system with category for coalescing similar messages
        this.showFeedbackMessage(message, 'evolution-points', 3000, false, 'evolution-points');
        
        // Log to console for debugging
        console.log('Game.showEvolutionPointsMessage displayed feedback popup');
    }
    
    /**
     * Show a feedback message to the player
     * @param {string} message - Message to display
     * @param {string} type - Type of message (success, error, evolution-points)
     * @param {number} duration - How long to show message in ms
     * @param {boolean} addToLog - Whether to also add this message to the game log
     * @param {string} category - Optional category for message coalescing
     * @returns {boolean} Whether the message was displayed
     */
    showFeedbackMessage(message, type = '', duration = 2000, addToLog = false, category = '') {
        // Always delegate to MessageSystem if available
        if (this.uiManager && this.uiManager.messageSystem && 
            typeof this.uiManager.messageSystem.showFeedbackMessage === 'function') {
            this.uiManager.messageSystem.showFeedbackMessage(message, duration, type, category);
            
            // Also add to log if requested
            if (addToLog && typeof this.uiManager.messageSystem.addLogMessage === 'function') {
                // Convert message type to log type
                let logType = 'system';
                if (type === 'success') logType = 'player';
                if (type === 'error' || type === 'warning') logType = 'event';
                
                this.uiManager.messageSystem.addLogMessage(message, logType);
            }
            
            return true;
        }
        
        // Fallback if MessageSystem not available
        console.log(`Feedback message: ${message}`);
        return false;
    }
    
    /**
     * Show feedback message - simplified wrapper for showFeedbackMessage
     * @param {string} message - Message to show
     * @param {string} type - Type of message (optional)
     * @param {boolean} addToLog - Whether to also add to log
     */
    showFeedback(message, type = '', addToLog = false) {
        this.showFeedbackMessage(message, type, 2000, addToLog);
    }
    
    /**
     * Add a message to the game log
     * @param {string} message - Message to add
     * @param {string} type - Message type (system, player, event)
     * @returns {boolean} Whether the message was added
     */
    addLogMessage(message, type = 'system') {
        // Delegate to MessageSystem if available
        if (this.uiManager && this.uiManager.messageSystem && 
            typeof this.uiManager.messageSystem.addLogMessage === 'function') {
            this.uiManager.messageSystem.addLogMessage(message, type);
            return true;
        }
        
        // If no MessageSystem, log to console as a fallback
        console.log(`[${type}] ${message}`);
        return false;
    }
    
    /**
     * Set the current player action
     * @param {string} action - Action to set
     */
    setPlayerAction(action) {
        console.log(`Game.setPlayerAction called with ${action}`);
        
        // Get the player component
        const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
        if (!playerEntity) {
            console.error("No player entity found");
            return;
        }
        
        const playerComponent = playerEntity.getComponent(PlayerComponent);
        if (!playerComponent) {
            console.error("No player component found");
            return;
        }
        
        // Special handling for null action - directly clear player's action
        if (action === null) {
            playerComponent.setAction(null);
            
            // If we have an ActionPanel, also update its state
            if (window.actionPanel) {
                window.actionPanel.currentAction = null;
                window.actionPanel.updateButtonStates();
            }
            return;
        }
        
        // For normal actions, if we have an ActionPanel, delegate to it
        if (window.actionPanel) {
            // ActionPanel will handle the UI updates and player component updates
            window.actionPanel.handleActionButtonClick(action);
            return;
        }
        
        // Fallback if ActionPanel is not available
        console.log("ActionPanel not available, using direct approach");
        
        // Set the action on the player component
        playerComponent.setAction(action);
        
        // Show feedback if an action was selected
        if (action) {
            this.showFeedback(`${action.charAt(0).toUpperCase() + action.slice(1)} action selected`);
        }
    }
    
    /**
     * Create the player entity
     * @returns {Object|null} The created player entity or null if creation failed
     */
    createPlayer() {
        try {
            // Check if a player entity already exists and remove it
            const existingPlayers = this.entityManager.getEntitiesByTag('player');
            if (existingPlayers && existingPlayers.length > 0) {
                console.warn(`Found ${existingPlayers.length} existing player entities, removing them...`);
                for (const player of existingPlayers) {
                    this.entityManager.removeEntity(player.id);
                }
            }
            
            // Use the imported Entity class directly, no need to check window.Entity
            const playerEntity = new Entity();
            
            // Add player component - the entity is passed automatically to the component constructor
            const playerComponent = playerEntity.addComponent(PlayerComponent, 0, 0);
            if (!playerComponent) {
                throw new Error('Failed to add PlayerComponent to player entity');
            }
            
            // Add tag for easy querying
            playerEntity.addTag('player');
            
            // Add to entity manager
            this.entityManager.addEntity(playerEntity);
            
            // Initialize player
            playerEntity.init();
            
            return playerEntity;
        } catch (error) {
            console.error('Failed to create player entity:', error);
            return null;
        }
    }
    
    /**
     * Start the game loop
     */
    startGameLoop() {
        try {
            // Start animation frame for game updates
            this.lastUpdateTime = Date.now();
            this.isRunning = true;
            requestAnimationFrame(this.update);
            
            console.log("Game loop started");
        } catch (error) {
            console.error("Failed to start game loop:", error);
            this.isRunning = false;
        }
    }
    
    /**
     * Game update loop
     */
    update() {
        try {
            // Skip update if game is not running
            if (!this.isRunning) {
                console.warn("Game loop update called while game is not running");
                return;
            }
            
            // Calculate delta time
            const now = Date.now();
            const deltaTime = (now - this.lastUpdateTime) / 1000; // in seconds
            this.lastUpdateTime = now;
            
            // Update grid
            if (this.grid && typeof this.grid.update === 'function') {
                this.grid.update(deltaTime);
            }
            
            // Update turn system
            if (this.turnSystem && typeof this.turnSystem.update === 'function') {
                this.turnSystem.update(deltaTime);
            }
            
            // Update entities
            if (this.entityManager && typeof this.entityManager.updateEntities === 'function') {
                this.entityManager.updateEntities(deltaTime);
            }
            
            // Continue the game loop
            requestAnimationFrame(this.update);
        } catch (error) {
            console.error("Error in game update loop:", error);
            // Continue the game loop despite errors
            // This helps prevent the game from completely freezing on non-critical errors
            requestAnimationFrame(this.update);
        }
    }
    
    /**
     * Handle tile click event
     * @param {Object} data - Event data containing row, col, and tileEntity
     */
    handleTileClick(data) {
        try {
            if (!data) {
                console.error("No data provided to handleTileClick");
                return;
            }
            
            const { row, col, tileEntity } = data;
            console.log(`Game: Tile clicked at (${row}, ${col})`);
            
            // Check if we can delegate to ActionPanel
            if (window.actionPanel && typeof window.actionPanel.handleTileClick === 'function') {
                // Since ActionPanel already has its own event listener for tileClicked,
                // we shouldn't call handleTileClick directly to avoid double execution
                
                // Instead, just log that we received the event too
                console.debug("Game received tile click, but ActionPanel is handling it");
                return;
            }
            
            // Only execute this fallback code if ActionPanel is not available
            // This ensures the game still works without the ActionPanel
            
            // Get player entity
            const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
            if (!playerEntity) {
                console.warn("No player entity found");
                return;
            }
            
            const playerComponent = playerEntity.getComponent(PlayerComponent);
            if (!playerComponent) {
                console.warn("No player component found");
                return;
            }
            
            // If no action is selected, provide feedback
            if (!playerComponent.currentAction) {
                this.showFeedback("Select an action first");
                return;
            }
            
            // Continue with the fallback implementation...
            console.warn("Using Game.js fallback tile click handler - ActionPanel not available");
            
            // This is only a fallback if ActionPanel is not available,
            // so we don't need to implement the full functionality here
        } catch (error) {
            console.error("Error handling tile click:", error);
        }
    }
    
    /**
     * Restart the game
     * @param {number} rows - Number of rows in the grid
     * @param {number} cols - Number of columns in the grid
     */
    restart(rows = 5, cols = 5) {
        console.log(`Restarting game with grid size ${rows}x${cols}`);
        
        // Hide the evolve button
        const evolveBtn = document.getElementById('evolve-btn');
        if (evolveBtn) {
            evolveBtn.classList.add('hidden');
        }
        
        // New game should reset all progress, so we don't save player traits
        
        // Clean up resources
        this.destroy();
        
        // Re-initialize the game with the specified grid size
        this.init(rows, cols);
        
        // Reset evolution system when starting a completely new game
        this.evolutionSystem.reset(false); // Don't keep traits
        
        // Get the player component to ensure UI is updated with zeroed evolution points
        const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
        if (playerEntity) {
            const playerComponent = playerEntity.getComponent(PlayerComponent);
            if (playerComponent) {
                // Explicitly emit event to update UI with reset evolution points
                this.eventSystem.emit('playerEvolutionPointsChanged', {
                    player: playerComponent,
                    chaosPoints: playerComponent.chaosEvolutionPoints,
                    flowPoints: playerComponent.flowEvolutionPoints,
                    orderPoints: playerComponent.orderEvolutionPoints,
                    totalPoints: playerComponent.evolutionPoints
                });
                console.log("Explicitly updating UI with reset evolution points");
                
                // Explicitly update UI with current player stats
                // This ensures the UI is updated immediately after game restart
                if (this.uiManager) {
                    this.uiManager.updateResourceDisplay('energy', {
                        energy: playerComponent.energy
                    });
                    
                    this.uiManager.updateResourceDisplay('movement', {
                        movementPoints: playerComponent.movementPoints
                    });
                }
            }
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        console.log("Game cleanup: removing event listeners and cleaning up systems");
        
        // Store references to all events we need to unregister
        const eventsToUnregister = [
            { event: 'tileClicked', handler: this.handleTileClick, context: this },
            { event: 'evolutionPointsAwarded', handler: this.showEvolutionPointsMessage },
            { event: 'evolutionReady', handler: this.handleEvolutionReady }
        ];
        
        // Unregister all events
        for (const eventInfo of eventsToUnregister) {
            if (eventInfo.context) {
                this.eventSystem.off(eventInfo.event, eventInfo.handler, eventInfo.context);
            } else {
                // For bound functions, try to remove all handlers for this event type
                this.eventSystem.removeAllListeners(eventInfo.event);
            }
        }
        
        // Clean up UI Manager
        if (this.uiManager) {
            this.uiManager.destroy();
            this.uiManager = null;
        }
        
        // Clean up systems in reverse order
        if (this.evolutionSystem) {
            this.evolutionSystem.destroy();
            this.evolutionSystem = null;
        }
        
        if (this.turnSystem) {
            this.turnSystem.destroy();
            this.turnSystem = null;
        }
        
        if (this.grid) {
            this.grid.destroy();
            this.grid = null;
        }
        
        // Clear entity manager
        if (this.entityManager) {
            this.entityManager.clear(); // Use clear() instead of clearEntities()
        }
        
        // Stop game loop
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        
        // Mark as not initialized
        this.isInitialized = false;
        
        console.log("Game cleanup completed successfully");
    }
    
    /**
     * Handle evolution ready state changes
     * @param {Object} data - Event data
     */
    handleEvolutionReady(data) {
        const evolveBtn = document.getElementById('evolve-btn');
        if (!evolveBtn) return;
        
        if (data.canEvolve) {
            // Show evolve button with a nice animation
            evolveBtn.classList.remove('hidden');
            
            // Show a message to the player
            this.showFeedbackMessage(
                `<span style="color: #64dfdf;">Evolution available!</span> You have gathered enough points in this level to evolve.`, 
                'success', 
                4000
            );
            
            // Add message to log
            this.addLogMessage(`You have gathered enough evolution points (${data.currentLevelTotal} in this level) to evolve!`);
            
            console.log(`Evolution ready: ${data.currentLevelTotal} points in current level, total accumulated: ${data.totalPoints}`);
        } else {
            // Hide evolve button
            evolveBtn.classList.add('hidden');
        }
    }
    
    /**
     * Show the level completion screen
     */
    showCompletionScreen() {
        console.log('Showing completion screen');
        
        // Get player statistics
        const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
        if (!playerEntity) return;
        
        const playerComponent = playerEntity.getComponent(PlayerComponent);
        if (!playerComponent) return;
        
        // Prepare completion data
        const completionData = {
            gameStage: this.turnSystem.gameStage,
            turnCount: this.turnSystem.turnCount,
            chaosPoints: playerComponent.chaosEvolutionPoints,
            flowPoints: playerComponent.flowEvolutionPoints,
            orderPoints: playerComponent.orderEvolutionPoints,
            totalPoints: playerComponent.getTotalEvolutionPoints(),
            tilesExplored: playerComponent.tilesExplored,
            movesMade: playerComponent.movesMade,
            actionsPerformed: playerComponent.actionsPerformed
        };
        
        // Determine player title based on points distribution
        completionData.title = this.determinePlayerTitle(completionData);
        
        // Create flavor text based on game stage
        completionData.flavorText = this.generateFlavorText(completionData);
        
        // Create and show the modal
        this.showModal(completionData);
    }
    
    /**
     * Determine a title for the player based on their evolution points
     * @param {Object} data - Player statistics
     * @returns {string} Player title
     */
    determinePlayerTitle(data) {
        // Calculate point ratios
        const total = data.totalPoints || 1; // Avoid division by zero
        const chaosRatio = data.chaosPoints / total;
        const flowRatio = data.flowPoints / total;
        const orderRatio = data.orderPoints / total;
        
        // Determine primary trait (chaos, flow, or order)
        let primaryTrait;
        if (chaosRatio >= 0.5) primaryTrait = 'chaos';
        else if (orderRatio >= 0.5) primaryTrait = 'order';
        else primaryTrait = 'flow';
        
        // Early game titles based on primary trait
        if (data.gameStage === 'early') {
            if (primaryTrait === 'chaos') {
                return 'Primordial Disruptor';
            } else if (primaryTrait === 'flow') {
                return 'Adaptive Organism';
            } else {
                return 'Pattern Weaver';
            }
        }
        
        // Mid game titles
        else if (data.gameStage === 'mid') {
            if (primaryTrait === 'chaos') {
                return 'Mutation Catalyst';
            } else if (primaryTrait === 'flow') {
                return 'Ecological Harmonizer';
            } else {
                return 'Structural Architect';
            }
        }
        
        // Late game titles
        else {
            if (primaryTrait === 'chaos') {
                return 'Quantum Destabilizer';
            } else if (primaryTrait === 'flow') {
                return 'Equilibrium Sage';
            } else {
                return 'Cosmic Engineer';
            }
        }
    }
    
    /**
     * Generate flavor text based on game stage and player stats
     * @param {Object} data - Player statistics
     * @returns {string} Flavor text
     */
    generateFlavorText(data) {
        if (data.gameStage === 'early') {
            return "From the primordial soup, your entity has gathered enough evolutionary potential to take a significant leap forward. The chaotic energies and ordered patterns you've harnessed will shape your path in this strange, new world.";
        } else if (data.gameStage === 'mid') {
            return "Your organism has adapted and thrived in its environment, collecting the essence of both chaos and order. Now, it stands at the precipice of a new evolutionary breakthrough, ready to specialize further or embrace the balance between forces.";
        } else {
            return "Having mastered the fundamental forces of your reality, your entity now approaches a transcendent state of being. The cosmic dance of chaos and order has revealed patterns beyond mere existence, and you are ready to evolve into something truly extraordinary.";
        }
    }
    
    /**
     * Show a modal with the completion screen
     * @param {Object} data - Completion data
     */
    showModal(data) {
        const modalContainer = document.getElementById('modal-container');
        const modalContent = document.getElementById('modal-content');
        
        if (!modalContainer || !modalContent) {
            console.error("Modal elements not found");
            return;
        }
        
        // Save completion data to instance property so it can be updated
        this.currentCompletionData = { ...data };
        
        // Clear existing content
        modalContent.innerHTML = '';
        
        // Create header with title
        const header = document.createElement('h2');
        header.classList.add('completion-header');
        header.textContent = 'Evolution Complete!';
        modalContent.appendChild(header);
        
        // Add player title
        const titleElement = document.createElement('h3');
        titleElement.classList.add('player-title');
        titleElement.textContent = data.title;
        modalContent.appendChild(titleElement);
        
        // Add flavor text
        const flavorText = document.createElement('p');
        flavorText.classList.add('flavor-text');
        flavorText.textContent = data.flavorText;
        modalContent.appendChild(flavorText);
        
        // Points summary
        const pointsSummary = document.createElement('div');
        pointsSummary.classList.add('points-summary');
        pointsSummary.innerHTML = `
            <div class="summary-row">
                <span class="label">Chaos Points:</span>
                <span class="value chaos">${data.chaosPoints}</span>
            </div>
            <div class="summary-row">
                <span class="label">Flow Points:</span>
                <span class="value flow">${data.flowPoints}</span>
            </div>
            <div class="summary-row">
                <span class="label">Order Points:</span>
                <span class="value order">${data.orderPoints}</span>
            </div>
            <div class="summary-row total">
                <span class="label">Total Points:</span>
                <span class="value">${data.totalPoints}</span>
            </div>
        `;
        modalContent.appendChild(pointsSummary);
        
        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('completion-buttons');
        
        // Stats button
        const statsButton = document.createElement('button');
        statsButton.textContent = 'Show Stats';
        statsButton.classList.add('stats-btn');
        statsButton.addEventListener('click', () => this.showStatsScreen(data));
        buttonsContainer.appendChild(statsButton);
        
        // Evolve button
        const evolveButton = document.createElement('button');
        evolveButton.textContent = 'Evolve';
        evolveButton.classList.add('evolve-btn');
        evolveButton.addEventListener('click', () => this.showEvolutionScreen(data));
        buttonsContainer.appendChild(evolveButton);
        
        // Next level button
        const nextLevelButton = document.createElement('button');
        nextLevelButton.textContent = 'Next Level';
        nextLevelButton.classList.add('next-level-btn');
        nextLevelButton.addEventListener('click', () => this.startNextLevel(data));
        buttonsContainer.appendChild(nextLevelButton);
        
        modalContent.appendChild(buttonsContainer);
        
        // Add close button
        const closeButton = document.createElement('span');
        closeButton.className = 'modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
            modalContainer.classList.add('hidden');
        });
        modalContent.appendChild(closeButton);
        
        // Show modal
        modalContainer.classList.remove('hidden');
    }
    
    /**
     * Show detailed stats screen
     * @param {Object} data - Completion data
     */
    showStatsScreen(data) {
        console.log('Showing stats screen');
        
        // Get metrics for the current level using the class property
        const currentMetrics = this.metricsSystem.getMetrics();
        
        // Get historical metrics from localStorage
        const historicalMetrics = JSON.parse(localStorage.getItem('levelMetrics') || '[]');
        
        // Prepare the modal container
        const modalContainer = document.getElementById('modal-container');
        const modalContent = document.getElementById('modal-content');
        
        if (!modalContainer || !modalContent) return;
        
        // Clear any existing content
        modalContent.innerHTML = '';
        
        // Create the main header
        const header = document.createElement('h2');
        header.className = 'stats-header';
        header.innerHTML = 'Evolutionary <span>Statistics</span>';
        modalContent.appendChild(header);
        
        // Create tabs for "Current Level" and "All Time"
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'stats-tabs';
        tabsContainer.innerHTML = `
            <button class="stats-tab active" data-tab="current">Current Level</button>
            <button class="stats-tab" data-tab="history">All Evolution</button>
        `;
        modalContent.appendChild(tabsContainer);
        
        // Create container for both tab contents
        const statsContainer = document.createElement('div');
        statsContainer.className = 'stats-container';
        modalContent.appendChild(statsContainer);
        
        // Current Level Stats Content
        const currentLevelStats = document.createElement('div');
        currentLevelStats.className = 'stats-tab-content current active';
        currentLevelStats.innerHTML = this.generateCurrentLevelStatsHTML(currentMetrics, data);
        statsContainer.appendChild(currentLevelStats);
        
        // Historical Stats Content
        const historicalStatsContent = document.createElement('div');
        historicalStatsContent.className = 'stats-tab-content history';
        historicalStatsContent.innerHTML = this.generateHistoricalStatsHTML(historicalMetrics, currentMetrics);
        statsContainer.appendChild(historicalStatsContent);
        
        // Add close button
        const closeButton = document.createElement('span');
        closeButton.className = 'modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
            modalContainer.classList.add('hidden');
        });
        modalContent.appendChild(closeButton);
        
        // Add a return button
        const returnButton = document.createElement('button');
        returnButton.textContent = 'Return';
        returnButton.className = 'return-btn';
        returnButton.addEventListener('click', () => {
            this.showCompletionScreen();
        });
        modalContent.appendChild(returnButton);
        
        // Add tab switching functionality
        const tabs = tabsContainer.querySelectorAll('.stats-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Deactivate all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                statsContainer.querySelectorAll('.stats-tab-content').forEach(content => 
                    content.classList.remove('active')
                );
                
                // Activate the clicked tab
                tab.classList.add('active');
                const tabName = tab.getAttribute('data-tab');
                statsContainer.querySelector(`.stats-tab-content.${tabName}`).classList.add('active');
            });
        });
        
        // Show the modal
        modalContainer.classList.remove('hidden');
    }
    
    /**
     * Generate HTML for current level stats
     * @param {Object} metrics - Current metrics
     * @param {Object} data - Completion data
     * @returns {string} HTML content
     */
    generateCurrentLevelStatsHTML(metrics, data) {
        const playerStyle = this.determinePlayerStyleAndStrengths(metrics);
        
        return `
            <div class="stats-header-section">
                <h3>Level ${metrics.game.levelsCompleted + 1} Statistics</h3>
                <div class="player-style">${data.title}</div>
            </div>
            
            <div class="stats-content">
                <div class="stat-group primary">
                    <h3>Play Style Analysis</h3>
                    <p class="style-description">${playerStyle.description}</p>
                    <div class="style-strengths">
                        <span>Strengths:</span> ${playerStyle.strengths}
                    </div>
                    
                    <div class="style-rating-container">
                        <div class="style-rating">
                            <div class="rating-label">Explorer</div>
                            <div class="rating-bar">
                                <div class="rating-fill explorer" style="width: ${metrics.ratings.explorerRating * 100}%"></div>
                            </div>
                        </div>
                        <div class="style-rating">
                            <div class="rating-label">Balancer</div>
                            <div class="rating-bar">
                                <div class="rating-fill balancer" style="width: ${metrics.ratings.balancerRating * 100}%"></div>
                            </div>
                        </div>
                        <div class="style-rating">
                            <div class="rating-label">Efficient</div>
                            <div class="rating-bar">
                                <div class="rating-fill efficient" style="width: ${metrics.ratings.efficientRating * 100}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="stat-columns">
                    <div class="stat-group">
                        <h3>Evolution</h3>
                        <div class="stat-item">
                            <span>Chaos Points:</span>
                            <span class="value chaos">${data.chaosPoints}</span>
                        </div>
                        <div class="stat-item">
                            <span>Flow Points:</span>
                            <span class="value flow">${data.flowPoints}</span>
                        </div>
                        <div class="stat-item">
                            <span>Order Points:</span>
                            <span class="value order">${data.orderPoints}</span>
                        </div>
                        <div class="stat-item total">
                            <span>Total Points:</span>
                            <span class="value">${data.totalPoints}</span>
                        </div>
                    </div>
                    
                    <div class="stat-group">
                        <h3>Movement</h3>
                        <div class="stat-item">
                            <span>Moves Made:</span>
                            <span>${metrics.movement.movesMade}</span>
                        </div>
                        <div class="stat-item">
                            <span>Tiles Explored:</span>
                            <span>${metrics.movement.tilesExplored}</span>
                        </div>
                        <div class="stat-item">
                            <span>Distance Traveled:</span>
                            <span>${metrics.movement.totalDistanceMoved} units</span>
                        </div>
                    </div>
                    
                    <div class="stat-group">
                        <h3>Resources</h3>
                        <div class="stat-item">
                            <span>Energy Used:</span>
                            <span>${metrics.resources.energyUsed}</span>
                        </div>
                        <div class="stat-item">
                            <span>Energy Gained:</span>
                            <span>${metrics.resources.energyGained}</span>
                        </div>
                        <div class="stat-item">
                            <span>Net Energy:</span>
                            <span>${metrics.resources.energyGained - metrics.resources.energyUsed}</span>
                        </div>
                        <div class="stat-item">
                            <span>Movement Points Used:</span>
                            <span>${metrics.resources.movementPointsUsed}</span>
                        </div>
                    </div>
                    
                    <div class="stat-group">
                        <h3>Actions</h3>
                        <div class="stat-item">
                            <span>Senses:</span>
                            <span>${metrics.actions.sensesPerformed}</span>
                        </div>
                        <div class="stat-item">
                            <span>Interactions:</span>
                            <span>${metrics.actions.interactionsPerformed}</span>
                        </div>
                        <div class="stat-item">
                            <span>Stabilizations:</span>
                            <span>${metrics.actions.stabilizationsPerformed}</span>
                        </div>
                        <div class="stat-item">
                            <span>Total Actions:</span>
                            <span>${metrics.actions.sensesPerformed + metrics.actions.interactionsPerformed + metrics.actions.stabilizationsPerformed}</span>
                        </div>
                    </div>
                    
                    <div class="stat-group">
                        <h3>Chaos/Order</h3>
                        <div class="stat-item">
                            <span>Chaos Created:</span>
                            <span>${metrics.chaos.chaosCreated.toFixed(2)}</span>
                        </div>
                        <div class="stat-item">
                            <span>Chaos Reduced:</span>
                            <span>${metrics.chaos.chaosReduced.toFixed(2)}</span>
                        </div>
                        <div class="stat-item">
                            <span>Net Chaos Change:</span>
                            <span>${metrics.chaos.netChaosChange.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="stat-group">
                        <h3>Game</h3>
                        <div class="stat-item">
                            <span>Turns Taken:</span>
                            <span>${metrics.game.turnsTaken}</span>
                        </div>
                        <div class="stat-item">
                            <span>Actions Per Turn:</span>
                            <span>${metrics.game.averageActionsPerTurn.toFixed(2)}</span>
                        </div>
                        <div class="stat-item">
                            <span>Game Stage:</span>
                            <span>${data.gameStage}</span>
                        </div>
                        <div class="stat-item">
                            <span>Play Time:</span>
                            <span>${this.formatPlayTime(metrics.game.totalPlayTime)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="stat-group achievements">
                    <h3>Achievements</h3>
                    <div class="achievements-container">
                        ${this.formatAchievements(metrics.achievements)}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Generate HTML for historical stats
     * @param {Array} historicalMetrics - Array of historical level metrics
     * @param {Object} currentMetrics - Current metrics
     * @returns {string} HTML content
     */
    generateHistoricalStatsHTML(historicalMetrics, currentMetrics) {
        // Count levels by game stage
        const stageCount = { early: 0, mid: 0, late: 0 };
        historicalMetrics.forEach(m => {
            if (m.gameStage) stageCount[m.gameStage]++;
        });
        
        // Calculate lifetime totals
        const lifetimeTotals = {
            totalLevels: historicalMetrics.length,
            totalTurns: historicalMetrics.reduce((sum, m) => sum + m.turns, 0),
            totalEnergyUsed: historicalMetrics.reduce((sum, m) => sum + m.energyUsed, 0),
            totalMoves: historicalMetrics.reduce((sum, m) => sum + m.movesMade, 0),
            totalTilesExplored: historicalMetrics.reduce((sum, m) => sum + m.tilesExplored, 0),
            totalSenses: historicalMetrics.reduce((sum, m) => sum + (m.sensesPerformed || 0), 0),
            totalInteractions: historicalMetrics.reduce((sum, m) => sum + (m.interactionsPerformed || 0), 0),
            totalStabilizations: historicalMetrics.reduce((sum, m) => sum + (m.stabilizationsPerformed || 0), 0),
            totalChaosCreated: historicalMetrics.reduce((sum, m) => sum + (m.chaosCreated || 0), 0),
            totalChaosReduced: historicalMetrics.reduce((sum, m) => sum + (m.chaosReduced || 0), 0),
            totalPlayTime: historicalMetrics.reduce((sum, m) => sum + (m.playTime || 0), 0)
        };
        
        // Get average per level
        const averages = {
            avgTurns: lifetimeTotals.totalLevels ? (lifetimeTotals.totalTurns / lifetimeTotals.totalLevels).toFixed(1) : 0,
            avgEnergyUsed: lifetimeTotals.totalLevels ? (lifetimeTotals.totalEnergyUsed / lifetimeTotals.totalLevels).toFixed(1) : 0,
            avgMoves: lifetimeTotals.totalLevels ? (lifetimeTotals.totalMoves / lifetimeTotals.totalLevels).toFixed(1) : 0,
            avgTilesExplored: lifetimeTotals.totalLevels ? (lifetimeTotals.totalTilesExplored / lifetimeTotals.totalLevels).toFixed(1) : 0
        };
        
        // Generate HTML
        return `
            <div class="stats-header-section">
                <h3>Evolutionary Journey</h3>
                <div class="journey-subtitle">Across All Dimensions</div>
            </div>
            
            <div class="stats-content">
                <div class="stat-group primary">
                    <h3>Journey Summary</h3>
                    <div class="journey-info">
                        <div class="journey-stat">
                            <div class="journey-count">${lifetimeTotals.totalLevels}</div>
                            <div class="journey-label">Levels Completed</div>
                        </div>
                        <div class="journey-stat">
                            <div class="journey-count">${stageCount.early}</div>
                            <div class="journey-label">Early Stage</div>
                        </div>
                        <div class="journey-stat">
                            <div class="journey-count">${stageCount.mid}</div>
                            <div class="journey-label">Mid Stage</div>
                        </div>
                        <div class="journey-stat">
                            <div class="journey-count">${stageCount.late}</div>
                            <div class="journey-label">Late Stage</div>
                        </div>
                    </div>
                    <div class="journey-time">
                        <span>Total Evolution Time:</span>
                        <span>${this.formatPlayTime(lifetimeTotals.totalPlayTime)}</span>
                    </div>
                </div>
                
                <div class="stat-columns">
                    <div class="stat-group">
                        <h3>Lifetime Totals</h3>
                        <div class="stat-item">
                            <span>Total Turns:</span>
                            <span>${lifetimeTotals.totalTurns}</span>
                        </div>
                        <div class="stat-item">
                            <span>Total Moves:</span>
                            <span>${lifetimeTotals.totalMoves}</span>
                        </div>
                        <div class="stat-item">
                            <span>Total Energy Used:</span>
                            <span>${lifetimeTotals.totalEnergyUsed}</span>
                        </div>
                        <div class="stat-item">
                            <span>Total Tiles Explored:</span>
                            <span>${lifetimeTotals.totalTilesExplored}</span>
                        </div>
                        <div class="stat-item">
                            <span>Evolution Points:</span>
                            <span>${currentMetrics.evolution.evolutionPointsEarned}</span>
                        </div>
                    </div>
                    
                    <div class="stat-group">
                        <h3>Per-Level Averages</h3>
                        <div class="stat-item">
                            <span>Avg. Turns:</span>
                            <span>${averages.avgTurns}</span>
                        </div>
                        <div class="stat-item">
                            <span>Avg. Moves:</span>
                            <span>${averages.avgMoves}</span>
                        </div>
                        <div class="stat-item">
                            <span>Avg. Energy Used:</span>
                            <span>${averages.avgEnergyUsed}</span>
                        </div>
                        <div class="stat-item">
                            <span>Avg. Tiles Explored:</span>
                            <span>${averages.avgTilesExplored}</span>
                        </div>
                    </div>
                    
                    <div class="stat-group">
                        <h3>Actions Performed</h3>
                        <div class="stat-item">
                            <span>Total Senses:</span>
                            <span>${lifetimeTotals.totalSenses}</span>
                        </div>
                        <div class="stat-item">
                            <span>Total Interactions:</span>
                            <span>${lifetimeTotals.totalInteractions}</span>
                        </div>
                        <div class="stat-item">
                            <span>Total Stabilizations:</span>
                            <span>${lifetimeTotals.totalStabilizations}</span>
                        </div>
                    </div>
                    
                    <div class="stat-group">
                        <h3>Chaos Manipulation</h3>
                        <div class="stat-item">
                            <span>Total Chaos Created:</span>
                            <span>${lifetimeTotals.totalChaosCreated.toFixed(2)}</span>
                        </div>
                        <div class="stat-item">
                            <span>Total Chaos Reduced:</span>
                            <span>${lifetimeTotals.totalChaosReduced.toFixed(2)}</span>
                        </div>
                        <div class="stat-item">
                            <span>Net Chaos Change:</span>
                            <span>${(lifetimeTotals.totalChaosCreated - lifetimeTotals.totalChaosReduced).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                ${this.generateLevelHistoryHTML(historicalMetrics)}
            </div>
        `;
    }
    
    /**
     * Generate HTML for level history
     * @param {Array} historicalMetrics - Array of historical level metrics
     * @returns {string} HTML content
     */
    generateLevelHistoryHTML(historicalMetrics) {
        if (!historicalMetrics.length) return '';
        
        const levelRows = historicalMetrics.map((level, index) => {
            const date = new Date(level.timestamp);
            const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            
            return `
                <tr>
                    <td>${historicalMetrics.length - index}</td>
                    <td>${level.gameStage || 'unknown'}</td>
                    <td>${level.turns || 0}</td>
                    <td>${level.movesMade || 0}</td>
                    <td>${level.energyUsed || 0}</td>
                    <td>${level.tilesExplored || 0}</td>
                    <td>${this.formatPlayTime(level.playTime || 0)}</td>
                    <td>${formattedDate}</td>
                </tr>
            `;
        }).join('');
        
        return `
            <div class="stat-group full-width">
                <h3>Level History</h3>
                <div class="level-history-container">
                    <table class="level-history">
                        <thead>
                            <tr>
                                <th>Level #</th>
                                <th>Stage</th>
                                <th>Turns</th>
                                <th>Moves</th>
                                <th>Energy</th>
                                <th>Explored</th>
                                <th>Time</th>
                                <th>Completed</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${levelRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    /**
     * Format achievements for display
     * @param {Object} achievements - Achievements object
     * @returns {string} HTML content
     */
    formatAchievements(achievements) {
        if (!achievements) return '<div class="no-achievements">No achievements yet</div>';
        
        return Object.values(achievements).map(achievement => {
            const progressPercent = achievement.inverted 
                ? Math.max(0, 100 - (achievement.progress / achievement.threshold * 100))
                : Math.min(100, achievement.progress / achievement.threshold * 100);
            
            return `
                <div class="achievement ${achievement.completed ? 'completed' : ''}">
                    <div class="achievement-info">
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-desc">${achievement.description}</div>
                    </div>
                    <div class="achievement-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="progress-text">
                            ${achievement.completed ? 'Completed!' : Math.round(progressPercent) + '%'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Format play time in a human-readable format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time
     */
    formatPlayTime(seconds) {
        if (!seconds) return '0s';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        
        if (minutes < 1) return `${remainingSeconds}s`;
        return `${minutes}m ${remainingSeconds}s`;
    }
    
    /**
     * Determine player style and strengths based on metrics
     * @param {Object} metrics - Player metrics
     * @returns {Object} Player style information
     */
    determinePlayerStyleAndStrengths(metrics) {
        // Calculate play style indicators
        const explorer = metrics.movement.tilesExplored / (this.grid.rows * this.grid.cols);
        const balancer = Math.min(metrics.chaos.chaosCreated, metrics.chaos.chaosReduced) / 
                        Math.max(1, Math.max(metrics.chaos.chaosCreated, metrics.chaos.chaosReduced));
        const efficient = Math.min(1, 50 / Math.max(1, metrics.resources.energyUsed));
        
        // Determine primary style
        let primaryStyle = "Balanced";
        let description = "You take a measured approach to evolution, balancing exploration and resource management.";
        let strengths = "Adaptability, Balance";
        
        if (explorer > 0.8 && explorer > balancer && explorer > efficient) {
            primaryStyle = "Explorer";
            description = "You favor thorough exploration, uncovering all the mysteries of each environment.";
            strengths = "Discovery, Mapping, Adaptation";
        } else if (balancer > 0.7 && balancer > explorer && balancer > efficient) {
            primaryStyle = "Harmonizer";
            description = "You strive to maintain harmony between chaos and order, finding balance in all things.";
            strengths = "Balance, Stability, Flow";
        } else if (efficient > 0.7 && efficient > explorer && efficient > balancer) {
            primaryStyle = "Efficient";
            description = "You carefully manage your resources, maximizing impact with minimal expenditure.";
            strengths = "Conservation, Planning, Optimization";
        } else if (metrics.chaos.netChaosChange > 5) {
            primaryStyle = "Chaos Agent";
            description = "You embrace the creative potential of chaos, fostering growth through disruption.";
            strengths = "Innovation, Creativity, Transformation";
        } else if (metrics.chaos.netChaosChange < -5) {
            primaryStyle = "Order Keeper";
            description = "You establish order and structure, creating stability in chaotic environments.";
            strengths = "Organization, Resilience, Structure";
        }
        
        return {
            style: primaryStyle,
            description: description,
            strengths: strengths
        };
    }
    
    /**
     * Show evolution/traits screen
     * @param {Object} data - Completion data
     */
    showEvolutionScreen(data) {
        console.log('Showing evolution screen');
        
        // Get player entity and component
        const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
        if (!playerEntity) {
            console.error("No player entity found when showing evolution screen");
            return;
        }
        
        const playerComponent = playerEntity.getComponent(PlayerComponent);
        if (!playerComponent) {
            console.error("No player component found when showing evolution screen");
            return;
        }
        
        // IMPORTANT: The player component is the source of truth for evolution points
        // Update the data object with the latest values from the player component
        data.chaosPoints = playerComponent.chaosEvolutionPoints;
        data.flowPoints = playerComponent.flowEvolutionPoints;
        data.orderPoints = playerComponent.orderEvolutionPoints;
        
        // If we have cached completion data, update it as well
        if (this.currentCompletionData) {
            this.currentCompletionData.chaosPoints = playerComponent.chaosEvolutionPoints;
            this.currentCompletionData.flowPoints = playerComponent.flowEvolutionPoints;
            this.currentCompletionData.orderPoints = playerComponent.orderEvolutionPoints;
            this.currentCompletionData.totalPoints = playerComponent.evolutionPoints;
        }
        
        console.log(`Evolution screen points from player component - Chaos: ${data.chaosPoints}, Flow: ${data.flowPoints}, Order: ${data.orderPoints}`);
        
        // Use the existing evolution system instance
        const evolutionSystem = this.evolutionSystem;
        
        // Prepare the modal container
        const modalContainer = document.getElementById('modal-container');
        const modalContent = document.getElementById('modal-content');
        
        if (!modalContainer || !modalContent) return;
        
        // Clear any existing content
        modalContent.innerHTML = '';
        
        // Create the main header
        const header = document.createElement('h2');
        header.className = 'evolution-header';
        header.innerHTML = 'Evolutionary <span>Traits</span>';
        modalContent.appendChild(header);
        
        // Create the evolution points display
        const pointsDisplay = document.createElement('div');
        pointsDisplay.className = 'evolution-points-display';
        pointsDisplay.innerHTML = `
            <div class="points-container">
                <div class="point-type chaos">
                    <div class="point-icon chaos-icon"></div>
                    <div class="point-value">${data.chaosPoints}</div>
                    <div class="point-label">Chaos</div>
                </div>
                <div class="point-type flow">
                    <div class="point-icon flow-icon"></div>
                    <div class="point-value">${data.flowPoints}</div>
                    <div class="point-label">Flow</div>
                </div>
                <div class="point-type order">
                    <div class="point-icon order-icon"></div>
                    <div class="point-value">${data.orderPoints}</div>
                    <div class="point-label">Order</div>
                </div>
            </div>
            <div class="stage-badge ${data.gameStage}">${data.gameStage.toUpperCase()} STAGE</div>
        `;
        modalContent.appendChild(pointsDisplay);
        
        // Create tabs for trait categories
        const traitCategories = ['movement', 'sense', 'manipulation', 'adaptation', 'survival'];
        
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'trait-tabs';
        
        // Create tab buttons
        traitCategories.forEach((category, index) => {
            const tab = document.createElement('button');
            tab.className = `trait-tab ${index === 0 ? 'active' : ''}`;
            tab.setAttribute('data-category', category);
            tab.textContent = this.formatCategoryName(category);
            tabsContainer.appendChild(tab);
        });
        
        modalContent.appendChild(tabsContainer);
        
        // Create trait list container
        const traitListContainer = document.createElement('div');
        traitListContainer.className = 'trait-list-container';
        modalContent.appendChild(traitListContainer);
        
        // Populate with initial category
        this.populateTraitList(traitListContainer, 'movement', data, playerComponent);
        
        // Add tab switching functionality
        const tabs = tabsContainer.querySelectorAll('.trait-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Deactivate all tabs
                tabs.forEach(t => t.classList.remove('active'));
                
                // Activate the clicked tab
                tab.classList.add('active');
                
                // Update trait list
                const category = tab.getAttribute('data-category');
                this.populateTraitList(traitListContainer, category, data, playerComponent);
            });
        });
        
        // Add navigation buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'evolution-buttons';
        
        // Return button
        const returnButton = document.createElement('button');
        returnButton.textContent = 'Return';
        returnButton.className = 'return-btn';
        returnButton.addEventListener('click', () => {
            this.showCompletionScreen();
        });
        buttonContainer.appendChild(returnButton);
        
        // Next level button
        const nextLevelButton = document.createElement('button');
        nextLevelButton.textContent = 'Next Level';
        nextLevelButton.className = 'next-level-btn';
        nextLevelButton.addEventListener('click', () => {
            this.startNextLevel(data);
        });
        buttonContainer.appendChild(nextLevelButton);
        
        modalContent.appendChild(buttonContainer);
        
        // Add close button
        const closeButton = document.createElement('span');
        closeButton.className = 'modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
            modalContainer.classList.add('hidden');
        });
        modalContent.appendChild(closeButton);
        
        // Show the modal
        modalContainer.classList.remove('hidden');
    }
    
    /**
     * Format a category name for display
     * @param {string} category - The trait category
     * @returns {string} The formatted category name
     */
    formatCategoryName(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
    
    /**
     * Populate the trait list for a category
     * @param {HTMLElement} container - The container to populate
     * @param {string} category - The trait category
     * @param {Object} data - Completion data
     * @param {PlayerComponent} playerComponent - The player component
     */
    populateTraitList(container, category, data, playerComponent) {
        // Clear the container
        container.innerHTML = '';
        
        // Get available traits in this category
        const evolutionSystem = new EvolutionSystem();
        const traits = evolutionSystem.getTraitsByCategory(category);
        
        // Get acquired traits
        const acquiredTraits = playerComponent.traits.map(trait => trait.id);
        
        // Create category description
        const categoryDesc = document.createElement('div');
        categoryDesc.className = 'category-description';
        categoryDesc.innerHTML = this.getCategoryDescription(category);
        container.appendChild(categoryDesc);
        
        // If no traits available
        if (!traits || traits.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-traits-message';
            emptyMessage.textContent = `No ${this.formatCategoryName(category)} traits available in this stage.`;
            container.appendChild(emptyMessage);
            return;
        }
        
        // Create trait cards
        traits.forEach(trait => {
            const traitCard = document.createElement('div');
            traitCard.className = `trait-card ${acquiredTraits.includes(trait.id) ? 'acquired' : ''}`;
            
            // Check if trait is unlockable with current points
            const isUnlockable = this.canUnlockTrait(trait, data, acquiredTraits);
            
            if (isUnlockable) {
                traitCard.classList.add('unlockable');
            } else if (!acquiredTraits.includes(trait.id)) {
                traitCard.classList.add('locked');
            }
            
            // Determine cost type (chaos, flow, order, or mixed)
            const costType = this.getTraitCostType(trait, data.gameStage);
            traitCard.classList.add(costType);
            
            traitCard.innerHTML = `
                <div class="trait-header">
                    <h3 class="trait-name">${trait.name}</h3>
                    <div class="trait-cost ${costType}">
                        ${this.formatTraitCost(trait.cost, costType)}
                    </div>
                </div>
                <div class="trait-description">${trait.description}</div>
                <div class="trait-status">
                    ${acquiredTraits.includes(trait.id) ? 
                        '<span class="status-acquired">Acquired</span>' : 
                        (isUnlockable ? 
                            '<button class="unlock-btn">Unlock</button>' : 
                            '<span class="status-locked">Locked</span>')}
                </div>
                ${trait.requirements ? `<div class="trait-requirements">Requires: ${trait.requirements}</div>` : ''}
            `;
            
            // Add click handler for unlockable traits
            if (isUnlockable) {
                const unlockBtn = traitCard.querySelector('.unlock-btn');
                if (unlockBtn) {
                    unlockBtn.addEventListener('click', () => {
                        this.unlockTrait(trait, data, playerComponent);
                        
                        // Update the trait card to show as acquired
                        traitCard.classList.remove('unlockable');
                        traitCard.classList.add('acquired');
                        traitCard.querySelector('.trait-status').innerHTML = '<span class="status-acquired">Acquired</span>';
                        
                        // Update points display
                        this.updateEvolutionScreenPoints(data, trait.cost, costType);
                    });
                }
            }
            
            container.appendChild(traitCard);
        });
    }
    
    /**
     * Unlock a trait for the player
     * @param {Object} trait - The trait to unlock
     * @param {Object} data - The player data
     * @param {PlayerComponent} playerComponent - The player component
     */
    unlockTrait(trait, data, playerComponent) {
        console.log(`Unlocking trait: ${trait.name}`, trait);
        
        if (!trait || !data || !playerComponent) {
            console.error("Cannot unlock trait - missing required parameters");
            return false;
        }
        
        // Add trait to acquired traits
        const evolutionSystem = this.getSystem('evolutionSystem');
        if (!evolutionSystem) {
            console.error("Evolution system not found. Cannot unlock trait.");
            return false;
        }
        
        // Check that player has enough points
        let hasSufficientPoints = true;
        let costType = this.getTraitCostType(trait, data.gameStage);
        
        // Handle both numeric and object cost structures
        let costObj = { chaos: 0, flow: 0, order: 0 };
        
        if (typeof trait.cost === 'number') {
            // Handle numeric cost based on cost type
            const numericCost = trait.cost;
            
            if (costType === 'chaos') {
                costObj.chaos = numericCost;
            } else if (costType === 'flow') {
                costObj.flow = numericCost;
            } else if (costType === 'order') {
                costObj.order = numericCost;
            } else if (costType === 'mixed') {
                // For mixed, distribute evenly
                const costPerType = Math.ceil(numericCost / 3);
                costObj.chaos = costPerType;
                costObj.flow = costPerType;
                costObj.order = costPerType;
            }
        } else if (typeof trait.cost === 'object' && trait.cost !== null) {
            // If it's already an object, use it directly
            costObj.chaos = !isNaN(trait.cost.chaos) ? trait.cost.chaos : 0;
            costObj.flow = !isNaN(trait.cost.flow) ? trait.cost.flow : 0;
            costObj.order = !isNaN(trait.cost.order) ? trait.cost.order : 0;
        } else {
            console.error("Invalid trait cost format:", trait.cost);
            return false;
        }
        
        // Check if player has enough of each point type
        if (costObj.chaos > data.chaosPoints) hasSufficientPoints = false;
        if (costObj.flow > data.flowPoints) hasSufficientPoints = false;
        if (costObj.order > data.orderPoints) hasSufficientPoints = false;
        
        if (!hasSufficientPoints) {
            console.error("Player doesn't have enough points to unlock trait:", trait.name);
            this.showFeedbackMessage("Not enough evolution points to unlock this trait!");
            return false;
        }
        
        // Apply trait to player
        evolutionSystem.acquireTrait(trait, playerComponent);
        
        // Deduct points from data object (used for UI)
        data.chaosPoints = Math.max(0, data.chaosPoints - costObj.chaos);
        data.flowPoints = Math.max(0, data.flowPoints - costObj.flow);
        data.orderPoints = Math.max(0, data.orderPoints - costObj.order);
        
        // IMPORTANT: Also deduct points from player component 
        // This ensures points are properly persisted
        playerComponent.chaosEvolutionPoints = Math.max(0, playerComponent.chaosEvolutionPoints - costObj.chaos);
        playerComponent.flowEvolutionPoints = Math.max(0, playerComponent.flowEvolutionPoints - costObj.flow);
        playerComponent.orderEvolutionPoints = Math.max(0, playerComponent.orderEvolutionPoints - costObj.order);
        playerComponent.evolutionPoints = playerComponent.chaosEvolutionPoints + 
                                         playerComponent.flowEvolutionPoints + 
                                         playerComponent.orderEvolutionPoints;
        
        // Also update the cached completion data if it exists
        if (this.currentCompletionData) {
            this.currentCompletionData.chaosPoints = data.chaosPoints;
            this.currentCompletionData.flowPoints = data.flowPoints;
            this.currentCompletionData.orderPoints = data.orderPoints;
            this.currentCompletionData.totalPoints = data.chaosPoints + data.flowPoints + data.orderPoints;
        }
        
        console.log(`Updated points after unlock: Chaos: ${data.chaosPoints}, Flow: ${data.flowPoints}, Order: ${data.orderPoints}`);
        console.log(`Player component points: Chaos: ${playerComponent.chaosEvolutionPoints}, Flow: ${playerComponent.flowEvolutionPoints}, Order: ${playerComponent.orderEvolutionPoints}`);
        
        // Show feedback
        this.showFeedbackMessage(`Unlocked trait: ${trait.name}!`, 'success', 3000, true);
        
        // Also add message to log
        this.addLogMessage(`You acquired the ${trait.name} trait!`);
        
        // Emit point change event to update all UI elements
        this.eventSystem.emit('playerEvolutionPointsChanged', {
            chaosPoints: playerComponent.chaosEvolutionPoints,
            flowPoints: playerComponent.flowEvolutionPoints,
            orderPoints: playerComponent.orderEvolutionPoints,
            totalPoints: playerComponent.evolutionPoints
        });
        
        // Return success
        return true;
    }
    
    /**
     * Update the evolution points display in the evolution screen
     * @param {Object} data - Player data
     * @param {Object} cost - Cost object with chaos, flow, order properties
     * @param {string} costType - Type of cost (chaos, flow, order, mixed)
     */
    updateEvolutionScreenPoints(data, cost, costType) {
        console.log(`Updating evolution screen points. Chaos: ${data.chaosPoints}, Flow: ${data.flowPoints}, Order: ${data.orderPoints}`);
        
        // Ensure we have valid non-NaN values
        data.chaosPoints = !isNaN(data.chaosPoints) ? data.chaosPoints : 0;
        data.flowPoints = !isNaN(data.flowPoints) ? data.flowPoints : 0;
        data.orderPoints = !isNaN(data.orderPoints) ? data.orderPoints : 0;
        
        // IMPORTANT: Update the cached completion data to persist points between screens
        if (this.currentCompletionData) {
            this.currentCompletionData.chaosPoints = data.chaosPoints;
            this.currentCompletionData.flowPoints = data.flowPoints;
            this.currentCompletionData.orderPoints = data.orderPoints;
            this.currentCompletionData.totalPoints = data.chaosPoints + data.flowPoints + data.orderPoints;
        }
        
        // IMPORTANT: Also ensure the player component has the same values
        // This ensures that when we transition between levels, the correct values are saved
        const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
        if (playerEntity) {
            const playerComponent = playerEntity.getComponent(PlayerComponent);
            if (playerComponent) {
                // Sync evolution points with the data object
                playerComponent.chaosEvolutionPoints = data.chaosPoints;
                playerComponent.flowEvolutionPoints = data.flowPoints;
                playerComponent.orderEvolutionPoints = data.orderPoints;
                playerComponent.evolutionPoints = data.chaosPoints + data.flowPoints + data.orderPoints;
                
                console.log(`Synchronized player component points - Chaos: ${playerComponent.chaosEvolutionPoints}, Flow: ${playerComponent.flowEvolutionPoints}, Order: ${playerComponent.orderEvolutionPoints}`);
            }
        }
        
        // Get the point display elements - make sure we're using correct selectors
        // First try the evolution-points-display class (modal display)
        let chaosPoints = document.querySelector('.evolution-points-display .chaos-points .point-value');
        let flowPoints = document.querySelector('.evolution-points-display .flow-points .point-value');
        let orderPoints = document.querySelector('.evolution-points-display .order-points .point-value');
        
        // Update the values if elements exist
        if (chaosPoints) chaosPoints.textContent = data.chaosPoints;
        if (flowPoints) flowPoints.textContent = data.flowPoints;
        if (orderPoints) orderPoints.textContent = data.orderPoints;
        
        // Also update points in the points-summary if it exists (for completion screen)
        chaosPoints = document.querySelector('.points-summary .value.chaos');
        flowPoints = document.querySelector('.points-summary .value.flow');
        orderPoints = document.querySelector('.points-summary .value.order');
        const totalPoints = document.querySelector('.points-summary .total .value');
        
        // Update completion screen values if they exist
        if (chaosPoints) chaosPoints.textContent = data.chaosPoints;
        if (flowPoints) flowPoints.textContent = data.flowPoints;
        if (orderPoints) orderPoints.textContent = data.orderPoints;
        if (totalPoints) totalPoints.textContent = data.chaosPoints + data.flowPoints + data.orderPoints;
        
        // Also check for point-type class format which might be used in some places
        chaosPoints = document.querySelector('.point-type.chaos .point-value');
        flowPoints = document.querySelector('.point-type.flow .point-value');
        orderPoints = document.querySelector('.point-type.order .point-value');
        
        // Update these too if they exist (could be alternate format)
        if (chaosPoints) chaosPoints.textContent = data.chaosPoints;
        if (flowPoints) flowPoints.textContent = data.flowPoints;
        if (orderPoints) orderPoints.textContent = data.orderPoints;
        
        // Also try the evolution-points-display directly, which is the format used in the evolution screen
        chaosPoints = document.querySelector('.evolution-points-display .point-type.chaos .point-value');
        flowPoints = document.querySelector('.evolution-points-display .point-type.flow .point-value');
        orderPoints = document.querySelector('.evolution-points-display .point-type.order .point-value');
        
        // Update these specific selectors as well
        if (chaosPoints) chaosPoints.textContent = data.chaosPoints;
        if (flowPoints) flowPoints.textContent = data.flowPoints;
        if (orderPoints) orderPoints.textContent = data.orderPoints;
        
        // Emit unified event for both evolution screen and game-info display updates
        this.eventSystem.emit('playerEvolutionPointsChanged', {
            chaosPoints: data.chaosPoints,
            flowPoints: data.flowPoints,
            orderPoints: data.orderPoints,
            totalPoints: data.chaosPoints + data.flowPoints + data.orderPoints
        });
        
        // Also refresh the trait list to update unlockable status for all traits
        // Get the current active category
        const activeTab = document.querySelector('.trait-tab.active');
        if (activeTab) {
            const category = activeTab.getAttribute('data-category');
            const container = document.querySelector('.trait-list-container');
            const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
            
            if (container && playerEntity && category) {
                const playerComponent = playerEntity.getComponent(PlayerComponent);
                if (playerComponent) {
                    // Refresh the trait list with updated data
                    this.populateTraitList(container, category, data, playerComponent);
                }
            }
        }
    }
    
    /**
     * Check if a trait can be unlocked with current points
     * @param {Object} trait - The trait to check
     * @param {Object} data - Completion data
     * @param {Array} acquiredTraits - Array of acquired trait IDs
     * @returns {boolean} Whether the trait can be unlocked
     */
    canUnlockTrait(trait, data, acquiredTraits) {
        // Check if already acquired
        if (acquiredTraits.includes(trait.id)) {
            return false;
        }
        
        // Check prerequisites
        if (trait.requires && !acquiredTraits.some(id => trait.requires.includes(id))) {
            return false;
        }
        
        // Calculate points needed
        const costType = this.getTraitCostType(trait, data.gameStage);
        
        // Handle both numeric and object cost structures
        let costObj = { chaos: 0, flow: 0, order: 0 };
        
        if (typeof trait.cost === 'number') {
            // Handle numeric cost based on cost type
            const numericCost = trait.cost;
            
            if (costType === 'chaos') {
                costObj.chaos = numericCost;
            } else if (costType === 'flow') {
                costObj.flow = numericCost;
            } else if (costType === 'order') {
                costObj.order = numericCost;
            } else if (costType === 'mixed') {
                // For mixed, distribute evenly
                const costPerType = Math.ceil(numericCost / 3);
                costObj.chaos = costPerType;
                costObj.flow = costPerType;
                costObj.order = costPerType;
            }
        } else if (typeof trait.cost === 'object' && trait.cost !== null) {
            // If it's already an object, use it directly
            costObj.chaos = !isNaN(trait.cost.chaos) ? trait.cost.chaos : 0;
            costObj.flow = !isNaN(trait.cost.flow) ? trait.cost.flow : 0;
            costObj.order = !isNaN(trait.cost.order) ? trait.cost.order : 0;
        } else {
            console.error("Invalid trait cost format:", trait.cost);
            return false;
        }
        
        // Check if player has enough of each point type
        if (costObj.chaos > data.chaosPoints) return false;
        if (costObj.flow > data.flowPoints) return false;
        if (costObj.order > data.orderPoints) return false;
        
        return true;
    }
    
    /**
     * Get the trait cost type based on game stage
     * @param {Object} trait - The trait
     * @param {string} gameStage - Current game stage
     * @returns {string} The cost type (chaos, flow, order, mixed)
     */
    getTraitCostType(trait, gameStage) {
        // If trait defines its own cost type, use that
        if (trait.costType) {
            return trait.costType;
        }
        
        // Otherwise, assign based on category and game stage
        const category = trait.category;
        
        if (gameStage === 'early') {
            // Early stage - mostly chaos traits with some flow, few order
            if (category === 'movement' || category === 'adaptation') {
                return 'chaos';
            } else if (category === 'sense') {
                return 'flow';
            } else if (category === 'manipulation') {
                return 'order';
            } else {
                return 'mixed';
            }
        } else if (gameStage === 'mid') {
            // Mid stage - more balanced
            if (category === 'movement') {
                return 'chaos';
            } else if (category === 'sense' || category === 'survival') {
                return 'flow';
            } else if (category === 'manipulation') {
                return 'order';
            } else {
                return 'mixed';
            }
        } else {
            // Late stage - more complex, mixed costs
            if (category === 'movement') {
                return 'chaos';
            } else if (category === 'sense') {
                return 'flow';
            } else if (category === 'manipulation') {
                return 'order';
            } else {
                return 'mixed';
            }
        }
    }
    
    /**
     * Format the trait cost for display
     * @param {number} cost - The trait cost
     * @param {string} costType - The cost type
     * @returns {string} HTML for displaying the cost
     */
    formatTraitCost(cost, costType) {
        if (costType === 'mixed') {
            const costPerType = Math.ceil(cost / 3);
            return `
                <span class="cost chaos-cost">${costPerType}</span>
                <span class="cost flow-cost">${costPerType}</span>
                <span class="cost order-cost">${costPerType}</span>
            `;
        } else {
            return `<span class="cost ${costType}-cost">${cost}</span>`;
        }
    }
    
    /**
     * Get a description for a trait category
     * @param {string} category - The trait category
     * @returns {string} The category description
     */
    getCategoryDescription(category) {
        switch (category) {
            case 'movement':
                return 'Movement traits enhance your mobility and ability to traverse the hex grid environment.';
            case 'sense':
                return 'Sensing traits improve your perception and ability to gather information about the environment.';
            case 'manipulation':
                return 'Manipulation traits enhance your ability to interact with and change the environment.';
            case 'adaptation':
                return 'Adaptation traits allow you to survive and thrive in challenging environments.';
            case 'survival':
                return 'Survival traits focus on resource management and efficiency.';
            default:
                return '';
        }
    }
    
    /**
     * Start the next level with proper progression
     * @param {Object} data - Completion data from previous level
     */
    startNextLevel(data) {
        console.log('Starting next level with data:', data);
        
        // Track current level number or initialize to 1
        let nextLevelNumber = (this.currentLevelNumber || 1) + 1;
        
        // Save player traits before clearing entities
        const playerData = this.savePlayerTraits();
        console.log(`Saved player data with ${playerData.traitIds.length} traits and ${playerData.evolutionPoints.total} evolution points`);
        
        // Hide the modal
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.classList.add('hidden');
        }
        
        // Hide the evolve button
        const evolveBtn = document.getElementById('evolve-btn');
        if (evolveBtn) {
            evolveBtn.classList.add('hidden');
        }
        
        // Calculate new balance for next level, passing level number
        const newBalance = this.calculateNextLevelBalance({
            ...data,
            levelNumber: nextLevelNumber
        });
        
        console.log(`Starting level ${nextLevelNumber} with balance: Chaos ${newBalance.chaos.toFixed(2)}, Order ${newBalance.order.toFixed(2)}`);
        
        // Determine grid size based on game stage
        let gridSize = this.config.defaultGridSize;
        if (data.gameStage === 'mid') {
            gridSize = 7; // Larger grid for mid game
        } else if (data.gameStage === 'late') {
            gridSize = 9; // Even larger grid for late game
        }
        
        // Ensure we clean up action panel completely before destroying the Game
        if (window.actionPanel) {
            console.log("Cleaning up action panel before level transition");
            window.actionPanel.destroy();
            window.actionPanel = null;
        }
        
        // Save metrics system data if needed
        const metricsData = this.metricsSystem ? this.metricsSystem.getData() : null;
        
        // Fully destroy the current game instance
        this.destroy();
        
        // Restart the game with new settings
        this.init(gridSize, gridSize, data.gameStage);
        
        // Update the current level number
        this.currentLevelNumber = nextLevelNumber;
        
        // Set the new balance on the grid
        if (this.grid) {
            this.grid.systemChaos = newBalance.chaos;
            this.grid.systemOrder = newBalance.order;
            // Emit the balance change event
            eventSystem.emitStandardized(
                EventTypes.SYSTEM_BALANCE_CHANGED.legacy,
                EventTypes.SYSTEM_BALANCE_CHANGED.standard,
                {
                    chaos: newBalance.chaos,
                    order: newBalance.order,
                    systemChaos: newBalance.chaos,
                    systemOrder: newBalance.order,
                    chaosDelta: 0
                }
            );
        }
        
        // Restore metrics data if needed
        if (metricsData && this.metricsSystem) {
            this.metricsSystem.setData(metricsData);
        }
        
        // Reset current level evolution points in the TurnSystem
        if (this.turnSystem) {
            this.turnSystem.resetCurrentLevelPoints();
        }
        
        // Use requestAnimationFrame to ensure player entity is fully initialized before restoring
        requestAnimationFrame(() => {
            // Verify player entity exists
            const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
            if (playerEntity) {
                console.log('Player entity found, restoring traits and evolution points');
                // Restore player traits and evolution points
                this.restorePlayerTraits(playerData);
                
                // Make sure the Evolve button is hidden at level start
                const evolveBtn = document.getElementById('evolve-btn');
                if (evolveBtn) {
                    evolveBtn.classList.add('hidden');
                }
                
                // Reset any action selection from previous level
                const playerComponent = playerEntity.getComponent(PlayerComponent);
                if (playerComponent) {
                    playerComponent.setAction(null);
                    
                    // Update UI to reflect no selected action
                    if (window.actionPanel) {
                        window.actionPanel.updateButtonStates();
                    }
                    
                    // Explicitly update UI with current player stats
                    // This ensures the UI is updated immediately after level transition
                    if (this.uiManager) {
                        this.uiManager.updateResourceDisplay('energy', {
                            energy: playerComponent.energy
                        });
                        
                        this.uiManager.updateResourceDisplay('movement', {
                            movementPoints: playerComponent.movementPoints
                        });
                    }
                }
            } else {
                console.error('Player entity not found when attempting to restore traits');
            }
        });
    }
    
    /**
     * Save player traits and evolution points before transitioning to a new level
     * @returns {Object} Object containing player traits and evolution points
     */
    savePlayerTraits() {
        const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
        if (!playerEntity) return { traitIds: [], evolutionPoints: {}, acquiredTraits: {} };
        
        const playerComponent = playerEntity.getComponent(PlayerComponent);
        if (!playerComponent) return { traitIds: [], evolutionPoints: {}, acquiredTraits: {} };
        
        // Get acquired traits from evolution system (using the property instead of creating new instance)
        const acquiredTraits = this.evolutionSystem.getAcquiredTraitsData();
        
        // Save trait IDs instead of full trait objects to avoid serialization issues with functions
        const traitIds = playerComponent.traits.map(trait => trait.id);
        
        console.log(`Saving ${traitIds.length} traits for level transition: ${traitIds.join(', ')}`);
        
        return {
            traitIds: traitIds,
            evolutionPoints: {
                chaos: playerComponent.chaosEvolutionPoints,
                flow: playerComponent.flowEvolutionPoints,
                order: playerComponent.orderEvolutionPoints,
                total: playerComponent.evolutionPoints
            },
            acquiredTraits: acquiredTraits
        };
    }
    
    /**
     * Restore player traits and evolution points after level transition
     * @param {Object} playerData - Player data from savePlayerTraits
     */
    restorePlayerTraits(playerData) {
        console.log(`Restoring player traits after level transition`);
        
        // Get player entity
        const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
        if (!playerEntity) {
            console.error("No player entity found when trying to restore traits");
            return;
        }
        
        // Get player component
        const playerComponent = playerEntity.getComponent(PlayerComponent);
        if (!playerComponent) {
            console.error("No player component found when trying to restore traits");
            return;
        }
        
        // Restore acquired traits data in evolution system (using the property)
        if (playerData.acquiredTraits) {
            this.evolutionSystem.setAcquiredTraitsData(playerData.acquiredTraits);
        }
        
        // Check and restore traits
        if (Array.isArray(playerData.traitIds) && playerData.traitIds.length > 0) {
            console.log(`Restoring ${playerData.traitIds.length} traits: ${playerData.traitIds.join(', ')}`);
            
            // Restore each trait
            for (const traitId of playerData.traitIds) {
                const trait = this.evolutionSystem.getTraitById(traitId);
                if (trait) {
                    playerComponent.addTrait(trait);
                } else {
                    console.warn(`Could not find trait with ID: ${traitId}`);
                }
            }
            
            // Apply all trait effects to ensure consistent state
            playerComponent.applyAllTraitEffects();
        } else {
            console.log('No traits to restore');
        }
        
        // Restore evolution points
        if (playerData.evolutionPoints) {
            playerComponent.chaosEvolutionPoints = playerData.evolutionPoints.chaos || 0;
            playerComponent.flowEvolutionPoints = playerData.evolutionPoints.flow || 0;
            playerComponent.orderEvolutionPoints = playerData.evolutionPoints.order || 0;
            playerComponent.evolutionPoints = playerData.evolutionPoints.total || 0;
            
            // Emit event to update UI
            this.eventSystem.emit('playerEvolutionPointsChanged', {
                chaosPoints: playerComponent.chaosEvolutionPoints,
                flowPoints: playerComponent.flowEvolutionPoints,
                orderPoints: playerComponent.orderEvolutionPoints,
                totalPoints: playerComponent.evolutionPoints
            });
            
            console.log(`Restored evolution points: ${playerComponent.evolutionPoints} total`);
        }
    }
    
    /**
     * Calculate balance for the next level based on player stats
     * @param {Object} data - Completion data
     * @returns {Object} New balance parameters
     */
    calculateNextLevelBalance(data) {
        // Get current game stage
        const currentStage = this.turnSystem?.gameStage || 'early';
        
        // Calculate point ratios
        const total = data.totalPoints || 1; // Avoid division by zero
        const chaosRatio = data.chaosPoints / total;
        const orderRatio = data.orderPoints / total;
        
        // Set progression based on game stage
        if (currentStage === 'early') {
            // Early game: Start with high chaos, gradually reduce toward balance
            // High chaos values (0.8 - 0.6) for primordial state
            if (data.levelNumber === undefined || data.levelNumber < 2) {
                // First level - high chaos (80/20)
                return {
                    chaos: 0.8,
                    order: 0.2
                };
            } else if (data.levelNumber < 4) {
                // Levels 2-3: Slightly less chaos (70/30)
                return {
                    chaos: 0.7,
                    order: 0.3
                };
            } else {
                // Levels 4+: Approaching balance (60/40)
                return {
                    chaos: 0.6, 
                    order: 0.4
                };
            }
        } else if (currentStage === 'mid') {
            // Mid game: Balance (50/50)
            return {
                chaos: 0.5,
                order: 0.5
            };
        } else if (currentStage === 'late') {
            // Late game: More order than chaos (30/70)
            return {
                chaos: 0.3,
                order: 0.7
            };
        } else {
            // Default case - use early game profile
            return {
                chaos: 0.8,
                order: 0.2
            };
        }
    }
    
    /**
     * Get a system by name
     * @param {string} systemName - Name of the system to get
     * @returns {Object|null} The system or null if not found
     */
    getSystem(systemName) {
        switch (systemName) {
            case 'evolutionSystem':
                return this.evolutionSystem;
                
            case 'metricsSystem':
                return this.metricsSystem;
                
            case 'turnSystem':
                return this.turnSystem;
                
            case 'grid':
                return this.grid;
                
            default:
                console.warn(`Unknown system requested: ${systemName}`);
                return null;
        }
    }
    
    /**
     * Create and initialize all game entities
     */
    createEntities() {
        console.log("Creating game entities");
        
        try {
            // Create player entity first (at the center)
            this.createPlayer();
            
            // Create and initialize UI Manager if it doesn't exist
            if (!this.uiManager) {
                console.log("Creating UIManager");
                this.uiManager = new UIManager();
            }
            
            // Initialize UI with fresh system references
            if (this.uiManager) {
                console.log("Initializing UIManager with grid and turnSystem references");
                this.uiManager.init({
                    grid: this.grid,
                    turnSystem: this.turnSystem
                });
            } else {
                console.warn("UIManager not available, skipping UI initialization");
            }
            
            console.log("Entities created successfully");
            return true;
        } catch (error) {
            console.error("Failed to create entities:", error);
            return false;
        }
    }
} 