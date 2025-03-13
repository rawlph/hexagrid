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

## Current Implementation Status

The codebase shows mixed adoption of the standardized event naming pattern:

- The UI modules, especially MessageSystem, listen for standardized events like `action:complete:move`
- The ActionPanel emits standardized events for actions, such as `action:complete:move`
- The MetricsSystem listens for standardized action events
- Many other events in the system still use legacy naming formats

## Legacy Event Support & Transition Plan

For backward compatibility, continue to emit both standardized and legacy events where needed:

```javascript
// Emit standardized event
eventSystem.emit('action:complete:stabilize', eventData);

// Also emit legacy event for backward compatibility
eventSystem.emit('stabilizeComplete', eventData);
```

Implementation steps for standardization:
1. First update event emissions to include both formats
2. Then update listeners to use the standardized format
3. Finally, remove legacy event emissions once all systems have been updated

## Event Data Structure

Event data should be consistent and include all relevant information:

### Action Completion Events

```javascript
{
    player: playerComponent,      // The player component instance
    tileComponent: tileComponent, // The tile component instance (if applicable)
    row: row,                     // Target row
    col: col,                     // Target column
    timestamp: Date.now(),        // Automatically added by EventSystem
    // Additional action-specific data as needed
}
```

### Resource Change Events

```javascript
{
    player: playerComponent,     // The player component instance
    oldValue: oldValue,          // Previous value (e.g., oldEnergy)
    newValue: newValue,          // Current value (e.g., energy)
    delta: delta,                // Change amount (can be positive or negative)
    timestamp: Date.now(),       // Automatically added by EventSystem
    // Resource-specific properties (e.g., energyRestored)
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
    delta: delta,                // Change amount (if applicable)
    timestamp: Date.now(),       // Automatically added by EventSystem
}
```

## Event Listeners and Cleanup

When registering event listeners, follow these best practices:

1. Store the registration reference returned by eventSystem.on()
2. Clean up all listeners when the component is destroyed
3. Use bound methods to maintain proper context

```javascript
// In component initialization
this._registeredEvents = [];
this._registeredEvents.push(
    eventSystem.on('action:complete:move', this.handleMoveComplete.bind(this))
);

// In component destruction
destroy() {
    // Clean up event listeners
    for (const registration of this._registeredEvents) {
        eventSystem.off(registration);
    }
    this._registeredEvents = [];
}
```

## Standard Event Categories

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

## Legacy to Standard Event Mapping

| Legacy Event Name | Standardized Event Name |
|-------------------|-------------------------|
| playerMoved | player:moved |
| playerEnergyChanged | player:resource:changed:energy |
| playerMovementPointsChanged | player:resource:changed:movement |
| playerTraitAdded | player:trait:added |
| playerActionChanged | player:action:changed |
| tileClicked | ui:interaction:tile |
| systemBalanceChanged | system:balance:changed |
| turnStart | system:turn:start |
| turnEnd | system:turn:end |
| evolutionPointsAwarded | player:evolution:points:awarded |

## Best Practices

1. **Document Events**: Add JSDoc comments for events emitted by a component
2. **Consistent Data**: Always include the same core properties in event data
3. **Avoid Over-Emitting**: Only emit events when state actually changes
4. **Clean Up Listeners**: Always remove event listeners when components are destroyed
5. **Event-First Design**: Design systems to communicate primarily through events for better decoupling
6. **Debug Mode**: Use eventSystem.setDebugMode(true) during development to log all events

## EventSystem Implementation

The EventSystem class provides these key methods:

```javascript
// Register an event listener
const registration = eventSystem.on('eventType', callback, context);

// Remove an event listener
eventSystem.off(registration);

// Emit an event
eventSystem.emit('eventType', eventData);

// Clear all event listeners
eventSystem.clear();

// Remove all listeners for a specific event
eventSystem.removeAllListeners('eventType');

// Enable debug mode to log all events
eventSystem.setDebugMode(true);
```

The event system automatically adds a timestamp to all event data and processes events asynchronously to prevent recursion. This architecture allows for loose coupling between components, as they do not need direct references to each other to communicate. 