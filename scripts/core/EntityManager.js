/**
 * Entity Component System for Hexgrid Evolution
 * Provides a robust entity-component system for game objects
 */

/**
 * Base class for components
 */
export class Component {
    /**
     * Create a new component
     * @param {Entity} entity - The entity this component belongs to
     */
    constructor(entity) {
        this.entity = entity;
        this.enabled = true;
    }

    /**
     * Initialize the component
     * Called by entity.init()
     */
    init() {
        // Override in derived classes
    }

    /**
     * Update the component
     * Called by entity.update()
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Override in derived classes
    }

    /**
     * Clean up the component
     * Called by entity.destroy() or entity.removeComponent()
     */
    destroy() {
        // Override in derived classes
    }

    /**
     * Enable this component
     */
    enable() {
        this.enabled = true;
        return this;
    }

    /**
     * Disable this component
     */
    disable() {
        this.enabled = false;
        return this;
    }
}

/**
 * Entity class that can have components attached
 */
export class Entity {
    /**
     * Create a new entity
     */
    constructor() {
        // Generate a unique ID using utils if available or fallback
        this.id = typeof utils !== 'undefined' && utils.generateId 
            ? utils.generateId() 
            : 'entity_' + Math.floor(Math.random() * 10000);
            
        // Initialize component storage with Map for better performance
        this.components = new Map();
        
        // Initialize tags with Set for better performance and uniqueness
        this.tags = new Set();
        
        // Flag to indicate if the entity is active
        this.isActive = true;
    }
    
    /**
     * Add a component to this entity
     * @param {Class} ComponentClass - Component class to instantiate
     * @param {...any} args - Arguments to pass to component constructor
     * @returns {Object} Instantiated component
     */
    addComponent(ComponentClass, ...args) {
        try {
            // First, create the component instance
            const component = new ComponentClass(this, ...args);
            const componentName = ComponentClass.name;
            
            // Store component by its constructor name
            this.components.set(componentName, component);
            
            // Notify entity manager if available
            const em = getEntityManagerInstance();
            if (em) {
                em.registerComponent(this, componentName);
            }
            
            return component;
        } catch (error) {
            console.error(`Failed to add component ${ComponentClass ? ComponentClass.name : 'unknown'} to entity ${this.id}:`, error);
            return null;
        }
    }
    
    /**
     * Get a component by class
     * @param {Class} ComponentClass - Component class to retrieve
     * @returns {Object} Component instance or null
     */
    getComponent(ComponentClass) {
        const componentName = ComponentClass.name;
        return this.components.get(componentName) || null;
    }
    
    /**
     * Check if entity has a component
     * @param {Class} ComponentClass - Component class to check
     * @returns {boolean} Whether entity has component
     */
    hasComponent(ComponentClass) {
        const componentName = ComponentClass.name;
        return this.components.has(componentName);
    }
    
    /**
     * Remove a component from this entity
     * @param {Class} ComponentClass - Component class to remove
     * @returns {boolean} Whether component was removed
     */
    removeComponent(ComponentClass) {
        const componentName = ComponentClass.name;
        
        if (!this.components.has(componentName)) {
            return false;
        }
        
        // Get component before removing
        const component = this.components.get(componentName);
        
        // Clean up component
        if (component.destroy && typeof component.destroy === 'function') {
            component.destroy();
        }
        
        // Remove from entity
        this.components.delete(componentName);
        
        // Unregister from entity manager
        const em = getEntityManagerInstance();
        if (em) {
            em.unregisterComponent(this, componentName);
        }
        
        return true;
    }
    
    /**
     * Add a tag to this entity
     * @param {string} tag - Tag to add
     * @returns {Entity} This entity for chaining
     */
    addTag(tag) {
        if (this.tags.has(tag)) {
            return this;
        }
        
        this.tags.add(tag);
        
        // Register with entity manager
        const em = getEntityManagerInstance();
        if (em) {
            em.registerTag(this, tag);
        }
        
        return this;
    }
    
    /**
     * Check if entity has a tag
     * @param {string} tag - Tag to check
     * @returns {boolean} Whether entity has tag
     */
    hasTag(tag) {
        return this.tags.has(tag);
    }
    
    /**
     * Remove a tag from this entity
     * @param {string} tag - Tag to remove
     * @returns {Entity} This entity for chaining
     */
    removeTag(tag) {
        if (!this.tags.has(tag)) {
            return this;
        }
        
        this.tags.delete(tag);
        
        // Unregister from entity manager
        const em = getEntityManagerInstance();
        if (em) {
            em.unregisterTag(this, tag);
        }
        
        return this;
    }
    
    /**
     * Initialize all components
     */
    init() {
        for (const component of this.components.values()) {
            if (component.init && typeof component.init === 'function') {
                try {
                    component.init();
                } catch (error) {
                    console.error(`Error initializing component ${component.constructor.name} on entity ${this.id}:`, error);
                }
            }
        }
        return this;
    }
    
    /**
     * Update all components
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        for (const component of this.components.values()) {
            if (!component.enabled) continue;
            
            if (component.update && typeof component.update === 'function') {
                try {
                    component.update(deltaTime);
                } catch (error) {
                    console.error(`Error updating component ${component.constructor.name} on entity ${this.id}:`, error);
                }
            }
        }
    }
    
    /**
     * Destroy this entity and all components
     */
    destroy() {
        // Clean up all components
        for (const component of this.components.values()) {
            if (component.destroy && typeof component.destroy === 'function') {
                try {
                    component.destroy();
                } catch (error) {
                    console.error(`Error destroying component ${component.constructor.name} on entity ${this.id}:`, error);
                }
            }
        }
        
        // Clear components and tags
        this.components.clear();
        this.tags.clear();
        
        // Remove from entity manager
        const em = getEntityManagerInstance();
        if (em) {
            em.removeEntity(this.id);
        }
        
        // Mark as inactive
        this.isActive = false;
    }
}

/**
 * Entity Manager singleton to track all entities
 */
class EntityManager {
    constructor() {
        // Check if instance already exists
        if (EntityManager.instance) {
            console.warn('EntityManager singleton already exists, returning existing instance');
            return EntityManager.instance;
        }
        
        // Store the instance
        EntityManager.instance = this;
        
        // Initialize data structures
        this.entities = new Map();
        this.taggedEntities = new Map();
        this.componentEntities = new Map();
        
        // Flag for initialization
        this.isInitialized = true;
    }
    
    /**
     * Add an entity to the manager
     * @param {Entity} entity - Entity to add
     * @returns {EntityManager} This manager for chaining
     */
    addEntity(entity) {
        if (!entity || !entity.id) {
            console.error('Invalid entity provided to EntityManager.addEntity');
            return this;
        }
        
        this.entities.set(entity.id, entity);
        return this;
    }
    
    /**
     * Get an entity by ID
     * @param {string} entityId - Entity ID to retrieve
     * @returns {Entity} Entity or undefined
     */
    getEntity(entityId) {
        return this.entities.get(entityId);
    }
    
    /**
     * Get all entities with a specific tag
     * @param {string} tag - Tag to search for
     * @returns {Array} Array of entities with tag
     */
    getEntitiesByTag(tag) {
        return Array.from(this.taggedEntities.get(tag) || []);
    }
    
    /**
     * Get all entities with a specific component
     * @param {Class} ComponentClass - Component class to search for
     * @returns {Array} Array of entities with component
     */
    getEntitiesByComponent(ComponentClass) {
        const componentName = ComponentClass.name;
        return Array.from(this.componentEntities.get(componentName) || []);
    }
    
    /**
     * Get all entities
     * @returns {Array} Array of all entities
     */
    getAllEntities() {
        return Array.from(this.entities.values());
    }
    
    /**
     * Register an entity's tag
     * @param {Entity} entity - Entity with tag
     * @param {string} tag - Tag to register
     */
    registerTag(entity, tag) {
        if (!entity || !tag) return;
        
        if (!this.taggedEntities.has(tag)) {
            this.taggedEntities.set(tag, new Set());
        }
        
        const entities = this.taggedEntities.get(tag);
        entities.add(entity);
    }
    
    /**
     * Unregister an entity's tag
     * @param {Entity} entity - Entity with tag
     * @param {string} tag - Tag to unregister
     */
    unregisterTag(entity, tag) {
        if (!entity || !tag) return;
        
        if (!this.taggedEntities.has(tag)) {
            return;
        }
        
        const entities = this.taggedEntities.get(tag);
        entities.delete(entity);
        
        // Remove empty tag sets
        if (entities.size === 0) {
            this.taggedEntities.delete(tag);
        }
    }
    
    /**
     * Register an entity's component
     * @param {Entity} entity - Entity with component
     * @param {string} componentName - Component name to register
     */
    registerComponent(entity, componentName) {
        if (!entity || !componentName) return;
        
        if (!this.componentEntities.has(componentName)) {
            this.componentEntities.set(componentName, new Set());
        }
        
        const entities = this.componentEntities.get(componentName);
        entities.add(entity);
    }
    
    /**
     * Unregister an entity's component
     * @param {Entity} entity - Entity with component
     * @param {string} componentName - Component name to unregister
     */
    unregisterComponent(entity, componentName) {
        if (!entity || !componentName) return;
        
        if (!this.componentEntities.has(componentName)) {
            return;
        }
        
        const entities = this.componentEntities.get(componentName);
        entities.delete(entity);
        
        // Remove empty component sets
        if (entities.size === 0) {
            this.componentEntities.delete(componentName);
        }
    }
    
    /**
     * Remove an entity from the manager
     * @param {string} entityId - ID of entity to remove
     * @returns {boolean} Whether entity was removed
     */
    removeEntity(entityId) {
        const entity = this.entities.get(entityId);
        
        if (!entity) {
            return false;
        }
        
        // Unregister all tags
        for (const tag of entity.tags) {
            this.unregisterTag(entity, tag);
        }
        
        // Unregister all components
        for (const componentName of entity.components.keys()) {
            this.unregisterComponent(entity, componentName);
        }
        
        // Remove from entities map
        this.entities.delete(entityId);
        
        return true;
    }
    
    /**
     * Update all entities
     * @param {number} deltaTime - Time elapsed since last update
     */
    updateEntities(deltaTime) {
        for (const entity of this.entities.values()) {
            entity.update(deltaTime);
        }
    }
    
    /**
     * Initialize all entities
     */
    initEntities() {
        for (const entity of this.entities.values()) {
            entity.init();
        }
    }
    
    /**
     * Clear all entities
     */
    clear() {
        // First make a copy of all entity IDs to avoid modification during iteration
        const entityIds = Array.from(this.entities.keys());
        
        // Then destroy each entity
        for (const entityId of entityIds) {
            const entity = this.entities.get(entityId);
            if (entity && typeof entity.destroy === 'function') {
                entity.destroy();
            }
        }
        
        // Clear all maps
        this.entities.clear();
        this.taggedEntities.clear();
        this.componentEntities.clear();
    }
    
    /**
     * Get singleton instance
     * @returns {EntityManager} The singleton instance
     */
    static getInstance() {
        return EntityManager.instance || new EntityManager();
    }
}

// Initialize the static instance property
EntityManager.instance = null;

/**
 * Get the entity manager singleton instance
 * @returns {EntityManager} The entity manager instance
 */
function getEntityManagerInstance() {
    // Check global window first (for backward compatibility)
    if (typeof window !== 'undefined' && window.entityManager) {
        return window.entityManager;
    }
    
    // Otherwise use the singleton instance
    return EntityManager.getInstance();
}

// Create and export singleton instance
export const entityManager = EntityManager.getInstance();

// For backward compatibility, set on window if in browser context
if (typeof window !== 'undefined') {
    window.entityManager = entityManager;
} 