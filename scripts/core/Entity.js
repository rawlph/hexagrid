/**
 * Entity class for the Entity Component System
 * An entity is just a container for components with a unique ID
 */
class Entity {
    /**
     * Create a new entity
     */
    constructor() {
        // Generate a unique ID for the entity
        this.id = 'entity_' + Math.floor(Math.random() * 10000);
        
        // Initialize component map
        this.components = {};
        
        // Initialize tags array
        this.tags = [];
        
        // Flag to indicate if the entity is active
        this.active = true;
    }

    /**
     * Add a component to this entity
     * @param {function} ComponentClass - Component class to instantiate
     * @param {...any} args - Arguments to pass to the component constructor
     * @returns {object} The created component instance
     */
    addComponent(ComponentClass, ...args) {
        // Create the component instance
        const component = new ComponentClass(this, ...args);
        
        // Store component by its constructor name
        const componentName = ComponentClass.name;
        this.components[componentName] = component;
        
        // Return the component for chaining
        return component;
    }

    /**
     * Get a component by its class
     * @param {function} ComponentClass - The component class to look for
     * @returns {object|null} The component instance or null if not found
     */
    getComponent(ComponentClass) {
        const componentName = ComponentClass.name;
        return this.components[componentName] || null;
    }

    /**
     * Check if entity has a component
     * @param {function} ComponentClass - The component class to check for
     * @returns {boolean} True if entity has the component
     */
    hasComponent(ComponentClass) {
        const componentName = ComponentClass.name;
        return !!this.components[componentName];
    }

    /**
     * Remove a component from this entity
     * @param {function} ComponentClass - The component class to remove
     * @returns {boolean} True if component was removed, false if not found
     */
    removeComponent(ComponentClass) {
        const componentName = ComponentClass.name;
        
        if (!this.components[componentName]) {
            return false;
        }
        
        // Call destroy on the component if it has that method
        if (typeof this.components[componentName].destroy === 'function') {
            this.components[componentName].destroy();
        }
        
        // Remove the component
        delete this.components[componentName];
        return true;
    }

    /**
     * Add a tag to this entity
     * @param {string} tag - The tag to add
     */
    addTag(tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
            
            // Register tag with entity manager if available
            if (window.entityManager) {
                entityManager.registerTag(this, tag);
            }
        }
    }

    /**
     * Check if entity has a tag
     * @param {string} tag - The tag to check for
     * @returns {boolean} True if entity has the tag
     */
    hasTag(tag) {
        return this.tags.includes(tag);
    }

    /**
     * Remove a tag from this entity
     * @param {string} tag - The tag to remove
     * @returns {boolean} True if tag was removed, false if not found
     */
    removeTag(tag) {
        const index = this.tags.indexOf(tag);
        
        if (index !== -1) {
            this.tags.splice(index, 1);
            
            // Unregister tag with entity manager if available
            if (window.entityManager) {
                entityManager.unregisterTag(this, tag);
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Initialize this entity's components
     */
    init() {
        // Initialize all components
        for (const componentName in this.components) {
            const component = this.components[componentName];
            if (typeof component.init === 'function') {
                component.init();
            }
        }
    }

    /**
     * Update this entity's components
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Skip update if entity is not active
        if (!this.active) return;
        
        // Update all components
        for (const componentName in this.components) {
            const component = this.components[componentName];
            
            // Skip disabled components
            if (component.enabled === false) continue;
            
            if (typeof component.update === 'function') {
                component.update(deltaTime);
            }
        }
    }

    /**
     * Destroy this entity and all its components
     */
    destroy() {
        // Call destroy on all components
        for (const componentName in this.components) {
            if (typeof this.components[componentName].destroy === 'function') {
                this.components[componentName].destroy();
            }
        }
        
        // Clear components
        this.components = {};
        
        // Remove from entity manager if available
        if (window.entityManager) {
            entityManager.removeEntity(this.id);
        }
        
        // Mark as inactive
        this.active = false;
    }
}

/**
 * Base class for components
 */
class Component {
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
    }

    /**
     * Disable this component
     */
    disable() {
        this.enabled = false;
    }
} 