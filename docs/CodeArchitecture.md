# Hexgrid Evolution: Code Architecture Reference

This document provides a detailed overview of the code architecture and dependencies across files in the Hexgrid Evolution game. It's designed to help understand how different components interact and depend on each other.

## Core Architecture

The game follows an **Entity Component System (ECS)** architectural pattern combined with an **event-driven** communication model. This approach allows for:

- Decoupling of systems
- Flexible entity composition
- Event-based interaction between systems

## Module System

The game uses JavaScript ES6 modules for code organization and dependency management:

- **Export**: Classes and functions are exported using the `export` keyword
- **Import**: Dependencies are imported using the `import` statement
- **Global Access**: Some core systems are made globally available through the window object in index.js

Example of proper module usage:

```javascript
// Exporting a class
export class MetricsSystem {
    // Class implementation
}

// Importing dependencies
import { EventSystem } from './EventSystem.js';
import { EntityManager } from './EntityManager.js';
```

### Module Dependencies

To maintain proper module structure:

1. Each module should explicitly export its public API
2. Modules should import their dependencies directly
3. Circular dependencies should be avoided
4. The index.js file makes core systems globally available when needed

## System Overviews

### Entity Component System

Located in `scripts/core/EntityManager.js`.

- **EntityManager**: Singleton that tracks all entities, their components, and tags
- **Entity**: Base class for creating game objects with component attachment capabilities
- **Components**: Reusable bundles of data and behavior attached to entities

**Key Dependencies**:
- Most game systems depend on the EntityManager to find and interact with entities
- Components depend on the Entity class for attachment

### Event System

Located in `scripts/core/EventSystem.js`.

- **EventSystem**: Singleton that manages event registration, emission, and handling
- Implements a pub/sub (Observer) pattern
- Prevents event recursion using an event queue

**Key Dependencies**:
- Almost all systems depend on the EventSystem for communication
- No other systems are required by the EventSystem (zero dependencies)

### Turn System

Located in `scripts/core/TurnSystem.js`.

- **TurnSystem**: Manages game turns, victory conditions, and evolution points
- Handles game stage progression
- Calculates and awards evolution points based on the chaos/order balance

**Key Dependencies**:
- Depends on EventSystem for emitting turn events
- Depends on EntityManager to find the player entity
- Depends on PlayerComponent for awarding evolution points
- Game.js depends on TurnSystem for turn management

### Grid System

Located in `scripts/core/Grid.js`.

- **Grid**: Manages the hexagonal grid, tile generation, and system-wide balance
- Creates tile entities for each hex cell
- Tracks and updates the chaos/order balance of the entire system

**Key Dependencies**:
- Depends on EntityManager for creating and tracking tile entities
- Depends on EventSystem for broadcasting grid events
- Depends on TileComponent for tile behavior
- Game.js depends on Grid for world representation

### Game Controller

Located in `scripts/core/Game.js`.

- **Game**: Main controller that initializes and orchestrates all game systems
- Manages the overall game state and lifecycle
- Handles UI updates and user input

**Key Dependencies**:
- Depends on all core systems (EntityManager, EventSystem, Grid, TurnSystem)
- Depends on PlayerComponent and TileComponent for entity creation
- Depends on DOM elements for UI updates

## Component Overviews

### Player Component

Located in `scripts/components/PlayerComponent.js`.

- **PlayerComponent**: Manages player state, movement, actions, and evolution
- Tracks player resources (energy, movement points)
- Stores evolution points and traits
- Calculates action costs with trait modifiers

**Key Dependencies**:
- Depends on EventSystem for broadcasting player events
- Depends on TileComponent for interaction with tiles
- Depends on EntityManager for finding tile entities

**Key Methods**:
```javascript
// Calculate action cost with trait modifiers
getActionCost(action, targetRow, targetCol) {
    // Get target tile
    const tileEntity = entityManager.getEntitiesByTag(`tile_${targetRow}_${targetCol}`)[0];
    if (!tileEntity) return -1;
    
    const tileComponent = tileEntity.getComponent(TileComponent);
    if (!tileComponent) return -1;
    
    // Get base cost from tile
    let cost = tileComponent.getActionCost(action);
    
    // Apply trait modifiers
    for (const trait of this.traits) {
        if (trait.modifiesActionCost && typeof trait.modifiesActionCost === 'function') {
            cost = trait.modifiesActionCost(action, cost, tileComponent);
        }
    }
    
    return Math.max(0, cost);
}

// Add a trait to the player
addTrait(trait) {
    // Check if we already have this trait
    if (this.traits.some(t => t.id === trait.id)) return false;
    
    // Add trait
    this.traits.push(trait);
    
    // Apply trait effects
    this.applyTraitEffects(trait);
    
    // Emit trait added event
    eventSystem.emit('playerTraitAdded', {
        player: this,
        trait: trait
    });
    
    return true;
}
```

### Tile Component

Located in `scripts/components/TileComponent.js`.

- **TileComponent**: Manages tile properties, behavior, and appearance
- Different tile types have different effects on gameplay
- Tracks individual tile chaos/order values

**Key Dependencies**:
- Depends on EventSystem for broadcasting tile events

## System Implementations

### Evolution System

Located in `scripts/systems/EvolutionSystem.js`.

- **EvolutionSystem**: Manages player evolution, traits, and abilities
- Defines available traits and their effects
- Handles trait acquisition and application

**Key Dependencies**:
- Depends on EventSystem for handling evolution events
- Depends on MetricsSystem for calculating evolution points
- Depends on EntityManager for accessing player entity

**Key Methods**:
```javascript
// Get traits by category
getTraitsByCategory(category) {
    if (this.availableTraits[category]) {
        return this.availableTraits[category];
    }
    return [];
}

// Check if a trait can be purchased
canPurchaseTrait(traitId, evolutionPoints) {
    const trait = this.getTraitById(traitId);
    if (!trait) return false;
    
    // Check if we have enough points
    return evolutionPoints >= trait.cost;
}
```

### Metrics System

Located in `scripts/systems/MetricsSystem.js`.

- **MetricsSystem**: Tracks and analyzes player performance metrics
- Calculates statistics for level completion
- Determines player play style based on actions

**Key Dependencies**:
- Depends on EntityManager for accessing player entity
- Depends on EventSystem for tracking game events

## UI Systems

### Action Panel

Located in `scripts/ui/ActionPanel.js`.

- **ActionPanel**: Manages the action buttons and their behavior
- **Key Responsibilities**:
  - Handles action button interactions
  - Executes actions when tiles are clicked
  - Updates button states based on game state
  - Manages action feedback to the player
- **Global Access**: Made available via `window.actionPanel` for delegation from Game

**Key Dependencies**:
- Depends on EventSystem for handling game events
- Depends on Game instance for system-wide balance updates
- Depends on PlayerComponent for checking action availability
- Depends on TileComponent for interacting with tiles

### UI Manager

Located in `scripts/ui/UIManager.js`.

- **UIManager**: Coordinates UI updates across the game
- **Key Responsibilities**:
  - Initializes ActionPanel and MessageSystem components
  - Makes ActionPanel globally accessible via window.actionPanel
  - Manages modal windows and overlays
  - Handles UI animations and transitions

**Key Dependencies**:
- Depends on EventSystem for responding to game events
- Depends on ActionPanel for handling player actions
- Depends on MessageSystem for player feedback
- Depends on DOM elements for UI manipulation

## Dependency Flow Diagram

```
┌─────────────┐         ┌─────────────┐
│  EventSystem │◄────────│    Game     │
└─────┬───────┘         └──────┬──────┘
      │                        │
      │                        ▼
      │                ┌──────────────┐
      ├───────────────►│ EntityManager│
      │                └──────┬───────┘
      │                       │
      │                       │
      ▼                       ▼
┌─────────────┐       ┌──────────────┐
│  TurnSystem  │◄──────│    Grid      │
└─────┬───────┘       └──────┬───────┘
      │                      │
      │                      │
      ▼                      ▼
┌─────────────┐       ┌──────────────┐
│PlayerComponent│◄─────┤TileComponent │
└─────┬───────┘       └──────────────┘
      │                      ▲
      ▼                      │
┌─────────────┐       ┌──────────────┐
│EvolutionSystem│      │  ActionPanel  │
└─────────────┘       └──────┬───────┘
                             │
                             ▼
                      ┌──────────────┐
                      │   UIManager   │
                      └──────────────┘
```

## Initialization Sequence

1. `index.js` loads all modules and creates a global Game instance
2. Game.init() is called, which:
   - Creates the Grid
   - Creates the TurnSystem
   - Creates the player entity with PlayerComponent
   - Initializes UI elements
   - Sets up event listeners
   - Starts the game loop

## Event Flow Examples

### Player Action Flow:
1. Player selects an action button
2. ActionPanel.handleActionButtonClick is called
3. PlayerComponent.setAction is called to update the current action
4. ActionPanel updates button UI states
5. Player clicks a tile
6. Grid emits 'tileClicked' event
7. Game.handleTileClick and ActionPanel.handleTileClick both receive the event
8. Game delegates to ActionPanel if it's available
9. ActionPanel verifies if the action is valid
10. ActionPanel executes the action via the appropriate method
11. Action effects are applied and feedback is shown to the player

### Delegation Pattern Implementation:
1. UIManager creates an ActionPanel instance
2. UIManager sets window.actionPanel to make it globally accessible
3. When a tile is clicked, Game.handleTileClick checks for window.actionPanel
4. If available, Game delegates action handling to ActionPanel
5. If not available, Game falls back to direct action handling
6. This ensures consistent behavior while maintaining backward compatibility

### Turn End Flow:
1. Player clicks "End Turn" button
2. Game.endTurn() is called
3. Game forwards the call to TurnSystem.endTurn()
4. TurnSystem calculates and awards evolution points
5. TurnSystem emits 'turnEnd' event
6. TurnSystem increments turn counter
7. TurnSystem emits 'turnStart' event for the new turn
8. Various systems react to these events

### Player Movement Flow:
1. Player selects "Move" action
2. Player clicks a tile
3. Game.handleTileClick() is called
4. Game checks if the action is valid
5. PlayerComponent.updatePosition() is called
6. PlayerComponent emits 'playerMoved' event
7. Grid updates the player's position
8. UI updates to reflect the new position

### Trait Acquisition Flow:
1. Player clicks "Evolve" button
2. Game.showEvolutionScreen() is called
3. Evolution screen displays available traits
4. Player selects a trait to unlock
5. Game.unlockTrait() is called
6. PlayerComponent.addTrait() adds the trait to the player
7. PlayerComponent.applyTraitEffects() applies the trait's effects
8. PlayerComponent emits 'playerTraitAdded' event
9. Evolution points are deducted
10. UI updates to reflect the new trait and points

## Resource Management

### Energy
- Stored in PlayerComponent
- Used for actions (Sense, Interact, Stabilize)
- Replenished at the start of each turn
- Can be gained from Energy tiles

### Movement Points
- Stored in PlayerComponent
- Used for movement
- Replenished at the start of each turn

### Evolution Points
- Three types: Chaos, Flow, and Order
- Stored in PlayerComponent
- Awarded at the end of each turn by TurnSystem
- Accumulate over time until spent on traits

## File Dependencies Table

| File | Direct Dependencies |
|------|---------------------|
| scripts/index.js | EventSystem, EntityManager, Grid, TurnSystem, TileComponent, PlayerComponent, Game, MetricsSystem, EvolutionSystem, UIManager |
| scripts/core/Game.js | EventSystem, EntityManager, Grid, TurnSystem, PlayerComponent, TileComponent, EvolutionSystem |
| scripts/core/Grid.js | EventSystem, EntityManager, TileComponent |
| scripts/core/TurnSystem.js | EventSystem, EntityManager, PlayerComponent |
| scripts/core/EntityManager.js | (None) |
| scripts/core/EventSystem.js | (None) |
| scripts/components/PlayerComponent.js | EventSystem, EntityManager, TileComponent |
| scripts/components/TileComponent.js | EventSystem |
| scripts/systems/EvolutionSystem.js | EventSystem, EntityManager, MetricsSystem |
| scripts/systems/MetricsSystem.js | EntityManager |
| scripts/ui/ActionPanel.js | EventSystem, PlayerComponent, TileComponent, EntityManager |
| scripts/ui/UIManager.js | EventSystem |

## Common Pitfalls and Best Practices

1. **Circular Dependencies**: Be careful not to create circular dependencies between modules
2. **Event Handling**: Always clean up event listeners when components are destroyed
3. **Component Access**: Use entityManager.getEntitiesByTag() and entity.getComponent() properly
4. **State Management**: State changes should be communicated via events for proper decoupling
5. **DOM Manipulation**: DOM updates should be handled by dedicated UI components only
6. **Module Exports**: Always export classes and functions that need to be used by other modules
7. **Action Cost Calculation**: Use PlayerComponent.getActionCost() for accurate action costs that include trait modifiers
8. **UI Delegation Pattern**: Use the delegation pattern for UI interactions to keep Game.js focused on game logic rather than UI details
9. **Global References**: Clean up global references in the destroy methods to prevent memory leaks

## Common Issues and Troubleshooting

1. **"X is not defined" Errors**: 
   - Ensure the class or function is properly exported from its source file
   - Check that it's correctly imported where it's used
   - For global access, verify it's added to the window object in index.js

2. **Action Cost Errors**:
   - If you encounter "TypeError: playerComponent.getActionCost is not defined", ensure the method is implemented in PlayerComponent
   - Check that necessary imports (TileComponent, entityManager) are present
   - Verify the method signature matches what's expected by calling code

3. **Trait Effects Not Applied**:
   - Ensure traits are properly saved and loaded between levels
   - Check that trait.onAcquire and trait.modifiesActionCost functions are defined correctly
   - Verify that PlayerComponent.applyAllTraitEffects() is called when loading a saved game

4. **Action Execution Issues**:
   - Ensure window.actionPanel is set correctly when initializing UIManager
   - Verify that systems are properly connected for balance updates
   - Check that actions are consistently defined in both Game and ActionPanel for fallback scenarios

## Extending the Game

When adding new features:

1. **New Components**: Add new capabilities to entities
2. **New Events**: Define clear event types for communication
3. **New UI Elements**: Follow the existing pattern of DOM manipulation
4. **New Systems**: Integrate with existing systems through the event system
5. **New Modules**: Ensure proper export/import and avoid circular dependencies
6. **User Interface Extensions**: 
   - Extend ActionPanel for additional action types
   - Follow the delegation pattern for new UI components
   - Ensure global references are properly cleaned up

For major architectural changes, consider:
1. How it affects the existing entity-component structure
2. How events will flow through the new systems
3. Whether it maintains proper separation of concerns 