/**
 * Hexgrid Evolution - Main Entry Point
 * Imports all required modules and initializes the game
 */

// Import utility modules
import { utils } from './utils/utils.js';

// Make utils globally available for the components that need it
window.utils = utils;

// Import core systems
import { EventSystem, eventSystem } from './core/EventSystem.js';
import { Entity, Component, entityManager } from './core/EntityManager.js';
import { Grid } from './core/Grid.js';
import { TurnSystem } from './core/TurnSystem.js';

// Make core systems globally available
window.eventSystem = eventSystem;
window.entityManager = entityManager;
window.Entity = Entity;
window.Grid = Grid;
window.TurnSystem = TurnSystem;

// Import components
import { TileComponent } from './components/TileComponent.js';
import { PlayerComponent } from './components/PlayerComponent.js';

// Make components globally available
window.TileComponent = TileComponent;
window.PlayerComponent = PlayerComponent;

// Import game systems
import { MetricsSystem } from './systems/MetricsSystem.js';
import { EvolutionSystem } from './systems/EvolutionSystem.js';
import { UIManager } from './ui/UIManager.js';

// Make systems globally available
window.MetricsSystem = MetricsSystem;
window.EvolutionSystem = EvolutionSystem;
window.UIManager = UIManager;

// Import game controller
import { Game } from './core/Game.js';

// Make game controller globally available
window.Game = Game;

// Log initialization
console.log('Hexgrid Evolution - Modules loaded');

/**
 * Handles initialization errors by displaying a user-friendly message
 * @param {Error} error - The error that occurred
 */
function handleInitializationError(error) {
    console.error('Error initializing game:', error);
    
    // Create error display if it doesn't exist
    let errorDisplay = document.getElementById('error-display');
    if (!errorDisplay) {
        errorDisplay = document.createElement('div');
        errorDisplay.id = 'error-display';
        errorDisplay.style.cssText = 'position:fixed;top:0;left:0;width:100%;padding:15px;background:#ff5252;color:white;font-family:sans-serif;z-index:1000;text-align:center;';
        document.body.prepend(errorDisplay);
    }
    
    // Display error message
    errorDisplay.innerHTML = `<strong>Game initialization failed:</strong> ${error.message} <br> Please check the console for more details.`;
    
    // Add a retry button
    const retryButton = document.createElement('button');
    retryButton.textContent = 'Retry';
    retryButton.style.cssText = 'margin-top:10px;padding:5px 15px;background:#fff;color:#ff5252;border:none;border-radius:3px;cursor:pointer;';
    retryButton.onclick = initializeGame;
    errorDisplay.appendChild(retryButton);
}

/**
 * Initialize the game with proper validation and error handling
 */
function initializeGame() {
    console.log('Starting game initialization');
    
    // Clear any previous error display
    const errorDisplay = document.getElementById('error-display');
    if (errorDisplay) {
        errorDisplay.remove();
    }
    
    try {
        // Validate required dependencies
        if (!window.eventSystem || !window.entityManager) {
            throw new Error('Core systems (eventSystem, entityManager) not available');
        }
        
        // Create global game instance with explicit dependencies
        window.game = new Game({
            entityManager: window.entityManager,
            eventSystem: window.eventSystem
        });
        
        // Initialize with default settings
        const initSuccess = window.game.init();
        
        if (initSuccess) {
            console.log('Game initialized successfully');
        } else {
            throw new Error('Game initialization returned false');
        }
    } catch (error) {
        handleInitializationError(error);
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeGame); 