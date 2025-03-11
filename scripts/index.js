/**
 * Hexgrid Evolution - Main Entry Point
 * Imports all required modules and initializes the game
 */

// Import utility modules
import { utils } from './utils/utils.js';

// Make utils globally available for the components that need it
window.utils = utils;

// Create core systems and make them globally available
import { eventSystem } from './core/EventSystem.js';
import { Entity, entityManager } from './core/EntityManager.js';
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

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded - starting game initialization');
    
    try {
        // Create global game instance
        window.game = new Game();
        
        // Initialize with default settings
        window.game.init();
        
        console.log('Game initialized successfully');
    } catch (error) {
        console.error('Error initializing game:', error);
    }
}); 