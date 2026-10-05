import { resetRuntime } from '#tempo/support/support.runtime.js';

// Filter only Node's experimental localStorage warning without hiding real deprecation or memory leak warnings
if (typeof process !== 'undefined' && process.on) {
  const existingWarningListeners = process.listeners('warning');
  process.removeAllListeners('warning');
  process.on('warning', (warning) => {
    if (warning.name === 'ExperimentalWarning' && warning.message.includes('localStorage')) return;
    if (existingWarningListeners.length > 0) {
      existingWarningListeners.forEach((listener) => listener(warning));
    } else {
      console.warn(`[${warning.name}] ${warning.message}`);
    }
  });
}

// Named spies for each console method
export const spies = {
  error: vi.spyOn(console, 'error').mockImplementation(() => { }),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => { }),
  debug: vi.spyOn(console, 'debug').mockImplementation(() => { }),
  log: vi.spyOn(console, 'log').mockImplementation(() => { }),
  info: vi.spyOn(console, 'info').mockImplementation(() => { }),
}

beforeEach(() => {
  resetRuntime();
  Object.values(spies).forEach(spy => spy.mockClear());
});

afterEach(() => {
  resetRuntime();
});

afterAll(() => {
  Object.values(spies).forEach(spy => spy.mockRestore());
});
