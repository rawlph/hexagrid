# Chaos/Order System in Hexgrid Evolution

This document outlines the Chaos/Order system in Hexgrid Evolution, a core mechanic that underlies the game's ecosystem balance and progression.

## Core Concepts

The Chaos/Order system is a fundamental balance mechanic that operates at both the individual tile level and across the entire game grid. This dual-layer balance system drives gameplay, resource acquisition, and evolutionary progression.

### Chaos/Order Balance Fundamentals

1. **Binary Duality**: Chaos and Order are complementary forces that always sum to 1.0 (100%)
   - If a tile has 0.7 (70%) chaos, it automatically has 0.3 (30%) order
   - This relationship is maintained at both tile and system levels, while the c/o balance of the hexgrid is static, but the average of all tiles can exceed 100%

2. **Balance States**:
   - High Chaos (>0.8): "Highly Chaotic" - More volatile, higher resource costs
   - Medium-High Chaos (0.6-0.8): "Chaotic" - Somewhat unstable  
   - Balanced (0.4-0.6): "Balanced" - Optimal state for certain mechanics  
   - Medium-High Order (0.2-0.4): "Orderly" - More predictable
   - High Order (<0.2): "Highly Orderly" - Most stable, lowest costs

## Tile-Level Chaos/Order

Each tile in the hexagonal grid has its own chaos and order values:

```javascript
// From TileComponent.js
constructor(entity, type = 'normal', row, col, chaos = 0.5) {
    super(entity);
    
    this.type = type;
    this.row = row;
    this.col = col;
    this.chaos = chaos;
    this.order = 1 - chaos;
    this.explored = false;
    // ...
}
```

### Tile Chaos Generation

When the grid is generated, tiles receive initial chaos values based on:

```javascript
// From Grid.js
createTileEntity(row, col, hexCell, tileProbabilities) {
    // ...
    // Create a chaos value for this tile based on game stage and position
    let chaos = RandomUtils.generateChaosByGameStage(
        this.gameStage, 
        row, 
        col, 
        this.rows, 
        this.cols
    );
    
    // Ensure chaos is within valid range
    chaos = utils.clamp(chaos, 0.1, 0.9);
    // ...
}
```

The RandomUtils determines chaos based on multiple factors:

```javascript
// From RandomUtils.js
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
```

Key observations:
- Early game starts with higher chaos (80%)
- Game progresses toward more order as stages advance
- Tiles farther from the center are more chaotic
- Random variation adds unpredictability

### Tile Types and Chaos Interaction

Different tile types have different baseline chaos levels:

```javascript
// From TileComponent.js
initializeByType() {
    switch (this.type) {
        case 'normal':
            this.actionCosts.move = 1;
            this.actionCosts.interact = 2;
            break;
            
        case 'energy':
            this.energyValue = Math.floor(Math.random() * 3) + 1;
            this.actionCosts.interact = 1;
            break;
            
        case 'chaotic':
            this.chaos = Math.min(this.chaos + 0.2, 1);
            this.order = 1 - this.chaos;
            this.interactEffect = 0.2;
            break;
            
        case 'orderly':
            this.chaos = Math.max(this.chaos - 0.2, 0);
            this.order = 1 - this.chaos;
            this.interactEffect = -0.2;
            break;
            
        case 'obstacle':
            this.isBlocked = true;
            this.actionCosts.move = 999; // Cannot move here
            break;
    }
    
    // Adjust action costs based on chaos level
    this.updateActionCosts();
}
```

### Chaos Effects on Gameplay

Chaos level directly affects action costs on tiles:

```javascript
// From TileComponent.js
updateActionCosts() {
    // High chaos increases costs
    const chaosFactor = 1 + (this.chaos * 0.5);
    
    // Apply chaos factor to all actions except move
    if (this.type !== 'obstacle') {
        this.actionCosts.sense *= chaosFactor;
        this.actionCosts.interact *= chaosFactor;
        this.actionCosts.stabilize *= chaosFactor;
    }
    
    // Round costs to nearest integer
    for (const action in this.actionCosts) {
        this.actionCosts[action] = Math.max(1, Math.round(this.actionCosts[action]));
    }
}
```

### Manipulating Tile Chaos

The player can change tile chaos levels primarily through the "stabilize" action:

```javascript
// From TileComponent.js
updateChaosLevel(chaosDelta) {
    if (typeof chaosDelta !== 'number') {
        console.error('TileComponent: chaosDelta must be a number');
        return 0;
    }
    
    const oldChaos = this.chaos;
    this.chaos = Math.max(0, Math.min(1, this.chaos + chaosDelta));
    this.order = 1 - this.chaos;
    
    // Update costs when chaos changes
    this.updateActionCosts();
    
    return this.chaos - oldChaos; // Return the actual change
}
```

## System-Wide Chaos/Order Balance

The entire grid has a system-wide chaos/order balance that represents the cumulative state of all tiles.

### Balance Tracking

The TurnSystem monitors and manages the system-wide balance:

```javascript
// From TurnSystem.js
constructor(gameStage = 'early', options = {}) {
    // ...
    // Balance parameters - differ by game stage
    this.startingChaos = 0.5;
    this.startingOrder = 0.5;
    this.targetChaos = 0.5;
    this.targetOrder = 0.5;
    this.victoryThreshold = 0.1; // How close to target for victory
    
    // Set balance parameters for current game stage
    this.setGameStageBalance(gameStage);
}
```

### Game Stage Balance Goals

Different game stages have different balance targets:

```javascript
// From TurnSystem.js
setGameStageBalance(gameStage) {
    this.gameStage = gameStage;
    
    switch (gameStage) {
        case 'early':
            // Early game: simple balance, more turns allowed
            this.startingChaos = 0.6;
            this.startingOrder = 0.4;
            this.targetChaos = 0.5;
            this.targetOrder = 0.5;
            this.victoryThreshold = 0.1;
            this.turnsToBalance = 3;
            this.maxTurns = 30;
            break;
            
        case 'mid':
            // Mid game: tighter balance requirements
            this.startingChaos = 0.7;
            this.startingOrder = 0.3;
            this.targetChaos = 0.45;
            this.targetOrder = 0.55;
            this.victoryThreshold = 0.08;
            this.turnsToBalance = 4;
            this.maxTurns = 25;
            break;
            
        case 'late':
            // Late game: precise balance needed
            this.startingChaos = 0.8;
            this.startingOrder = 0.2;
            this.targetChaos = 0.4;
            this.targetOrder = 0.6;
            this.victoryThreshold = 0.05;
            this.turnsToBalance = 5;
            this.maxTurns = 20;
            break;
    }
}
```

### Detecting Balance Changes

When a tile's chaos level changes, the TurnSystem updates the system-wide balance:

```javascript
// From TurnSystem.js
onTileChaosChanged(data) {
    // Update system balance and emit event
    const { systemChaos, systemOrder } = data;
    
    // Check for balance changes that might lead to victory/defeat
    const chaosDiff = Math.abs(systemChaos - this.targetChaos);
    const orderDiff = Math.abs(systemOrder - this.targetOrder);
    
    // Emit balance changed event
    eventSystem.emitStandardized(
        EventTypes.SYSTEM_BALANCE_CHANGED.legacy,
        EventTypes.SYSTEM_BALANCE_CHANGED.standard,
        {
            chaos: systemChaos,
            order: systemOrder,
            targetChaos: this.targetChaos,
            targetOrder: this.targetOrder,
            chaosDiff,
            orderDiff,
            isBalanced: chaosDiff <= this.victoryThreshold && orderDiff <= this.victoryThreshold
        }
    );
}
```

## Evolution Points and Chaos/Order Relationship

The system balance directly impacts what type of evolution points the player earns.

### Evolution Point Types

There are three evolution point types related to the chaos/order balance:

```javascript
// From PlayerComponent.js
constructor(entity, startRow = 0, startCol = 0) {
    // ...
    // Evolution
    this.evolutionPoints = 0; // Legacy total points
    this.chaosEvolutionPoints = 0;
    this.flowEvolutionPoints = 0;
    this.orderEvolutionPoints = 0;
    // ...
}
```

### Evolution Point Calculation

Evolution points are calculated at the end of each turn based on the current system balance:

```javascript
// From TurnSystem.js
calculateEvolutionPoints() {
    // Get current system balance
    const { chaos, order } = this.getSystemBalance();
    
    // Define base points for each category
    let chaosPoints = 0;
    let flowPoints = 0;
    let orderPoints = 0;
    
    // Determine multiplier based on game stage
    const multiplier = this.pointsMultiplier[this.gameStage] || 1;
    
    // Parameters for points distribution
    const perfectBalance = 0.5;          // 50% chaos is perfect balance
    const balanceThreshold = 0.05;       // ±5% around 50% is considered balanced
    const specializationThreshold = 0.52; // Lower threshold to 52% (from 55%) for chaos/order specialization
    
    // Calculate balance deviation from perfect 50/50
    const balanceDeviation = Math.abs(chaos - perfectBalance);
    
    // Always calculate flow points - highest at perfect balance, declining as we move away
    if (balanceDeviation <= balanceThreshold) {
        // Within balanced range (45-55% chaos)
        // Highest flow points at perfect 50/50, linearly decreasing as we approach thresholds
        const flowFactor = 1 - (balanceDeviation / balanceThreshold);
        flowPoints = Math.round((6 * flowFactor + 3) * multiplier); // Scale from 3-9 based on proximity to perfect balance
    } else {
        // Outside balanced range but still give some flow points
        // Base flow points decrease the further we get from balance
        const flowBase = Math.max(0, 3 - (balanceDeviation - balanceThreshold) * 10);
        flowPoints = Math.max(1, Math.round(flowBase * multiplier)); // Minimum 1 flow point
    }
    
    // Calculate chaos points - only when chaos > specializationThreshold
    if (chaos > specializationThreshold) {
        // How far into chaos territory we are
        const chaosDepth = chaos - specializationThreshold;
        // More chaos = more chaos points, up to 8 at 100% chaos
        chaosPoints = Math.round((chaosDepth * 20) * multiplier); // Increased multiplier from 18 to 20
    }
    
    // Calculate order points - only when order > specializationThreshold
    if (order > specializationThreshold) {
        // How far into order territory we are
        const orderDepth = order - specializationThreshold;
        // More order = more order points, up to 8 at 100% order
        orderPoints = Math.round((orderDepth * 18) * multiplier);
    }
    
    // Ensure minimum 1 point total is always awarded
    const totalPoints = chaosPoints + flowPoints + orderPoints;
    if (totalPoints < 1) {
        flowPoints = 1;
    }
    
    return {
        chaos: chaosPoints,
        flow: flowPoints,
        order: orderPoints,
        total: chaosPoints + flowPoints + orderPoints
    };
}
```

Key observations:
- "Flow" points are highest when chaos/order is perfectly balanced (50/50)
- "Chaos" points increase with higher chaos levels (above 52%)
- "Order" points increase with higher order levels (above 52%)
- Game stage multipliers increase points in later stages

## Metrics and Achievement Tracking

The MetricsSystem tracks statistics related to chaos/order balance:

```javascript
// From MetricsSystem.js
constructor() {
    // ...
    // Chaos/Order metrics
    this.chaosCreated = 0;
    this.chaosReduced = 0;
    this.netChaosChange = 0;
    // ...
    
    // Play style metrics (calculated values)
    this.explorerRating = 0;    // How much of the map is explored
    this.balancerRating = 0;    // How well chaos/order is balanced
    this.efficientRating = 0;   // How efficiently resources are used
    // ...
}
```

## Actions and Their Effects on Chaos/Order

### Sense Action
- Reveals information about tiles
- Does not directly affect chaos/order balance
- Higher cost on chaotic tiles

### Move Action
- Allows player to navigate the grid
- No direct impact on chaos/order balance
- Movement cost is generally not affected by chaos level

### Interact Action
- Effects depend on tile type
- Can increase chaos on "chaotic" tiles (`interactEffect: 0.2`)
- Can decrease chaos on "orderly" tiles (`interactEffect: -0.2`)
- Higher cost on chaotic tiles

### Stabilize Action
- Primary action for reducing chaos
- Directly decreases a tile's chaos level
- Higher cost on chaotic tiles
- Strategic tool for balancing the system

## Visual Representation

Chaos/order is visually represented in the game:

```css
/* From CSSArchitecture.md */
.hex-tile.chaotic {
    --tile-background-color: #511e29; /* Deeper red for chaotic biology */
    background-image: 
        radial-gradient(circle at 30% 70%, rgba(201, 60, 100, 0.3) 0%, transparent 70%),
        radial-gradient(circle at 70% 30%, rgba(201, 60, 100, 0.2) 0%, transparent 60%);
    box-shadow: 0 0 10px rgba(201, 60, 100, 0.15);
}

/* Orderly structured tiles */
.hex-tile.orderly {
    --tile-background-color: #0e3c4e; /* Deep ordered blue */
    background-image: 
        linear-gradient(120deg, rgba(42, 111, 142, 0.2) 0%, transparent 50%),
        linear-gradient(240deg, rgba(42, 111, 142, 0.2) 0%, transparent 50%);
    box-shadow: 0 0 10px rgba(42, 111, 142, 0.15);
}

/* Unexplored abyss tiles */
.hex-tile.unexplored {
    --tile-background-color: #041c26; /* Dark abyss */
    background-image: 
        radial-gradient(circle at center, rgba(10, 52, 66, 0.3) 0%, transparent 100%);
    filter: brightness(0.6) contrast(0.9) blur(1px);
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
}
```

## Explored vs Unexplored Tiles

The distinction between explored and unexplored tiles interacts with the chaos/order system:

- **Unexplored Tiles**:
  - Visually distinct with a dark, blurred appearance
  - Information about their chaos/order levels is hidden from the player
  - Require the "Sense" action to reveal their properties
  - Add an element of risk and discovery to gameplay

- **Explored Tiles**:
  - Reveal their true properties, including chaos/order levels
  - Allow the player to make informed decisions about actions
  - Display appropriate visual cues about their chaos/order state
  - Can be more efficiently manipulated by the player

## Game Progression Through Chaos/Order Balance

The overall game progression is tied to achieving specific chaos/order balance targets:

1. **Early Game Stage**:
   - Starts with higher chaos (60%)
   - Goal is to achieve balanced state (50/50)
   - Requires 3 consecutive balanced turns
   - Has 30 maximum turns

2. **Mid Game Stage**:
   - Starts with even higher chaos (70%)
   - Goal shifts slightly toward order (45/55)
   - Requires 4 consecutive balanced turns
   - Has 25 maximum turns
   - Balance tolerance becomes stricter (±8%)

3. **Late Game Stage**:
   - Starts with highest chaos (80%)
   - Goal shifts further toward order (40/60)
   - Requires 5 consecutive balanced turns
   - Has 20 maximum turns
   - Balance tolerance is most strict (±5%)

This progression creates an evolutionary narrative of bringing increasing order to a chaotic system while still maintaining sufficient chaos for adaptability. 