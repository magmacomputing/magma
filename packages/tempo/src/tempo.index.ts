/**
 * Tempo Core Engine (Main Entry)
 * 
 * This is the primary export barrel for the `@magmacomputing/tempo` package.
 * It registers the "batteries-included" modules (Parse, Format, Mutate, Duration, Terms)
 * and exports the initialized `Tempo` class alongside core types and utilities.
 */
import { Tempo } from './tempo.class.js';
import { onRegistryReset, enums, getRuntime } from '#tempo/support';

import { ParseModule } from '#tempo/parse';
import { FormatModule } from '#tempo/format';

import { MutateModule } from '#tempo/mutate';
import { DurationModule } from '#tempo/duration';
import { QuarterTerm } from '#tempo/terms/quarter';
import { SeasonTerm } from '#tempo/terms/season';
import { TimelineTerm } from '#tempo/terms/timeline';
import { defineModule } from './plugin/plugin.util.js';

const CivicTerms = [QuarterTerm, SeasonTerm, TimelineTerm];

/**
 * TermsModule provides the standard civic term definitions for Tempo (`#quarter`, `#season`, `#timeOfDay`).
 *
 * This module automatically registers standard civic temporal terms and ensures
 * they are re-registered on registry resets.
 */
export const TermsModule = defineModule({
	/** Module name identifier */
	name: 'TermsModule',
	/** Installs standard civic terms into the Tempo class */
	install(this: typeof Tempo, TempoClass: typeof Tempo) {
		getRuntime().modules['TermsModule'] = true;
		onRegistryReset(() => { TempoClass.use(CivicTerms); });
		TempoClass.use(CivicTerms);
	},
});

// Batteries Included: Register standard modules
const core = [ParseModule, FormatModule, MutateModule, DurationModule, TermsModule];

getRuntime().modules['Tempo'] = Tempo;
onRegistryReset(() => {
	getRuntime().modules['Tempo'] = Tempo;
	Tempo.use(core);
});

Tempo.use(core);

const pending = getRuntime().modules['$pendingAutoInstalls'];
if (Array.isArray(pending) && pending.length > 0) {
	Tempo.use(pending);
	pending.length = 0;
}

export { parse, format } from '#tempo/module';
export { enums };

// make the Tempo type augmentations available
export type * from '#tempo/parse';
export type * from '#tempo/format';
export type * from '#tempo/mutate';
export type * from '#tempo/duration';
export type * from '#tempo/term';
export { TermHook } from '#tempo/support';
export type { TempoFormatTokens } from './tempo.type.js';

export { defineConfig } from './config/config.define.js';
export { definePlugin, defineNamespace, defineProperties, defineProperty } from './plugin/plugin.util.js';
export { Interval } from './interval.index.js';
export * from './tempo.class.js';
export default Tempo;
