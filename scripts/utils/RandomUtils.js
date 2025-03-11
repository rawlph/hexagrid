/**
 * Utility functions for randomization in the game
 */
class RandomUtils {
    /**
     * Get a random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer between min and max
     */
    static getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Get a random floating point number between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {number} decimals - Number of decimal places (default 2)
     * @returns {number} Random float between min and max
     */
    static getRandomFloat(min, max, decimals = 2) {
        const rand = Math.random() * (max - min) + min;
        const power = Math.pow(10, decimals);
        return Math.floor(rand * power) / power;
    }

    /**
     * Get a random item from an array
     * @param {Array} array - The array to pick from
     * @returns {*} A random item from the array
     */
    static getRandomArrayItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Shuffle an array using the Fisher-Yates algorithm
     * @param {Array} array - The array to shuffle
     * @returns {Array} The shuffled array
     */
    static shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    /**
     * Generate a random tile type based on probabilities
     * @param {object} probabilities - Object with tile types as keys and probabilities as values
     * @returns {string} The selected tile type
     */
    static getWeightedRandomTileType(probabilities) {
        const types = Object.keys(probabilities);
        const weights = Object.values(probabilities);
        
        // Calculate cumulative weights
        const cumulativeWeights = [];
        let sum = 0;
        
        for (const weight of weights) {
            sum += weight;
            cumulativeWeights.push(sum);
        }
        
        // Generate a random number between 0 and the sum of weights
        const random = Math.random() * sum;
        
        // Find the first cumulative weight greater than the random number
        for (let i = 0; i < cumulativeWeights.length; i++) {
            if (random <= cumulativeWeights[i]) {
                return types[i];
            }
        }
        
        // Fallback (should never reach here)
        return types[0];
    }

    /**
     * Generate a random chaos value based on the game stage and position
     * @param {string} gameStage - Current game stage (early, mid, late)
     * @param {number} row - Row position
     * @param {number} col - Column position
     * @param {number} rows - Total rows in grid
     * @param {number} cols - Total columns in grid
     * @returns {number} A chaos value between 0 and 1
     */
    static generateChaosByGameStage(gameStage, row, col, rows, cols) {
        // Base chaos levels by game stage
        const baseChaos = {
            early: 0.8,  // Early game: high chaos (80%)
            mid: 0.5,    // Mid game: balanced (50%)
            late: 0.3    // Late game: more order (30%)
        };
        
        // Calculate distance from center (normalized to 0-1)
        const centerRow = Math.floor(rows / 2);
        const centerCol = Math.floor(cols / 2);
        
        const maxDistance = Math.sqrt(Math.pow(Math.max(centerRow, rows - centerRow), 2) + 
                              Math.pow(Math.max(centerCol, cols - centerCol), 2));
        
        const distance = Math.sqrt(Math.pow(row - centerRow, 2) + 
                         Math.pow(col - centerCol, 2)) / maxDistance;
        
        // Base chaos for current stage
        let chaos = baseChaos[gameStage] || 0.5;
        
        // Add position-based variation (edges more chaotic)
        chaos += distance * 0.2;
        
        // Add some randomness
        chaos += this.getRandomFloat(-0.1, 0.1);
        
        // Clamp between 0 and 1
        return Math.max(0, Math.min(1, chaos));
    }
} 