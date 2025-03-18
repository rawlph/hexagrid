# Hexgrid Evolution: Code Structure & Best Practices Guide

This guide provides a comprehensive overview of the Hexgrid Evolution codebase architecture, patterns, and best practices. Use it as a reference to maintain consistency when extending or modifying the code.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Code Architecture](#code-architecture)
3. [Entity Component System](#entity-component-system)
4. [Event System](#event-system)
5. [Core Systems](#core-systems)
6. [UI Management](#ui-management)
7. [Turn Handling](#turn-handling)
8. [Grid System](#grid-system)
9. [Resource Management](#resource-management)
10. [Code Organization](#code-organization)
11. [Best Practices](#best-practices)
12. [Implementation Examples](#implementation-examples)

## Project Overview

Hexgrid Evolution is a browser-based game built around ecological concepts, using a hexagonal grid for gameplay. The core concept revolves around balancing chaos and order in an evolving ecosystem, with the player progressing through various evolutionary stages.

**Key Principles:**
- Single source of truth for state management
- Consistent coding patterns and practices
- Event-driven communication between systems
- Composition over inheritance
- Module-based organization with clear dependencies

## Code Architecture

The game follows an **Entity Component System (ECS)** architectural pattern combined with an **event-driven** communication model.

### Key Architectural Patterns

1. **ECS Architecture**: Decouples entities (game objects) from their behaviors (components)
2. **Event System**: Facilitates communication between systems using publish/subscribe
3. **Singleton Core Systems**: Central systems are implemented as singletons
4. **ES6 Module System**: Manages dependencies between components

### Directory Structure

```
scripts/
├── core/              # Core systems (Game, Grid, EntityManager, etc.)
├── components/        # Component definitions
├── entities/          # Entity definitions
├── systems/           # Game systems
├── ui/                # UI components
├── utils/             # Utility functions
└── index.js           # Entry point
```

## Entity Component System

The Entity Component System is the foundational architecture for game objects and their behaviors.

### Entities

Entities are game objects with a unique ID that serve as containers for components:

```javascript
// Entity creation pattern
const entity = new Entity();
entity.addComponent(ComponentClass, arg1, arg2);
entityManager.addEntity(entity);
entity.init();
```

### Components

Components encapsulate specific behaviors and data for entities:

```javascript
// Component definition pattern
export class ExampleComponent extends Component {
    constructor(entity, param1, param2) {
        super(entity);
        this.param1 = param1;
        this.param2 = param2;
        this.someProperty = null;
    }
    
    // Lifecycle hooks
    onAttach() { /* Setup when attached to entity */ }
    init() { /* Full initialization */ }
    update(deltaTime) { /* Per-frame updates */ }
    destroy() { /* Clean up resources */ }
}
```

### Entity Manager

The EntityManager is the central registry that tracks all entities and components:

```javascript
// EntityManager usage example
export const entityManager = new EntityManager();

// Add entity with tag
entityManager.addEntity(entity, 'player');

// Query entities
const playerEntities = entityManager.getEntitiesByTag('player');
const tilesWithComponent = entityManager.getEntitiesWithComponent(TileComponent);
```

### Component Lifecycle Hooks

Components implement a comprehensive set of lifecycle hooks:

| Hook | Description | When Called |
|------|-------------|------------|
| `constructor(entity, ...args)` | Initial setup | Component creation |
| `onAttach()` | Post-attachment setup | After attachment to entity |
| `init()` | Full initialization | When entity.init() is called |
| `onEnable()` | Activation logic | When component is enabled |
| `update(deltaTime)` | Frame update | Each active frame |
| `onDisable()` | Deactivation logic | When component is disabled |
| `onDetach()` | Pre-detachment cleanup | Before removal from entity |
| `destroy()` | Final cleanup | When entity/component is destroyed |
| `reset(...args)` | State reset | When reused from pool |

## Event System

The event system enables communication between components and systems without direct references.

### Event Registration

```javascript
// Register an event listener
const registration = eventSystem.on('eventType', (data) => {
    // Handle the event
    console.log('Event received:', data);
});

// Store registration for later cleanup
this._registeredEvents.push(registration);
```

### Event Emission

```javascript
// Emit a standard event
eventSystem.emit('eventType', {
    timestamp: Date.now(),
    // Event-specific data
    someData: 'value'
});

// Emit a standardized event with legacy support (planning to eliminate legacy code)
eventSystem.emitStandardized(
    'legacy-event-name',
    'standardized-event-name',
    {
        timestamp: Date.now(),
        isStandardized: true,
        // Event-specific data
    }
);
```

### Event Cleanup

```javascript
// Clean up event listeners
destroy() {
    // Clean up event listeners
    for (const registration of this._registeredEvents) {
        eventSystem.off(registration);
    }
    this._registeredEvents = [];
}
```

### Standardized Event Types

The codebase uses standardized event types defined in `EventTypes.js`:

```javascript
export const EventTypes = {
    TILE_CLICKED: {
        legacy: 'tileClicked',
        standard: 'tile:clicked'
    },
    PLAYER_MOVED: {
        legacy: 'playerMoved',
        standard: 'player:moved'
    },
    // ... more event types
};
```

## Core Systems

### Game Controller

The Game class (`Game.js`) is the central controller that:
- Initializes and orchestrates all game systems
- Manages the overall game state and lifecycle
- Handles UI updates and user input

```javascript
// Game initialization example
init() {
    // Create core systems
    this.grid = new Grid(options);
    this.turnSystem = new TurnSystem(options);
    
    // Create player entity
    this.createPlayerEntity();
    
    // Initialize UI
    this.initUI();
    
    // Register event listeners
    this.registerEventListeners();
    
    // Start game loop
    this.start();
}
```

### Turn System

The TurnSystem (`TurnSystem.js`) manages:
- Turn start/end transitions
- Game victory/defeat conditions
- Evolution point calculations
- Level completion logic

### Grid System

The Grid class (`Grid.js`) manages:
- Hexagonal grid and tile generation
- System-wide chaos/order balance
- Coordinate calculations and adjacency
- Tile interaction handling

### Entity Manager

The EntityManager (`EntityManager.js`) is responsible for:
- Entity reference tracking
- Component registration and retrieval
- Entity tagging for fast lookups
- Entity creation and destruction lifecycle

## UI Management

### UI Update Pattern

UI updates follow this consistent pattern:

1. **Event-Driven Updates**: Components emit events when state changes
2. **Listener Registration**: UI components register for relevant events
3. **Handler Implementation**: Event handlers update the UI state and DOM
4. **Cleanup**: UI components clean up listeners when destroyed

```javascript
// Example of UI update pattern from ActionPanel.js
class ActionPanel {
    // Register for events affecting UI state
    registerEventListeners() {
        this._registeredEvents.push(
            eventSystem.on(EventTypes.PLAYER_ENERGY_CHANGED.standard, this.updateButtonStates.bind(this))
        );
    }
    
    // Update UI based on state changes
    updateButtonStates() {
        // Get player component
        const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
        if (!playerEntity) return;
        
        const playerComponent = playerEntity.getComponent(PlayerComponent);
        if (!playerComponent) return;
        
        // Update UI based on player state
        for (const button of Object.values(this.buttons)) {
            if (button) button.classList.remove('active');
        }
        
        if (playerComponent.currentAction && this.buttons[playerComponent.currentAction]) {
            this.buttons[playerComponent.currentAction].classList.add('active');
        }
        
        // Disable buttons based on resource availability
        const hasMovementPoints = playerComponent.movementPoints > 0;
        if (this.buttons.move) this.buttons.move.disabled = !hasMovementPoints;
        // ... more button updates
    }
    
    // Clean up when no longer needed
    destroy() {
        // Remove event listeners
        for (const registration of this._registeredEvents) {
            eventSystem.off(registration);
        }
        this._registeredEvents = [];
        
        // Clean up DOM references
        // ...
    }
}
```

### Message System

For user feedback, the MessageSystem provides standardized notifications:

```javascript
// Show feedback to the user
showFeedback(message, type = '', duration = 2000, addToLog = false, category = '') {
    if (this.messageSystem) {
        // Show feedback popup
        this.messageSystem.showFeedbackMessage(message, duration, type, category);
        
        // Also add to game log if requested
        if (addToLog) {
            let logType = 'system';
            if (type === 'success') logType = 'player';
            if (type === 'error' || type === 'warning') logType = 'event';
            
            this.messageSystem.addLogMessage(message, logType);
        }
    }
}
```

### Message System Enhancements

The MessageSystem now includes advanced features for handling rapid gameplay and message clutter:

```javascript
class MessageSystem {
    constructor() {
        this.messageQueue = [];
        this.maxQueueSize = 5;
        this.isCompactMode = false;
        this._lastMessageTimestamp = 0;
        this._coalescedMessages = new Map();
    }

    showFeedbackMessage(message, duration = 2000, type = '', category = '') {
        // Check for similar messages within 1 second
        const now = Date.now();
        const similarMessage = this._findSimilarMessage(message, now - 1000);
        
        if (similarMessage) {
            // Coalesce similar messages
            const count = (similarMessage.count || 1) + 1;
            const coalescedMessage = this._formatCoalescedMessage(message, count);
            
            // Update existing message
            this._updateExistingMessage(similarMessage.id, coalescedMessage, count);
        } else {
            // Add new message to queue
            this._addNewMessage({
                content: message,
                type,
                category,
                timestamp: now,
                duration: this._calculateDuration(duration)
            });
        }
        
        // Manage queue size
        this._enforceQueueLimit();
    }

    _calculateDuration(baseDuration) {
        // Reduce duration during rapid gameplay
        return this.isCompactMode ? baseDuration * 0.6 : baseDuration;
    }

    _findSimilarMessage(message, timeThreshold) {
        return this.messageQueue.find(msg => 
            msg.timestamp > timeThreshold &&
            this._calculateMessageSimilarity(msg.content, message) >= 0.7
        );
    }

    _calculateMessageSimilarity(msg1, msg2) {
        // Strip HTML and compare text content
        const text1 = this._stripHTML(msg1);
        const text2 = this._stripHTML(msg2);
        
        // Implement similarity calculation (e.g., Levenshtein distance)
        return /* similarity score between 0 and 1 */;
    }

    _formatCoalescedMessage(message, count) {
        const baseMessage = this._stripHTML(message);
        return `${baseMessage} (×${count})`;
    }

    _enforceQueueLimit() {
        while (this.messageQueue.length > this.maxQueueSize) {
            // Remove oldest non-critical message
            const index = this.messageQueue.findIndex(msg => msg.type !== 'critical');
            if (index >= 0) {
                this.messageQueue.splice(index, 1);
            } else {
                break;
            }
        }
    }
}
```

### UI Styling Patterns

The UI follows consistent styling patterns for visual feedback and theming:

```css
/* Deep-sea theme variables */
:root {
    --deep-blue: #001f3f;
    --biolum-glow: #00ff9d;
    --ocean-gradient: linear-gradient(180deg, var(--deep-blue) 0%, #000913 100%);
    --feedback-shadow: 0 0 15px var(--biolum-glow);
}

/* Feedback message positioning */
#feedback-message {
    position: absolute;
    bottom: 200px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    background: rgba(0, 31, 63, 0.9);
    border: 1px solid var(--biolum-glow);
    box-shadow: var(--feedback-shadow);
    padding: 10px 20px;
    border-radius: 4px;
    transition: opacity 0.3s ease;
}

/* Responsive design */
@media (max-width: 768px) {
    #feedback-message {
        width: 90%;
        max-width: 400px;
    }
}

/* Animation patterns */
.message-enter {
    animation: slideUp 0.3s ease-out;
}

.message-exit {
    animation: fadeOut 0.3s ease-in;
}

@keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}
```

### Enhanced Event System

The event system now includes transaction-based handling and migration support:

```javascript
class EventSystem {
    constructor() {
        this.listeners = new Map();
        this.transactionStack = [];
        this.migrationStatus = new Map();
    }

    emitWithTransaction(eventType, data, sourceAction = null) {
        // Start transaction
        const transaction = {
            id: crypto.randomUUID(),
            sourceAction,
            events: []
        };
        
        this.transactionStack.push(transaction);
        
        try {
            // Emit event
            this.emit(eventType, {
                ...data,
                transactionId: transaction.id,
                sourceAction
            });
            
            // Track for migration
            this._updateMigrationStats(eventType, sourceAction);
        } finally {
            // End transaction
            this.transactionStack.pop();
        }
    }

    _updateMigrationStats(eventType, sourceAction) {
        const stats = this.migrationStatus.get(eventType) || {
            totalEmissions: 0,
            sourceActions: new Map(),
            lastEmission: null
        };
        
        stats.totalEmissions++;
        if (sourceAction) {
            const actionCount = stats.sourceActions.get(sourceAction) || 0;
            stats.sourceActions.set(sourceAction, actionCount + 1);
        }
        stats.lastEmission = Date.now();
        
        this.migrationStatus.set(eventType, stats);
    }

    checkEventMigrationReadiness(legacyType, standardType) {
        const legacyStats = this.migrationStatus.get(legacyType);
        const standardStats = this.migrationStatus.get(standardType);
        
        return {
            isReady: this._calculateMigrationReadiness(legacyStats, standardStats),
            analysis: {
                legacyUsage: legacyStats?.totalEmissions || 0,
                standardUsage: standardStats?.totalEmissions || 0,
                commonSources: this._findCommonSources(legacyStats, standardStats)
            }
        };
    }
}
```

These enhancements maintain the codebase's principles while adding modern features for improved user experience and maintainability.

## Turn Handling

The turn system manages the flow of gameplay through discrete turns.

### Turn Flow Example

```javascript
// End turn handling in ActionPanel.js
handleEndTurnClick() {
    // Clear current action
    this.currentAction = null;
    
    // Clear player component action if needed
    const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
    if (playerEntity) {
        const playerComponent = playerEntity.getComponent(PlayerComponent);
        if (playerComponent && playerComponent.currentAction !== null) {
            playerComponent.setAction(null);
        }
    }
    
    // End the turn through the appropriate system
    if (this.turnSystem) {
        // Direct dependency - best practice
        this.turnSystem.endTurn();
    } else if (window.game) {
        // Fallback to global game instance
        window.game.endTurn();
    }
    
    // Update UI state
    this.updateButtonStates();
}
```

### Turn Response Handling

```javascript
// Handle turn start event
onTurnStart(data) {
    // Reset action selection
    this.currentAction = null;
    
    // Reset player component state if needed
    const playerEntity = this.entityManager.getEntitiesByTag('player')[0];
    if (playerEntity) {
        const playerComponent = playerEntity.getComponent(PlayerComponent);
        if (playerComponent && playerComponent.currentAction !== null) {
            playerComponent.setAction(null);
        }
    }
    
    // Update UI
    this.updateButtonStates();
}
```

## Grid System

The Grid system manages the hexagonal grid and tile entities.

### Grid Generation

The grid is generated at game initialization:

```javascript
// Grid generation (conceptual)
initializeGrid(rows, cols) {
    // Create grid data structure
    this.tiles = [];
    
    // Generate tile entities
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            // Create tile entity
            const tileEntity = new Entity();
            
            // Add tile component with initial properties
            const tileType = this.determineTileType(row, col);
            const chaos = this.generateInitialChaos(row, col);
            tileEntity.addComponent(TileComponent, tileType, row, col, chaos);
            
            // Add tag for fast lookup
            tileEntity.addTag(`tile_${row}_${col}`);
            
            // Register with entity manager
            entityManager.addEntity(tileEntity);
            
            // Initialize the entity
            tileEntity.init();
            
            // Store in grid data structure
            this.tiles.push(tileEntity);
        }
    }
    
    // Emit grid initialized event
    eventSystem.emit('gridInitialized', {
        rows: rows,
        cols: cols,
        timestamp: Date.now()
    });
}
```

### Grid and Action Panel Integration

The Action Panel interacts with the Grid through events and direct references:

```javascript
// ActionPanel integration with Grid
class ActionPanel {
    constructor(options = {}) {
        // Store grid reference
        this.grid = options.grid || null;
    }
    
    // Handle tile clicks from grid
    handleTileClick(data) {
        // Get clicked tile coordinates
        const { row, col } = data;
        
        // Process action on tile
        this.executeAction(action, row, col, playerComponent);
    }
    
    // Update grid system balance
    updateSystemBalance(chaosDelta) {
        if (this.grid) {
            const scaledDelta = chaosDelta / 5;
            this.grid.updateSystemBalance(scaledDelta);
        }
    }
}
```

## Resource Management

### Energy Management

```javascript
// Energy usage in PlayerComponent
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

### Movement Points Management

```javascript
// Movement points usage
useMovementPoints(amount) {
    // Check if we have enough points
    if (this.movementPoints < amount) return false;
    
    // Store old value
    const oldPoints = this.movementPoints;
    
    // Deduct points
    this.movementPoints = Math.max(0, this.movementPoints - amount);
    
    // Emit event
    eventSystem.emit('playerMovementPointsChanged', {
        player: this,
        oldPoints: oldPoints,
        points: this.movementPoints,
        delta: this.movementPoints - oldPoints
    });
    
    return true;
}
```

## Code Organization

### ES6 Module System

The codebase uses ES6 modules for organization and dependency management:

```javascript
// Exporting classes and singletons
export class MetricsSystem {
    // Class implementation
}

// Exporting a singleton instance
export const metricsSystem = new MetricsSystem();

// Importing dependencies
import { eventSystem } from './EventSystem.js';
import { entityManager } from './EntityManager.js';
```

### File Organization

- **Single Responsibility**: Each file should handle one component or system
- **Explicit Exports**: Files should clearly export their public API
- **Avoid Circular Dependencies**: Files should not cyclically depend on each other
- **Group Related Functionality**: Related components should be in the same directory

## Best Practices

### Event Handling Best Practices

1. **Registration Storage**: Always store event registrations for cleanup
2. **Standardized Events**: Use events defined in EventTypes.js
3. **Complete Cleanup**: Always clean up listeners in destroy method
4. **Proper Context Binding**: Bind event handlers to preserve 'this'
5. **Event Data Standards**: Include timestamp in all event data

```javascript
// Event registration best practice
constructor() {
    // Initialize registration array
    this._registeredEvents = [];
}

init() {
    // Register with proper binding
    this._registeredEvents.push(
        eventSystem.on('eventType', this.handleEvent.bind(this))
    );
}

destroy() {
    // Clean up all registrations
    for (const registration of this._registeredEvents) {
        eventSystem.off(registration);
    }
    this._registeredEvents = [];
}
```

### Entity Component Best Practices

1. **Component Access**: Use type-safe component access methods
2. **Entity Lifecycle**: Properly manage entity creation and destruction
3. **Component Initialization**: Always call entity.init() after setup
4. **Tag Naming**: Use consistent tag naming conventions
5. **Entity Queries**: Use cached queries for repeated lookups

```javascript
// Component access best practice
// Good - Type-safe and clear
const playerComponent = entity.getComponent(PlayerComponent);

// Avoid - String-based lookup is error-prone
const playerComponent = entity.components.get('PlayerComponent');
```

### State Management Best Practices

1. **Event Emission**: Emit events for all state changes
2. **Method Validation**: Validate inputs in state-changing methods
3. **Immutable State**: Store old state before changing for event emission
4. **Proper Accessors**: Use methods rather than direct property access
5. **Resource Management**: Use resource-specific methods with validation

```javascript
// State change best practice
// Good - Method with validation and event emission
useEnergy(amount) {
    if (this.energy < amount) return false;
    const oldEnergy = this.energy;
    this.energy -= amount;
    eventSystem.emit('playerEnergyChanged', { 
        player: this, 
        oldEnergy, 
        energy: this.energy 
    });
    return true;
}

// Avoid - Direct property modification
this.energy -= amount;
```

## Implementation Examples

### Component Definition Example

```javascript
export class ExampleComponent extends Component {
    constructor(entity, param1, param2) {
        super(entity);
        this.param1 = param1;
        this.param2 = param2;
        this.someProperty = null;
        this._registeredEvents = [];
    }
    
    onAttach() {
        // Register with global systems
        if (!this.entity.hasTag('example')) {
            this.entity.addTag('example');
        }
    }
    
    init() {
        // Create DOM elements or setup complex state
        this.someProperty = this.calculateSomething();
        
        // Set up event listeners
        this._registeredEvents.push(
            eventSystem.on('some-event', this.handleEvent.bind(this))
        );
    }
    
    update(deltaTime) {
        // Update state based on time
        this.someProperty += deltaTime * 0.1;
    }
    
    destroy() {
        // Clean up event listeners
        for (const registration of this._registeredEvents) {
            eventSystem.off(registration);
        }
        
        // Clean up resources
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
    
    handleEvent(data) {
        // Event handler implementation
    }
    
    calculateSomething() {
        // Implementation detail
        return 42;
    }
}
```

### Action Execution Example

```javascript
// From ActionPanel.js - Example of action execution pattern
executeAction(action, row, col, playerComponent) {
    // Get target tile component
    const targetEntity = this.entityManager.getEntitiesByTag(`tile_${row}_${col}`)[0];
    if (!targetEntity) return;
    
    const tileComponent = targetEntity.getComponent(TileComponent);
    if (!tileComponent) return;
    
    // Check if energy cost can be paid
    const energyCost = playerComponent.getActionCost(action, row, col);
    if (energyCost < 0 || playerComponent.energy < energyCost) {
        this.showFeedback(`Not enough energy for ${action}`, 'warning');
        return;
    }
    
    // Check adjacency
    const isAdjacent = playerComponent.isAdjacentTo(row, col);
    if (!isAdjacent) {
        this.showFeedback(`You can only ${action} adjacent tiles`, 'warning');
        return;
    }
    
    // Execute action based on type
    let success = false;
    switch (action) {
        case 'move':
            success = this.executeMoveAction({ 
                player: playerComponent, 
                tileComponent, 
                row, 
                col 
            });
            break;
        // Other action cases...
    }
    
    // Handle result
    if (success) {
        // Consume resources
        playerComponent.useEnergy(energyCost);
        playerComponent.useMovementPoints(1);
        
        // Update UI
        this.updateButtonStates();
    } else {
        this.showFeedback(`${action} action failed`, 'warning');
    }
}
```

### UI Initialization Example

```javascript
// UI initialization example
init(messageSystem, options = {}) {
    // Clean up previous initialization if needed
    if (this._initialized) {
        this.destroy();
    }
    
    // Reset state
    this.clickHandlers = {};
    this._registeredEvents = [];
    
    // Set dependencies
    this.messageSystem = messageSystem;
    this.turnSystem = options.turnSystem || this.turnSystem;
    this.grid = options.grid || this.grid;
    
    // Get references to DOM elements
    this.buttons = {
        move: document.getElementById('move-btn'),
        sense: document.getElementById('sense-btn'),
        interact: document.getElementById('interact-btn'),
        stabilize: document.getElementById('stabilize-btn'),
        endTurn: document.getElementById('end-turn-btn')
    };
    
    // Set up event listeners
    this.setupButtonListeners();
    this.registerEventListeners();
    
    // Initialize state
    this.currentAction = null;
    this._initialized = true;
}
```

By following these patterns and best practices, we maintain code consistency and a single source of truth throughout the Hexgrid Evolution codebase. 