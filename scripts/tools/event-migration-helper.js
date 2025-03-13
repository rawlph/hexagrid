/**
 * Event Migration Helper
 * 
 * This file provides utilities to help with migrating from legacy
 * event names to standardized event names.
 * 
 * Usage in browser console:
 * 
 * 1. Get migration stats:
 *    EventMigrationHelper.getMigrationStats();
 * 
 * 2. Check legacy event usage:
 *    EventMigrationHelper.checkLegacyUsage();
 * 
 * 3. Print standard event mappings:
 *    EventMigrationHelper.printEventMappings();
 */

import { eventSystem } from '../core/EventSystem.js';
import { EventTypes } from '../core/EventTypes.js';

class EventMigrationHelper {
    /**
     * Get statistics about migration progress
     */
    static getMigrationStats() {
        const stats = eventSystem.getMigrationStats();
        console.log('Event Migration Statistics:');
        console.log(`Legacy events: ${stats.legacyEvents}`);
        console.log(`Standardized events: ${stats.standardizedEvents}`);
        
        // Calculate percentage
        const total = stats.legacyEvents + stats.standardizedEvents;
        if (total > 0) {
            const standardizedPercentage = (stats.standardizedEvents / total * 100).toFixed(2);
            console.log(`Migration progress: ${standardizedPercentage}% standardized`);
        }
        
        return stats;
    }
    
    /**
     * Check which legacy events are still being used
     */
    static checkLegacyUsage() {
        const stats = eventSystem.getMigrationStats();
        
        console.log('Legacy Events Still in Use:');
        console.table(stats.legacyUsage);
        
        // Check for events that should be standardized
        const needsStandardization = [];
        
        for (const legacyName in stats.legacyUsage) {
            // Check if this legacy event has a standardized equivalent
            for (const key in EventTypes) {
                if (EventTypes[key].legacy === legacyName) {
                    needsStandardization.push({
                        legacyName: legacyName,
                        standardName: EventTypes[key].standard,
                        usage: stats.legacyUsage[legacyName]
                    });
                    break;
                }
            }
        }
        
        if (needsStandardization.length > 0) {
            console.log('Legacy Events That Need Standardization:');
            console.table(needsStandardization);
        } else {
            console.log('All mapped legacy events have been standardized!');
        }
        
        return needsStandardization;
    }
    
    /**
     * Print all event mappings for reference
     */
    static printEventMappings() {
        console.log('Event Type Mappings:');
        
        const mappings = [];
        for (const key in EventTypes) {
            mappings.push({
                constant: key,
                legacy: EventTypes[key].legacy,
                standard: EventTypes[key].standard
            });
        }
        
        console.table(mappings);
        return mappings;
    }
    
    /**
     * Check for unmapped legacy events
     */
    static findUnmappedEvents() {
        const stats = eventSystem.getMigrationStats();
        const unmapped = [];
        
        for (const legacyName in stats.legacyUsage) {
            let isMapped = false;
            
            // Check if this legacy event has a standardized equivalent
            for (const key in EventTypes) {
                if (EventTypes[key].legacy === legacyName) {
                    isMapped = true;
                    break;
                }
            }
            
            if (!isMapped) {
                unmapped.push({
                    legacyName: legacyName,
                    usage: stats.legacyUsage[legacyName]
                });
            }
        }
        
        if (unmapped.length > 0) {
            console.log('Unmapped Legacy Events:');
            console.table(unmapped);
        } else {
            console.log('All legacy events are mapped!');
        }
        
        return unmapped;
    }
}

// Make available globally for console usage
window.EventMigrationHelper = EventMigrationHelper;

export default EventMigrationHelper; 