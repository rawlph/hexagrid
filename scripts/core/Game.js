/**
 * Main game controller for Hexgrid Evolution
 * Integrates all systems and manages the game lifecycle
 */
import { MetricsSystem } from '../systems/MetricsSystem.js';
import { UIManager } from '../ui/UIManager.js';

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
        
        // Game state
        this.isInitialized = false;
        
        // Bind methods
        this.update = this.update.bind(this);
        this.handleTileClick = this.handleTileClick.bind(this);
        this.endTurn = this.endTurn.bind(this);
    }
    
    /**
     * Initialize the game
     * @param {number} rows - Number of rows in the grid
     * @param {number} cols - Number of columns in the grid
     * @param {string} gameStage - Current game stage (early, mid, late)
     * @returns {boolean} - Whether initialization was successful
     */
    init(rows = this.config.defaultGridSize, cols = this.config.defaultGridSize, gameStage = this.config.defaultGameStage) {
        console.log(`Initializing game with grid size ${rows}x${cols}, stage: ${gameStage}`);
        
        try {
            // Check critical dependencies before proceeding
            if (!this.entityManager || !this.eventSystem) {
                throw new Error('Cannot initialize game: missing critical dependencies');
            }
            
            // Clear existing entities
            this.entityManager.clear();
            
            // Clear event system
            this.eventSystem.clear();
            
            // Create core systems
            if (!window.Grid || !window.TurnSystem) {
                throw new Error('Grid or TurnSystem classes not found');
            }
            
            this.grid = new Grid(rows, cols, gameStage);
            this.turnSystem = new TurnSystem(gameStage);
            
            // Set the grid on the turn system
            if (this.turnSystem && this.turnSystem.setGrid) {
                this.turnSystem.setGrid(this.grid);
            }
            
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
            
            // Initialize grid and create entities
            if (this.grid && typeof this.grid.initializeGrid === 'function') {
                this.grid.initializeGrid();
            } else {
                throw new Error('Grid initialization failed: grid object invalid');
            }
            
            // Create player entity
            this.createPlayer();
            
            // Initialize systems
            if (this.turnSystem && typeof this.turnSystem.init === 'function') {
                this.turnSystem.init();
            } else {
                throw new Error('TurnSystem initialization failed: turnSystem object invalid');
            }
            
            // Initialize UI Manager
            this.uiManager = new UIManager();
            if (this.uiManager && typeof this.uiManager.init === 'function') {
                this.uiManager.init();
            } else {
                console.warn('UIManager initialization failed');
            }
            
            // Initialize all entities
            this.entityManager.initEntities();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Update UI with initial values
            this.updateUI();
            
            // Start game loop
            this.startGameLoop();
            
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
        // Listen for tile clicks
        this.eventSystem.on('tileClicked', this.handleTileClick, this);
        
        // Listen for turn end action - Fix the end turn button
        const endTurnBtn = document.getElementById('end-turn-btn');
        if (endTurnBtn) {
            console.log("Setting up end turn button listener");
            
            // Remove any existing listeners by cloning the button
            const newEndTurnBtn = endTurnBtn.cloneNode(true);
            endTurnBtn.parentNode.replaceChild(newEndTurnBtn, endTurnBtn);
            
            // Add the listener - use a simple function that calls our endTurn method
            newEndTurnBtn.addEventListener('click', () => {
                console.log('End turn button clicked');
                this.endTurn();
            });
        } else {
            console.warn("End turn button not found");
        }
        
        // Listen for energy changes
        this.eventSystem.on('playerEnergyChanged', this.updateEnergyDisplay.bind(this));
        
        // Listen for turn changes
        this.eventSystem.on('turnStart', this.updateTurnDisplay.bind(this));
        
        // Listen for system balance changes
        this.eventSystem.on('systemBalanceChanged', this.updateBalanceDisplay.bind(this));
        
        // Listen for evolution points changes
        this.eventSystem.on('playerEvolutionPointsChanged', this.updateEvolutionPointsDisplay.bind(this));
        
        // Listen for evolution points awards
        this.eventSystem.on('evolutionPointsAwarded', this.showEvolutionPointsMessage.bind(this));
        
        // Listen for evolution ready state
        this.eventSystem.on('evolutionReady', this.handleEvolutionReady.bind(this));
        
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
        
        // Fallback setup only if ActionPanel is not available
        if (!window.actionPanel) {
            console.warn("ActionPanel not available, using fallback button setup");
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
     */
    endTurn() {
        console.log('End turn method called');
        
        // Clear any active action
        this.setPlayerAction(null);
        
        // End the turn in the turn system
        if (this.turnSystem) {
            this.turnSystem.endTurn();
        } else {
            console.error("Turn system is null");
        }
    }
    
    /**
     * Update UI with initial values
     */
    updateUI() {
        // Update energy display
        const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
        if (playerEntity) {
            const playerComponent = playerEntity.getComponent(PlayerComponent);
            if (playerComponent) {
                this.updateEnergyDisplay({
                    player: playerComponent,
                    newEnergy: playerComponent.energy
                });
                
                // Update evolution points display
                this.updateEvolutionPointsDisplay({
                    player: playerComponent,
                    chaosPoints: playerComponent.chaosEvolutionPoints,
                    flowPoints: playerComponent.flowEvolutionPoints,
                    orderPoints: playerComponent.orderEvolutionPoints
                });
            }
        }
        
        // Update turn display
        this.updateTurnDisplay({
            turnCount: this.turnSystem.turnCount
        });
        
        // Update balance display
        const balance = this.grid.getSystemBalance();
        this.updateBalanceDisplay({
            systemChaos: balance.chaos,
            systemOrder: balance.order
        });
    }
    
    /**
     * Update energy display
     * @param {Object} data - Event data
     */
    updateEnergyDisplay(data) {
        const energyValue = document.querySelector('#energy-display .value');
        if (energyValue) {
            energyValue.textContent = data.newEnergy;
        }
    }
    
    /**
     * Update turn display
     * @param {Object} data - Event data
     */
    updateTurnDisplay(data) {
        const turnValue = document.querySelector('#turn-display .value');
        if (turnValue) {
            turnValue.textContent = data.turnCount;
        }
    }
    
    /**
     * Update balance display
     * @param {Object} data - Event data
     */
    updateBalanceDisplay(data) {
        const chaosPercent = Math.round(data.systemChaos * 100);
        const orderPercent = Math.round(data.systemOrder * 100);
        
        // Update chaos/order value text
        const chaosValue = document.querySelector('.chaos-value');
        if (chaosValue) {
            chaosValue.textContent = chaosPercent;
        }
        
        const orderValue = document.querySelector('.order-value');
        if (orderValue) {
            orderValue.textContent = orderPercent;
        }
        
        // Update visual balance bar
        const chaosFill = document.querySelector('.balance-chaos-fill');
        if (chaosFill) {
            chaosFill.style.width = `${chaosPercent}%`;
        }
        
        // Update balance marker position (perfect balance at 50%)
        const balanceMarker = document.querySelector('.balance-marker');
        if (balanceMarker) {
            // Position marker based on chaos percentage
            balanceMarker.style.left = `${chaosPercent}%`;
            
            // Color the marker based on how far from perfect balance
            const balanceDeviation = Math.abs(chaosPercent - 50);
            if (balanceDeviation < 5) {
                // Near perfect balance - green
                balanceMarker.style.backgroundColor = 'rgba(100, 255, 100, 0.9)';
            } else if (balanceDeviation < 20) {
                // Moderate imbalance - yellow
                balanceMarker.style.backgroundColor = 'rgba(255, 255, 100, 0.9)';
            } else {
                // Severe imbalance - white
                balanceMarker.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            }
        }
    }
    
    /**
     * Update evolution points display
     * @param {Object} data - Event data
     */
    updateEvolutionPointsDisplay(data) {
        // Update chaos points
        const chaosPoints = document.querySelector('#evolution-points-display .chaos-points');
        if (chaosPoints) {
            chaosPoints.textContent = data.chaosPoints || 0;
        }
        
        // Update flow points
        const flowPoints = document.querySelector('#evolution-points-display .flow-points');
        if (flowPoints) {
            flowPoints.textContent = data.flowPoints || 0;
        }
        
        // Update order points
        const orderPoints = document.querySelector('#evolution-points-display .order-points');
        if (orderPoints) {
            orderPoints.textContent = data.orderPoints || 0;
        }
    }
    
    /**
     * Show a message about evolution points being awarded
     * @param {Object} data - Event data
     */
    showEvolutionPointsMessage(data) {
        const { pointsAwarded } = data;
        let message = `<span style="color: #e0e0e0;">Evolution points earned:</span> `;
        
        // Add chaos points to message if any were awarded
        if (pointsAwarded.chaos > 0) {
            message += `<span style="color: var(--chaos-color);">${pointsAwarded.chaos} Chaos</span> `;
        }
        
        // Add flow points to message if any were awarded
        if (pointsAwarded.flow > 0) {
            message += `<span style="color: #64dfdf;">${pointsAwarded.flow} Flow</span> `;
        }
        
        // Add order points to message if any were awarded
        if (pointsAwarded.order > 0) {
            message += `<span style="color: var(--order-color);">${pointsAwarded.order} Order</span>`;
        }
        
        // Display message
        this.showFeedbackMessage(message, 'evolution-points', 3000);
    }
    
    /**
     * Show a feedback message to the player
     * @param {string} message - Message to display
     * @param {string} type - Type of message (success, error, evolution-points)
     * @param {number} duration - How long to show message in ms
     */
    showFeedbackMessage(message, type = '', duration = 2000) {
        const feedbackElement = document.getElementById('feedback-message');
        if (!feedbackElement) return;
        
        // Set message content (supports HTML)
        feedbackElement.innerHTML = message;
        
        // Add styling based on type
        feedbackElement.className = 'visible';
        if (type) {
            feedbackElement.classList.add(type);
        }
        
        // Show message
        clearTimeout(this._feedbackTimeout);
        
        // Hide after duration
        this._feedbackTimeout = setTimeout(() => {
            feedbackElement.className = '';
        }, duration);
    }
    
    /**
     * Show feedback message
     * @param {string} message - Message to show
     */
    showFeedback(message) {
        const feedbackEl = document.getElementById('feedback-message');
        if (!feedbackEl) {
            console.error("Feedback element not found");
            return;
        }
        
        // Clear any existing content
        feedbackEl.textContent = '';
        
        // Add new message
        feedbackEl.textContent = message;
        
        // Make visible
        feedbackEl.classList.add('visible');
        
        // Add message to log
        this.addLogMessage(message);
        
        // Hide after delay
        clearTimeout(this.feedbackTimeout);
        this.feedbackTimeout = setTimeout(() => {
            feedbackEl.classList.remove('visible');
        }, 2000);
    }
    
    /**
     * Add message to the game log
     * @param {string} message - Message to add
     */
    addLogMessage(message) {
        const messageContainer = document.getElementById('message-container');
        if (!messageContainer) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        
        const messageText = document.createElement('span');
        messageText.className = 'message-text';
        messageText.textContent = message;
        
        messageEl.appendChild(timestamp);
        messageEl.appendChild(messageText);
        messageContainer.appendChild(messageEl);
        
        // Scroll to bottom
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }
    
    /**
     * Set the current player action
     * @param {string} action - Action to set
     */
    setPlayerAction(action) {
        console.log(`setPlayerAction called with ${action}`);
        
        // Get the current action
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
        
        const currentAction = playerComponent.currentAction;
        console.log(`Current action: ${currentAction}, New action: ${action}`);
        
        // Clear active class from all buttons FIRST
        const buttons = document.querySelectorAll('.action-btn');
        buttons.forEach(btn => {
            if (!btn.id.includes('end-turn')) {
                btn.classList.remove('active');
            }
        });
        
        // Don't toggle off actions - always set the new action
        // Set active class on the clicked button
        if (action) {
            const button = document.getElementById(`${action}-btn`);
            if (button) {
                button.classList.add('active');
            }
        }
        
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
            // Ensure Entity class is available
            if (!window.Entity || !window.PlayerComponent) {
                throw new Error('Entity or PlayerComponent classes not found');
            }
            
            // Create player entity at top-left corner
            const playerEntity = new Entity();
            
            // Add player component
            const playerComponent = playerEntity.addComponent(PlayerComponent, 0, 0);
            if (!playerComponent) {
                throw new Error('Failed to add PlayerComponent to player entity');
            }
            
            // Add tag for easy querying
            playerEntity.addTag('player');
            
            // Add to entity manager
            this.entityManager.addEntity(playerEntity);
            
            // Initialize player
            if (typeof playerComponent.init === 'function') {
                playerComponent.init();
            } else {
                console.warn('Player component has no init method');
            }
            
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
            
            // Check if we can delegate to ActionPanel (preferred way to avoid duplication)
            if (window.actionPanel && typeof window.actionPanel.handleTileClick === 'function') {
                // Let ActionPanel handle the tile click to avoid duplicate logic
                console.log("Delegating tile click to ActionPanel");
                // The actionPanel already has its own event handler, so we don't need to do anything
                return;
            }
            
            // If ActionPanel is not available, fall back to direct handling
            // This is a fallback to ensure the game still works if UIManager/ActionPanel isn't available
            
            // Get tile component
            if (!tileEntity) {
                console.warn("No tile entity found");
                return;
            }
            
            const tileComponent = tileEntity.getComponent(TileComponent);
            if (!tileComponent) {
                console.warn("No tile component found");
                return;
            }
            
            console.log(`Attempting ${playerComponent.currentAction} action on tile (${row}, ${col})`);
            
            // Continue with the rest of the method...
            // Additional implementation would go here
        } catch (error) {
            console.error("Error handling tile click:", error);
        }
    }
    
    /**
     * Restart the game
     */
    restart() {
        console.log('Restarting game');
        
        // Hide the evolve button
        const evolveBtn = document.getElementById('evolve-btn');
        if (evolveBtn) {
            evolveBtn.classList.add('hidden');
        }
        
        // New game should reset all progress, so we don't save player traits
        
        // Clean up resources
        this.destroy();
        
        // Re-initialize the game
        this.init();
        
        // Reset evolution system when starting a completely new game
        const evolutionSystem = new EvolutionSystem();
        evolutionSystem.reset(false); // Don't keep traits
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        this.eventSystem.off('tileClicked', this.handleTileClick, this);
        
        // Clean up UI Manager
        if (this.uiManager) {
            this.uiManager.destroy();
            this.uiManager = null;
        }
        
        // Clean up systems in reverse order
        if (this.turnSystem) {
            this.turnSystem.destroy();
            this.turnSystem = null;
        }
        
        if (this.grid) {
            this.grid.destroy();
            this.grid = null;
        }
        
        // Mark as not initialized
        this.isInitialized = false;
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
                `<span style="color: #64dfdf;">Evolution available!</span> You have gathered enough points to evolve.`, 
                'success', 
                4000
            );
            
            // Add message to log
            this.addLogMessage('You have gathered enough evolution points to evolve!');
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
        
        // Get metrics for the current level
        const metricsSystem = new MetricsSystem();
        const currentMetrics = metricsSystem.getMetrics();
        
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
        if (!playerEntity) return;
        
        const playerComponent = playerEntity.getComponent(PlayerComponent);
        if (!playerComponent) return;
        
        // Get evolution system
        const evolutionSystem = new EvolutionSystem();
        
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
                        this.updateEvolutionPointsDisplay(data, trait.cost, costType);
                    });
                }
            }
            
            container.appendChild(traitCard);
        });
    }
    
    /**
     * Unlock a trait for the player
     * @param {Object} trait - The trait to unlock
     * @param {Object} data - Completion data
     * @param {PlayerComponent} playerComponent - The player component
     */
    unlockTrait(trait, data, playerComponent) {
        // Apply trait to player
        playerComponent.addTrait(trait);
        
        // Deduct points based on cost type
        const costType = this.getTraitCostType(trait, data.gameStage);
        
        if (costType === 'chaos') {
            data.chaosPoints -= trait.cost;
            playerComponent.chaosEvolutionPoints -= trait.cost;
        } else if (costType === 'flow') {
            data.flowPoints -= trait.cost;
            playerComponent.flowEvolutionPoints -= trait.cost;
        } else if (costType === 'order') {
            data.orderPoints -= trait.cost;
            playerComponent.orderEvolutionPoints -= trait.cost;
        } else if (costType === 'mixed') {
            // For mixed, deduct evenly from all types
            const costPerType = Math.ceil(trait.cost / 3);
            data.chaosPoints = Math.max(0, data.chaosPoints - costPerType);
            data.flowPoints = Math.max(0, data.flowPoints - costPerType);
            data.orderPoints = Math.max(0, data.orderPoints - costPerType);
            
            playerComponent.chaosEvolutionPoints = Math.max(0, playerComponent.chaosEvolutionPoints - costPerType);
            playerComponent.flowEvolutionPoints = Math.max(0, playerComponent.flowEvolutionPoints - costPerType);
            playerComponent.orderEvolutionPoints = Math.max(0, playerComponent.orderEvolutionPoints - costPerType);
        }
        
        // Update the legacy total evolution points for compatibility
        playerComponent.evolutionPoints = playerComponent.chaosEvolutionPoints + 
                                         playerComponent.flowEvolutionPoints + 
                                         playerComponent.orderEvolutionPoints;
        
        // Emit an event to notify other systems
        this.eventSystem.emit('playerEvolutionPointsChanged', {
            player: playerComponent,
            chaosPoints: playerComponent.chaosEvolutionPoints,
            flowPoints: playerComponent.flowEvolutionPoints,
            orderPoints: playerComponent.orderEvolutionPoints,
            totalPoints: playerComponent.evolutionPoints
        });
        
        // Show a feedback message
        this.showFeedbackMessage(
            `<span style="color: #64dfdf;">Trait Acquired:</span> ${trait.name}`, 
            'success', 
            3000
        );
        
        // Add message to log
        this.addLogMessage(`You acquired the ${trait.name} trait!`);
    }
    
    /**
     * Update the evolution points display after unlocking a trait
     * @param {Object} data - Completion data
     * @param {number} cost - The cost of the trait
     * @param {string} costType - The type of cost (chaos, flow, order, mixed)
     */
    updateEvolutionPointsDisplay(data, cost, costType) {
        // Update the evolution screen display
        const chaosValueElement = document.querySelector('.point-type.chaos .point-value');
        const flowValueElement = document.querySelector('.point-type.flow .point-value');
        const orderValueElement = document.querySelector('.point-type.order .point-value');
        
        if (chaosValueElement) chaosValueElement.textContent = data.chaosPoints;
        if (flowValueElement) flowValueElement.textContent = data.flowPoints;
        if (orderValueElement) orderValueElement.textContent = data.orderPoints;
        
        // Also update the game-info display
        const chaosPoints = document.querySelector('#evolution-points-display .chaos-points');
        const flowPoints = document.querySelector('#evolution-points-display .flow-points');
        const orderPoints = document.querySelector('#evolution-points-display .order-points');
        
        if (chaosPoints) chaosPoints.textContent = data.chaosPoints;
        if (flowPoints) flowPoints.textContent = data.flowPoints;
        if (orderPoints) orderPoints.textContent = data.orderPoints;
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
        
        if (costType === 'chaos') {
            return data.chaosPoints >= trait.cost;
        } else if (costType === 'flow') {
            return data.flowPoints >= trait.cost;
        } else if (costType === 'order') {
            return data.orderPoints >= trait.cost;
        } else if (costType === 'mixed') {
            // For mixed, need 1/3 of cost in each type
            const costPerType = Math.ceil(trait.cost / 3);
            return data.chaosPoints >= costPerType && 
                   data.flowPoints >= costPerType && 
                   data.orderPoints >= costPerType;
        }
        
        return false;
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
     * Start the next level
     * @param {Object} data - Completion data
     */
    startNextLevel(data) {
        console.log('Starting next level');
        
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
        
        // Calculate new balance based on player's style
        let newBalance = this.calculateNextLevelBalance(data);
        
        // Determine grid size based on game stage
        let gridSize = this.config.defaultGridSize;
        if (data.gameStage === 'mid') {
            gridSize = 7; // Larger grid for mid game
        } else if (data.gameStage === 'late') {
            gridSize = 9; // Even larger grid for late game
        }
        
        // Restart the game with new settings
        this.init(gridSize, gridSize, data.gameStage);
        
        // Use requestAnimationFrame to ensure player entity is fully initialized before restoring
        requestAnimationFrame(() => {
            // Verify player entity exists
            const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
            if (playerEntity) {
                console.log('Player entity found, restoring traits and evolution points');
                // Restore player traits and evolution points
                this.restorePlayerTraits(playerData);
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
        
        // Get acquired traits from evolution system
        const evolutionSystem = new EvolutionSystem();
        const acquiredTraits = evolutionSystem.getAcquiredTraitsData();
        
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
     * Restore player traits and evolution points after transitioning to a new level
     * @param {Object} playerData - Object containing player traits and evolution points
     */
    restorePlayerTraits(playerData) {
        if (!playerData) return;
        
        const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
        if (!playerEntity) return;
        
        const playerComponent = playerEntity.getComponent(PlayerComponent);
        if (!playerComponent) return;
        
        // Initialize the evolution system
        const evolutionSystem = new EvolutionSystem();
        
        // Restore acquired traits in evolution system
        if (playerData.acquiredTraits) {
            evolutionSystem.setAcquiredTraitsData(playerData.acquiredTraits);
        }
        
        // Restore traits by getting them fresh from the EvolutionSystem using their IDs
        const traitIds = playerData.traitIds || [];
        console.log(`Restoring ${traitIds.length} traits: ${traitIds.join(', ')}`);
        
        // Clear the player's traits array to avoid duplicates
        playerComponent.traits = [];
        
        // Add each trait using its ID
        for (const traitId of traitIds) {
            const trait = evolutionSystem.getTraitById(traitId);
            if (trait) {
                // Add the trait without triggering the onAcquire effect yet
                playerComponent.addTraitWithoutEffect(trait);
            } else {
                console.warn(`Could not find trait with ID: ${traitId}`);
            }
        }
        
        // Now apply all trait effects at once
        playerComponent.applyAllTraitEffects();
        
        // Restore evolution points
        if (playerData.evolutionPoints) {
            playerComponent.chaosEvolutionPoints = playerData.evolutionPoints.chaos || 0;
            playerComponent.flowEvolutionPoints = playerData.evolutionPoints.flow || 0;
            playerComponent.orderEvolutionPoints = playerData.evolutionPoints.order || 0;
            playerComponent.evolutionPoints = playerData.evolutionPoints.total || 0;
            
            // Update UI with restored evolution points
            this.updateEvolutionPointsDisplay({
                chaosPoints: playerComponent.chaosEvolutionPoints,
                flowPoints: playerComponent.flowEvolutionPoints,
                orderPoints: playerComponent.orderEvolutionPoints
            });
            
            // Emit event to notify other systems
            this.eventSystem.emit('playerEvolutionPointsChanged', {
                player: playerComponent,
                chaosPoints: playerComponent.chaosEvolutionPoints,
                flowPoints: playerComponent.flowEvolutionPoints,
                orderPoints: playerComponent.orderEvolutionPoints,
                totalPoints: playerComponent.evolutionPoints
            });
        }
        
        console.log(`Restored ${traitIds.length} traits and evolution points from previous level`);
    }
    
    /**
     * Calculate balance for the next level based on player stats
     * @param {Object} data - Completion data
     * @returns {Object} New balance parameters
     */
    calculateNextLevelBalance(data) {
        // Calculate point ratios
        const total = data.totalPoints || 1; // Avoid division by zero
        const chaosRatio = data.chaosPoints / total;
        const orderRatio = data.orderPoints / total;
        
        // Determine if player tends toward chaos or order
        if (chaosRatio > 0.6) {
            // Player favors chaos - make world slightly more ordered
            return {
                chaos: 0.45,
                order: 0.55
            };
        } else if (orderRatio > 0.6) {
            // Player favors order - make world slightly more chaotic
            return {
                chaos: 0.55,
                order: 0.45
            };
        } else {
            // Player is balanced - keep world near balanced
            return {
                chaos: 0.5,
                order: 0.5
            };
        }
    }
} 