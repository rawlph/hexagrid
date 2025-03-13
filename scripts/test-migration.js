/**
 * Test script to analyze event migration status and
 * report on migration progress
 */
import { EventMigrationHelper } from './utils/event-migration-helper.js';
import { eventSystem } from './core/EventSystem.js';
import { EventTypes, getStandardName } from './core/EventTypes.js';

// Wait for page to fully load
window.addEventListener('load', () => {
    setTimeout(() => {
        console.group('Event Migration Analysis');
        console.log('Analyzing event migration status...');
        
        // Get overall migration stats
        const stats = eventSystem.getMigrationStats();
        console.log('Migration stats:', stats);
        
        // Identify events ready for migration
        console.log('Identifying events ready for migration:');
        const readyEvents = EventMigrationHelper.identifyMigrationReadyEvents();
        
        // Print summary
        console.log('=== SUMMARY ===');
        console.log(`Total events: ${Object.keys(stats.legacyEventUsage).length + Object.keys(stats.standardizedEventUsage).length}`);
        console.log(`Events ready for migration: ${readyEvents.length}`);
        console.log(`Standardization percentage: ${stats.standardizationPercentage}%`);
        
        // List fully migrated events
        console.log('=== FULLY MIGRATED EVENTS ===');
        console.log('The following legacy events are already marked as fully migrated:');
        Array.from(eventSystem.fullyMigratedEvents).forEach(event => {
            console.log(`- ${event}`);
        });
        
        console.log('These events no longer emit legacy versions - all components are using standardized versions.');
        
        // Check event listener statistics
        console.log('=== EVENT LISTENER ANALYSIS ===');
        const { legacyListeners, standardListeners } = stats.listenerStatistics;
        
        console.log('Events with zero legacy listeners but active standard listeners:');
        const potentialMigrations = [];
        
        for (const legacyEvent in legacyListeners) {
            if (legacyListeners[legacyEvent] === 0) {
                const standardEvent = getStandardName(legacyEvent);
                if (standardEvent && standardListeners[standardEvent] > 0) {
                    potentialMigrations.push({
                        legacy: legacyEvent,
                        standard: standardEvent,
                        standardListeners: standardListeners[standardEvent]
                    });
                    console.log(`- ${legacyEvent} → ${standardEvent} (${standardListeners[standardEvent]} standard listeners)`);
                }
            }
        }
        
        if (potentialMigrations.length > 0) {
            console.log("\nSuggested code to mark these events as fully migrated:");
            console.log("```javascript");
            console.log("// Add these events to the fullyMigratedEvents Set in EventSystem.js constructor");
            potentialMigrations.forEach(event => {
                console.log(`'${event.legacy}', // → ${event.standard}`);
            });
            console.log("```");
        } else {
            console.log("No additional events are ready for migration at this time.");
            console.log("Focus on updating remaining legacy listeners to use standardized event names.");
        }
        
        console.groupEnd();
    }, 2000); // Wait 2 seconds after page load
}); 