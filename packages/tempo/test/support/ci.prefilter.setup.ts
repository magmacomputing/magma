import { Tempo } from '#tempo';

// Enable patchability of Tempo.init only in test/CI by setting a global flag
(globalThis as any).TEMPO_TESTING = true;

// Optionally, call Tempo.init with parsePrefilter=true for initial hydration
Tempo.init({ parsePrefilter: true });

if ((typeof process !== 'undefined' && (process.env.CI || process.env.TEMPO_PREFILTER_CI))) {
  // eslint-disable-next-line no-console
  console.log('[CI] parsePrefilter enabled for all tests (Tempo.init initial hydration)');
}

