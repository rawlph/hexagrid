# Hexgrid Evolution: CSS Rework Roadmap

This document outlines a comprehensive plan for reworking the CSS in Hexgrid Evolution, with a focus on removing mobile compatibility and enhancing the desktop experience. It includes an analysis of current CSS-JavaScript dependencies and a phased approach to implementation.

## Key CSS-JavaScript Dependencies

### Grid.js Dependencies
- **Hex Tile Dimensions**: Grid.js uses hardcoded values (70px width, 80px height) that match CSS (.hex-tile in hexgrid.css)
- **Grid Layout Calculations**:
  ```javascript
  const hexWidth = 70;  // Width of a hex tile
  const hexHeight = 80; // Height of a hex tile
  const horizSpacing = hexWidth * 1.00; // Spacing calculation
  const vertSpacing = hexHeight * 0.74; // Spacing calculation
  ```
- **Element Positioning**:
  ```javascript
  this.gridElement.style.width = `${totalWidth}px`;
  this.gridElement.style.height = `${totalHeight}px`;
  this.gridElement.style.position = 'absolute';
  this.gridElement.style.left = '50%';
  this.gridElement.style.top = '50%';
  this.gridElement.style.transform = 'translate(-50%, -50%)';
  ```
- **Tile Positioning**:
  ```javascript
  hexCell.style.left = `${xPos}px`;
  hexCell.style.top = `${yPos}px`;
  hexCell.style.position = 'absolute';
  ```
- **Particle Effects**:
  ```javascript
  particle.style.left = `${randomX}%`;
  particle.style.top = `${randomY}%`;
  particle.style.animationDelay = `${Math.random() * 15}s`;
  ```

### CSS Variables
Important CSS variables in `:root` that establish key dimensions and colors:
```css
:root {
    /* Deep-sea primordial color palette */
    --primary-color: #0a3442;
    --secondary-color: #20a4b5;
    --accent-color: #f05e23;
    /* ... other color variables ... */
    
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

### CSS Class Dependencies
Various JavaScript components add/remove classes for state changes:
- 'active' - for selected actions/buttons
- 'unexplored' - for hex tiles
- 'sense-effect', 'interact-effect', 'stabilize-effect' - for action feedback
- 'chaotic', 'energy', 'orderly', 'normal' - for tile types

### Layout Structure
Main grid layout that defines the overall UI structure:
```css
main {
    display: grid;
    grid-template-columns: 3fr 1fr;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
        "info info"
        "grid log"
        "actions log";
}
```

### Current Mobile Media Queries
Mobile-specific adjustments to remove:
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
    /* Additional mobile styles... */
}

@media (max-width: 1200px) {
    .hex-tile {
        width: 60px;
        height: 69px;
    }
    /* Additional tablet styles... */
}
```

## CSS Rework Implementation Plan

### Phase 1: Analysis and Preparation

1. **Document CSS-JavaScript Dependencies**
   - ✅ Completed - See above analysis
   - Ensure any additional dependencies are identified during implementation

2. **Identify Mobile-Specific Code**
   - ✅ Identified media queries: `@media (max-width: 768px)` and `@media (max-width: 1200px)`
   - ✅ Identified mobile-specific grid layout changes
   - ✅ Identified size reductions for mobile

3. **Create CSS Variable Inventory**
   - ✅ Identified key CSS variables in `:root`

### Phase 2: Establish Desktop-First Foundation

1. **Update Base Layout Structure**
   - Remove mobile-specific grid layouts in media queries
   - Enhance main grid layout for desktop:
     ```css
     main {
         display: grid;
         grid-template-columns: 3fr 1fr;  /* Consider adjusting for more content space */
         grid-template-rows: auto 1fr auto;
         grid-template-areas:
             "info info"
             "grid log"
             "actions log";
     }
     ```
   - Consider adding new areas for extended content:
     ```css
     main {
         display: grid;
         grid-template-columns: 1fr 3fr 1fr;  /* Left panel, grid, right panel */
         grid-template-rows: auto 1fr auto;
         grid-template-areas:
             "info info info"
             "traits grid log"
             "evolution actions log";
     }
     ```

2. **Define Desktop-Optimized Component Sizes**
   - Consider increasing hex tile sizes for better visibility:
     ```css
     .hex-tile {
         width: 80px;
         height: 92px; /* Maintain aspect ratio: width * 1.1547 */
     }
     ```
   - **Important**: If changing hex tile dimensions, also update Grid.js:
     ```javascript
     const hexWidth = 80;  // Update to match CSS
     const hexHeight = 92; // Update to match CSS
     ```
   - Increase message log height for more information display:
     ```css
     :root {
         --message-log-height: 300px; /* Increased from 200px */
     }
     ```

3. **Set Minimum Window Size**
   - Add minimum dimensions to prevent too-small displays:
     ```css
     body {
         min-width: 1024px;
         min-height: 768px;
     }
     ```
   - Add a warning for small screens instead of responsive design:
     ```css
     .screen-size-warning {
         display: none;
     }
     
     @media (max-width: 1024px) {
         .game-container {
             display: none;
         }
         .screen-size-warning {
             display: block;
             text-align: center;
             padding: 20px;
         }
     }
     ```

### Phase 3: Remove Mobile Responsiveness

1. **Eliminate Mobile Media Queries**
   - Remove all `@media (max-width: 768px)` blocks from:
     - main.css (lines ~534, ~650, ~1272)
     - hexgrid.css (line ~255)
   - Remove or modify `@media (max-width: 1200px)` in hexgrid.css (line ~242)
   - Remove any mobile touch accommodations (larger touch targets, etc.)

2. **Fix Element Sizes**
   - Set fixed sizes for buttons and interactive elements
   - Remove size reductions for smaller screens
   - Optimize padding and margins for desktop mouse interaction

3. **Update JavaScript Grid Generation**
   - If hex dimensions are changed, ensure Grid.js constants are updated
   - Review calculateMockBalance adjustments for different screen sizes

### Phase 4: Enhanced Desktop Experience

1. **Implement Extended Information Panels**
   - Create new CSS for trait details panel:
     ```css
     .traits-panel {
         grid-area: traits; /* If using new grid layout */
         background: rgba(10, 52, 66, 0.8);
         border-radius: 8px;
         padding: 15px;
         overflow-y: auto;
     }
     
     .trait-detail {
         margin-bottom: 15px;
         padding: 10px;
         background: rgba(4, 28, 38, 0.6);
         border: 1px solid rgba(32, 164, 181, 0.3);
         border-radius: 4px;
     }
     ```
   - Design evolution progression panel:
     ```css
     .evolution-panel {
         grid-area: evolution; /* If using new grid layout */
         background: rgba(10, 52, 66, 0.8);
         border-radius: 8px;
         padding: 15px;
     }
     
     .evolution-tree {
         display: flex;
         flex-direction: column;
         gap: 10px;
     }
     ```
   - Add areas for world information:
     ```css
     .world-info {
         position: absolute;
         top: 10px;
         right: 10px;
         background: rgba(10, 52, 66, 0.8);
         border-radius: 8px;
         padding: 15px;
         width: 300px;
     }
     ```

2. **Create Expandable UI Elements**
   - Implement collapsible panels:
     ```css
     .expandable-panel {
         transition: all 0.3s ease;
     }
     
     .expandable-panel.collapsed {
         height: 40px;
         overflow: hidden;
     }
     
     .panel-header {
         display: flex;
         justify-content: space-between;
         cursor: pointer;
     }
     
     .panel-content {
         margin-top: 10px;
     }
     ```
   - Create tabbed interfaces for information categories:
     ```css
     .tab-container {
         display: flex;
         flex-direction: column;
     }
     
     .tab-buttons {
         display: flex;
         gap: 5px;
     }
     
     .tab-button {
         padding: 8px 15px;
         background: rgba(10, 52, 66, 0.6);
         border: none;
         border-radius: 4px 4px 0 0;
         cursor: pointer;
     }
     
     .tab-button.active {
         background: rgba(32, 164, 181, 0.4);
     }
     
     .tab-content {
         background: rgba(4, 28, 38, 0.4);
         padding: 15px;
         border-radius: 0 4px 4px 4px;
     }
     ```

3. **Enhance Visual Design for Desktop**
   - Add more detailed visual effects:
     ```css
     /* More advanced hex hover effects */
     .hex-tile:hover {
         transform: scale(1.12) translateZ(10px);
         box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
         z-index: 10;
     }
     
     /* Enhanced background particles */
     @keyframes advancedFloat {
         0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0.1; }
         25% { transform: translateY(-20px) translateX(10px) rotate(5deg); opacity: 0.3; }
         50% { transform: translateY(-35px) translateX(5px) rotate(0deg); opacity: 0.2; }
         75% { transform: translateY(-50px) translateX(-5px) rotate(-5deg); opacity: 0.1; }
         100% { transform: translateY(-70px) translateX(0) rotate(0deg); opacity: 0; }
     }
     ```
   - Add keyboard shortcut indicators:
     ```css
     .key-hint {
         display: inline-block;
         background: rgba(0, 0, 0, 0.4);
         border: 1px solid rgba(255, 255, 255, 0.2);
         border-radius: 3px;
         padding: 2px 6px;
         font-size: 0.8em;
         margin-left: 5px;
         vertical-align: middle;
     }
     ```

### Phase 5: Testing and Optimization

1. **Test Grid Rendering**
   - Verify hex tile positioning and sizing
   - Check that clickable areas work correctly
   - Test with various desktop screen dimensions (minimum 1024x768)

2. **Test UI Interactions**
   - Verify all interactive elements work correctly
   - Test keyboard shortcuts
   - Ensure game is fully playable on desktop

3. **Performance Optimization**
   - Clean up unused CSS
   - Consolidate duplicate styles
   - Optimize animations for performance
   - Add will-change hints for elements with complex animations

## Implementation Notes

### Critical Elements to Preserve
1. **Class Names**: Maintain all class names used by JavaScript for state changes
2. **Animation Timings**: Preserve animation durations or update related JavaScript
3. **CSS Variables**: Update carefully, especially dimensions used in calculations
4. **Grid Layout**: Ensure grid areas match the elements that use grid-area

### Potential Risks
1. **Grid Calculations**: Changes to hex dimensions might affect grid layout
2. **Animation Dependence**: Scripts might depend on animation durations
3. **Class References**: Ensure all class names referenced in JS remain intact

### Testing Strategy
1. Test each phase independently
2. Create a dev branch to safely experiment with changes
3. Pay special attention to Grid.js functionality after CSS updates
4. Test with various desktop screen sizes

## Future Enhancements to Consider

1. **Keyboard Navigation**: Add support for keyboard shortcuts
2. **Advanced Tooltips**: Create detailed tooltips for game elements
3. **Visualization Tools**: Add graphical representations of game data
4. **Theme Options**: Consider adding theme switching capability
5. **High-DPI Optimization**: Enhance visuals for high-resolution displays 