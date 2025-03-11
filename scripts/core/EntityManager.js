/**
 * Entity System for Hexgrid Evolution
 * Provides entity-component system for game objects
 */

/**
 * Basic entity class that can have components attached
 */
export class Entity {
    constructor() {
        this.id = utils.generateId();
        this.components = new Map();
        this.tags = new Set();
        this.isActive = true;
    }
    
    /**
     * Add a component to this entity
     * @param {Class} ComponentClass - Component class to instantiate
     * @param {...any} args - Arguments to pass to component constructor
     * @returns {Object} Instantiated component
     */
    addComponent(ComponentClass, ...args) {
        const component = new ComponentClass(...args);
        const componentName = ComponentClass.name;
        
        this.components.set(componentName, component);
        
        // Register with entity manager
        entityManager.registerComponent(this, componentName);
        
        return component;
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
        entityManager.unregisterComponent(this, componentName);
        
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
        entityManager.registerTag(this, tag);
        
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
        entityManager.unregisterTag(this, tag);
        
        return this;
    }
    
    /**
     * Initialize all components
     */
    init() {
        for (const component of this.components.values()) {
            if (component.init && typeof component.init === 'function') {
                component.init();
            }
        }
    }
    
    /**
     * Update all components
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        for (const component of this.components.values()) {
            if (component.update && typeof component.update === 'function') {
                component.update(deltaTime);
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
                component.destroy();
            }
        }
        
        // Clear components and tags
        this.components.clear();
        this.tags.clear();
        
        // Remove from entity manager
        entityManager.removeEntity(this.id);
    }
}

/**
 * Entity Manager singleton to track all entities
 */
class EntityManager {
    constructor() {
        this.entities = new Map();
        this.taggedEntities = new Map();
        this.componentEntities = new Map();
    }
    
    /**
     * Add an entity to the manager
     * @param {Entity} entity - Entity to add
     * @returns {EntityManager} This manager for chaining
     */
    addEntity(entity) {
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
        return this.taggedEntities.get(tag) || [];
    }
    
    /**
     * Get all entities with a specific component
     * @param {Class} ComponentClass - Component class to search for
     * @returns {Array} Array of entities with component
     */
    getEntitiesByComponent(ComponentClass) {
        const componentName = ComponentClass.name;
        return this.componentEntities.get(componentName) || [];
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
        if (!this.taggedEntities.has(tag)) {
            this.taggedEntities.set(tag, []);
        }
        
        // Add entity to tag list if not already present
        const entities = this.taggedEntities.get(tag);
        if (!entities.includes(entity)) {
            entities.push(entity);
        }
    }
    
    /**
     * Unregister an entity's tag
     * @param {Entity} entity - Entity with tag
     * @param {string} tag - Tag to unregister
     */
    unregisterTag(entity, tag) {
        if (!this.taggedEntities.has(tag)) {
            return;
        }
        
        // Remove entity from tag list
        const entities = this.taggedEntities.get(tag);
        const index = entities.indexOf(entity);
        
        if (index !== -1) {
            entities.splice(index, 1);
            
            // Remove empty tag lists
            if (entities.length === 0) {
                this.taggedEntities.delete(tag);
            }
        }
    }
    
    /**
     * Register an entity's component
     * @param {Entity} entity - Entity with component
     * @param {string} componentName - Component name to register
     */
    registerComponent(entity, componentName) {
        if (!this.componentEntities.has(componentName)) {
            this.componentEntities.set(componentName, []);
        }
        
        // Add entity to component list if not already present
        const entities = this.componentEntities.get(componentName);
        if (!entities.includes(entity)) {
            entities.push(entity);
        }
    }
    
    /**
     * Unregister an entity's component
     * @param {Entity} entity - Entity with component
     * @param {string} componentName - Component name to unregister
     */
    unregisterComponent(entity, componentName) {
        if (!this.componentEntities.has(componentName)) {
            return;
        }
        
        // Remove entity from component list
        const entities = this.componentEntities.get(componentName);
        const index = entities.indexOf(entity);
        
        if (index !== -1) {
            entities.splice(index, 1);
            
            // Remove empty component lists
            if (entities.length === 0) {
                this.componentEntities.delete(componentName);
            }
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
        // Clean up all entities
        for (const entity of this.entities.values()) {
            entity.destroy();
        }
        
        // Clear all maps
        this.entities.clear();
        this.taggedEntities.clear();
        this.componentEntities.clear();
    }
}

// Create singleton instance
export const entityManager = new EntityManager(); 