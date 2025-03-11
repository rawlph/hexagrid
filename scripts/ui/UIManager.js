/**
 * Manages the game's user interface components
 */
import { MetricsSystem } from '../systems/MetricsSystem.js';
import { ActionPanel } from './ActionPanel.js';
import { MessageSystem } from './MessageSystem.js';

export class UIManager {
    constructor() {
        // UI elements
        this.energyDisplay = document.getElementById('energy-value');
        this.turnDisplay = document.getElementById('turn-value');
        this.orderDisplay = document.getElementById('order-value');
        this.chaosDisplay = document.getElementById('chaos-value');
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
    }
    
    /**
     * Initialize the UI manager
     */
    init() {
        console.log("Initializing UI manager");
        
        // Initialize subsystems
        this.messageSystem.init();
        this.actionPanel.init(this.messageSystem);
        
        // Set up button listeners
        this.setupButtonListeners();
        
        // Register event listeners
        this.registerEventListeners();
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
        // Player resource changes
        this._registeredEvents.push(
            eventSystem.on('playerEnergyChanged', this.updateEnergyDisplay.bind(this))
        );
        
        // Turn changes
        this._registeredEvents.push(
            eventSystem.on('turnStart', this.updateTurnDisplay.bind(this))
        );
        
        // System balance changes
        this._registeredEvents.push(
            eventSystem.on('systemBalanceChanged', this.updateBalanceDisplay.bind(this))
        );
        
        // Game state changes
        this._registeredEvents.push(
            eventSystem.on('gameVictory', this.showVictoryScreen.bind(this))
        );
        
        this._registeredEvents.push(
            eventSystem.on('gameOver', this.showGameOverScreen.bind(this))
        );
    }
    
    /**
     * Handle New Game button click
     */
    handleNewGameClick() {
        console.log("New Game button clicked");
        
        // Get selected grid size
        const gridSize = parseInt(this.gridSizeSelect.value);
        
        // Show confirmation dialog
        this.showModalDialog(
            `<h2>Start New Game</h2>
            <p>Start a new game with a ${gridSize}x${gridSize} grid?</p>
            <div class="modal-buttons">
                <button id="confirm-new-game">Start New Game</button>
                <button id="cancel-new-game">Cancel</button>
            </div>`
        );
        
        // Add button handlers
        document.getElementById('confirm-new-game').addEventListener('click', () => {
            this.closeModalDialog();
            this.startNewGame(gridSize);
        });
        
        document.getElementById('cancel-new-game').addEventListener('click', () => {
            this.closeModalDialog();
        });
    }
    
    /**
     * Start a new game
     * @param {number} gridSize - Size of the grid (rows and columns)
     */
    startNewGame(gridSize) {
        console.log(`Starting new game with grid size ${gridSize}x${gridSize}`);
        
        // Create a new Game instance - assuming Game has a static restart method
        window.game.restart(gridSize, gridSize);
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
     * Update the energy display
     * @param {object} data - Energy change data
     */
    updateEnergyDisplay(data) {
        if (this.energyDisplay) {
            this.energyDisplay.textContent = data.currentEnergy;
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
        const orderPct = Math.round(data.order * 100);
        const chaosPct = Math.round(data.chaos * 100);
        
        if (this.orderDisplay) {
            this.orderDisplay.textContent = orderPct;
        }
        
        if (this.chaosDisplay) {
            this.chaosDisplay.textContent = chaosPct;
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
        
        // Clean up event listeners
        for (const registration of this._registeredEvents) {
            eventSystem.off(registration);
        }
        
        // Destroy subsystems
        if (this.messageSystem) {
            this.messageSystem.destroy();
        }
        
        if (this.actionPanel) {
            this.actionPanel.destroy();
            this.actionPanel = null;
        }
    }
} 