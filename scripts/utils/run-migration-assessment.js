/**
 * Migration Assessment Runner for Hexgrid Evolution
 * 
 * This script runs a full assessment of the event system migration status
 * and provides recommendations for which events can be fully migrated.
 * 
 * Run this script in the browser console:
 * 1. Load the game
 * 2. Play through a few actions to ensure event statistics are populated
 * 3. Run "import('/scripts/utils/run-migration-assessment.js')" in the console
 */
import { EventMigrationHelper } from './event-migration-helper.js';

console.log('Running Event Migration Assessment...');

// First, get overall migration statistics
const stats = EventMigrationHelper.getMigrationStats();
console.log(`Overall standardization progress: ${stats.standardizationPercentage}%`);

// Run final phase assessment
console.log('Running Final Migration Phase Assessment:');
const assessmentResults = EventMigrationHelper.runFinalMigrationPhase(false);

// Show a summary of events that could be migrated
if (assessmentResults.readyForMigration.length > 0) {
    console.log(`
=== Events Ready for Migration ===
The following events can be fully migrated (disable legacy emissions):

${assessmentResults.readyForMigration.map(event => 
    `${event.legacy} → ${event.standard}`
).join('\n')}

To automatically migrate these events, run:
EventMigrationHelper.migrateReadyEvents();
`);
} else {
    console.log(`
=== No Events Ready for Migration ===
All events either:
- Still have legacy listeners
- Need standard listeners added
- Have already been marked as fully migrated

To see which events are not ready, check the notReadyForMigration array in the assessment results.
`);
}

// Exit with assessmentResults so they're available in the console
export default assessmentResults; 