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
- **Singleton Access**: Core systems are implemented as singletons and exported directly

Example of proper module usage:

```javascript
// Exporting a class
export class MetricsSystem {
    // Class implementation
}

// Exporting a singleton
export const metricsSystem = new MetricsSystem();

// Importing dependencies
import { eventSystem } from './EventSystem.js';
import { entityManager } from './EntityManager.js';
```

### Module Dependencies

Best practices for maintaining module structure:

1. Each module should explicitly export its public API
2. Modules should import their dependencies directly
3. Circular dependencies should be avoided
4. Singletons should be accessible through direct imports

## Core Systems

### Entity Component System

Located in `scripts/core/EntityManager.js`.

- **Entity**: Base class for game objects with component attachment capabilities
- **Component**: Base class for components that can be attached to entities
- **EntityManager**: Singleton that tracks all entities, their components, and tags

**Key Features**:
- Entity reference tracking
- Component registration and retrieval
- Entity tagging for fast lookups
- Entity creation and destruction lifecycle management

**Component Lifecycle**:
```javascript
// 1. Component creation
const component = entity.addComponent(PlayerComponent, startRow, startCol);

// 2. Component initialization (called by entity)
component.init();

// 3. Component updates (called by game loop)
component.update(deltaTime);

// 4. Component destruction
entity.removeComponent(PlayerComponent);
// or
entity.destroy(); // Removes all components
```

### Event System

Located in `scripts/core/EventSystem.js`.

- **EventSystem**: Singleton that manages event registration, emission, and handling
- Implements a pub/sub (Observer) pattern
- Prevents event recursion using an event queue

**Key Features**:
- Event listener registration with context binding
- Asynchronous event processing to prevent recursion
- Debug mode for logging events
- Clean listener removal with registration objects

**Event Processing Flow**:
```javascript
// 1. Event is emitted
eventSystem.emit('eventType', data);

// 2. Event is added to queue with timestamp
data.timestamp = Date.now();
eventQueue.push({ eventType, data });

// 3. Queue is processed (if not already processing)
processEventQueue();

// 4. Listeners are called with data
listeners[eventType].forEach(listener => {
    listener.callback.call(listener.context, data);
});
```

### Turn System

Located in `scripts/core/TurnSystem.js`.

- **TurnSystem**: Manages game turns, victory conditions, and evolution points
- Handles game stage progression
- Calculates and awards evolution points based on the chaos/order balance

**Key Responsibilities**:
- Turn start/end management
- Game victory/defeat conditions
- Evolution point calculations
- Level completion logic

**Turn Flow**:
1. Player takes actions during their turn
2. Player ends their turn (manually or automatically)
3. TurnSystem processes end-of-turn effects
4. Evolution points are awarded based on system balance
5. New turn begins with resource replenishment

### Grid System

Located in `scripts/core/Grid.js`.

- **Grid**: Manages the hexagonal grid, tile generation, and system-wide balance
- Creates tile entities for each hex cell
- Tracks and updates the chaos/order balance of the entire system

**Key Responsibilities**:
- Grid initialization and tile entity creation
- Hex coordinate system and adjacency calculations
- System balance tracking and updates
- Tile interaction handling

**Coordinate System**:
- Uses a row-column coordinate system for the hexagonal grid
- Provides utilities for calculating adjacent positions
- Handles hex grid rendering and positioning

### Game Controller

Located in `scripts/core/Game.js`.

- **Game**: Main controller that initializes and orchestrates all game systems
- Manages the overall game state and lifecycle
- Handles UI updates and user input

**Initialization Process**:
1. Create and initialize all systems
2. Set up the grid and create entities
3. Register event listeners
4. Create the player entity
5. Initialize the UI components
6. Start the game loop

## Key Components

### Player Component

Located in `scripts/components/PlayerComponent.js`.

- **PlayerComponent**: Manages player state, movement, actions, and evolution
- Tracks player resources (energy, movement points)
- Stores evolution points and traits
- Calculates action costs with trait modifiers

**Key Responsibilities**:
- Player movement and positioning
- Resource management (energy, movement points)
- Action execution and cost calculation
- Trait storage and application
- Evolution point accumulation

**Resource Management**:
```javascript
// Energy usage for actions
useEnergy(amount) {
    // Check if we have enough energy
    if (this.energy < amount) return false;
    
    // Store old energy value
    const oldEnergy = this.energy;
    
    // Deduct energy
    this.energy = Math.max(0, this.energy - amount);
    
    // Emit energy changed event
    eventSystem.emit('playerEnergyChanged', {
        player: this,
        oldEnergy: oldEnergy,
        energy: this.energy,
        delta: this.energy - oldEnergy
    });
    
    return true;
}
```

### Tile Component

Located in `scripts/components/TileComponent.js`.

- **TileComponent**: Manages tile properties, behavior, and appearance
- Different tile types have different effects on gameplay
- Tracks individual tile chaos/order values

**Key Responsibilities**:
- Tile type definition (energy, chaos, order, flow)
- Action cost calculations for different actions
- Tile appearance and visual updates
- Tile interaction handling

## Game Systems

### Evolution System

Located in `scripts/systems/EvolutionSystem.js`.

- **EvolutionSystem**: Manages player evolution, traits, and abilities
- Defines available traits and their effects
- Handles trait acquisition and application

**Trait Categories**:
- Movement: Traits that enhance movement capabilities
- Sensing: Traits that improve sensing ability
- Interaction: Traits that enhance interaction ability
- Stabilization: Traits that improve stabilization ability
- Special: Unique traits with special effects

**Trait Application**:
```javascript
// Add trait to player
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

### Metrics System

Located in `scripts/systems/MetricsSystem.js`.

- **MetricsSystem**: Tracks and analyzes player performance metrics
- Calculates statistics for level completion
- Determines player play style based on actions

**Key Metrics**:
- Actions performed (by type)
- Movement patterns
- System balance influence
- Evolution point accumulation
- Time to complete objectives

## UI Systems

### Action Panel

Located in `scripts/ui/ActionPanel.js`.

- **ActionPanel**: Manages the action buttons and their behavior
- Handles action button interactions
- Executes actions when tiles are clicked
- Updates button states based on game state

**Key Responsibilities**:
- Action button rendering and state management
- Action execution logic
- Action cost display and validation
- User feedback for actions

**Action Flow**:
1. Player selects an action from the action panel
2. ActionPanel updates button states and current action
3. Player clicks a tile on the grid
4. ActionPanel validates and executes the action
5. Action results are processed and displayed

### UI Manager

Located in `scripts/ui/UIManager.js`.

- **UIManager**: Coordinates UI updates across the game
- Initializes ActionPanel and MessageSystem components
- Manages modal windows and overlays
- Handles UI animations and transitions

**Key Responsibilities**:
- Screen transitions and modal management
- UI element creation and positioning
- Integration of various UI components
- User input handling for UI elements

### Message System

Located in `scripts/ui/MessageSystem.js`.

- **MessageSystem**: Manages game messages and notifications
- Provides feedback for player actions
- Shows tutorial and hint messages
- Displays system notifications

**Message Types**:
- Info: General information messages
- Success: Positive feedback messages
- Warning: Cautionary messages
- Error: Critical error messages
- Tutorial: Help and guidance messages

## Dependency Flow

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

### Player Movement Flow:

1. Player selects "Move" action in ActionPanel
2. ActionPanel calls playerComponent.setAction('move')
3. Player clicks a tile on the grid
4. Grid.handleTileClick fires the 'tileClicked' event
5. ActionPanel handles the 'tileClicked' event
6. ActionPanel validates the move action with playerComponent.getActionCost
7. ActionPanel calls playerComponent.updatePosition(row, col)
8. PlayerComponent updates its position and emits 'playerMoved' event
9. Various systems react to the 'playerMoved' event

### Turn End Flow:

1. Player clicks "End Turn" button
2. ActionPanel triggers Game.endTurn()
3. Game forwards the call to TurnSystem.endTurn()
4. TurnSystem emits 'turnEnd' event
5. PlayerComponent handles the 'turnEnd' event (clears current action)
6. TurnSystem calculates and awards evolution points
7. TurnSystem increments turn counter
8. TurnSystem emits 'turnStart' event
9. PlayerComponent handles 'turnStart' (replenishes energy/movement)

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
| scripts/core/Game.js | EventSystem, EntityManager, Grid, TurnSystem, PlayerComponent, TileComponent, EvolutionSystem, UIManager, MetricsSystem |
| scripts/core/Grid.js | EventSystem, EntityManager, TileComponent |
| scripts/core/TurnSystem.js | EventSystem, EntityManager, PlayerComponent |
| scripts/core/EntityManager.js | (None) |
| scripts/core/EventSystem.js | (None) |
| scripts/components/PlayerComponent.js | EventSystem, EntityManager, TileComponent |
| scripts/components/TileComponent.js | EventSystem, Component |
| scripts/systems/EvolutionSystem.js | EventSystem, EntityManager, PlayerComponent |
| scripts/systems/MetricsSystem.js | EventSystem, EntityManager, PlayerComponent |
| scripts/ui/ActionPanel.js | EventSystem, PlayerComponent, TileComponent, EntityManager |
| scripts/ui/UIManager.js | EventSystem, ActionPanel, MessageSystem |
| scripts/ui/MessageSystem.js | EventSystem |

## Common Pitfalls and Best Practices

1. **Event Listener Cleanup**: Always clean up event listeners in the destroy method of components and systems
   ```javascript
   destroy() {
       // Clean up event listeners
       for (const registration of this._registeredEvents) {
           eventSystem.off(registration);
       }
   }
   ```

2. **Component Access**: Use proper methods for component access
   ```javascript
   // Good - Type-safe and clear
   const playerComponent = entity.getComponent(PlayerComponent);
   
   // Avoid - String-based lookup is error-prone
   const playerComponent = entity.components.get('PlayerComponent');
   ```

3. **Entity Lifecycle**: Properly manage entity creation and destruction
   ```javascript
   // Create an entity
   const entity = new Entity();
   entityManager.addEntity(entity);
   
   // Add components
   entity.addComponent(TileComponent, row, col);
   
   // Destroy an entity (triggers component.destroy() for all components)
   entityManager.removeEntity(entity);
   ```

4. **Event Communication**: Use events for cross-system communication rather than direct references
   ```javascript
   // Good - Event-based communication
   eventSystem.emit('playerMoved', { player: this, row, col });
   
   // Avoid - Direct system references
   gameInstance.grid.updatePlayerPosition(this, row, col);
   ```

5. **State Management**: Manage state changes through proper methods and emit events for changes
   ```javascript
   // Good - Method with validation and event emission
   useEnergy(amount) {
       if (this.energy < amount) return false;
       const oldEnergy = this.energy;
       this.energy -= amount;
       eventSystem.emit('playerEnergyChanged', { player: this, oldEnergy, energy: this.energy });
       return true;
   }
   
   // Avoid - Direct property modification
   this.energy -= amount;
   ```

6. **Error Handling**: Use try-catch blocks for error-prone operations
   ```javascript
   try {
       const component = entity.addComponent(PlayerComponent);
       component.init();
   } catch (error) {
       console.error('Failed to create player component:', error);
       // Handle the error appropriately
   }
   ```

## LLM Context Optimization

For LLM agents working with this codebase, focus on these key architectural principles:

1. **Entity-Component Pattern**: Game objects are entities with attached components
2. **Event-Driven Communication**: Systems communicate via events, not direct references
3. **Singleton Core Systems**: Core systems are implemented as singletons
4. **Resource Management**: Player resources are managed through PlayerComponent
5. **Action Flow**: Player actions follow a select-action → click-tile → execute pattern
6. **Event Standardization**: Events follow a category:action:subject naming pattern

When modifying code, ensure:
1. Components properly register and clean up event listeners
2. State changes emit appropriate events for other systems
3. New functionality follows the established architectural patterns
4. Systems don't bypass the event system for cross-system communication
5. Entity and component lifecycles are properly managed 