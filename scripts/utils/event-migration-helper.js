/**
 * Event Migration Helper for Hexgrid Evolution
 * 
 * This utility helps track and manage the migration from legacy event names
 * to standardized event names. It provides tools for checking event usage,
 * finding unmapped events, and monitoring migration progress.
 */
import { eventSystem } from '../core/EventSystem.js';
import { EventTypes, getStandardName, getLegacyName } from '../core/EventTypes.js';

export class EventMigrationHelper {
    /**
     * Get statistics about the migration progress
     * @returns {Object} Statistics about migration progress
     */
    static getMigrationStats() {
        // Get the raw stats from the event system
        const stats = eventSystem.getMigrationStats();
        
        // Log a detailed report
        console.group('Event Migration Statistics');
        console.log(`Standardized events: ${stats.standardizedEventCount} unique types (${stats.totalStandardEvents} emissions)`);
        console.log(`Legacy events: ${stats.legacyEventCount} unique types (${stats.totalLegacyEvents} emissions)`);
        console.log(`Overall standardization: ${stats.standardizationPercentage}%`);
        console.groupEnd();
        
        return stats;
    }
    
    /**
     * Check which legacy events are still being used
     * @returns {Object} Information about legacy event usage
     */
    static checkLegacyUsage() {
        const stats = eventSystem.getMigrationStats();
        const legacyUsage = stats.legacyEventUsage;
        
        // Log detailed information about legacy event usage
        console.group('Legacy Event Usage');
        
        // Group events by standardization status
        const eventGroups = {
            missingStandard: [],
            hasStandard: []
        };
        
        // Check each legacy event
        for (const eventName in legacyUsage) {
            const count = legacyUsage[eventName];
            const standardName = getStandardName(eventName);
            
            if (standardName) {
                eventGroups.hasStandard.push({
                    legacy: eventName, 
                    standard: standardName, 
                    count
                });
            } else {
                eventGroups.missingStandard.push({
                    legacy: eventName,
                    count
                });
            }
        }
        
        // Sort by usage count (descending)
        eventGroups.hasStandard.sort((a, b) => b.count - a.count);
        eventGroups.missingStandard.sort((a, b) => b.count - a.count);
        
        // Log events that have standardized equivalents
        console.group('Legacy events with standardized equivalents');
        if (eventGroups.hasStandard.length === 0) {
            console.log('No legacy events with standardized equivalents found');
        } else {
            console.table(eventGroups.hasStandard);
        }
        console.groupEnd();
        
        // Log events without standardized equivalents
        console.group('Legacy events without standardized equivalents');
        if (eventGroups.missingStandard.length === 0) {
            console.log('No legacy events without standardized equivalents found');
        } else {
            console.table(eventGroups.missingStandard);
        }
        console.groupEnd();
        
        console.groupEnd();
        
        return {
            eventsWithStandard: eventGroups.hasStandard,
            eventsWithoutStandard: eventGroups.missingStandard
        };
    }
    
    /**
     * Print all event mappings
     * @returns {Object} Object containing all event mappings
     */
    static printEventMappings() {
        const mappings = [];
        
        // Extract mappings from EventTypes
        for (const key in EventTypes) {
            const eventType = EventTypes[key];
            mappings.push({
                constant: key,
                legacy: eventType.legacy,
                standard: eventType.standard
            });
        }
        
        // Sort alphabetically by standard name
        mappings.sort((a, b) => a.standard.localeCompare(b.standard));
        
        // Log the mappings
        console.group('Event Type Mappings');
        console.table(mappings);
        console.groupEnd();
        
        return mappings;
    }
    
    /**
     * Find legacy events that don't have standardized equivalents
     * @returns {Array} Array of unmapped legacy events
     */
    static findUnmappedEvents() {
        const stats = eventSystem.getMigrationStats();
        const legacyUsage = stats.legacyEventUsage;
        const unmapped = [];
        
        // Check each legacy event
        for (const eventName in legacyUsage) {
            const standardName = getStandardName(eventName);
            
            if (!standardName) {
                unmapped.push({
                    legacy: eventName,
                    count: legacyUsage[eventName],
                    suggestedStandard: this.suggestStandardName(eventName)
                });
            }
        }
        
        // Sort by usage count (descending)
        unmapped.sort((a, b) => b.count - a.count);
        
        // Log the unmapped events
        console.group('Unmapped Legacy Events');
        if (unmapped.length === 0) {
            console.log('No unmapped legacy events found');
        } else {
            console.table(unmapped);
        }
        console.groupEnd();
        
        return unmapped;
    }
    
    /**
     * Suggest a standardized name for a legacy event
     * @param {string} legacyName - Legacy event name
     * @returns {string} Suggested standardized name
     */
    static suggestStandardName(legacyName) {
        // Common prefixes to look for
        const prefixMappings = {
            'player': 'player:',
            'tile': 'tile:',
            'system': 'system:',
            'game': 'system:game:',
            'turn': 'system:turn:',
            'action': 'action:',
            'ui': 'ui:'
        };
        
        // Common action words
        const actionMappings = {
            'Changed': 'changed',
            'Added': 'added',
            'Removed': 'removed',
            'Created': 'created',
            'Destroyed': 'destroyed',
            'Started': 'start',
            'Ended': 'end',
            'Completed': 'complete',
            'Initialized': 'initialized',
            'Updated': 'updated',
            'Ready': 'ready'
        };
        
        // Try to identify prefix and action
        let prefix = '';
        let action = '';
        let subject = '';
        
        // Check for common prefixes
        for (const key in prefixMappings) {
            if (legacyName.startsWith(key)) {
                prefix = prefixMappings[key];
                // Remove prefix from the legacy name
                subject = legacyName.substring(key.length);
                break;
            }
        }
        
        // If no prefix was found, try to infer based on first word
        if (!prefix) {
            const firstWordMatch = legacyName.match(/^([a-z]+)/i);
            if (firstWordMatch) {
                const firstWord = firstWordMatch[1].toLowerCase();
                prefix = `${firstWord}:`;
                subject = legacyName.substring(firstWord.length);
            }
        }
        
        // Check for common action words
        for (const key in actionMappings) {
            if (subject.includes(key)) {
                action = actionMappings[key];
                // Replace action word in subject
                subject = subject.replace(key, '');
                break;
            }
        }
        
        // If no action was found, try to infer from last word
        if (!action) {
            const lastWordMatch = subject.match(/([A-Z][a-z]+)$/);
            if (lastWordMatch) {
                action = lastWordMatch[1].toLowerCase();
                subject = subject.substring(0, subject.length - lastWordMatch[1].length);
            }
        }
        
        // Format subject: convert camelCase to kebab-case
        subject = subject
            .replace(/([a-z])([A-Z])/g, '$1:$2')
            .toLowerCase();
        
        // Remove any leading/trailing colons
        subject = subject.replace(/^:+|:+$/g, '');
        
        // Build the suggested name
        let suggestedName = prefix;
        
        if (action) {
            suggestedName += action + ':';
        }
        
        if (subject) {
            suggestedName += subject;
        }
        
        return suggestedName;
    }
    
    /**
     * Analyze component event usage to identify where legacy events are still being used
     * @returns {Object} Component analysis results
     */
    static analyzeComponentEventUsage() {
        // This would require static analysis of the code
        // For now, just provide guidance
        console.group('Component Event Usage Analysis');
        console.log('To find components using legacy events, search the codebase for:');
        console.log('1. eventSystem.on(\'legacyEventName\', ...) - Event listeners');
        console.log('2. eventSystem.emit(\'legacyEventName\', ...) - Event emitters');
        console.log('3. Check for direct string references instead of EventTypes constants');
        console.groupEnd();
        
        return {
            message: 'Static analysis not available. Please use search tools to locate legacy event usage.'
        };
    }
    
    /**
     * Get event usage by category
     * Shows which event categories are most commonly used
     * @returns {Object} Event usage by category
     */
    static getEventUsageByCategory() {
        const stats = eventSystem.getMigrationStats();
        const standardUsage = stats.standardizedEventUsage;
        const categories = {};
        
        // Group events by category
        for (const eventName in standardUsage) {
            const category = eventName.split(':')[0];
            if (!categories[category]) {
                categories[category] = {
                    count: 0,
                    events: {}
                };
            }
            
            categories[category].count += standardUsage[eventName];
            categories[category].events[eventName] = standardUsage[eventName];
        }
        
        // Sort categories by usage count
        const sortedCategories = Object.entries(categories)
            .sort(([, a], [, b]) => b.count - a.count)
            .reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {});
        
        // Log categories
        console.group('Event Usage by Category');
        for (const category in sortedCategories) {
            console.group(`${category} (${sortedCategories[category].count} emissions)`);
            
            // Sort events within category by usage count
            const sortedEvents = Object.entries(sortedCategories[category].events)
                .sort(([, a], [, b]) => b - a)
                .map(([event, count]) => ({ event, count }));
            
            console.table(sortedEvents);
            console.groupEnd();
        }
        console.groupEnd();
        
        return sortedCategories;
    }
    
    /**
     * Toggle deprecation warnings
     * @param {boolean} enabled - Whether to enable deprecation warnings
     */
    static setDeprecationWarnings(enabled) {
        eventSystem.setDeprecationWarnings(enabled);
        console.log(`Deprecation warnings ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Run a comprehensive migration diagnostics report
     * Combines multiple analysis tools into a single report
     * @returns {Object} Comprehensive migration statistics and recommendations
     */
    static runMigrationDiagnostics() {
        console.group('🔍 EVENT SYSTEM MIGRATION DIAGNOSTICS');
        
        // Get overall statistics
        const stats = this.getMigrationStats();
        
        console.log('\n📊 DETAILED STATISTICS:');
        // Check specific legacy event usage
        const legacyUsage = this.checkLegacyUsage();
        
        console.log('\n🗺️ UNMAPPED EVENTS:');
        // Look for unmapped events
        const unmappedEvents = this.findUnmappedEvents();
        
        console.log('\n📋 RECOMMENDATIONS:');
        
        // Prioritize components to update
        const highPriorityEvents = Object.entries(stats.legacyEventUsage)
            .filter(([event, count]) => count > 5)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
            
        if (highPriorityEvents.length > 0) {
            console.log('High-priority events to standardize (most frequently used):');
            highPriorityEvents.forEach(([event, count]) => {
                const standardName = getStandardName(event) || this.suggestStandardName(event);
                console.log(`  - "${event}" (${count} uses) → "${standardName || '???'}"`);
            });
        } else {
            console.log('✅ No high-priority legacy events remaining.');
        }
        
        // Overall migration progress score (0-100)
        const progressScore = Math.round(stats.standardizationPercentage);
        
        console.log(`\n🏆 MIGRATION PROGRESS: ${progressScore}%`);
        
        // Progress visualization
        const progressBar = Array(10).fill('▓').map((char, i) => 
            i < Math.floor(progressScore / 10) ? '█' : '░'
        ).join('');
        
        console.log(`[${progressBar}] ${progressScore}%`);
        
        // Next steps recommendation
        if (progressScore < 30) {
            console.log('📝 NEXT STEPS: Focus on updating the most frequently used events first.');
        } else if (progressScore < 70) {
            console.log('📝 NEXT STEPS: Good progress! Continue standardizing event listeners and emitters.');
        } else if (progressScore < 95) {
            console.log('📝 NEXT STEPS: Almost there! Clean up remaining legacy code and consider starting to remove backwards compatibility.');
        } else {
            console.log('📝 NEXT STEPS: Excellent! Consider removing legacy event support entirely.');
        }
        
        console.groupEnd();
        
        return {
            stats,
            legacyUsage,
            unmappedEvents,
            highPriorityEvents,
            progressScore
        };
    }
    
    /**
     * Identify events that can be safely migrated based on listener statistics
     * @returns {Array} Array of event names ready for full migration
     */
    static identifyMigrationReadyEvents() {
        console.group('Migration Ready Events Analysis');
        
        // Get event stats
        const stats = eventSystem.getMigrationStats();
        const { listenerStatistics } = stats;
        const readyForMigration = [];
        
        for (const legacyName in listenerStatistics.legacyListeners) {
            const legacyListenerCount = listenerStatistics.legacyListeners[legacyName] || 0;
            const standardName = getStandardName(legacyName);
            
            if (!standardName) {
                console.log(`⚠️ No standard mapping for '${legacyName}'`);
                continue;
            }
            
            const standardListenerCount = listenerStatistics.standardListeners[standardName] || 0;
            
            // If no legacy listeners but has standard listeners, ready for migration
            if (legacyListenerCount === 0 && standardListenerCount > 0) {
                readyForMigration.push({
                    legacyName,
                    standardName,
                    standardListenerCount
                });
                console.log(`✅ Ready for migration: '${legacyName}' → '${standardName}' (${standardListenerCount} standard listeners, 0 legacy listeners)`);
            }
        }
        
        console.log(`Found ${readyForMigration.length} events ready for full migration`);
        console.groupEnd();
        
        return readyForMigration;
    }
    
    /**
     * Run a complete migration assessment and mark events as fully migrated
     * This will identify events that are ready for full migration (no more legacy emissions)
     * and mark them in the EventSystem to disable legacy emissions
     * @param {boolean} autoDisable - Whether to automatically disable legacy emissions for fully migrated events
     * @returns {Object} Results of the migration assessment
     */
    static runFinalMigrationPhase(autoDisable = false) {
        console.group('Final Migration Phase Assessment');
        
        // Get all migration stats
        const stats = eventSystem.getMigrationStats();
        
        // Prepare results
        const results = {
            fullyMigrated: [],
            readyForMigration: [],
            notReadyForMigration: [],
            noStandardEquivalent: []
        };
        
        // Check each legacy event
        for (const legacyEvent in stats.legacyEventUsage) {
            const standardEvent = getStandardName(legacyEvent);
            
            // Skip events that are already marked as fully migrated
            if (stats.fullyMigratedEvents.includes(legacyEvent)) {
                results.fullyMigrated.push({
                    legacy: legacyEvent,
                    standard: standardEvent
                });
                continue;
            }
            
            // Check if this event has a standard equivalent
            if (!standardEvent) {
                results.noStandardEquivalent.push(legacyEvent);
                continue;
            }
            
            // Get listener counts
            const legacyListeners = stats.listenerStatistics.legacyListeners[legacyEvent] || 0;
            const standardListeners = stats.listenerStatistics.standardListeners[standardEvent] || 0;
            
            // Check if this event is ready for migration
            if (legacyListeners === 0 && standardListeners > 0) {
                results.readyForMigration.push({
                    legacy: legacyEvent,
                    standard: standardEvent,
                    legacyUsage: stats.legacyEventUsage[legacyEvent],
                    standardUsage: stats.standardizedEventUsage[standardEvent]
                });
                
                // If auto-disable is enabled, mark this event as fully migrated
                if (autoDisable) {
                    console.log(`🟢 Marking event '${legacyEvent}' as fully migrated`);
                    eventSystem.markEventAsMigrated(legacyEvent);
                }
            } else {
                results.notReadyForMigration.push({
                    legacy: legacyEvent,
                    standard: standardEvent,
                    legacyListeners,
                    standardListeners,
                    reason: legacyListeners > 0 ? "Still has legacy listeners" : "No standard listeners"
                });
            }
        }
        
        // Log results
        console.log(`Events fully migrated: ${results.fullyMigrated.length}`);
        console.log(`Events ready for migration: ${results.readyForMigration.length}`);
        console.log(`Events not ready for migration: ${results.notReadyForMigration.length}`);
        console.log(`Events without standard equivalent: ${results.noStandardEquivalent.length}`);
        
        if (results.readyForMigration.length > 0) {
            console.log("Events ready for migration:");
            results.readyForMigration.forEach(event => {
                console.log(`  - ${event.legacy} → ${event.standard}`);
            });
        }
        
        console.groupEnd();
        
        return results;
    }
    
    /**
     * Mark all events ready for migration as fully migrated
     * This will disable legacy event emissions for these events
     * @returns {Array} List of events that were marked as fully migrated
     */
    static migrateReadyEvents() {
        const results = this.runFinalMigrationPhase(true);
        return results.readyForMigration;
    }
    
    /**
     * Analyze the impact of disabling legacy events
     * Shows which components would break if legacy events were disabled
     * @returns {Object} Impact analysis
     */
    static analyzeLegacyEventImpact() {
        console.group('Legacy Event Impact Analysis');
        
        const stats = eventSystem.getMigrationStats();
        const { listenerStatistics } = stats;
        
        // Events still in use
        const eventsInUse = Object.entries(listenerStatistics.legacyListeners)
            .filter(([event, count]) => count > 0)
            .sort((a, b) => b[1] - a[1]);
        
        console.log(`${eventsInUse.length} legacy events still have active listeners:`);
        
        eventsInUse.forEach(([event, count]) => {
            const standardName = getStandardName(event) || '(no mapping)';
            console.log(`  - '${event}': ${count} listeners (standard: '${standardName}')`);
        });
        
        // Calculate impact score (0-100) - higher is more problematic
        const totalLegacyListeners = stats.totalLegacyListeners;
        const impactScore = totalLegacyListeners > 0 ? 
            Math.min(100, Math.round((eventsInUse.length * totalLegacyListeners) / 5)) : 0;
        
        console.log(`\nImpact Score: ${impactScore}/100`);
        
        if (impactScore < 20) {
            console.log('✅ Low impact - Safe to disable most legacy events');
        } else if (impactScore < 50) {
            console.log('🟨 Medium impact - Test thoroughly before disabling legacy events');
        } else {
            console.log('🛑 High impact - Many components still depend on legacy events');
        }
        
        console.groupEnd();
        
        return {
            eventsInUse,
            impactScore,
            totalLegacyListeners
        };
    }
    
    /**
     * Run migration assistant wizard
     * Interactive helper that guides through the migration process
     */
    static runMigrationAssistant() {
        console.group('🧙‍♂️ EVENT MIGRATION ASSISTANT WIZARD');
        
        // Step 1: Run diagnostics
        console.log('STEP 1: Running diagnostics...');
        const stats = this.getMigrationStats();
        
        // Step 2: Check for events ready to migrate
        console.log('\nSTEP 2: Checking for events ready to migrate...');
        const readyEvents = this.identifyMigrationReadyEvents();
        
        if (readyEvents.length > 0) {
            console.log(`\n${readyEvents.length} events can be fully migrated!`);
            console.log('Run EventMigrationHelper.migrateReadyEvents() to disable their legacy emissions');
        } else {
            console.log('\nNo events are ready for full migration yet.');
            console.log('Focus on updating components to use standardized event names.');
        }
        
        // Step 3: Analyze impact of disabling legacy events
        console.log('\nSTEP 3: Analyzing impact of legacy events...');
        const impact = this.analyzeLegacyEventImpact();
        
        // Step 4: Provide recommendations
        console.log('\nSTEP 4: Recommendations');
        
        if (stats.standardizationPercentage < 50) {
            console.log('• Continue updating event listeners to use standardized names');
            console.log('• Focus on the high-priority legacy events identified earlier');
        } else if (readyEvents.length > 0) {
            console.log('• Migrate the ready events using EventMigrationHelper.migrateReadyEvents()');
            console.log('• Test the application thoroughly after migration');
        } else if (impact.impactScore < 30) {
            console.log('• Consider selective disabling of legacy events with low usage');
            console.log('• Use eventSystem.disableLegacyEventEmissions() for specific events');
        } else {
            console.log('• Continue updating components to use standardized events');
            console.log('• Focus on reducing the legacy listener count');
        }
        
        console.groupEnd();
    }
}

// Make the helper available globally for console use
window.EventMigrationHelper = EventMigrationHelper; 