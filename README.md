# Hexgrid Evolution: A Turn-Based Adventure RPG

## Overview

Hexgrid Evolution is a turn-based hex grid game that combines elements of puzzle-solving, exploration, and character evolution. The player navigates a mysterious, ever-changing hexagonal grid world, balancing chaos and order forces while evolving new abilities to overcome challenges.

## Game Concept

In Hexgrid Evolution, you play as an entity evolving through a series of environmental challenges. The game is divided into three stages of evolution (early, mid, and late game), with increasingly complex mechanics and larger environments.

### Core Mechanics

- **Hex Grid Movement**: Navigate a hex grid with limited movement points per turn
- **Energy Management**: Manage energy as a resource for special actions
- **Chaos/Order Balance**: Maintain or manipulate the balance between chaos and order
- **Character Evolution**: Acquire and evolve traits that enhance your abilities
- **Environmental Interaction**: Interact with different tile types that affect gameplay

### New Features

- **Evolution Points System**: Earn different types of evolution points based on chaos/order balance
  - **Chaos Points**: Earned when the system leans toward chaos (>55% chaos)
  - **Flow Points**: Earned most efficiently when maintaining balance (45-55% chaos/order)
  - **Order Points**: Earned when the system leans toward order (>55% order)
- **Visual Balance Bar**: Intuitive visual representation of the chaos/order balance
- **Level Completion System**: Complete levels when enough evolution points are accumulated
- **Dynamic Titles**: Earn titles based on your play style and evolution choices
- **Trait System**: Unlock and apply evolutionary traits that enhance your capabilities

### Game Progression

1. **Early Stage**: Simple movement and basic interactions as you learn to navigate
2. **Mid Stage**: Develop specialized traits and deal with more complex environments
3. **Late Stage**: Master advanced abilities and tackle challenging scenarios

## Technical Architecture

The game is built with a modular architecture using vanilla JavaScript:

### Core Systems

- **Entity Component System**: Flexible entity management
- **Event System**: Communication between game systems
- **Grid System**: Hex grid generation and management
- **Turn System**: Turn-based gameplay management
- **Evolution System**: Tracks and awards different types of evolution points

### Game Systems

- **Metrics System**: Tracks player actions and achievements
- **Evolution System**: Manages trait acquisition and character development
- **Balance System**: Monitors and updates the chaos/order balance

### UI Systems

- **UI Manager**: Coordinates all UI elements
- **Message System**: Handles in-game messages and feedback
- **Action Panel**: Manages player action controls
- **Completion Screen**: Shows level summary and player achievements
- **Evolution Screen**: Interface for spending evolution points on traits

## Running the Game

1. Clone the repository
2. Open `index.html` in a modern web browser or use the included server script
3. No build process required - the game runs directly in the browser

### Local Development Server

For a better development experience, you can use the included Python server:

```bash
# Start the server on default port 8000
python start_server.py

# Specify a custom port
python start_server.py 8080
```

## Development

### Project Structure

```
/
├── index.html            # Main HTML file
├── start_server.py       # Local development server
├── start_server.bat      # Windows batch file for server
├── styles/               # Stylesheets
│   ├── main.css          # Main styling
│   ├── hexgrid.css       # Hexgrid-specific styling
│   └── ui.css            # UI component styling
├── scripts/              # JavaScript files
│   ├── core/             # Core game systems
│   ├── components/       # Entity components
│   ├── systems/          # Game systems
│   ├── ui/               # UI components
│   └── utils/            # Utility functions
└── assets/               # Game assets (images, etc.)
```

### Key Files

- `scripts/core/Game.js`: Main game controller
- `scripts/core/Grid.js`: Hex grid implementation
- `scripts/core/TurnSystem.js`: Turn management and evolution points awarding
- `scripts/components/TileComponent.js`: Tile properties and behaviors
- `scripts/components/PlayerComponent.js`: Player properties and actions
- `scripts/systems/EvolutionSystem.js`: Trait definitions and evolution mechanics
- `scripts/systems/MetricsSystem.js`: Player performance tracking and analysis

## Game Features

### Tile Types

- **Normal**: Basic movement tile
- **Energy**: Provides energy when explored
- **Chaotic**: Increases system chaos when interacted with
- **Orderly**: Increases system order when interacted with
- **Obstacle**: Blocks movement but may be removed with abilities

### Player Actions

- **Move**: Navigate to adjacent tiles (costs movement points)
- **Sense**: Reveal properties of nearby tiles (costs energy)
- **Interact**: Manipulate tiles based on their type (costs energy)
- **Stabilize**: Balance chaos/order in adjacent tiles (costs energy)

### Evolution System

The game features an evolution points system where players earn points based on the chaos/order balance:

- **Point Types**: Chaos, Flow, and Order points
- **Evolution Thresholds**: 
  - Early stage: 50 points to evolve
  - Mid stage: 100 points to evolve
  - Late stage: 150 points to evolve
- **Level Completion**: 
  - Earn a title based on your play style
  - View statistics for the completed level
  - Choose new evolution traits with earned points
  - Progress to the next level with adjusted balance

### Evolution Traits

Traits are organized into categories:
- **Movement**: Enhance mobility and traversal
  - Swift Movement: Increases movement points by 1
  - Efficient Movement: Reduces energy cost of movement
- **Sensing**: Improve perception and information gathering
  - Enhanced Senses: Reduces energy cost of sensing
  - Deep Insight: Provides more information when sensing
- **Manipulation**: Better interaction with the environment
  - Powerful Stabilizer: Increases stabilize action effect by 50%
  - Efficient Manipulation: Reduces energy cost of interact and stabilize
- **Adaptation**: Defensive and survival traits
  - Aquatic Adaptation: Allows movement through water tiles
  - Mountaineer: Reduces movement cost on mountain tiles
- **Survival**: Resource management and regeneration
  - Energy Efficiency: Gain extra energy each turn
  - Regeneration: Recover energy when exploring new tiles

### Action Cost System

The game uses a dynamic action cost system that:
- Calculates base costs from tile properties
- Applies trait modifiers to adjust costs
- Ensures costs never go below zero
- Provides feedback on energy requirements

## Recent Updates

### Module System Improvements
- Proper exports added to system classes (MetricsSystem, EvolutionSystem, UIManager)
- Necessary imports added to relevant files
- Global access provided through index.js for backward compatibility

### Action Cost Calculation
- Added getActionCost method to PlayerComponent
- Implemented trait-based cost modification
- Fixed issues with action cost calculation for sense, interact, and stabilize actions

### Evolution Screen Implementation
- Added interface for spending evolution points
- Implemented trait unlocking and application
- Created category-based trait browsing

### Action Panel Architecture Improvements
- Eliminated redundancy between Game.js and ActionPanel.js for handling actions
- Implemented delegation pattern where Game.js delegates to ActionPanel for action execution
- Made ActionPanel globally accessible through window.actionPanel
- Enhanced action execution with consistent system-wide balance updates
- Improved error handling in action execution, particularly for the Sense action
- Consolidated button event handling to prevent duplicate listeners

## Known Issues

- Some traits may not persist correctly between level transitions
- Action costs may not reflect trait modifiers in certain edge cases
- Evolution screen may not display all available traits in some game stages

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
