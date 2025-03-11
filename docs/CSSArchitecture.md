# Hexgrid Evolution: CSS Architecture Documentation

This document provides a comprehensive overview of the CSS architecture, styling approach, and the interaction between CSS, JavaScript, and HTML elements in the Hexgrid Evolution game. This will serve as a reference for making CSS modifications and understanding how styles affect the game's appearance and functionality.

## Table of Contents

1. [CSS File Structure](#css-file-structure)
2. [Styling Approach](#styling-approach)
3. [Color System](#color-system)
4. [Layout System](#layout-system)
5. [Component-Specific Styling](#component-specific-styling)
6. [CSS-JavaScript Interaction](#css-javascript-interaction)
7. [Responsive Design](#responsive-design)
8. [Animation System](#animation-system)
9. [Deep-Sea Theme Effects](#deep-sea-theme-effects)
10. [Evolution Screen Styling](#evolution-screen-styling)
11. [Common CSS Patterns](#common-css-patterns)

## CSS File Structure

The game's CSS is organized into three main files, each with a specific purpose:

### 1. `styles/main.css`

The primary stylesheet containing:
- CSS variables (custom properties)
- Base element styling
- Layout grid structure
- UI components
- Generic utility classes
- Modal and overlay styling
- Feedback message styling
- Balance display
- Evolution points display
- Deep-sea effect variables and animations
- Evolution screen and trait card styling

### 2. `styles/hexgrid.css`

Dedicated to the hex grid rendering:
- Hex grid container
- Individual hex cell styling
- Hex tile content positioning
- Tile type-specific styling with biological themes
- Player marker
- Tile state classes (explored, unexplored, activated)
- Hex-specific animations
- Responsive adjustments for the grid

### 3. `styles/ui.css`

Focused on interactive UI elements:
- Action buttons styling
- Action panel layout
- Button states (active, hover, disabled)
- Message log styling
- Feedback message system
- Stats display
- Progress bars
- Evolution points visualization

## Styling Approach

### CSS Variables

The game uses CSS custom properties (variables) for consistent theming, defined in the `:root` selector in `main.css`:

```css
:root {
    /* Deep-sea primordial color palette */
    --primary-color: #0a3442;
    --secondary-color: #20a4b5;
    --accent-color: #f05e23;
    --dark-color: #041c26;
    --light-color: #e6f4f1;
    
    /* UI colors - biology-themed */
    --energy-color: #68c3a6;       /* Bioluminescent green */
    --chaos-color: #c93c64;        /* Primordial red */
    --order-color: #2a6f8e;        /* Deep ocean blue */
    --background-color: #021218;   /* Abyssal dark */
    --text-color: #e6f4f1;
    
    /* Feedback colors */
    --success-color: #43c59e;
    --warning-color: #ffc145;
    --error-color: #ff5a5f;
    
    /* Typography */
    --title-font: 'Arial', sans-serif;
    --body-font: 'Arial', sans-serif;
    
    /* Dimensions */
    --header-height: 60px;
    --footer-height: 60px;
    --action-panel-height: 60px;
    --message-log-height: 200px;
    
    /* Deep-sea effect variables */
    --deep-glow: rgba(14, 145, 178, 0.1);
    --biolum-glow: rgba(72, 219, 251, 0.1);
    --abyss-shadow: rgba(1, 4, 9, 0.3);
}
```

These variables are referenced throughout the CSS files to maintain consistency and make theme changes easier.

### BEM-Inspired Naming

The CSS classes follow a BEM-inspired (Block, Element, Modifier) naming convention:

- **Blocks**: Main components like `.hex-tile`, `.action-btn`, `.balance-bar`
- **Elements**: Parts of a component like `.hex-tile-content`, `.balance-bar-label`
- **Modifiers**: Variations like `.hex-tile.chaotic`, `.action-btn.active`, `.message.warning`

## Color System

The game uses a cohesive deep-sea, primordial color system with distinct colors for different game concepts:

| Variable | Purpose | Color | Usage |
|----------|---------|-------|-------|
| `--primary-color` | Primary UI elements | #0a3442 (Deep sea blue) | Background of main UI components |
| `--secondary-color` | Secondary UI elements | #20a4b5 (Teal blue) | Highlights, secondary buttons |
| `--accent-color` | Accent highlights | #f05e23 (Vivid orange) | Player marker, important actions |
| `--energy-color` | Energy representation | #68c3a6 (Bioluminescent green) | Energy display, energy tiles |
| `--chaos-color` | Chaos representation | #c93c64 (Primordial red) | Chaos values, chaotic tiles, balance bar |
| `--order-color` | Order representation | #2a6f8e (Deep ocean blue) | Order values, orderly tiles, balance bar |
| `--success-color` | Success messages | #43c59e (Sea mint) | Positive feedback notifications |
| `--warning-color` | Warning messages | #ffc145 (Warm amber) | Caution notifications |
| `--error-color` | Error messages | #ff5a5f (Coral red) | Error notifications |
| `--deep-glow` | Underwater glow | rgba(14, 145, 178, 0.1) | Subtle glow effects |
| `--biolum-glow` | Bioluminescent glow | rgba(72, 219, 251, 0.1) | Biological light effects |
| `--abyss-shadow` | Deep shadows | rgba(1, 4, 9, 0.3) | Creating depth and darkness |

## Layout System

### Main Grid Layout

The game uses CSS Grid for the main layout structure:

```css
main {
    flex: 1;
    display: grid;
    grid-template-columns: 3fr 1fr;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
        "info info"
        "grid log"
        "actions log";
    gap: 0.5rem;
    padding: 0.5rem;
    overflow: hidden;
    height: calc(100vh - var(--header-height));
}
```

Each component is positioned in its respective grid area using the `grid-area` property:

```css
#game-info { grid-area: info; }
#grid-container { grid-area: grid; }
#action-panel { grid-area: actions; }
#message-log { grid-area: log; }
```

### Hex Grid Layout

The hex grid uses absolute positioning to create the interlocking hexagonal pattern:

```css
.hex-grid {
    position: absolute;
    overflow: visible;
    z-index: 2; /* Above the grid-container background effects */
}

.hex-tile {
    position: absolute;
    width: 70px;
    height: 80px;
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    transition: transform 0.25s cubic-bezier(0.15, 1.2, 0.3, 1), filter 0.3s ease;
    --tile-background-color: #0a3442;
    background-color: var(--tile-background-color);
    cursor: pointer;
    box-sizing: border-box;
    box-shadow: 0 0 10px rgba(1, 10, 15, 0.5);
}
```

The JavaScript in `Grid.js` calculates precise positions for each hex tile and sets them via inline styles:

```javascript
// Calculate proper spacing for a honeycomb pattern
const horizSpacing = hexWidth * 1.00; // Increased for proper interlocking
const vertSpacing = hexHeight * 0.74; // Decreased to reduce gaps between rows

// Calculate hex position with proper offset for odd rows
let xPos = col * horizSpacing;
let yPos = row * vertSpacing;

// Offset odd rows to create interlocking pattern
if (row % 2 === 1) {
    xPos += horizSpacing / 2;
}

hexCell.style.left = `${xPos}px`;
hexCell.style.top = `${yPos}px`;
hexCell.style.position = 'absolute';
```

## Deep-Sea Theme Effects

The game employs several CSS techniques to create a deep-sea, primordial atmosphere:

### 1. Grid Container Background

The grid container creates depth with overlapping gradients and shadows:

```css
#grid-container {
    background-color: rgba(4, 14, 27, 0.9);
    background-image: 
        radial-gradient(circle at 10% 20%, rgba(14, 85, 100, 0.05) 0%, transparent 80%),
        radial-gradient(circle at 90% 80%, rgba(18, 110, 130, 0.03) 0%, transparent 70%);
    border-radius: 8px;
    box-shadow: inset 0 0 40px var(--abyss-shadow);
    position: relative;
    overflow: hidden;
}

#grid-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: 
        linear-gradient(180deg, rgba(6, 22, 33, 0) 70%, rgba(3, 26, 36, 0.2) 100%),
        linear-gradient(90deg, rgba(6, 22, 33, 0) 85%, rgba(3, 26, 36, 0.1) 100%);
    pointer-events: none;
    z-index: 1;
}
```

### 2. Floating Particles

Two types of floating particles create an underwater effect:

#### Static Background Particles
```css
#grid-container::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: 
        radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.02) 0%, transparent 2%),
        radial-gradient(circle at 40% 70%, rgba(255, 255, 255, 0.01) 0%, transparent 1%),
        /* Additional gradients for more particles */;
    pointer-events: none;
    animation: floatParticles 60s linear infinite;
    z-index: 3;
}
```

#### Dynamic JavaScript-Generated Particles
```css
.floating-particle {
    position: absolute;
    width: 3px;
    height: 3px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    pointer-events: none;
    animation: float 15s ease-in infinite;
    z-index: 2;
}

/* Variations for different particle sizes and behaviors */
.floating-particle:nth-child(2n) {
    width: 2px;
    height: 2px;
    animation-duration: 25s;
    animation-delay: 2s;
}

.floating-particle:nth-child(4n) {
    background-color: rgba(104, 195, 166, 0.1); /* Bioluminescent particle */
    animation-duration: 30s;
    animation-delay: 7s;
}
```

These particles are generated by JavaScript:

```javascript
createFloatingParticles() {
    // Clean up any existing particles
    const existingParticles = this.container.querySelectorAll('.floating-particle');
    existingParticles.forEach(particle => particle.remove());
    
    // Number of particles scales with grid size
    const numParticles = Math.min(20, Math.max(8, Math.floor((this.rows * this.cols) / 4)));
    
    // Create and position particles
    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('div');
        particle.className = 'floating-particle';
        
        // Random position and animation delay
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 15}s`;
        
        this.container.appendChild(particle);
    }
}
```

### 3. Biology-Themed Tile Styling

Each tile type has specific styling to match the deep-sea biological theme:

```css
/* Normal "cellular" tiles */
.hex-tile.normal {
    --tile-background-color: #0a3442; /* Deep sea blue */
    background-image: 
        radial-gradient(circle at center, rgba(20, 70, 90, 0.8) 0%, transparent 100%);
}

/* Energy tiles with bioluminescence */
.hex-tile.energy {
    --tile-background-color: #0d564c; /* Base color for energy tiles */
    background-image: 
        radial-gradient(circle at center, rgba(104, 195, 166, 0.4) 0%, transparent 70%);
    box-shadow: 0 0 10px rgba(104, 195, 166, 0.2);
    animation: energyPulse 3s infinite alternate;
}

/* Chaotic primordial tiles */
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

/* Molecular particles on tiles */
.hex-tile.energy::after,
.hex-tile.chaotic::after,
.hex-tile.orderly::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background-image: radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.1) 0%, transparent 2%),
                      radial-gradient(circle at 70% 60%, rgba(255, 255, 255, 0.1) 0%, transparent 2%),
                      radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 2%),
                      radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 2%);
    pointer-events: none;
}
```

## Component-Specific Styling

### Balance Bar

The balance bar visualizes the chaos/order balance with a dynamic fill and marker:

```css
.balance-bar {
    flex: 1;
    height: 12px;
    background: linear-gradient(to right, 
        rgba(25, 25, 25, 0.5) 0%,
        var(--order-color) 100%);
    border-radius: 6px;
    position: relative;
    overflow: hidden;
}

.balance-chaos-fill {
    position: absolute;
    height: 100%;
    width: 50%; /* Default 50% - will be updated via JS */
    background: linear-gradient(to right, 
        var(--chaos-color) 0%,
        rgba(201, 60, 100, 0.8) 100%);
    border-radius: 6px 0 0 6px;
}

.balance-marker {
    position: absolute;
    width: 3px;
    height: 18px;
    background-color: rgba(255, 255, 255, 0.9);
    top: -3px;
    left: 50%; /* Will be updated via JS */
    transform: translateX(-50%);
}
```

The JavaScript in `Game.js` updates these elements dynamically:

```javascript
// Update chaos fill width
const chaosFill = document.querySelector('.balance-chaos-fill');
if (chaosFill) {
    chaosFill.style.width = `${chaosPercent}%`;
}

// Update balance marker position
const balanceMarker = document.querySelector('.balance-marker');
if (balanceMarker) {
    balanceMarker.style.left = `${chaosPercent}%`;
    
    // Also update color based on balance deviation
    const balanceDeviation = Math.abs(chaosPercent - 50);
    if (balanceDeviation < 5) {
        balanceMarker.style.backgroundColor = 'rgba(100, 255, 100, 0.9)';
    } 
    // More color logic...
}
```

### Evolve Button

The evolve button features a pulsing animation and transforms on hover:

```css
#evolve-btn {
    position: absolute;
    bottom: 50px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 28px;
    background: linear-gradient(135deg, var(--secondary-color) 0%, #187182 100%);
    color: var(--light-color);
    border: none;
    border-radius: 30px;
    font-size: 16px;
    font-weight: bold;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: 0 0 20px rgba(32, 164, 181, 0.4);
    transition: all 0.3s ease;
    animation: pulse 2s infinite;
}

#evolve-btn:hover {
    transform: translateX(-50%) scale(1.05);
    box-shadow: 0 0 30px rgba(32, 164, 181, 0.6);
}

@keyframes pulse {
    0% { box-shadow: 0 0 20px rgba(32, 164, 181, 0.4); }
    50% { box-shadow: 0 0 30px rgba(32, 164, 181, 0.6); }
    100% { box-shadow: 0 0 20px rgba(32, 164, 181, 0.4); }
}
```

### Player Marker

The player marker has been redesigned to resemble an evolving organism:

```css
.player-marker {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background-color: var(--accent-color);
    background-image: radial-gradient(circle at 70% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 40%);
    border: 2px solid var(--light-color);
    z-index: 50;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: bold;
    box-shadow: 0 0 15px rgba(240, 94, 35, 0.4);
    color: var(--light-color);
    pointer-events: none; /* Ensure clicks pass through to tiles */
}
```

## CSS-JavaScript Interaction

The interaction between CSS and JavaScript occurs through several mechanisms:

### 1. Class Manipulation

JavaScript code adds/removes classes to change element styling:

```javascript
// In ActionPanel.js - Updating button states
updateButtonStates() {
    // Get player component
    const playerEntity = entityManager.getEntitiesByTag('player')[0];
    if (!playerEntity) return;
    
    const playerComponent = playerEntity.getComponent(PlayerComponent);
    if (!playerComponent) return;
    
    // Remove active class from all buttons
    for (const button of Object.values(this.buttons)) {
        if (button) button.classList.remove('active');
    }
    
    // Add active class to current action
    if (playerComponent.currentAction && this.buttons[playerComponent.currentAction]) {
        this.buttons[playerComponent.currentAction].classList.add('active');
    }
    
    // Disable buttons if player has no movement points
    const hasMovementPoints = playerComponent.movementPoints > 0;
    
    for (const action of ['move', 'sense', 'interact', 'stabilize']) {
        if (this.buttons[action]) {
            this.buttons[action].disabled = !hasMovementPoints;
        }
    }
}
```

### 2. Style Property Manipulation

JavaScript directly modifies CSS properties for dynamic effects:

```javascript
// In Grid.js - Positioning hex cells
hexCell.style.left = `${xPos}px`;
hexCell.style.top = `${yPos}px`;
hexCell.style.position = 'absolute';
```

### 3. Dynamic Creation of Elements

JavaScript creates visual elements like the floating particles:

```javascript
// In Grid.js - Creating floating particles
createFloatingParticles() {
    // Number of particles scales with grid size
    const numParticles = Math.min(20, Math.max(8, Math.floor((this.rows * this.cols) / 4)));
    
    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('div');
        particle.className = 'floating-particle';
        // Position and animation setup...
        this.container.appendChild(particle);
    }
}
```

### 4. Action Effect Visualization

The ActionPanel applies visual effects for different actions:

```javascript
// In TileComponent.js - Applying visual effects
applyEffect(effectClass) {
    if (!this.element) return;
    
    // Add effect class
    this.element.classList.add(effectClass);
    
    // Remove after animation completes
    setTimeout(() => {
        this.element.classList.remove(effectClass);
    }, 1000);
}
```

CSS for action effects:

```css
/* In styles/hexgrid.css */
.hex-tile.sense-effect {
    animation: pulseGlow 1s ease-out;
}

.hex-tile.interact-effect {
    animation: shiftColors 1s ease-in-out;
}

.hex-tile.stabilize-effect {
    animation: stabilize 1s ease-out;
}

@keyframes pulseGlow {
    0% { box-shadow: 0 0 5px rgba(104, 195, 166, 0.3); }
    50% { box-shadow: 0 0 20px rgba(104, 195, 166, 0.6); }
    100% { box-shadow: 0 0 5px rgba(104, 195, 166, 0.3); }
}

@keyframes shiftColors {
    0% { filter: hue-rotate(0deg); }
    50% { filter: hue-rotate(180deg); }
    100% { filter: hue-rotate(0deg); }
}

@keyframes stabilize {
    0% { box-shadow: 0 0 25px rgba(72, 219, 251, 0.3); }
    100% { box-shadow: 0 0 0 rgba(72, 219, 251, 0); }
}
```

## Animation System

The game uses CSS animations for visual effects, now enhanced with deep-sea themed animations:

### 1. Water Movement Animations

```css
@keyframes floatParticles {
    0% { transform: translateY(0%) translateX(0%); }
    25% { transform: translateY(-2%) translateX(1%); }
    50% { transform: translateY(-1%) translateX(-1%); }
    75% { transform: translateY(1%) translateX(-2%); }
    100% { transform: translateY(0%) translateX(0%); }
}

@keyframes float {
    0% { transform: translateY(0) translateX(0); opacity: 0.1; }
    50% { transform: translateY(-15px) translateX(5px); opacity: 0.3; }
    100% { transform: translateY(-30px) translateX(0); opacity: 0; }
}
```

### 2. Bioluminescent Pulsing

```css
@keyframes energyPulse {
    0% { box-shadow: 0 0 10px rgba(104, 195, 166, 0.2); }
    100% { box-shadow: 0 0 20px rgba(104, 195, 166, 0.4); }
}

@keyframes pulse {
    0% {
        transform: scale(1);
        filter: brightness(1);
    }
    50% {
        transform: scale(1.05);
        filter: brightness(1.2);
        box-shadow: 0 0 20px var(--deep-glow);
    }
    100% {
        transform: scale(1);
        filter: brightness(1);
    }
}
```

### 3. Stabilization Effect

```css
@keyframes stabilize {
    0% { box-shadow: 0 0 25px rgba(72, 219, 251, 0.3); }
    100% { box-shadow: 0 0 0 rgba(72, 219, 251, 0); }
}
```

## Responsive Design

The game employs responsive design to adapt to different screen sizes:

### Media Queries

```css
@media (max-width: 768px) {
    main {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr auto auto;
        grid-template-areas:
            "info"
            "grid"
            "actions"
            "log";
    }
    
    /* Additional responsive adjustments */
}

@media (max-width: 1200px) {
    .hex-tile {
        width: 60px;
        height: 69px;
    }
    
    .player-marker {
        width: 24px;
        height: 24px;
        font-size: 0.8rem;
    }
}
```

## Evolution Screen Styling

The evolution screen uses a modal-based interface with specialized styling for trait cards and category tabs:

### Modal Container

The modal container provides a full-screen overlay with a semi-transparent background:

```css
#modal-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s ease;
}

#modal-container.hidden {
    display: none;
}

#modal-container:not(.hidden) {
    opacity: 1;
}

#modal-content {
    background: linear-gradient(to bottom, 
        rgba(20, 40, 60, 0.95), 
        rgba(10, 20, 40, 0.95));
    border-radius: 10px;
    padding: 30px;
    width: 80%;
    max-width: 700px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 0 30px rgba(80, 170, 230, 0.4);
    border: 1px solid rgba(100, 180, 255, 0.3);
    position: relative;
    animation: modalAppear 0.5s ease forwards;
}
```

### Evolution Header

The evolution screen header uses a distinctive styling with accent colors:

```css
.evolution-header {
    color: #64dfdf;
    text-align: center;
    margin-bottom: 20px;
    font-size: 2rem;
    text-shadow: 0 0 10px rgba(100, 223, 223, 0.5);
}

.evolution-header span {
    color: var(--accent-color);
}
```

### Evolution Points Display

The evolution points display shows the different types of points with distinctive styling:

```css
.evolution-points-display {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    padding: 15px;
    background: rgba(10, 30, 50, 0.5);
    border-radius: 8px;
}

.points-container {
    display: flex;
    gap: 20px;
}

.point-type {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px;
    border-radius: 6px;
    min-width: 80px;
}

.point-type.chaos {
    background: rgba(201, 60, 100, 0.2);
}

.point-type.flow {
    background: rgba(100, 223, 223, 0.2);
}

.point-type.order {
    background: rgba(42, 111, 142, 0.2);
}

.point-icon {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    margin-bottom: 5px;
}

.chaos-icon {
    background: var(--chaos-color);
    box-shadow: 0 0 10px rgba(201, 60, 100, 0.5);
}

.flow-icon {
    background: #64dfdf;
    box-shadow: 0 0 10px rgba(100, 223, 223, 0.5);
}

.order-icon {
    background: var(--order-color);
    box-shadow: 0 0 10px rgba(42, 111, 142, 0.5);
}

.point-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--light-color);
}

.point-label {
    font-size: 0.8rem;
    color: rgba(230, 244, 241, 0.7);
}
```

### Trait Category Tabs

The trait category tabs allow for easy navigation between trait types:

```css
.trait-tabs {
    display: flex;
    gap: 5px;
    margin-bottom: 15px;
    overflow-x: auto;
    padding-bottom: 5px;
}

.trait-tab {
    padding: 8px 15px;
    background: rgba(10, 52, 66, 0.6);
    border: none;
    border-radius: 4px;
    color: rgba(230, 244, 241, 0.8);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
}

.trait-tab:hover {
    background: rgba(32, 164, 181, 0.3);
}

.trait-tab.active {
    background: rgba(32, 164, 181, 0.4);
    color: #ffffff;
    font-weight: bold;
}
```

### Trait List Container

The trait list container holds the scrollable list of available traits:

```css
.trait-list-container {
    max-height: 400px;
    overflow-y: auto;
    padding: 10px;
    background: rgba(4, 28, 38, 0.4);
    border-radius: 4px;
    margin-bottom: 20px;
}

.category-description {
    margin-bottom: 15px;
    padding: 10px;
    background: rgba(10, 52, 66, 0.4);
    border-radius: 4px;
    font-style: italic;
    color: rgba(230, 244, 241, 0.8);
}

.empty-traits-message {
    padding: 20px;
    text-align: center;
    color: rgba(230, 244, 241, 0.6);
    font-style: italic;
}
```

### Trait Cards

Trait cards display individual traits with their details and status:

```css
.trait-card {
    margin-bottom: 15px;
    padding: 15px;
    border-radius: 6px;
    background: rgba(10, 52, 66, 0.6);
    border: 1px solid rgba(32, 164, 181, 0.2);
    transition: all 0.2s ease;
}

.trait-card:hover {
    border-color: rgba(32, 164, 181, 0.5);
    box-shadow: 0 0 10px rgba(32, 164, 181, 0.2);
}

.trait-card.acquired {
    border-color: rgba(104, 195, 166, 0.5);
    background: rgba(10, 52, 66, 0.8);
}

.trait-card.unlockable {
    border-color: rgba(32, 164, 181, 0.7);
    box-shadow: 0 0 10px rgba(32, 164, 181, 0.3);
}

.trait-card.locked {
    opacity: 0.7;
}
```

### Cost Type Styling

Different trait cost types have distinctive styling:

```css
.trait-card.chaos {
    border-left: 4px solid var(--chaos-color);
}

.trait-card.flow {
    border-left: 4px solid #64dfdf;
}

.trait-card.order {
    border-left: 4px solid var(--order-color);
}

.trait-card.mixed {
    border-left: 4px solid var(--accent-color);
}
```

### Trait Card Content

The trait card content is structured with header, description, and status:

```css
.trait-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.trait-name {
    margin: 0;
    color: var(--light-color);
    font-size: 18px;
}

.trait-cost {
    display: flex;
    gap: 5px;
    align-items: center;
}

.cost {
    padding: 3px 6px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 14px;
}

.chaos-cost {
    background: rgba(201, 60, 100, 0.3);
    color: var(--chaos-color);
}

.flow-cost {
    background: rgba(100, 223, 223, 0.3);
    color: #64dfdf;
}

.order-cost {
    background: rgba(42, 111, 142, 0.3);
    color: var(--order-color);
}

.trait-description {
    margin-bottom: 15px;
    color: rgba(230, 244, 241, 0.9);
    line-height: 1.4;
}

.trait-status {
    display: flex;
    justify-content: flex-end;
}

.status-acquired {
    color: var(--energy-color);
    font-weight: bold;
}

.status-locked {
    color: rgba(230, 244, 241, 0.5);
    font-style: italic;
}

.unlock-btn {
    padding: 5px 15px;
    background: rgba(32, 164, 181, 0.4);
    border: 1px solid rgba(32, 164, 181, 0.6);
    border-radius: 4px;
    color: var(--light-color);
    cursor: pointer;
    transition: all 0.2s ease;
}

.unlock-btn:hover {
    background: rgba(32, 164, 181, 0.6);
}

.trait-requirements {
    margin-top: 10px;
    font-size: 12px;
    color: rgba(230, 244, 241, 0.6);
    font-style: italic;
}
```

### Evolution Screen Navigation Buttons

The evolution screen includes navigation buttons for returning to the completion screen or proceeding to the next level:

```css
.evolution-buttons {
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
}

.return-btn, .next-level-btn {
    padding: 10px 20px;
    border-radius: 4px;
    border: none;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
}

.return-btn {
    background: rgba(10, 52, 66, 0.6);
    color: var(--light-color);
    border: 1px solid rgba(32, 164, 181, 0.3);
}

.return-btn:hover {
    background: rgba(10, 52, 66, 0.8);
    border-color: rgba(32, 164, 181, 0.5);
}

.next-level-btn {
    background: rgba(32, 164, 181, 0.6);
    color: var(--light-color);
}

.next-level-btn:hover {
    background: rgba(32, 164, 181, 0.8);
}
```

## Common CSS Patterns

### 1. Gradient Overlays

Used for depth and visual interest:

```css
background-image: 
    linear-gradient(to bottom, rgba(10, 20, 30, 0.8), rgba(5, 10, 15, 0.9)),
    radial-gradient(circle at center, rgba(30, 100, 120, 0.2), transparent 70%);
```

### 2. Subtle Animations

Used for biological, living feel:

```css
@keyframes pulse {
    0% { opacity: 0.7; transform: scale(0.98); }
    100% { opacity: 1; transform: scale(1); }
}

.element {
    animation: pulse 2s infinite alternate ease-in-out;
}
```

### 3. Nested Pseudo-elements

Used for complex visual effects without extra DOM elements:

```css
.element {
    position: relative;
}

.element::before {
    content: '';
    position: absolute;
    /* styling for first layer */
}

.element::after {
    content: '';
    position: absolute;
    /* styling for second layer */
}
```

## Best Practices for CSS Modifications

1. **Use Variables**: Modify CSS variables in `:root` for theme-wide changes
2. **Respect BEM**: Follow the existing naming conventions
3. **Mobile-First**: Consider mobile layouts first, then enhance for larger screens
4. **Performance**: Be cautious with complex animations and shadows on low-end devices
5. **Specificity**: Keep selector specificity as low as possible
6. **Comments**: Document complex CSS techniques and animations

## Common Issues and Troubleshooting

1. **Z-Index Stacking**: If elements appear in the wrong order, check the z-index stacking context
2. **Animation Performance**: If animations are sluggish, reduce complexity or use `will-change`
3. **Modal Positioning**: If modals appear incorrectly positioned, check the fixed positioning and z-index
4. **Trait Card Styling**: If trait cards don't reflect their state correctly, ensure the proper classes are applied
5. **Responsive Layout Issues**: If the layout breaks on certain screen sizes, check the media queries

This documentation should help you understand and modify the CSS architecture of Hexgrid Evolution with its deep-sea, primordial atmosphere. 