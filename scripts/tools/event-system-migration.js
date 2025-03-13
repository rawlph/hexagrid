/**
 * Event System Migration Tool for Hexgrid Evolution
 * 
 * This tool helps automate the transition from legacy event naming to standardized event naming.
 * It implements a phased approach to migration, allowing for gradual updates without breaking functionality.
 */

import { EventMigrationHelper } from '../utils/event-migration-helper.js';
import { eventSystem } from '../core/EventSystem.js';
import { EventTypes } from '../core/EventTypes.js';

class EventSystemMigration {
    constructor() {
        this.transitionStatus = {
            phase: 0,
            completedFiles: [],
            inProgressFiles: []
        };
        
        this.phaseDescriptions = [
            'Assessment Phase: Analyzing current usage',
            'Phase 1: Update event listeners to standardized format',
            'Phase 2: Mark legacy events as fully deprecated',
            'Phase 3: Remove legacy event support for fully migrated events',
            'Completed: Migration fully complete'
        ];
    }
    
    /**
     * Run the migration diagnostics and show current status
     */
    async checkStatus() {
        // Run diagnostics
        const diagnostics = EventMigrationHelper.runMigrationDiagnostics();
        
        // Show current phase information
        console.group('🚀 MIGRATION STATUS');
        console.log(`Current Phase: ${this.phaseDescriptions[this.transitionStatus.phase]}`);
        
        // Files completed in current phase
        if (this.transitionStatus.completedFiles.length > 0) {
            console.log('\nCompleted Files:');
            this.transitionStatus.completedFiles.forEach(file => {
                console.log(`  ✅ ${file}`);
            });
        }
        
        // Files in progress
        if (this.transitionStatus.inProgressFiles.length > 0) {
            console.log('\nIn Progress Files:');
            this.transitionStatus.inProgressFiles.forEach(file => {
                console.log(`  🔄 ${file}`);
            });
        }
        
        console.log('\nNext Phase: ' + this.phaseDescriptions[Math.min(4, this.transitionStatus.phase + 1)]);
        console.groupEnd();
        
        return diagnostics;
    }
    
    /**
     * Execute the current migration phase
     * @param {string} targetFile - Specific file to target (optional)
     */
    async executePhase(targetFile = null) {
        switch(this.transitionStatus.phase) {
            case 0:
                await this.executeAssessmentPhase(targetFile);
                break;
            case 1:
                await this.executeListenerUpdatePhase(targetFile);
                break;
            case 2:
                await this.executeDeprecationPhase(targetFile);
                break;
            case 3:
                await this.executeLegacyRemovalPhase(targetFile);
                break;
            case 4:
                console.log('Migration already completed! 🎉');
                break;
            default:
                console.error('Unknown migration phase');
        }
    }
    
    /**
     * Assessment Phase: Analyze current usage and create migration plan
     */
    async executeAssessmentPhase(targetFile) {
        console.log('Executing Assessment Phase...');
        
        // Run diagnostics
        EventMigrationHelper.runMigrationDiagnostics();
        
        // Find all event listeners in the codebase
        EventMigrationHelper.analyzeComponentEventUsage();
        
        // Create and save migration plan
        this.createMigrationPlan();
        
        // Advance to next phase
        this.transitionStatus.phase = 1;
        console.log('Assessment complete. Advanced to Phase 1');
        
        return this.transitionStatus;
    }
    
    /**
     * Phase 1: Update event listeners to use standardized event names
     */
    async executeListenerUpdatePhase(targetFile) {
        console.log('Executing Listener Update Phase...');
        
        // If a specific file is targeted, update that file
        if (targetFile) {
            await this.updateListenersInFile(targetFile);
            
            // Add to completed files if not already there
            if (!this.transitionStatus.completedFiles.includes(targetFile)) {
                this.transitionStatus.completedFiles.push(targetFile);
            }
            
            // Remove from in progress if present
            const inProgressIndex = this.transitionStatus.inProgressFiles.indexOf(targetFile);
            if (inProgressIndex !== -1) {
                this.transitionStatus.inProgressFiles.splice(inProgressIndex, 1);
            }
        } else {
            console.log('Please specify a target file to update listeners.');
        }
        
        return this.transitionStatus;
    }
    
    /**
     * Phase 2: Mark legacy events as fully deprecated
     */
    async executeDeprecationPhase(targetFile) {
        console.log('Executing Deprecation Phase...');
        
        // This phase updates EventSystem.js to increase deprecation warning visibility
        // and modifies EventTypes.js to mark legacy events as scheduled for removal
        
        if (targetFile === 'EventSystem.js' || !targetFile) {
            await this.updateEventSystemDeprecation();
            this.transitionStatus.completedFiles.push('EventSystem.js');
        }
        
        if (targetFile === 'EventTypes.js' || !targetFile) {
            await this.updateEventTypesDeprecation();
            this.transitionStatus.completedFiles.push('EventTypes.js');
        }
        
        return this.transitionStatus;
    }
    
    /**
     * Phase 3: Remove legacy event support for fully migrated events
     */
    async executeLegacyRemovalPhase(targetFile) {
        console.log('Executing Legacy Removal Phase...');
        
        // This phase modifies EventSystem.js to stop emitting legacy events
        // that have been fully migrated
        
        if (targetFile === 'EventSystem.js' || !targetFile) {
            await this.removeLegacyEventSupport();
            this.transitionStatus.completedFiles.push('EventSystem.js');
        }
        
        return this.transitionStatus;
    }
    
    /**
     * Create a migration plan based on current usage
     */
    createMigrationPlan() {
        console.log('Creating migration plan...');
        
        // This would analyze all files and create a plan
        // For now, this is a placeholder
        
        return {
            highPriorityFiles: [
                'scripts/ui/MessageSystem.js',
                'scripts/ui/ActionPanel.js',
                'scripts/components/PlayerComponent.js'
            ],
            mediumPriorityFiles: [
                'scripts/systems/MetricsSystem.js',
                'scripts/systems/EvolutionSystem.js'
            ],
            lowPriorityFiles: [
                // Other files
            ]
        };
    }
    
    /**
     * Update event listeners in a specific file
     */
    async updateListenersInFile(filePath) {
        console.log(`Updating listeners in ${filePath}...`);
        
        // In practice, this would:
        // 1. Parse the file
        // 2. Find all eventSystem.on('legacyName', ...) calls
        // 3. Replace with eventSystem.on(EventTypes.EVENT_NAME.standard, ...)
        // 4. Add imports for EventTypes if needed
        
        // For now, just mark the file as in progress
        if (!this.transitionStatus.inProgressFiles.includes(filePath)) {
            this.transitionStatus.inProgressFiles.push(filePath);
        }
    }
    
    /**
     * Update EventSystem.js to increase deprecation warning visibility
     */
    async updateEventSystemDeprecation() {
        console.log('Updating EventSystem.js for increased deprecation warnings...');
        
        // This would modify the emitStandardized method to:
        // 1. Make deprecation warnings more visible
        // 2. Collect usage statistics more aggressively 
    }
    
    /**
     * Update EventTypes.js to mark events as scheduled for removal
     */
    async updateEventTypesDeprecation() {
        console.log('Updating EventTypes.js to mark events for removal...');
        
        // This would:
        // 1. Add a 'scheduled_removal' date to all legacy events
        // 2. Update deprecation messages
    }
    
    /**
     * Remove legacy event support for fully migrated events
     */
    async removeLegacyEventSupport() {
        console.log('Removing legacy event support for fully migrated events...');
        
        // This would modify the emitStandardized method to:
        // 1. Check if an event has been fully migrated
        // 2. Skip emitting the legacy event if it has
    }
    
    /**
     * Advance to the next phase
     */
    advancePhase() {
        if (this.transitionStatus.phase < 4) {
            this.transitionStatus.phase++;
            this.transitionStatus.completedFiles = [];
            this.transitionStatus.inProgressFiles = [];
            
            console.log(`Advanced to ${this.phaseDescriptions[this.transitionStatus.phase]}`);
        } else {
            console.log('Migration already completed! 🎉');
        }
        
        return this.transitionStatus;
    }
}

// Create and export instance
export const eventSystemMigration = new EventSystemMigration();

// Add to window for console access
if (typeof window !== 'undefined') {
    window.eventSystemMigration = eventSystemMigration;
} 