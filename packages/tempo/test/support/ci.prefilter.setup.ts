import { Tempo } from '#tempo';

// 🛡️ Monkey-patch Tempo.init to force parsePrefilter=true globally for all tests in CI.
// Subsequent per-test calls to Tempo.init() will now preserve the prefilter setting.
const _init = Tempo.init;
Tempo.init = function (options: any = {}) {
  return _init.call(this, { ...options, parsePrefilter: true });
};

// Apply the initial forced hydration
Tempo.init();

if (process.env.CI || process.env.TEMPO_PREFILTER_CI) {
  // eslint-disable-next-line no-console
  console.log('[CI] parsePrefilter enabled for all tests (Tempo.init wrapped)');
}

