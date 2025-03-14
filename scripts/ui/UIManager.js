/**
 * Manages the game's user interface components
 */
import { MetricsSystem } from '../systems/MetricsSystem.js';
import { ActionPanel } from './ActionPanel.js';
import { MessageSystem } from './MessageSystem.js';
import { eventSystem } from '../core/EventSystem.js';
import { EventTypes } from '../core/EventTypes.js';

export class UIManager {
    constructor() {
        // UI elements - using standardized resource-value class
        this.energyDisplay = document.querySelector('#energy-display .resource-value');
        this.movementDisplay = document.querySelector('#movement-display .resource-value');
        this.turnDisplay = document.querySelector('#turn-display .resource-value');
        
        // Balance display elements - use specific selectors from the balance display
        this.balanceChaosDisplay = document.querySelector('#balance-display .chaos-resource-value');
        this.balanceOrderDisplay = document.querySelector('#balance-display .order-resource-value');
        
        // Evolution points display elements - use specific selectors from the evolution points display
        this.evolutionChaosDisplay = document.querySelector('#evolution-points-display .chaos-resource-value');
        this.evolutionFlowDisplay = document.querySelector('#evolution-points-display .flow-resource-value');
        this.evolutionOrderDisplay = document.querySelector('#evolution-points-display .order-resource-value');
        
        // UI controls
        this.gridSizeSelect = document.getElementById('grid-size');
        this.newGameButton = document.getElementById('new-game-btn');
        this.settingsButton = document.getElementById('settings-btn');
        this.statsButton = document.getElementById('stats-btn');
        this.modal = document.getElementById('modal');
        this.modalContent = document.getElementById('modal-content');
        this.closeModal = document.querySelector('.close-modal');
        
        // UI sub-systems
        this.messageSystem = new MessageSystem();
        this.actionPanel = new ActionPanel();
        
        // Make actionPanel available globally for delegation from Game
        window.actionPanel = this.actionPanel;
        
        // Click handlers
        this.clickHandlers = {};
        
        // Event listeners
        this._registeredEvents = [];
        
        // Debug mode
        this.debugMode = false;
    }
    
    /**
     * Initialize the UI manager
     * @param {Object} options - Options for initialization
     * @param {Object} options.grid - Grid system to use
     * @param {Object} options.turnSystem - Turn system to use
     */
    init(options = {}) {
        console.log("Initializing UI manager");
        
        // Initialize message system
        this.messageSystem.init();
        
        // Store grid and turn system references
        this.grid = options.grid || (window.game ? window.game.grid : null);
        this.turnSystem = options.turnSystem || (window.game ? window.game.turnSystem : null);
        
        if (!this.grid || !this.turnSystem) {
            console.warn("UIManager initialized without grid or turn system");
        }
        
        // Set up button listeners
        this.setupButtonListeners();
        
        // Register event listeners
        this.registerEventListeners();
        
        // Initialize action panel with dependencies - AFTER everything else is set up
        // This ensures proper order of initialization
        setTimeout(() => {
            this.actionPanel.init(this.messageSystem, {
                grid: this.grid,
                turnSystem: this.turnSystem
            });
            
            // Make sure the global reference is updated
            window.actionPanel = this.actionPanel;
            
            console.log("ActionPanel initialized in UIManager");
            
            // Emit event to notify systems that ActionPanel is ready
            eventSystem.emitStandardized(
                EventTypes.ACTION_PANEL_READY.legacy,
                EventTypes.ACTION_PANEL_READY.standard,
                {
                    actionPanel: this.actionPanel,
                    isStandardized: true
                }
            );
        }, 0);
        
        return true;
    }
    
    /**
     * Set up button click listeners
     */
    setupButtonListeners() {
        // New Game button
        if (this.newGameButton) {
            this.clickHandlers.newGame = () => this.handleNewGameClick();
            this.newGameButton.addEventListener('click', this.clickHandlers.newGame);
        }
        
        // Settings button
        if (this.settingsButton) {
            this.clickHandlers.settings = () => this.handleSettingsClick();
            this.settingsButton.addEventListener('click', this.clickHandlers.settings);
        }
        
        // Stats button
        if (this.statsButton) {
            this.clickHandlers.stats = () => this.handleStatsClick();
            this.statsButton.addEventListener('click', this.clickHandlers.stats);
        }
        
        // Modal close button
        if (this.closeModal) {
            this.clickHandlers.closeModal = () => this.closeModalDialog();
            this.closeModal.addEventListener('click', this.clickHandlers.closeModal);
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.closeModalDialog();
            }
        });
    }
    
    /**
     * Register game event listeners
     */
    registerEventListeners() {
        // Use standardized event names for all listeners
        // Only register for legacy events that don't have standardized equivalents
        
        // Player resource changes
        this._registeredEvents.push(
            eventSystem.on(EventTypes.PLAYER_ENERGY_CHANGED.standard, 
                data => this.updateResourceDisplay('energy', data))
        );
        
        this._registeredEvents.push(
            eventSystem.on(EventTypes.PLAYER_MOVEMENT_POINTS_CHANGED.standard, 
                data => this.updateResourceDisplay('movement', data))
        );
        
        // Add listener for player stats updates to ensure UI stays in sync
        this._registeredEvents.push(
            eventSystem.on('player:stats:updated', 
                data => {
                    if (this.debugMode) {
                        console.log('Received player:stats:updated event:', data);
                    }
                    // Update all player resources at once
                    this.updateResourceDisplay('energy', data);
                    this.updateResourceDisplay('movement', data);
                    
                    // Also update evolution points from stats updates
                    if (data.evolutionPoints) {
                        this.updateEvolutionPointsDisplay(data);
                    }
                })
        );
        
        // Turn system events
        this._registeredEvents.push(
            eventSystem.on(EventTypes.TURN_START.standard, this.updateTurnDisplay.bind(this))
        );
        
        // System balance events
        this._registeredEvents.push(
            eventSystem.on(EventTypes.SYSTEM_BALANCE_CHANGED.standard, this.updateBalanceDisplay.bind(this))
        );
        
        // Evolution points events - updated to use standardized event
        this._registeredEvents.push(
            eventSystem.on(EventTypes.PLAYER_EVOLUTION_POINTS_CHANGED.standard, this.updateEvolutionPointsDisplay.bind(this))
        );
        
        // Game state events
        this._registeredEvents.push(
            eventSystem.on(EventTypes.GAME_VICTORY.standard, this.showVictoryScreen.bind(this))
        );
        
        this._registeredEvents.push(
            eventSystem.on(EventTypes.GAME_OVER.standard, this.showGameOverScreen.bind(this))
        );
    }
    
    /**
     * Get the correct display element for a resource type
     * @param {string} resourceType - Type of resource (energy, movement, etc.)
     * @returns {HTMLElement} The display element for that resource
     */
    getResourceDisplayElement(resourceType) {
        switch(resourceType) {
            case 'energy':
                return this.energyDisplay;
            case 'movement':
                return this.movementDisplay;
            case 'turn':
                return this.turnDisplay;
            case 'balanceChaos':
                return this.balanceChaosDisplay;
            case 'balanceOrder':
                return this.balanceOrderDisplay;
            case 'evolutionChaos':
                return this.evolutionChaosDisplay;
            case 'evolutionFlow':
                return this.evolutionFlowDisplay;
            case 'evolutionOrder':
                return this.evolutionOrderDisplay;
            default:
                console.warn(`Unknown resource type: ${resourceType}`);
                return null;
        }
    }
    
    /**
     * Extract the appropriate value from event data based on resource type
     * @param {string} resourceType - Type of resource
     * @param {object} data - Event data
     * @returns {*} The resource value
     */
    getResourceValue(resourceType, data) {
        if (!data) return 0;
        
        switch(resourceType) {
            case 'energy':
                // Check for different property structures in events
                if (data.energy !== undefined) return data.energy;
                if (data.newValue !== undefined) return data.newValue;
                if (data.player && data.player.energy !== undefined) return data.player.energy;
                if (data.stats && data.stats.energy !== undefined) return data.stats.energy;
                console.log('Energy event data structure:', data);
                return 0;
            case 'movement':
                // Check for different property structures in events
                if (data.movementPoints !== undefined) return data.movementPoints;
                if (data.newValue !== undefined) return data.newValue;
                if (data.player && data.player.movementPoints !== undefined) return data.player.movementPoints;
                if (data.stats && data.stats.movementPoints !== undefined) return data.stats.movementPoints;
                console.log('Movement event data structure:', data);
                return 0;
            case 'turn':
                return data.turnCount || 0;
            default:
                console.warn(`No value extractor defined for resource type: ${resourceType}`);
                return 0;
        }
    }
    
    /**
     * Update a resource display with the correct value
     * @param {string} resourceType - Type of resource to update
     * @param {object} data - Event data containing the resource value
     */
    updateResourceDisplay(resourceType, data) {
        const displayElement = this.getResourceDisplayElement(resourceType);
        if (!displayElement) {
            console.warn(`Display element not found for resource type: ${resourceType}`);
            return;
        }
        
        const value = this.getResourceValue(resourceType, data);
        displayElement.textContent = value;
        
        if (this.debugMode) {
            console.log(`Updated ${resourceType} display to ${value}`, data);
        }
    }
    
    /**
     * Handle New Game button click
     */
    handleNewGameClick() {
        console.log("New Game button clicked");
        
        // Get selected grid size, default to 5 if gridSizeSelect doesn't exist
        const gridSize = this.gridSizeSelect ? parseInt(this.gridSizeSelect.value) : 5;
        
        // Show confirmation dialog
        this.showModalDialog(
            `<h2>Start New Game</h2>
            <p>Start a new game with a ${gridSize}x${gridSize} grid?</p>
            <div class="modal-buttons">
                <button id="confirm-new-game">Start New Game</button>
                <button id="cancel-new-game">Cancel</button>
            </div>`
        );
        
        // Wait for a short time to ensure the modal is rendered before attaching event listeners
        setTimeout(() => {
            // Check if the buttons exist before attaching listeners
            const confirmButton = document.getElementById('confirm-new-game');
            const cancelButton = document.getElementById('cancel-new-game');
            
            if (confirmButton) {
                confirmButton.addEventListener('click', () => {
                    this.closeModalDialog();
                    this.startNewGame(gridSize);
                });
            } else {
                console.error("Confirm button not found in modal");
            }
            
            if (cancelButton) {
                cancelButton.addEventListener('click', () => {
                    this.closeModalDialog();
                });
            } else {
                console.error("Cancel button not found in modal");
            }
        }, 50); // Short delay to allow DOM to update
    }
    
    /**
     * Start a new game with the specified grid size
     * @param {number} gridSize - Size of the grid (square)
     */
    startNewGame(gridSize) {
        console.log(`Starting new game with grid size ${gridSize}x${gridSize}`);
        
        // Create a new Game instance
        window.game.restart(gridSize, gridSize);
        
        // After game restart, we don't need to reinitialize the action panel
        // Game.restart will call UIManager.init which will initialize the ActionPanel
        // This prevents duplicate initialization which could lead to multiple event listeners
        
        console.log("Game restarted with grid size " + gridSize);
    }
    
    /**
     * Handle Settings button click
     */
    handleSettingsClick() {
        console.log("Settings button clicked");
        
        // Show settings dialog
        this.showModalDialog(
            `<h2>Game Settings</h2>
            <div class="settings-group">
                <h3>Display</h3>
                <div class="setting-item">
                    <label for="show-coords">Show Coordinates</label>
                    <input type="checkbox" id="show-coords">
                </div>
                <div class="setting-item">
                    <label for="show-chaos-indicators">Show Chaos Indicators</label>
                    <input type="checkbox" id="show-chaos-indicators" checked>
                </div>
            </div>
            
            <div class="settings-group">
                <h3>Gameplay</h3>
                <div class="setting-item">
                    <label for="auto-end-turn">Auto End Turn</label>
                    <input type="checkbox" id="auto-end-turn">
                </div>
                <div class="setting-item">
                    <label for="difficulty">Difficulty</label>
                    <select id="difficulty">
                        <option value="easy">Easy</option>
                        <option value="normal" selected>Normal</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
            </div>
            
            <div class="modal-buttons">
                <button id="save-settings">Save Settings</button>
                <button id="cancel-settings">Cancel</button>
            </div>`
        );
        
        // Add button handlers
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
            this.closeModalDialog();
        });
        
        document.getElementById('cancel-settings').addEventListener('click', () => {
            this.closeModalDialog();
        });
    }
    
    /**
     * Save game settings
     */
    saveSettings() {
        // Get settings from form
        const settings = {
            display: {
                showCoordinates: document.getElementById('show-coords').checked,
                showChaosIndicators: document.getElementById('show-chaos-indicators').checked
            },
            gameplay: {
                autoEndTurn: document.getElementById('auto-end-turn').checked,
                difficulty: document.getElementById('difficulty').value
            }
        };
        
        // Save to local storage
        localStorage.setItem('gameSettings', JSON.stringify(settings));
        
        // Apply settings immediately
        this.applySettings(settings);
    }
    
    /**
     * Apply game settings
     * @param {object} settings - The settings object
     */
    applySettings(settings) {
        // Apply display settings
        if (settings.display.showCoordinates) {
            document.body.classList.add('show-coordinates');
        } else {
            document.body.classList.remove('show-coordinates');
        }
        
        if (settings.display.showChaosIndicators) {
            document.body.classList.add('show-chaos-indicators');
        } else {
            document.body.classList.remove('show-chaos-indicators');
        }
        
        // Apply gameplay settings if game is available
        if (window.game) {
            // Apply auto end turn
            // Apply difficulty
        }
    }
    
    /**
     * Handle Stats button click
     */
    handleStatsClick() {
        console.log("Stats button clicked");
        
        // Get metrics from metrics system
        const metricsSystem = new MetricsSystem(); // Assuming this is available
        const metrics = metricsSystem.getMetrics();
        
        // Format the statistics HTML
        const statsHtml = `
            <h2>Game Statistics</h2>
            
            <div class="stats-content">
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
                </div>
            </div>
            
            <div class="stat-group achievements">
                <h3>Achievements</h3>
                ${this.formatAchievements(metrics.achievements)}
            </div>
            
            <div class="modal-buttons">
                <button id="close-stats">Close</button>
            </div>
        `;
        
        // Show stats dialog
        this.showModalDialog(statsHtml);
        
        // Add button handler
        document.getElementById('close-stats').addEventListener('click', () => {
            this.closeModalDialog();
        });
    }
    
    /**
     * Format achievements for display
     * @param {object} achievements - The achievements object
     * @returns {string} Formatted HTML
     */
    formatAchievements(achievements) {
        let html = '';
        
        for (const key in achievements) {
            const achievement = achievements[key];
            const progressPct = achievement.inverted
                ? 100 - (achievement.progress / achievement.threshold * 100)
                : (achievement.progress / achievement.threshold * 100);
            
            const clampedPct = Math.min(100, Math.max(0, progressPct));
            
            html += `
                <div class="achievement ${achievement.completed ? 'completed' : ''}">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${clampedPct}%"></div>
                    </div>
                </div>
            `;
        }
        
        return html || '<div class="no-achievements">No achievements yet</div>';
    }
    
    /**
     * Show the modal dialog
     * @param {string} content - HTML content for the modal
     */
    showModalDialog(content) {
        if (this.modalContent) {
            this.modalContent.innerHTML = content;
        }
        
        if (this.modal) {
            this.modal.style.display = 'block';
        }
    }
    
    /**
     * Close the modal dialog
     */
    closeModalDialog() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
        
        // Clear content after closing
        if (this.modalContent) {
            this.modalContent.innerHTML = '';
        }
    }
    
    /**
     * Update the turn display
     * @param {object} data - Turn data
     */
    updateTurnDisplay(data) {
        if (this.turnDisplay) {
            this.turnDisplay.textContent = data.turnCount;
        }
    }
    
    /**
     * Update the balance display
     * @param {object} data - Balance data
     */
    updateBalanceDisplay(data) {
        // Check if we have valid balance data
        if (!data) {
            console.warn("UIManager.updateBalanceDisplay: No data provided");
            return;
        }
        
        // Determine the chaos value from various possible properties
        // Following the ChaosOrderSystem principles where chaos + order = 1.0
        let chaosValue;
        
        // If chaos is explicitly provided
        if (typeof data.chaos === 'number') {
            chaosValue = data.chaos;
        } 
        // Otherwise check for systemChaos
        else if (typeof data.systemChaos === 'number') {
            chaosValue = data.systemChaos;
        } 
        // Fall back to calculated values if both are provided
        else if (typeof data.chaosValue === 'number') {
            chaosValue = data.chaosValue;
        } 
        // Default to 0.5 only if we have no valid data
        else {
            chaosValue = 0.5;
            console.warn("UIManager.updateBalanceDisplay: No valid chaos value, defaulting to 0.5");
        }
        
        // Ensure chaos is a valid value between 0 and 1
        chaosValue = Math.max(0, Math.min(1, chaosValue));
        
        // Order is ALWAYS 1 - chaos (per ChaosOrderSystem.md: Binary Duality rule)
        let orderValue = 1 - chaosValue;
        
        // Log any mismatches for debugging
        if (typeof data.order === 'number' && Math.abs(data.order - orderValue) > 0.01) {
            console.warn(`UIManager.updateBalanceDisplay: Order value mismatch. Received: ${data.order}, Calculated: ${orderValue}`);
        }
        
        // Convert to percentages
        const chaosPct = Math.round(chaosValue * 100);
        let orderPct = Math.round(orderValue * 100);
        
        // Ensure the percentages always sum to 100%
        // In case of rounding artifacts
        if (chaosPct + orderPct !== 100) {
            // Adjust order to maintain 100% total
            // This ensures the display shows values that sum to 100%
            const newOrderPct = 100 - chaosPct;
            console.log(`UIManager.updateBalanceDisplay: Adjusted order percent from ${orderPct} to ${newOrderPct} to maintain 100% total`);
            orderPct = newOrderPct;
        }
        
        // Update display values
        if (this.balanceChaosDisplay) {
            this.balanceChaosDisplay.textContent = chaosPct;
        }
        
        if (this.balanceOrderDisplay) {
            this.balanceOrderDisplay.textContent = orderPct;
        }
        
        // Update visual balance bar
        const chaosFill = document.querySelector('.balance-chaos-fill');
        if (chaosFill) {
            chaosFill.style.width = `${chaosPct}%`;
        }
        
        // Update balance marker position (perfect balance at 50%)
        const balanceMarker = document.querySelector('.balance-marker');
        if (balanceMarker) {
            // Position marker based on chaos percentage
            balanceMarker.style.left = `${chaosPct}%`;
            
            // Color the marker based on how far from perfect balance
            const balanceDeviation = Math.abs(chaosPct - 50);
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
     * Update the evolution points display
     * @param {object} data - Evolution points data
     */
    updateEvolutionPointsDisplay(data) {
        // Check for null or undefined data
        if (!data) {
            console.warn('UIManager: Null or undefined data passed to updateEvolutionPointsDisplay');
            return;
        }
        
        // Extract chaos points, checking different possible property structures
        let chaosPoints = 0;
        if (data.chaosPoints !== undefined) chaosPoints = data.chaosPoints;
        else if (data.newValues && data.newValues.chaos !== undefined) chaosPoints = data.newValues.chaos;
        else if (data.evolutionPoints && data.evolutionPoints.chaos !== undefined) chaosPoints = data.evolutionPoints.chaos;
        else if (data.player && data.player.chaosEvolutionPoints !== undefined) chaosPoints = data.player.chaosEvolutionPoints;
        
        // Extract flow points, checking different possible property structures
        let flowPoints = 0;
        if (data.flowPoints !== undefined) flowPoints = data.flowPoints;
        else if (data.newValues && data.newValues.flow !== undefined) flowPoints = data.newValues.flow;
        else if (data.evolutionPoints && data.evolutionPoints.flow !== undefined) flowPoints = data.evolutionPoints.flow;
        else if (data.player && data.player.flowEvolutionPoints !== undefined) flowPoints = data.player.flowEvolutionPoints;
        
        // Extract order points, checking different possible property structures
        let orderPoints = 0;
        if (data.orderPoints !== undefined) orderPoints = data.orderPoints;
        else if (data.newValues && data.newValues.order !== undefined) orderPoints = data.newValues.order;
        else if (data.evolutionPoints && data.evolutionPoints.order !== undefined) orderPoints = data.evolutionPoints.order;
        else if (data.player && data.player.orderEvolutionPoints !== undefined) orderPoints = data.player.orderEvolutionPoints;
        
        // If we couldn't find values and debug is enabled, log the data structure
        if (this.debugMode && chaosPoints === 0 && flowPoints === 0 && orderPoints === 0) {
            console.log('UIManager: Could not extract evolution points from data structure:', data);
        }
        
        // Update chaos evolution points display
        if (this.evolutionChaosDisplay) {
            this.evolutionChaosDisplay.textContent = chaosPoints;
        }
        
        // Update flow evolution points display
        if (this.evolutionFlowDisplay) {
            this.evolutionFlowDisplay.textContent = flowPoints;
        }
        
        // Update order evolution points display
        if (this.evolutionOrderDisplay) {
            this.evolutionOrderDisplay.textContent = orderPoints;
        }
        
        if (this.debugMode) {
            console.log(`UIManager: Updated evolution points display - Chaos: ${chaosPoints}, Flow: ${flowPoints}, Order: ${orderPoints}`);
        }
    }
    
    /**
     * Show victory screen
     * @param {object} data - Victory data
     */
    showVictoryScreen(data) {
        // Get metrics
        const metricsSystem = new MetricsSystem(); // Assuming this is available
        const metrics = metricsSystem.getMetrics();
        
        const content = `
            <h2>Victory!</h2>
            <p>You have successfully established order in the chaotic system.</p>
            
            <div class="victory-stats">
                <div class="stat-group">
                    <h3>Level Summary</h3>
                    <div class="stat-item">
                        <span>Turns Taken:</span>
                        <span>${metrics.game.turnsTaken}</span>
                    </div>
                    <div class="stat-item">
                        <span>Order Achieved:</span>
                        <span>${Math.round(data.systemOrder * 100)}%</span>
                    </div>
                    <div class="stat-item">
                        <span>Tiles Explored:</span>
                        <span>${metrics.movement.tilesExplored}</span>
                    </div>
                </div>
            </div>
            
            <p class="evolution-points">
                You earned <span class="highlight">${data.evolutionPoints || 5}</span> evolution points!
            </p>
            
            <div class="modal-buttons">
                <button id="continue-btn">Continue Evolution</button>
                <button id="new-game-btn">New Game</button>
            </div>
        `;
        
        this.showModalDialog(content);
        
        // Add button handlers
        document.getElementById('continue-btn').addEventListener('click', () => {
            this.closeModalDialog();
            // Continue with evolution - assuming this method exists
            window.game.continueEvolution();
        });
        
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.closeModalDialog();
            this.handleNewGameClick();
        });
    }
    
    /**
     * Show game over screen
     * @param {object} data - Game over data
     */
    showGameOverScreen(data) {
        const content = `
            <h2>Game Over</h2>
            <p>${data.reason || 'The game has ended.'}</p>
            
            <div class="modal-buttons">
                <button id="restart-btn">Try Again</button>
                <button id="new-game-btn">New Game</button>
            </div>
        `;
        
        this.showModalDialog(content);
        
        // Add button handlers
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.closeModalDialog();
            // Restart the current level - assuming this method exists
            window.game.restartLevel();
        });
        
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.closeModalDialog();
            this.handleNewGameClick();
        });
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        console.log("Destroying UI manager");
        
        // Clean up button listeners
        for (const handler in this.clickHandlers) {
            const button = document.getElementById(handler);
            if (button && this.clickHandlers[handler]) {
                button.removeEventListener('click', this.clickHandlers[handler]);
            }
        }
        this.clickHandlers = {};
        
        // Clean up event listeners
        for (const registration of this._registeredEvents) {
            eventSystem.off(registration);
        }
        this._registeredEvents = [];
        
        // Remove window event listener for modal
        window.removeEventListener('click', this.modalClickHandler);
        
        // Clear UI element references
        this.energyDisplay = null;
        this.movementDisplay = null;
        this.turnDisplay = null;
        this.balanceChaosDisplay = null;
        this.balanceOrderDisplay = null;
        this.evolutionChaosDisplay = null;
        this.evolutionFlowDisplay = null;
        this.evolutionOrderDisplay = null;
        this.gridSizeSelect = null;
        this.newGameButton = null;
        this.settingsButton = null;
        this.statsButton = null;
        this.modal = null;
        this.modalContent = null;
        this.closeModal = null;
        
        // Destroy subsystems
        if (this.messageSystem) {
            this.messageSystem.destroy();
            this.messageSystem = null;
        }
        
        if (this.actionPanel) {
            this.actionPanel.destroy();
            this.actionPanel = null;
        }
        
        console.log("UI manager destroyed successfully");
    }
} 