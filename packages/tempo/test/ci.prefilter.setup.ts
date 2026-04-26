import { Tempo } from '#tempo';

// Enable parsePrefilter globally for all tests in CI
Tempo.init({ parsePrefilter: true });

// Optionally, log to confirm setup
if (process.env.CI || process.env.TEMPO_PREFILTER_CI) {
  // eslint-disable-next-line no-console
  console.log('[CI] parsePrefilter enabled for all tests');
}
