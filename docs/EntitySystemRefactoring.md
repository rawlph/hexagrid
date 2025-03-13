# Entity System Refactoring Guide

This document outlines the steps to fully consolidate the Entity Component System (ECS) in the Hexgrid Evolution game during a polishing phase. The current implementation includes backward compatibility layers that can be removed for a cleaner, more efficient codebase.

## Current State

The current entity system has been fully consolidated with:

1. A unified `EntityManager.js` that provides the core functionality
2. Removal of backward compatibility:
   - No re-exports in separate files
   - No global window object assignments
   - No fallback patterns for accessing the entity manager

## Full Consolidation Plan

### Phase 1: Update All Component Classes ✅

- [x] Update `PlayerComponent` to extend the base `Component` class
- [x] Update `TileComponent` to extend the base `Component` class
- [x] Update any other component classes to follow the same pattern

### Phase 2: Remove Backward Compatibility ✅

1. **Remove Entity.js Re-exports**
   - [x] Delete the `Entity.js` file entirely
   - [x] Update all imports to reference `EntityManager.js` directly

2. **Remove Global Window Assignments**
   - [x] Remove all `window.entityManager = entityManager` assignments
   - [x] Remove all `window.Entity = Entity` assignments
   - [x] Remove all `window.Component = Component` assignments

3. **Update EntityManager.js**
   - [x] Remove the `getEntityManagerInstance()` helper function
   - [x] Remove window object checks in the singleton implementation
   - [x] Simplify the singleton pattern

4. **Update All Entity Creation**
   - [x] Ensure all entity creation uses the imported `Entity` class
   - [x] Remove any checks for `window.Entity`

### Phase 3: Modernize the API ✅

1. **Enhance Component Lifecycle**
   - [x] Add more lifecycle hooks (onAttach, onDetach, etc.)
   - [x] Implement a more robust event system for component communication

2. **Improve Performance**
   - [x] Optimize entity queries with spatial partitioning
   - [x] Add component pools for frequently created/destroyed components
   - [x] Implement cached entity queries for faster retrieval

3. **Add Type Safety**
   - [ ] Consider adding TypeScript definitions (future enhancement)
   - [x] Add runtime type checking for component parameters

## Implementation Details

### Updated Import Pattern

All files use this import pattern:

```javascript
import { Entity, Component, entityManager } from './core/EntityManager.js';
```

### Updated Component Pattern

All components follow this pattern:

```javascript
import { Component } from '../core/EntityManager.js';

export class MyComponent extends Component {
    constructor(entity, ...args) {
        super(entity);
        // Component-specific initialization
    }
    
    onAttach() {
        // Called after component is attached to entity
        // Register with global systems or add tags
    }
    
    init() {
        // Called when the entity is initialized
        // Set up DOM elements and event listeners
    }
    
    onEnable() {
        // Called when the component is enabled
    }
    
    update(deltaTime) {
        // Called each frame
    }
    
    onDisable() {
        // Called when the component is disabled
    }
    
    onDetach() {
        // Called before component is removed from entity
        // Unregister from global systems
    }
    
    destroy() {
        // Final cleanup when component is removed
        // Clean up DOM elements and event listeners
    }
    
    reset(...args) {
        // Reset state for reuse from component pool
    }
}
```

### Updated Entity Creation Pattern

Entity creation follows this pattern:

```javascript
import { Entity, entityManager } from './core/EntityManager.js';
import { MyComponent } from './components/MyComponent.js';

// Create entity
const entity = new Entity();

// Add components
entity.addComponent(MyComponent, arg1, arg2);

// Add to entity manager
entityManager.addEntity(entity);

// Initialize
entity.init();
```

## Benefits of Full Consolidation

1. **Reduced Code Size**: Eliminating duplicate implementations and backward compatibility layers
2. **Improved Performance**: More efficient data structures and access patterns
3. **Better Maintainability**: Single source of truth for entity management
4. **Clearer API**: Consistent patterns for entity and component usage
5. **Easier Debugging**: Simplified code paths make issues easier to track

## Status Update

✅ **Completed!** The Entity Component System refactoring has been fully implemented. The system now features:

- Complete component lifecycle hooks: constructor, onAttach, init, onEnable, update, onDisable, onDetach, destroy, reset
- Component pooling for improved performance and reduced garbage collection
- Cached entity queries for efficient entity retrieval
- Spatial partitioning for position-based queries
- Consistent entity and component creation patterns
- Helper methods in the Game class for common entity operations

See the `EntityComponentSystem.md` document for a detailed overview of the current architecture.

## Migration Strategy

1. Create a feature branch for the refactoring
2. Implement changes in small, testable increments
3. Add comprehensive tests for entity and component functionality
4. Test thoroughly with all game systems
5. Merge when all systems are working correctly

## Potential Risks

1. **Breaking Changes**: Some code might rely on the global window assignments
2. **Hidden Dependencies**: There might be implicit dependencies on the current implementation
3. **Performance Regression**: Changes might affect performance in unexpected ways

Mitigate these risks with thorough testing and incremental changes.

## Timeline

1. Phase 1: 1-2 days
2. Phase 2: 2-3 days
3. Phase 3: 3-5 days
4. Testing and refinement: 2-3 days

Total estimated time: 8-13 days of focused work 