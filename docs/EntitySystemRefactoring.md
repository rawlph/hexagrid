# Entity System Refactoring Guide

This document outlines the steps to fully consolidate the Entity Component System (ECS) in the Hexgrid Evolution game during a polishing phase. The current implementation includes backward compatibility layers that can be removed for a cleaner, more efficient codebase.

## Current State

The current entity system has been partially consolidated with:

1. A unified `EntityManager.js` that provides the core functionality
2. Backward compatibility through:
   - Re-exports in `Entity.js`
   - Global window object assignments
   - Fallback patterns for accessing the entity manager

## Full Consolidation Plan

### Phase 1: Update All Component Classes

- [x] Update `PlayerComponent` to extend the base `Component` class
- [x] Update `TileComponent` to extend the base `Component` class
- [ ] Update any other component classes to follow the same pattern

### Phase 2: Remove Backward Compatibility

1. **Remove Entity.js Re-exports**
   - Delete the `Entity.js` file entirely
   - Update all imports to reference `EntityManager.js` directly

2. **Remove Global Window Assignments**
   - Remove all `window.entityManager = entityManager` assignments
   - Remove all `window.Entity = Entity` assignments
   - Remove all `window.Component = Component` assignments

3. **Update EntityManager.js**
   - Remove the `getEntityManagerInstance()` helper function
   - Remove window object checks in the singleton implementation
   - Simplify the singleton pattern

4. **Update All Entity Creation**
   - Ensure all entity creation uses the imported `Entity` class
   - Remove any checks for `window.Entity`

### Phase 3: Modernize the API

1. **Enhance Component Lifecycle**
   - Add more lifecycle hooks (onAttach, onDetach, etc.)
   - Implement a more robust event system for component communication

2. **Improve Performance**
   - Optimize entity queries with spatial partitioning
   - Add component pools for frequently created/destroyed components
   - Implement archetype-based entity storage for faster iteration

3. **Add Type Safety**
   - Consider adding TypeScript definitions
   - Add runtime type checking for component parameters

## Implementation Details

### Updated Import Pattern

All files should use this import pattern:

```javascript
import { Entity, Component, entityManager } from './core/EntityManager.js';
```

### Updated Component Pattern

All components should follow this pattern:

```javascript
import { Component } from '../core/EntityManager.js';

export class MyComponent extends Component {
    constructor(entity, ...args) {
        super(entity);
        // Component-specific initialization
    }
    
    init() {
        // Called when the entity is initialized
    }
    
    update(deltaTime) {
        // Called each frame
    }
    
    destroy() {
        // Cleanup when component is removed
    }
}
```

### Updated Entity Creation Pattern

Entity creation should follow this pattern:

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