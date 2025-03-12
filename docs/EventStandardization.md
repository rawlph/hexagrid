# Hexgrid Evolution: Event Standardization Guide

This document outlines the standardized event naming and data format conventions for the Hexgrid Evolution game. Following these guidelines will ensure consistent event handling across components.

## Event Naming Pattern

All events should follow a consistent naming pattern with colon-separated segments:

```
[category]:[action]:[subject]
```

For example:
- `action:complete:move` - A move action has been completed
- `action:complete:sense` - A sense action has been completed
- `action:complete:interact` - An interact action has been completed
- `action:complete:stabilize` - A stabilize action has been completed

This pattern makes it clear what the event relates to and makes it easier to filter and handle related events.

## Legacy Event Support

For backward compatibility, the code should emit both the new standardized event names and the legacy event names:

```javascript
// Emit standardized event
eventSystem.emit('action:complete:stabilize', eventData);

// Also emit legacy event for backward compatibility
eventSystem.emit('stabilizeComplete', eventData);
```

Over time, as all systems are updated to listen for the standardized events, the legacy event emissions can be phased out.

## Event Data Structure

Event data should be consistent and include all relevant information:

### Action Completion Events

```javascript
{
    player: playerComponent,      // The player component instance
    tileComponent: tileComponent, // The tile component instance (if applicable)
    row: row,                     // Target row
    col: col,                     // Target column
    // Additional action-specific data as needed
}
```

### Resource Change Events

```javascript
{
    player: playerComponent,     // The player component instance
    oldValue: oldValue,          // Previous value
    newValue: newValue,          // Current value
    delta: delta                 // Change amount (can be positive or negative)
}
```

### State Change Events

```javascript
{
    entity: entity,              // The entity whose state changed
    component: component,        // The component that changed
    property: property,          // The property that changed
    oldValue: oldValue,          // Previous value
    newValue: newValue,          // Current value
    delta: delta                 // Change amount (if applicable)
}
```

## Event Listeners

When registering event listeners, store the returned listener reference for proper cleanup:

```javascript
// Good practice
this._registeredEvents.push(
    eventSystem.on('action:complete:move', this.handleMoveComplete.bind(this))
);

// Later, for cleanup
this._registeredEvents.forEach(listener => {
    eventSystem.off(listener);
});
```

## Event Categories

Organize events into the following categories:

### Action Events
- `action:start:[actionType]` - An action has started
- `action:complete:[actionType]` - An action has been completed
- `action:fail:[actionType]` - An action has failed

### System Events
- `system:balance:changed` - System balance has changed
- `system:initialized` - System has been initialized
- `system:evolution:ready` - Evolution is ready (can evolve)

### Entity Events
- `entity:created` - Entity has been created
- `entity:destroyed` - Entity has been destroyed
- `entity:component:added` - Component has been added to an entity
- `entity:component:removed` - Component has been removed from an entity

### Player Events
- `player:moved` - Player has moved
- `player:resource:changed` - Player resource has changed
- `player:trait:added` - Player has acquired a trait
- `player:action:changed` - Player has changed the current action

### UI Events
- `ui:button:clicked` - UI button has been clicked
- `ui:screen:opened` - UI screen has been opened
- `ui:screen:closed` - UI screen has been closed

## Best Practices

1. **Document Events**: Add JSDoc comments for events emitted by a component
2. **Consistent Data**: Always include the same core properties in event data
3. **Avoid Over-Emitting**: Only emit events when state actually changes
4. **Clean Up Listeners**: Always remove event listeners when components are destroyed
5. **Event-First Design**: Design systems to communicate primarily through events for better decoupling

## Event System Architecture

The event system uses a publish-subscribe (pub/sub) pattern:

```javascript
// Publishing an event
eventSystem.emit('action:complete:move', {
    player: playerComponent,
    row: row,
    col: col
});

// Subscribing to an event
const listener = eventSystem.on('action:complete:move', (data) => {
    console.log(`Player moved to (${data.row}, ${data.col})`);
});

// Unsubscribing
eventSystem.off(listener);
```

This architecture allows for loose coupling between components, as they do not need direct references to each other to communicate. 