# Hexgrid Evolution: Game Logic Reference

This document provides a detailed overview of the game logic, state management, resource management, and game loop in Hexgrid Evolution. It's designed to help understand how the game functions from a semantic and mechanical perspective.

## Core Game Loop

The game follows a turn-based structure with the following cycle:

1. **Turn Start**
   - Player resources are replenished
   - UI is updated to reflect the new turn
   - Any turn-start effects are applied

2. **Player Actions**
   - Player selects an action (Move, Sense, Interact, Stabilize)
   - Player clicks on tiles to execute the selected action
   - Actions consume resources (energy or movement points)
   - Actions can affect the chaos/order balance

3. **Turn End**
   - Evolution points are calculated based on the chaos/order balance
   - Points are awarded to the player
   - Evolution readiness is checked
   - Turn counter is incremented
   - Next turn begins

4. **Level Completion**
   - When enough evolution points are accumulated, the EVOLVE button appears
   - Player clicks EVOLVE to complete the level
   - Completion screen shows achievements and options
   - Player can view stats, evolve traits, or proceed to the next level

## State Management

### Global Game State

The game's global state is primarily managed by the `Game` class, which:
- Maintains references to all core systems
- Tracks whether the game is initialized or running
- Manages UI state and interactions
- Handles transitions between different game states

Key properties in the Game class:
```javascript
this.grid = null;          // Reference to the grid system
this.turnSystem = null;    // Reference to the turn system
this.isInitialized = false; // Whether the game is initialized
```

### Entity States

Entity state is managed through the Entity Component System (ECS):

1. **Entities**: Represent game objects (player, tiles)
2. **Components**: Store state data for specific aspects of entities
3. **Systems**: Process and update component data

The ECS implementation features:
- Component lifecycle hooks (constructor, onAttach, init, onEnable, update, onDisable, onDetach, destroy, reset)
- Component pooling for performance optimization
- Cached entity queries for efficient entity retrieval
- Spatial partitioning for position-based queries

This approach allows for:
- Separation of data (state) from logic
- Focused components that manage specific aspects of state
- Flexible composition of entities with different capabilities
- Efficient memory management through component pooling
- Optimal performance for entity lookups

### Player State

Managed by the `PlayerComponent` class:

```javascript
// Position
this.row = startRow;
this.col = startCol;

// Resources
this.energy = 10;
this.maxEnergy = 10;
this.movementPoints = 3;
this.maxMovementPoints = 3;

// Evolution
this.chaosEvolutionPoints = 0;
this.flowEvolutionPoints = 0;
this.orderEvolutionPoints = 0;
this.traits = [];

// Action state
this.currentAction = null;

// Stats tracking
this.tilesExplored = 0;
this.movesMade = 0;
this.actionsPerformed = 0;
this.turnsCompleted = 0;
```

### Tile State

Managed by the `TileComponent` class:

```javascript
// Tile properties
this.type = type;          // normal, energy, chaotic, orderly, obstacle
this.row = row;
this.col = col;
this.chaos = chaos;        // 0.0 to 1.0
this.order = 1 - chaos;
this.explored = false;

// Action costs
this.actionCosts = {
    move: 1,
    sense: 1,
    interact: 1,
    stabilize: 1
};

// Effects
this.energyValue = 0;      // For energy tiles
this.stabilizeEffect = 0;  // For stabilize action
this.interactEffect = 0;   // For interact action
this.isBlocked = false;    // For obstacle tiles
```

### Game Stage State

Managed by the `TurnSystem` class:

```javascript
// Game stage
this.gameStage = gameStage; // early, mid, late

// Turn tracking
this.turnCount = 1;
this.maxTurns = 30;

// Evolution state
this.canEvolve = false;
```

## State Transitions

### Action Selection Transitions

1. Initial State: No action selected
2. Player clicks an action button
3. Action is set in PlayerComponent
4. UI updates to highlight the selected action
5. Player clicks a tile
6. ActionPanel executes the corresponding action
7. State returns to no action selected

### Action Execution Flow

1. **Button Click**:
   - Player clicks an action button in the UI
   - ActionPanel.handleActionButtonClick is triggered
   - Sets the current action in PlayerComponent
   - UI updates to show the selected action

2. **Tile Click**:
   - Player clicks a tile
   - Grid emits the 'tileClicked' event
   - ActionPanel receives the event and processes it
   - Game.handleTileClick also receives the event but delegates to ActionPanel

3. **Action Processing**:
   - ActionPanel checks if the action is valid (adjacent tile, enough resources)
   - If valid, the action is executed by the appropriate method
   - Resources are consumed (energy, movement points)
   - Action effects are applied to the tile and system balance
   - Feedback is provided to the player

### Turn Transitions

1. Turn N State:
   - Player has resources
   - Player can perform actions
2. Player clicks End Turn button
3. TurnSystem processes end of turn
4. Evolution points are awarded
5. Turn N+1 State:
   - Resources are replenished
   - Turn counter is incremented

### Level Completion Transitions

1. Playing State:
   - Player accumulates evolution points
   - EVOLVE button is hidden
2. Evolution Ready State:
   - Player reaches required points threshold
   - EVOLVE button appears
3. Level Completion State:
   - Player clicks EVOLVE button
   - Completion screen is shown
4. Next Level State:
   - New grid is generated
   - Player is placed at starting position
   - Evolution points are retained

## Resource Management

### Energy

- **Purpose**: Powers special actions (Sense, Interact, Stabilize)
- **Starting Value**: 10
- **Consumption**:
  - Sense: 1-3 energy depending on tile type
  - Interact: 1-4 energy depending on tile type
  - Stabilize: 2-5 energy depending on tile type
- **Replenishment**:
  - Start of turn: +5 energy (base value)
  - Energy tiles: +1-3 energy when interacted with
- **Cap**: maxEnergy (10 by default, can be increased with traits)
- **Implementation**: Managed in PlayerComponent

### Movement Points

- **Purpose**: Powers movement across the grid
- **Starting Value**: 3
- **Consumption**:
  - Move: 1 point per tile moved
- **Replenishment**:
  - Start of turn: +3 movement points (base value)
- **Cap**: maxMovementPoints (3 by default, can be increased with traits)
- **Implementation**: Managed in PlayerComponent

### Evolution Points

- **Purpose**: Measure progress toward evolution and used for purchasing traits
- **Types**:
  - Chaos Points: Earned when chaos > 55%
  - Flow Points: Earned most efficiently when chaos≈order (45-55%)
  - Order Points: Earned when order > 55%
- **Calculation**:
  - Points awarded at the end of each turn
  - Amount based on current chaos/order balance
  - Multiplier based on game stage (early: 1x, mid: 2x, late: 3x)
- **Spending**: Used to purchase evolution traits in the Evolution Screen
- **Implementation**: Tracked in PlayerComponent, awarded by TurnSystem

## Balance System

The chaos/order balance is a core mechanic affecting gameplay:

### Global Balance

- Measured as percentages (chaos% + order% = 100%)
- Visualized by the balance bar in the UI
- Affects what type of evolution points are earned
- Shifts based on player interactions with tiles

### Tile Balance

- Each tile has an individual chaos/order value (0.0 to 1.0)
- Chaos: chaotic potential of a tile (higher = more chaotic)
- Order: orderly potential of a tile (higher = more orderly)
- Always sum to 1.0 (if chaos = 0.7, then order = 0.3)

### Balance Manipulation

Player can affect balance through:

1. **Interact Action**:
   - On chaotic tiles: Increases chaos by +0.2
   - On orderly tiles: Decreases chaos by -0.2 (increases order)

2. **Stabilize Action**:
   - On any tile: Moves chaos/order toward target values
   - More effective on highly imbalanced tiles

### Balance Effects

1. **Action Costs**:
   - Higher chaos tiles typically have higher action costs
   - Higher order tiles may have lower action costs

2. **Evolution Points**:
   - Balanced system (45-55%): Maximizes flow points
   - Chaos-dominant system (>55% chaos): Awards chaos points
   - Order-dominant system (>55% order): Awards order points

3. **Level Generation**:
   - Next level's balance is influenced by player's play style
   - Players who favor chaos will find more ordered worlds
   - Players who favor order will find more chaotic worlds

## Trait System

The game features an evolution trait system that allows players to enhance their capabilities:

### Trait Categories

Traits are organized into five main categories:

1. **Movement**: Enhance mobility and traversal
   - Example: "Swift Movement" increases movement points by 1
   - Example: "Efficient Movement" reduces energy cost of movement

2. **Sense**: Improve perception and information gathering
   - Example: "Enhanced Senses" reduces energy cost of sensing
   - Example: "Deep Insight" provides more information when sensing

3. **Manipulation**: Better interaction with the environment
   - Example: "Powerful Stabilizer" increases stabilize action effect by 50%
   - Example: "Efficient Manipulation" reduces energy cost of interact and stabilize

4. **Adaptation**: Defensive and survival traits
   - Example: "Aquatic Adaptation" allows movement through water tiles
   - Example: "Mountaineer" reduces movement cost on mountain tiles

5. **Survival**: Resource management and regeneration
   - Example: "Energy Efficiency" grants extra energy each turn
   - Example: "Regeneration" recovers energy when exploring new tiles

### Trait Implementation

Each trait is defined with the following structure:

```javascript
{
    id: 'trait_id',
    name: 'Trait Name',
    description: 'Description of what the trait does',
    cost: 3, // Evolution points cost
    category: 'category_name',
    onAcquire: (player) => {
        // Function that runs when trait is acquired
        // Can modify player stats directly
    },
    modifiesActionCost: (action, cost, tile) => {
        // Function that modifies action costs
        // Returns the modified cost
        if (action === 'specific_action') {
            return Math.max(1, cost - 1);
        }
        return cost;
    }
}
```

### Action Cost Calculation

The `getActionCost` method in `PlayerComponent` calculates the final cost of an action by:

1. Getting the base cost from the tile
2. Applying trait modifiers that affect action costs
3. Ensuring the cost never goes below zero

```javascript
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
```

### Trait Persistence

Traits persist between levels and are saved with the player state. When loading a saved game:

1. Trait IDs are stored rather than the full trait objects
2. On game initialization, traits are reapplied from the EvolutionSystem
3. The `applyAllTraitEffects` method ensures all trait effects are properly applied

## User Interface Structure

The UI is organized into several key sections:

1. **Game Info Bar**:
   - Energy display
   - Turn counter
   - Balance bar
   - Evolution points display

2. **Grid Container**:
   - Hexagonal grid of tiles
   - Player marker
   - EVOLVE button (when available)

3. **Action Panel**:
   - Move button
   - Sense button
   - Interact button
   - Stabilize button
   - End Turn button

4. **Message Log**:
   - Game events and notifications
   - Timestamped entries

5. **Modal Windows**:
   - Level completion screen
   - Stats screen
   - Evolution screen

## Important Events

The event system is central to communication between components:

### Turn Events
- **turnStart**: New turn begins
- **turnEnd**: Current turn ends

### Player Events
- **playerMoved**: Player changes position
- **playerEnergyChanged**: Player energy changes. Event data includes:
  - `energy`: Current energy level (standard property)
  - `oldEnergy`: Previous energy level
  - `delta`: Change in energy
  - `maxEnergy`: Maximum energy capacity (if available)
  - `energyUsed`/`energyRestored`: Amount used or gained (for metrics)
- **playerMovementPointsChanged**: Player movement points change
- **playerEvolutionPointsChanged**: Player evolution points change
- **playerActionChanged**: Player selects a different action
- **playerTraitAdded**: Player acquires a new trait

### Tile Events
- **tileClicked**: Player clicks a tile
- **tileExplored**: Tile is discovered
- **tileChaosChanged**: Tile chaos/order balance changes

### System Events
- **gridInitialized**: Hex grid is created
- **systemBalanceChanged**: Global chaos/order balance changes
- **evolutionPointsAwarded**: Points are awarded at turn end
- **evolutionReady**: Player has enough points to evolve

## Game Initialization

The game follows this initialization sequence:

1. **Load Modules**:
   - index.js imports required modules
   - Global access to core systems is established

2. **Create Game Instance**:
   - window.game is set to a new Game instance

3. **Initialize Game**:
   - Grid is created based on size and game stage
   - TurnSystem is created based on game stage
   - Player entity is created at starting position
   - UI elements are initialized
   - Event listeners are set up

4. **Start Game Loop**:
   - First turn begins
   - Player is ready to take actions

## Implementation Notes

### Hex Grid Implementation

The game uses an offset coordinate system for the hex grid:
- Even/odd row system (odd rows are offset)
- Each tile has row and column coordinates
- Adjacent tiles calculated via offset formulas

### Evolution Points Calculation

Points awarded based on system balance:
```javascript
// Flow points (highest at perfect 50/50 balance)
if (balanceDeviation <= balanceThreshold) {
    // Within balanced range (45-55% chaos)
    const flowFactor = 1 - (balanceDeviation / balanceThreshold);
    flowPoints = Math.round((6 * flowFactor + 3) * multiplier);
} else {
    // Outside balanced range
    const flowBase = Math.max(0, 3 - (balanceDeviation - balanceThreshold) * 10);
    flowPoints = Math.max(1, Math.round(flowBase * multiplier));
}

// Chaos points (only when chaos > 55%)
if (chaos > specializationThreshold) {
    const chaosDepth = chaos - specializationThreshold;
    chaosPoints = Math.round((chaosDepth * 18) * multiplier);
}

// Order points (only when order > 55%)
if (order > specializationThreshold) {
    const orderDepth = order - specializationThreshold;
    orderPoints = Math.round((orderDepth * 18) * multiplier);
}
```

### Level Completion Criteria

Evolution thresholds by game stage:
- Early stage: 50 total evolution points
- Mid stage: 100 total evolution points
- Late stage: 150 total evolution points

When threshold is reached:
- 'evolutionReady' event is emitted
- EVOLVE button appears
- Player can complete the level

## Common Issues and Troubleshooting

1. **Action Cost Errors**: If you encounter "TypeError: playerComponent.getActionCost is not defined" when performing actions, ensure that:
   - The PlayerComponent class has the getActionCost method implemented
   - The necessary imports (TileComponent, entityManager) are present in PlayerComponent.js
   - The method is properly defined with all required parameters

2. **Trait Effects Not Applied**: If trait effects don't seem to be working:
   - Check that the trait's onAcquire or modifiesActionCost functions are properly defined
   - Verify that traits are being saved and loaded correctly between levels
   - Ensure the applyAllTraitEffects method is called when loading a saved game

3. **Evolution Points Issues**: If evolution points aren't being awarded correctly:
   - Check the chaos/order balance calculation in the TurnSystem
   - Verify that the playerEvolutionPointsChanged event is being emitted
   - Ensure the UI is properly updated when points change

4. **Action Delegation Issues**: If actions don't seem to be executing properly:
   - Verify that window.actionPanel is properly set in the UIManager
   - Check that all actions properly update the system balance
   - Ensure Game.js is properly delegating to ActionPanel
   - Look for errors in the console related to action execution

## Architectural Improvements

The game employs a delegation pattern for action execution:

1. **Centralized Action Execution**: ActionPanel is the primary handler for executing actions, eliminating redundancy
2. **Delegation Pattern**: Game.handleTileClick delegates to ActionPanel for action execution
3. **Fallback Mechanism**: If ActionPanel isn't available, Game can still handle actions directly
4. **Global Accessibility**: ActionPanel is made available globally via window.actionPanel
5. **Clear Boundaries**: Game coordinates high-level game flow, while ActionPanel handles UI and action execution details

This approach reduces code duplication, improves maintainability, and ensures consistent behavior across the game.

## Next Development Priorities

1. **Evolution Screen Enhancement**:
   - Improved UI for the evolution screen
   - More detailed trait descriptions and effects visualization
   - Better categorization and filtering of available traits

2. **Trait System Expansion**:
   - More traits with unique effects
   - Trait prerequisites and upgrade paths
   - Special traits unlocked by specific achievements

3. **Game Balance Refinement**:
   - Fine-tuning of point award amounts
   - Adjustment of action costs
   - Balance progression across game stages 