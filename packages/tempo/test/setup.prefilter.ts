import { Tempo } from '#tempo';

/**
 * CI Setup for parsePrefilter testing.
 * This file is loaded by Vitest in the 'test-parse-prefilter' CI job.
 */
if (process.env.TEMPO_PREFILTER_CI === 'true') {
	Tempo.init({ parsePrefilter: true });
}
