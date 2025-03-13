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
- PlayerComponent now uses standardized event emission with backward compatibility
- Many other events in the system still use legacy naming formats

## Migration Implementation

The codebase now includes tools to facilitate the migration to standardized events:

1. **EventTypes.js** - Defines constants for all event types with both legacy and standardized names
2. **emitStandardized** - A method in EventSystem that emits both legacy and standardized events
3. **EventMigrationHelper** - A utility class for tracking migration progress and analyzing readiness
4. **eventSystemMigration** - A migration tool that implements a phased approach to transitioning

### Using EventTypes

```javascript
import { EventTypes } from '../core/EventTypes.js';

// Use constants for event names
eventSystem.emit(EventTypes.PLAYER_MOVED.standard, { 
    player: this,
    row: newRow,
    col: newCol
});
```

### Using emitStandardized

```javascript
// Emit both legacy and standardized events
eventSystem.emitStandardized(
    EventTypes.PLAYER_MOVED.legacy,
    EventTypes.PLAYER_MOVED.standard,
    {
        player: this,
        row: newRow,
        col: newCol
    }
);
```

### Using EventMigrationHelper

The migration helper provides tools to track progress and identify areas needing updates:

```javascript
// In browser console
EventMigrationHelper.getMigrationStats();         // Get overall migration progress
EventMigrationHelper.checkLegacyUsage();          // See which legacy events are still in use
EventMigrationHelper.printEventMappings();        // See all available event mappings
EventMigrationHelper.findUnmappedEvents();        // Find legacy events without mappings
EventMigrationHelper.identifyMigrationReadyEvents(); // Find events ready for full migration
EventMigrationHelper.migrateReadyEvents();        // Disable legacy events for fully migrated ones
EventMigrationHelper.runMigrationAssistant();     // Interactive migration assistant wizard
```

## Phased Migration Strategy

We've implemented a phased approach to migration to ensure a smooth transition:

### Phase 0: Assessment
- Analyze current event usage patterns
- Identify high-priority components for migration
- Create a migration plan

### Phase 1: Update Event Listeners
- Update all event listeners to use standardized event names
- Continue emitting both legacy and standardized events
- Focus on high-usage components first

### Phase 2: Mark Events as Deprecated
- Increase deprecation warning visibility
- Add scheduled removal dates to legacy events
- Begin selective disabling of legacy events for fully migrated ones

### Phase 3: Remove Legacy Event Support
- Stop emitting legacy events for fully migrated types
- Test application thoroughly with legacy events disabled
- Clean up any remaining legacy event code

## Selective Legacy Event Control

The EventSystem now provides methods to selectively disable legacy event emissions:

```javascript
// Disable all legacy event emissions
eventSystem.disableLegacyEventEmissions(true);

// Disable specific legacy events
eventSystem.disableLegacyEventEmissions(['playerMoved', 'turnStart']);

// Mark an event as fully migrated
eventSystem.markEventAsMigrated('playerMoved');

// Check if an event is fully migrated
const isReady = eventSystem.isEventFullyMigrated('playerMoved', 'player:moved');

// Re-enable legacy events if needed
eventSystem.enableLegacyEventEmissions(true);
```

## Legacy Event Support & Transition Plan

For backward compatibility, continue to emit both standardized and legacy events where needed:

```javascript
// Emit standardized event
eventSystem.emit('action:complete:stabilize', eventData);

// Also emit legacy event for backward compatibility
eventSystem.emit('stabilizeComplete', eventData);
```

Implementation steps for standardization:
1. First update event emissions to include both formats (using emitStandardized)
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
    isStandardized: true,         // Flag indicating if it's a standardized event
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
    isStandardized: true,        // Flag indicating if it's a standardized event
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
    isStandardized: true,        // Flag indicating if it's a standardized event
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
    eventSystem.on(EventTypes.ACTION_COMPLETE_MOVE.standard, this.handleMoveComplete.bind(this))
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

## Migration Progress Tracking

The EventSystem now tracks:

1. **Event usage**: How often each event type is emitted
2. **Listener statistics**: How many listeners are registered for each event type
3. **Fully migrated events**: Events that no longer need legacy support

You can view this information using the EventMigrationHelper:

```javascript
// Get comprehensive migration statistics
EventMigrationHelper.runMigrationDiagnostics();

// Run the interactive migration wizard
EventMigrationHelper.runMigrationAssistant();
```

## Best Practices

1. **Document Events**: Add JSDoc comments for events emitted by a component
2. **Consistent Data**: Always include the same core properties in event data
3. **Avoid Over-Emitting**: Only emit events when state actually changes
4. **Clean Up Listeners**: Always remove event listeners when components are destroyed
5. **Event-First Design**: Design systems to communicate primarily through events for better decoupling
6. **Debug Mode**: Use eventSystem.setDebugMode(true) during development to log all events
7. **Use Constants**: Always use EventTypes constants for event names to avoid typos
8. **Track Migration**: Use EventMigrationHelper to track and guide the transition process
9. **Selective Disabling**: Use the migration tools to identify and disable legacy events that are ready

## EventSystem Implementation

The EventSystem class provides these key methods:

```javascript
// Register an event listener
const registration = eventSystem.on(EventTypes.PLAYER_MOVED.standard, callback, context);

// Remove an event listener
eventSystem.off(registration);

// Emit an event (standardized)
eventSystem.emit(EventTypes.PLAYER_MOVED.standard, eventData);

// Emit both legacy and standardized events
eventSystem.emitStandardized(
    EventTypes.PLAYER_MOVED.legacy,
    EventTypes.PLAYER_MOVED.standard,
    eventData
);

// Clear all event listeners
eventSystem.clear();

// Remove all listeners for a specific event
eventSystem.removeAllListeners(EventTypes.PLAYER_MOVED.standard);

// Enable debug mode to log all events
eventSystem.setDebugMode(true);

// Get migration statistics
const stats = eventSystem.getMigrationStats();

// Disable legacy event emissions
eventSystem.disableLegacyEventEmissions(true);

// Mark an event as fully migrated
eventSystem.markEventAsMigrated('playerMoved');
```

The event system automatically adds a timestamp and standardization flag to all event data and processes events asynchronously to prevent recursion. This architecture allows for loose coupling between components, as they do not need direct references to each other to communicate. 