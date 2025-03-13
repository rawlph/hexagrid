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
     * Called after the component is attached to an entity
     * This happens after constructor but before init
     */
    onAttach() {
        // Override in derived classes
    }

    /**
     * Called before the component is detached from an entity
     * This happens before destroy when removing a component
     */
    onDetach() {
        // Override in derived classes
    }

    /**
     * Called when component is enabled
     */
    onEnable() {
        // Override in derived classes
    }

    /**
     * Called when component is disabled
     */
    onDisable() {
        // Override in derived classes
    }

    /**
     * Reset component state
     * Called when a component is reused from a pool
     * @param {...any} args - Arguments to reinitialize the component with
     */
    reset(...args) {
        // Override in derived classes to reinitialize state
    }

    /**
     * Enable this component
     */
    enable() {
        if (!this.enabled) {
            this.enabled = true;
            this.onEnable();
        }
        return this;
    }

    /**
     * Disable this component
     */
    disable() {
        if (this.enabled) {
            this.enabled = false;
            this.onDisable();
        }
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
            const componentName = ComponentClass.name;
            
            // Check if this entity already has this component type
            if (this.components.has(componentName)) {
                console.warn(`Entity ${this.id} already has component ${componentName}`);
                return this.components.get(componentName);
            }
            
            // Use component pool if available
            let component;
            if (entityManager && entityManager.componentPools.has(componentName)) {
                component = entityManager.createComponent(this, ComponentClass, ...args);
            } else {
                // Create component directly if no pool exists
                component = new ComponentClass(this, ...args);
            }
            
            // Store component by its constructor name
            this.components.set(componentName, component);
            
            // Notify entity manager
            if (entityManager) {
                entityManager.registerComponent(this, componentName);
            }
            
            // Call onAttach lifecycle method
            if (component.onAttach && typeof component.onAttach === 'function') {
                try {
                    component.onAttach();
                } catch (error) {
                    console.error(`Error in onAttach for component ${componentName} on entity ${this.id}:`, error);
                }
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
        
        // Call onDetach lifecycle method
        if (component.onDetach && typeof component.onDetach === 'function') {
            try {
                component.onDetach();
            } catch (error) {
                console.error(`Error in onDetach for component ${componentName} on entity ${this.id}:`, error);
            }
        }
        
        // Clean up component
        if (component.destroy && typeof component.destroy === 'function') {
            try {
                component.destroy();
            } catch (error) {
                console.error(`Error destroying component ${componentName} on entity ${this.id}:`, error);
            }
        }
        
        // Remove from entity
        this.components.delete(componentName);
        
        // Unregister from entity manager
        if (entityManager) {
            entityManager.unregisterComponent(this, componentName);
            
            // Return component to pool if available
            entityManager.releaseComponent(component);
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
        if (entityManager) {
            entityManager.registerTag(this, tag);
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
        if (entityManager) {
            entityManager.unregisterTag(this, tag);
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
            // Call onDetach to signal that component is being removed from entity
            if (component.onDetach && typeof component.onDetach === 'function') {
                try {
                    component.onDetach();
                } catch (error) {
                    console.error(`Error in onDetach for component ${component.constructor.name} on entity ${this.id}:`, error);
                }
            }
            
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
        if (entityManager) {
            entityManager.removeEntity(this.id);
        }
        
        // Mark as inactive
        this.isActive = false;
    }
}

/**
 * Cached query for efficiently retrieving entities
 */
export class EntityQuery {
    /**
     * Create a new entity query
     * @param {EntityManager} entityManager - The entity manager instance
     * @param {Array<Class>} componentClasses - Component classes to filter by (AND logic)
     * @param {Array<string>} tags - Tags to filter by (AND logic)
     */
    constructor(entityManager, componentClasses = [], tags = []) {
        this.entityManager = entityManager;
        this.componentClasses = componentClasses;
        this.tags = tags;
        this.results = [];
        this.isDirty = true;
        
        // Register with entity manager for updates
        this.entityManager.registerQuery(this);
    }
    
    /**
     * Get the query results, refreshing if needed
     * @returns {Array<Entity>} Array of entities matching the query
     */
    execute() {
        if (this.isDirty) {
            this.refresh();
        }
        return this.results;
    }
    
    /**
     * Force refresh the query results
     * @returns {Array<Entity>} Updated results
     */
    refresh() {
        // Start with all entities or entities with specific tags
        let entities;
        
        if (this.tags.length > 0) {
            // Start with entities that have the first tag
            entities = this.entityManager.getEntitiesByTag(this.tags[0]);
            
            // Filter by additional tags
            for (let i = 1; i < this.tags.length; i++) {
                entities = entities.filter(entity => entity.hasTag(this.tags[i]));
            }
        } else {
            // No tags specified, use all entities
            entities = this.entityManager.getAllEntities();
        }
        
        // Filter by components
        if (this.componentClasses.length > 0) {
            entities = entities.filter(entity => {
                return this.componentClasses.every(ComponentClass => {
                    return entity.hasComponent(ComponentClass);
                });
            });
        }
        
        this.results = entities;
        this.isDirty = false;
        return this.results;
    }
    
    /**
     * Mark the query as dirty, forcing a refresh on next execute
     */
    markDirty() {
        this.isDirty = true;
    }
    
    /**
     * Dispose of the query and remove from entity manager
     */
    dispose() {
        this.entityManager.unregisterQuery(this);
        this.results = [];
    }
}

/**
 * Pool for reusing component instances
 */
export class ComponentPool {
    /**
     * Create a new component pool
     * @param {Class} ComponentClass - Component class to pool
     * @param {number} initialSize - Initial pool size (pre-allocation)
     * @param {number} maxSize - Maximum pool size (-1 for unlimited)
     */
    constructor(ComponentClass, initialSize = 0, maxSize = 100) {
        this.ComponentClass = ComponentClass;
        this.pool = [];
        this.maxSize = maxSize;
        
        // Pre-allocate components if requested
        if (initialSize > 0) {
            this.preallocate(initialSize);
        }
    }
    
    /**
     * Pre-allocate components to the pool
     * @param {number} count - Number of components to pre-allocate
     */
    preallocate(count) {
        for (let i = 0; i < count; i++) {
            const component = new this.ComponentClass(null);
            this.pool.push(component);
        }
    }
    
    /**
     * Get a component from the pool or create a new one
     * @param {Entity} entity - Entity to attach the component to
     * @param {...any} args - Arguments to pass to reset method
     * @returns {Component} Component instance
     */
    get(entity, ...args) {
        let component;
        
        // Get from pool or create new
        if (this.pool.length > 0) {
            component = this.pool.pop();
            component.entity = entity;
            
            // Call reset method with args
            if (component.reset && typeof component.reset === 'function') {
                component.reset(...args);
            }
        } else {
            component = new this.ComponentClass(entity, ...args);
        }
        
        return component;
    }
    
    /**
     * Release a component back to the pool
     * @param {Component} component - Component to release
     * @returns {boolean} Whether the component was added to the pool
     */
    release(component) {
        // Validate component type
        if (!(component instanceof this.ComponentClass)) {
            console.warn(`ComponentPool: Cannot release component of type ${component.constructor.name} to pool for ${this.ComponentClass.name}`);
            return false;
        }
        
        // Skip if pool is at max size
        if (this.maxSize !== -1 && this.pool.length >= this.maxSize) {
            return false;
        }
        
        // Prepare component for pooling
        component.entity = null;
        
        // Add to pool
        this.pool.push(component);
        return true;
    }
    
    /**
     * Get the number of components in the pool
     * @returns {number} Pool size
     */
    size() {
        return this.pool.length;
    }
    
    /**
     * Clear the pool
     */
    clear() {
        this.pool = [];
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
        this.queries = new Set();
        this.componentPools = new Map();
        
        // Flag for initialization
        this.isInitialized = true;
    }
    
    /**
     * Get or create a component pool
     * @param {Class} ComponentClass - Component class to pool
     * @param {number} initialSize - Initial pool size
     * @param {number} maxSize - Maximum pool size
     * @returns {ComponentPool} Component pool instance
     */
    getComponentPool(ComponentClass, initialSize = 0, maxSize = 100) {
        const componentName = ComponentClass.name;
        
        if (!this.componentPools.has(componentName)) {
            const pool = new ComponentPool(ComponentClass, initialSize, maxSize);
            this.componentPools.set(componentName, pool);
            return pool;
        }
        
        return this.componentPools.get(componentName);
    }
    
    /**
     * Create a component from a pool
     * @param {Entity} entity - Entity to attach component to
     * @param {Class} ComponentClass - Component class to create
     * @param {...any} args - Arguments to pass to component
     * @returns {Component} Created component
     */
    createComponent(entity, ComponentClass, ...args) {
        const pool = this.getComponentPool(ComponentClass);
        return pool.get(entity, ...args);
    }
    
    /**
     * Release a component back to its pool
     * @param {Component} component - Component to release
     * @returns {boolean} Whether component was released
     */
    releaseComponent(component) {
        if (!component || !component.constructor) {
            return false;
        }
        
        const componentName = component.constructor.name;
        
        if (!this.componentPools.has(componentName)) {
            return false;
        }
        
        const pool = this.componentPools.get(componentName);
        return pool.release(component);
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
        this.markQueriesDirty();
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
     * Create a new cached query
     * @param {Array<Class>} componentClasses - Component classes to filter by
     * @param {Array<string>} tags - Tags to filter by
     * @returns {EntityQuery} New query instance
     */
    createQuery(componentClasses = [], tags = []) {
        return new EntityQuery(this, componentClasses, tags);
    }
    
    /**
     * Register a query for updates
     * @param {EntityQuery} query - Query to register
     */
    registerQuery(query) {
        this.queries.add(query);
    }
    
    /**
     * Unregister a query
     * @param {EntityQuery} query - Query to unregister
     */
    unregisterQuery(query) {
        this.queries.delete(query);
    }
    
    /**
     * Mark all queries as dirty
     */
    markQueriesDirty() {
        for (const query of this.queries) {
            query.markDirty();
        }
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
        this.markQueriesDirty();
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
        
        this.markQueriesDirty();
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
        this.markQueriesDirty();
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
        
        this.markQueriesDirty();
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
        
        this.markQueriesDirty();
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
        
        // Clear all queries
        for (const query of this.queries) {
            query.dispose();
        }
        this.queries.clear();
        
        // Clear component pools
        for (const pool of this.componentPools.values()) {
            pool.clear();
        }
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

// Create and export singleton instance
export const entityManager = EntityManager.getInstance(); 