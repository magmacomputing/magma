import { defineModule } from '../plugin.util.js'
import { QuarterTerm } from './term.quarter.js'
import { SeasonTerm } from './term.season.js'
import { ZodiacTerm } from './term.zodiac.js'
import { TimelineTerm } from './term.timeline.js'

import type {Tempo} from '../../tempo.class.js';

/** collection of built-in terms for initial registration */
export const StandardTerms = [QuarterTerm, SeasonTerm, ZodiacTerm, TimelineTerm];

/** Aggregator module for all standard Terms */
export const TermsModule = defineModule({
	name: 'TermsModule',
	install(this: Tempo, TempoClass: typeof Tempo) {
		TempoClass.extend(StandardTerms);
	},
});
