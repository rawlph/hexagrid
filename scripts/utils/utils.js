/**
 * Utility functions for Hexgrid Evolution
 */
export const utils = {
    /**
     * Generate a random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    /**
     * Generate a random float between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random float
     */
    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    /**
     * Choose a random item from an array
     * @param {Array} array - Array to choose from
     * @returns {*} Random item from array
     */
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    },
    
    /**
     * Shuffle an array using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffleArray(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },
    
    /**
     * Check if two objects are adjacent in a hex grid
     * @param {number} row1 - Row of first object
     * @param {number} col1 - Column of first object
     * @param {number} row2 - Row of second object
     * @param {number} col2 - Column of second object
     * @returns {boolean} True if objects are adjacent
     */
    areAdjacent(row1, col1, row2, col2) {
        // Get adjacent coordinates from the first position
        const adjacentCoords = this.getAdjacentCoordinates(row1, col1, 100, 100);
        
        // Check if the second position is in the list of adjacent coordinates
        return adjacentCoords.some(([r, c]) => r === row2 && c === col2);
    },
    
    /**
     * Get all adjacent coordinates in a hex grid
     * @param {number} row - Center row
     * @param {number} col - Center column
     * @param {number} maxRows - Maximum number of rows in grid
     * @param {number} maxCols - Maximum number of columns in grid
     * @returns {Array} Array of adjacent [row, col] coordinates
     */
    getAdjacentCoordinates(row, col, maxRows, maxCols) {
        // For hexagons, there are always 6 adjacent tiles
        // The directions depend on whether the row is odd or even
        
        const isOddRow = row % 2 === 1;
        
        // These directions work for both odd-q and even-q offset coordinate systems
        const directions = isOddRow ? [
            // For odd rows
            [-1, 0],  // top-left
            [-1, 1],  // top-right
            [0, 1],   // right
            [1, 1],   // bottom-right
            [1, 0],   // bottom-left
            [0, -1]   // left
        ] : [
            // For even rows
            [-1, -1], // top-left
            [-1, 0],  // top-right
            [0, 1],   // right
            [1, 0],   // bottom-right
            [1, -1],  // bottom-left
            [0, -1]   // left
        ];
        
        // Generate all adjacent coordinates
        const adjacentCoords = directions.map(([dr, dc]) => {
            const newRow = row + dr;
            const newCol = col + dc;
            return [newRow, newCol];
        });
        
        // Filter out coordinates outside the grid boundaries
        return adjacentCoords.filter(([r, c]) => 
            r >= 0 && r < maxRows && c >= 0 && c < maxCols
        );
    },
    
    /**
     * Calculate Manhattan distance between two points
     * @param {number} row1 - Row of first point
     * @param {number} col1 - Column of first point
     * @param {number} row2 - Row of second point
     * @param {number} col2 - Column of second point
     * @returns {number} Manhattan distance
     */
    manhattanDistance(row1, col1, row2, col2) {
        return Math.abs(row1 - row2) + Math.abs(col1 - col2);
    },
    
    /**
     * Calculate hex grid distance between two points
     * @param {number} row1 - Row of first point
     * @param {number} col1 - Column of first point
     * @param {number} row2 - Row of second point
     * @param {number} col2 - Column of second point
     * @returns {number} Hex grid distance
     */
    hexDistance(row1, col1, row2, col2) {
        // Convert axial coordinates (odd-r offset) to cube coordinates
        let x1, y1, z1, x2, y2, z2;
        
        // Convert first point
        if (row1 % 2 === 1) { // Odd row
            x1 = col1;
            z1 = row1;
            y1 = -x1 - z1;
        } else { // Even row
            x1 = col1 - 0.5;
            z1 = row1;
            y1 = -x1 - z1;
        }
        
        // Convert second point
        if (row2 % 2 === 1) { // Odd row
            x2 = col2;
            z2 = row2;
            y2 = -x2 - z2;
        } else { // Even row
            x2 = col2 - 0.5;
            z2 = row2;
            y2 = -x2 - z2;
        }
        
        // Calculate distance using cube coordinates
        return Math.max(
            Math.abs(x1 - x2),
            Math.abs(y1 - y2),
            Math.abs(z1 - z2)
        );
    },
    
    /**
     * Format a timestamp for display
     * @param {Date} date - Date object
     * @returns {string} Formatted time string (HH:MM:SS)
     */
    formatTime(date = new Date()) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    },
    
    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    
    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp(a, b, t) {
        return a + (b - a) * this.clamp(t, 0, 1);
    },
    
    /**
     * Generate a unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    },
    
    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    /**
     * Debounce a function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    },
    
    /**
     * Throttle a function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}; 