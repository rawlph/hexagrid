/**
 * Utility functions for hexagonal grid calculations
 */
class HexUtils {
    /**
     * Calculates the pixel coordinates for a hex cell at the given grid position
     * @param {number} row - The row in the grid
     * @param {number} col - The column in the grid
     * @param {number} hexWidth - The width of a hex cell in pixels
     * @param {number} hexHeight - The height of a hex cell in pixels
     * @returns {Object} The x and y coordinates
     */
    static getHexPosition(row, col, hexWidth = 70, hexHeight = 80) {
        // Calculate spacing based on hex dimensions with adjusted values
        const horizSpacing = hexWidth * 1.00; // Increased from 0.75 to prevent overlap
        const vertSpacing = hexHeight * 0.74; // Decreased from 0.865 to reduce gap between rows
        
        // Calculate base position
        let x = col * horizSpacing;
        let y = row * vertSpacing;
        
        // Offset odd rows to create interlocking pattern
        if (row % 2 === 1) {
            x += horizSpacing / 2;
        }
        
        return { x, y };
    }

    /**
     * Get the adjacent hex positions for a given hex
     * @param {number} row - The row in the grid
     * @param {number} col - The column in the grid
     * @returns {Array} Array of adjacent positions {row, col}
     */
    static getAdjacentHexes(row, col) {
        const isOddRow = row % 2 === 1;
        
        // Define adjacent positions based on row parity
        const positions = [];
        
        // For a pointy-top hex grid, adjacent tiles are at these relative positions:
        // Direction coordinates are different for odd and even rows
        if (isOddRow) {
            // Odd row
            positions.push(
                { row: row - 1, col: col },     // North
                { row: row - 1, col: col + 1 }, // Northeast
                { row: row, col: col + 1 },     // Southeast
                { row: row + 1, col: col + 1 }, // South
                { row: row + 1, col: col },     // Southwest
                { row: row, col: col - 1 }      // Northwest
            );
        } else {
            // Even row
            positions.push(
                { row: row - 1, col: col },     // North
                { row: row - 1, col: col + 1 }, // Northeast
                { row: row, col: col + 1 },     // Southeast
                { row: row + 1, col: col },     // South
                { row: row + 1, col: col - 1 }, // Southwest
                { row: row, col: col - 1 }      // Northwest
            );
        }
        
        return positions;
    }

    /**
     * Check if two hex positions are adjacent
     * @param {number} row1 - Row of first hex
     * @param {number} col1 - Column of first hex
     * @param {number} row2 - Row of second hex
     * @param {number} col2 - Column of second hex
     * @returns {boolean} True if the hexes are adjacent
     */
    static areHexesAdjacent(row1, col1, row2, col2) {
        const adjacentHexes = this.getAdjacentHexes(row1, col1);
        return adjacentHexes.some(hex => hex.row === row2 && hex.col === col2);
    }

    /**
     * Calculate the distance between two hex coordinates (in grid units)
     * @param {number} row1 - Row of first hex
     * @param {number} col1 - Column of first hex
     * @param {number} row2 - Row of second hex
     * @param {number} col2 - Column of second hex
     * @returns {number} The distance in hex grid units
     */
    static getHexDistance(row1, col1, row2, col2) {
        // Convert to cube coordinates for easier distance calculation
        const [x1, y1, z1] = this.offsetToCube(row1, col1);
        const [x2, y2, z2] = this.offsetToCube(row2, col2);
        
        // Manhattan distance in cube coordinates
        return (Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2)) / 2;
    }

    /**
     * Convert offset coordinates (row, col) to cube coordinates (x, y, z)
     * @param {number} row - Row in offset coordinates
     * @param {number} col - Column in offset coordinates
     * @returns {Array} [x, y, z] in cube coordinates
     */
    static offsetToCube(row, col) {
        const isOddRow = row % 2 === 1;
        let x = col - (row - (isOddRow ? 1 : 0)) / 2;
        let z = row;
        let y = -x - z;
        return [x, y, z];
    }

    /**
     * Convert cube coordinates (x, y, z) to offset coordinates (row, col)
     * @param {number} x - X in cube coordinates
     * @param {number} y - Y in cube coordinates
     * @param {number} z - Z in cube coordinates
     * @returns {Array} [row, col] in offset coordinates
     */
    static cubeToOffset(x, y, z) {
        let row = z;
        let col = x + (z - (z % 2)) / 2;
        return [row, col];
    }

    /**
     * Check if a position is within the grid boundaries
     * @param {number} row - Row to check
     * @param {number} col - Column to check
     * @param {number} gridRows - Total number of rows in the grid
     * @param {number} gridCols - Total number of columns in the grid
     * @returns {boolean} True if the position is within bounds
     */
    static isWithinGrid(row, col, gridRows, gridCols) {
        return row >= 0 && row < gridRows && col >= 0 && col < gridCols;
    }
} 