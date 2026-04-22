import { defineModule } from '../plugin.util.js'
import { getRuntime, onRegistryReset } from '#tempo/support';
import { QuarterTerm } from './term.quarter.js'
import { SeasonTerm } from './term.season.js'
import { ZodiacTerm } from './term.zodiac.js'
import { TimelineTerm } from './term.timeline.js'

import type { Tempo } from '../../tempo.class.js';

/** collection of built-in terms for initial registration */
export const StandardTerms = [QuarterTerm, SeasonTerm, ZodiacTerm, TimelineTerm];
export { defineTerm, defineRange, getTermRange } from '../term.util.js';

/** Aggregator module for all standard Terms */
export const TermsModule = defineModule({
	name: 'TermsModule',
	install(this: Tempo, TempoClass: typeof Tempo) {
		getRuntime().modules['TermsModule'] = true;							// mark as canonical module
		onRegistryReset(() => { TempoClass.extend(StandardTerms); });
		TempoClass.extend(StandardTerms);
	},
});
