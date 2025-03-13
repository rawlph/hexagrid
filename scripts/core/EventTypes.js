/**
 * Event type definitions for Hexgrid Evolution
 * This file maps legacy event names to their standardized equivalents
 * and serves as a central reference for all event names in the system.
 */

export const EventTypes = {
    // Player events
    PLAYER_MOVED: {
        legacy: 'playerMoved',
        standard: 'player:moved',
        deprecation: {
            version: '2.0.0',
            message: 'Use player:moved instead. The legacy playerMoved event will be removed in v2.0'
        }
    },
    PLAYER_ENERGY_CHANGED: {
        legacy: 'playerEnergyChanged',
        standard: 'player:resource:changed:energy',
        deprecation: {
            version: '2.0.0',
            message: 'Use player:resource:changed:energy instead. The legacy playerEnergyChanged event will be removed in v2.0'
        }
    },
    PLAYER_MOVEMENT_POINTS_CHANGED: {
        legacy: 'playerMovementPointsChanged',
        standard: 'player:resource:changed:movement',
        deprecation: {
            version: '2.0.0',
            message: 'Use player:resource:changed:movement instead. The legacy playerMovementPointsChanged event will be removed in v2.0'
        }
    },
    PLAYER_TRAIT_ADDED: {
        legacy: 'playerTraitAdded',
        standard: 'player:trait:added',
        deprecation: {
            version: '2.0.0',
            message: 'Use player:trait:added instead. The legacy playerTraitAdded event will be removed in v2.0'
        }
    },
    PLAYER_ACTION_CHANGED: {
        legacy: 'playerActionChanged',
        standard: 'player:action:changed',
        deprecation: {
            version: '2.0.0',
            message: 'Use player:action:changed instead. The legacy playerActionChanged event will be removed in v2.0'
        }
    },
    PLAYER_STATS_UPDATED: {
        legacy: 'playerStatsUpdated',
        standard: 'player:stats:updated',
        deprecation: {
            version: '2.0.0',
            message: 'Use player:stats:updated instead. The legacy playerStatsUpdated event will be removed in v2.0'
        }
    },
    PLAYER_EVOLUTION_POINTS_CHANGED: {
        legacy: 'playerEvolutionPointsChanged',
        standard: 'player:evolution:points:changed',
        deprecation: {
            version: '2.0.0',
            message: 'Use player:evolution:points:changed instead. The legacy playerEvolutionPointsChanged event will be removed in v2.0'
        }
    },
    
    // Action events
    ACTION_COMPLETE_MOVE: {
        legacy: 'moveComplete',
        standard: 'action:complete:move',
        deprecation: {
            version: '2.0.0',
            message: 'Use action:complete:move instead. The legacy moveComplete event will be removed in v2.0'
        }
    },
    ACTION_COMPLETE_SENSE: {
        legacy: 'senseComplete',
        standard: 'action:complete:sense',
        deprecation: {
            version: '2.0.0',
            message: 'Use action:complete:sense instead. The legacy senseComplete event will be removed in v2.0'
        }
    },
    ACTION_COMPLETE_INTERACT: {
        legacy: 'interactComplete',
        standard: 'action:complete:interact',
        deprecation: {
            version: '2.0.0',
            message: 'Use action:complete:interact instead. The legacy interactComplete event will be removed in v2.0'
        }
    },
    ACTION_COMPLETE_STABILIZE: {
        legacy: 'stabilizeComplete',
        standard: 'action:complete:stabilize',
        deprecation: {
            version: '2.0.0',
            message: 'Use action:complete:stabilize instead. The legacy stabilizeComplete event will be removed in v2.0'
        }
    },
    
    // Tile events
    TILE_CLICKED: {
        legacy: 'tileClicked',
        standard: 'ui:interaction:tile',
        deprecation: {
            version: '2.0.0',
            message: 'Use ui:interaction:tile instead. The legacy tileClicked event will be removed in v2.0'
        }
    },
    TILE_EXPLORED: {
        legacy: 'tileExplored',
        standard: 'tile:explored',
        deprecation: {
            version: '2.0.0',
            message: 'Use tile:explored instead. The legacy tileExplored event will be removed in v2.0'
        }
    },
    TILE_CHAOS_CHANGED: {
        legacy: 'tileChaosChanged',
        standard: 'tile:chaos:changed',
        deprecation: {
            version: '2.0.0',
            message: 'Use tile:chaos:changed instead. The legacy tileChaosChanged event will be removed in v2.0'
        }
    },
    
    // System events
    SYSTEM_BALANCE_CHANGED: {
        legacy: 'systemBalanceChanged',
        standard: 'system:balance:changed',
        deprecation: {
            version: '2.0.0',
            message: 'Use system:balance:changed instead. The legacy systemBalanceChanged event will be removed in v2.0'
        }
    },
    TURN_START: {
        legacy: 'turnStart',
        standard: 'system:turn:start',
        deprecation: {
            version: '2.0.0',
            message: 'Use system:turn:start instead. The legacy turnStart event will be removed in v2.0'
        }
    },
    TURN_END: {
        legacy: 'turnEnd',
        standard: 'system:turn:end',
        deprecation: {
            version: '2.0.0',
            message: 'Use system:turn:end instead. The legacy turnEnd event will be removed in v2.0'
        }
    },
    GRID_INITIALIZED: {
        legacy: 'gridInitialized',
        standard: 'system:grid:initialized',
        deprecation: {
            version: '2.0.0',
            message: 'Use system:grid:initialized instead. The legacy gridInitialized event will be removed in v2.0'
        }
    },
    GAME_INITIALIZED: {
        legacy: 'gameInitialized',
        standard: 'system:game:initialized',
        deprecation: {
            version: '2.0.0',
            message: 'Use system:game:initialized instead. The legacy gameInitialized event will be removed in v2.0'
        }
    },
    EVOLUTION_POINTS_AWARDED: {
        legacy: 'evolutionPointsAwarded',
        standard: 'player:evolution:points:awarded',
        deprecation: {
            version: '2.0.0',
            message: 'Use player:evolution:points:awarded instead. The legacy evolutionPointsAwarded event will be removed in v2.0'
        }
    },
    GAME_VICTORY: {
        legacy: 'gameVictory',
        standard: 'system:game:victory',
        deprecation: {
            version: '2.0.0',
            message: 'Use system:game:victory instead. The legacy gameVictory event will be removed in v2.0'
        }
    },
    GAME_OVER: {
        legacy: 'gameOver',
        standard: 'system:game:over',
        deprecation: {
            version: '2.0.0',
            message: 'Use system:game:over instead. The legacy gameOver event will be removed in v2.0'
        }
    },
    LEVEL_COMPLETED: {
        legacy: 'levelCompleted',
        standard: 'system:level:completed',
        deprecation: {
            version: '2.0.0',
            message: 'Use system:level:completed instead. The legacy levelCompleted event will be removed in v2.0'
        }
    },
    
    // UI events
    ACTION_PANEL_READY: {
        legacy: 'actionPanelReady',
        standard: 'ui:action:panel:ready',
        deprecation: {
            version: '2.0.0',
            message: 'Use ui:action:panel:ready instead. The legacy actionPanelReady event will be removed in v2.0'
        }
    }
};

/**
 * Helper method to get all event types of a specific category
 * @param {string} category - Category prefix (e.g., 'action', 'player')
 * @returns {Array} Array of event types in that category
 */
export function getEventsByCategory(category) {
    const prefix = `${category}:`;
    return Object.values(EventTypes)
        .filter(eventType => eventType.standard.startsWith(prefix))
        .map(eventType => eventType.standard);
}

/**
 * Helper method to find the standard name for a legacy event
 * @param {string} legacyName - Legacy event name
 * @returns {string|null} Standardized name or null if not found
 */
export function getStandardName(legacyName) {
    for (const key in EventTypes) {
        if (EventTypes[key].legacy === legacyName) {
            return EventTypes[key].standard;
        }
    }
    return null;
}

/**
 * Helper method to find the legacy name for a standard event
 * @param {string} standardName - Standard event name
 * @returns {string|null} Legacy name or null if not found
 */
export function getLegacyName(standardName) {
    for (const key in EventTypes) {
        if (EventTypes[key].standard === standardName) {
            return EventTypes[key].legacy;
        }
    }
    return null;
} 