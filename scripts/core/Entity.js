/**
 * Re-exports of Entity and Component classes from EntityManager.js
 * This file exists for backward compatibility.
 */

import { Entity, Component, entityManager } from './EntityManager.js';

// Re-export the classes for backward compatibility
export { Entity, Component, entityManager };

// For backward compatibility with code that doesn't use imports
if (typeof window !== 'undefined') {
    window.Entity = Entity;
    window.Component = Component;
}