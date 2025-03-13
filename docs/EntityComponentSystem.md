# Entity Component System Architecture

## Overview

This document details the Entity Component System (ECS) architecture implemented in Hexgrid Evolution. It serves as the authoritative reference for maintaining consistency in code structure, terminology, and implementation patterns throughout the codebase.

## Core ECS Architecture

Hexgrid Evolution employs a composition-based ECS architecture with these key components:

1. **Entity**: A container with a unique ID that represents a game object
2. **Component**: A data container that defines specific aspects of an entity's state and behavior
3. **System**: Logic that processes entities based on their component composition
4. **EntityManager**: The central registry that maintains and provides access to all entities

### Key Advantages

- **Composition over Inheritance**: Entities derive behavior from their component composition
- **Separation of Concerns**: Clear boundaries between data (components) and logic (systems)
- **Performance Optimization**: Entity queries and component pooling improve runtime efficiency
- **Maintainability**: Modular approach makes the codebase easier to maintain and extend

## Entity Lifecycle

Entities have a well-defined lifecycle:

1. **Creation**: Entities are created using the `Entity` constructor
2. **Registration**: Added to the `EntityManager` via `entityManager.addEntity()`
3. **Component Attachment**: Components are added using `entity.addComponent()`
4. **Initialization**: The entity and all its components are initialized via `entity.init()`
5. **Updates**: The entity receives `update(deltaTime)` calls each frame
6. **Destruction**: The entity and its components are cleaned up via `entity.destroy()`

```javascript
// Entity creation pattern
const entity = new Entity();
entity.addComponent(ComponentClass, arg1, arg2);
entityManager.addEntity(entity);
entity.init();
```

## Component Lifecycle Hooks

Components implement a comprehensive set of lifecycle hooks:

| Hook | Description | When Called |
|------|-------------|------------|
| `constructor(entity, ...args)` | Initial component setup | When the component is created |
| `onAttach()` | Post-attachment setup | After component is attached to an entity |
| `init()` | Full initialization | When `entity.init()` is called |
| `onEnable()` | Activation logic | When component is enabled |
| `update(deltaTime)` | Frame update | Each active frame for enabled components |
| `onDisable()` | Deactivation logic | When component is disabled |
| `onDetach()` | Pre-detachment cleanup | Before component is removed from entity |
| `destroy()` | Final cleanup | When entity or component is destroyed |
| `reset(...args)` | State reset | When component is reused from pool |

### Lifecycle Flow

```
Entity Creation → Component Constructor → onAttach → init → 
[Active Lifecycle: update, onDisable/onEnable] → 
onDetach → destroy
```

## Component Pooling

To reduce garbage collection and improve performance, components are pooled:

### How Pooling Works

1. **Pre-allocation**: Component pools are initialized during game startup
2. **Retrieval**: When an entity needs a component, it's retrieved from the pool
3. **Reset**: The component's state is reset with new parameters
4. **Return**: When a component is removed, it's returned to the pool for reuse

### Implementation

```javascript
// Pool initialization
this.entityManager.getComponentPool(TileComponent, initialSize, maxSize);

// Component reset method (must be implemented for poolable components)
reset(type, row, col, chaos) {
    this.type = type;
    this.row = row;
    this.col = col;
    this.chaos = chaos;
    this.order = 1 - chaos;
    this.explored = false;
    // Reset other properties...
    this.enabled = true;
}
```

## Entity Queries

Entity queries provide efficient access to entities matching specific criteria:

### Query Types

1. **Component Queries**: Find entities with specific component types
2. **Tag Queries**: Find entities with specific tags
3. **Combined Queries**: Find entities matching both component and tag criteria

### Cached Queries

Queries cache their results and only refresh when entity states change, improving performance.

```javascript
// Create a query for all entities with PlayerComponent
this.playerQuery = this.entityManager.createQuery([PlayerComponent]);

// Create a query for all entities with the 'player' tag
this.playerTagQuery = this.entityManager.createQuery([], ['player']);

// Execute the query
const playerEntities = this.playerQuery.execute();
```

## Spatial Partitioning

For position-based entity lookups, a spatial hash system is implemented:

### Key Features

- Fast entity lookups by position
- Efficient radius searches
- Automatic updates when entities move

```javascript
// Get all tiles within a radius
const tilesInRadius = grid.getTilesInRadius(centerRow, centerCol, radius);
```

## Entity Helper Methods

The `Game` class provides convenient methods for common entity operations:

```javascript
// Get the player entity
const playerEntity = game.getPlayerEntity();

// Get a tile at specific coordinates
const tileEntity = game.getTileEntity(row, col);

// Get the player component directly
const playerComponent = game.getPlayerComponent();

// Get a tile component directly
const tileComponent = game.getTileComponent(row, col);
```

## Best Practices

### Component Design

1. **Single Responsibility**: Each component should handle one aspect of entity behavior
2. **Data-Centric**: Components should primarily store data, with minimal logic
3. **Complete Lifecycle**: Implement all relevant lifecycle hooks
4. **Pool-Ready**: Always implement a proper `reset()` method
5. **Event-Based Communication**: Use the event system for cross-component communication

### Lifecycle Hook Usage

| Hook | Appropriate Uses | Avoid |
|------|-----------------|-------|
| `constructor` | Basic property initialization | DOM operations, global registrations |
| `onAttach` | Register with global systems | Heavy computation, DOM creation |
| `init` | Create DOM elements, full initialization | Assuming external systems are ready |
| `onEnable/onDisable` | Toggle visibility, pause/resume | Resource creation/destruction |
| `onDetach` | Unregister from global systems | Destroying resources |
| `destroy` | Release resources, remove DOM elements | Accessing other components |
| `reset` | Reinitialize all properties | Partial resets |

### Performance Optimizations

1. **Use Component Pools**: Minimize garbage collection
2. **Prefer Cached Queries**: Avoid repetitive entity lookups
3. **Batch DOM Operations**: Minimize direct DOM manipulation
4. **Implement Proper Cleanup**: All resources should be released in `destroy`

## Component Implementation Example

```javascript
export class ExampleComponent extends Component {
    constructor(entity, param1, param2) {
        super(entity);
        this.param1 = param1;
        this.param2 = param2;
        this.someProperty = null;
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
        this.boundHandler = this.handleEvent.bind(this);
        eventSystem.on('some-event', this.boundHandler);
    }
    
    onEnable() {
        // Update visual state
        if (this.element) {
            this.element.classList.remove('disabled');
        }
    }
    
    update(deltaTime) {
        // Update state based on time
        this.someProperty += deltaTime * 0.1;
    }
    
    onDisable() {
        // Update visual state
        if (this.element) {
            this.element.classList.add('disabled');
        }
    }
    
    onDetach() {
        // Unregister from global systems
        eventSystem.off(this.boundHandler);
    }
    
    destroy() {
        // Clean up resources
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
    
    reset(param1, param2) {
        // Reset state for reuse
        this.param1 = param1;
        this.param2 = param2;
        this.someProperty = null;
        this.enabled = true;
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

## Conclusion

The Entity Component System in Hexgrid Evolution provides a robust framework for game object management. By following these patterns and practices, we ensure consistency, performance, and maintainability throughout the codebase. 