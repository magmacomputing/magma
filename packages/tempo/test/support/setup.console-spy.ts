import { resetRuntime } from '#tempo/support/support.runtime.js';

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
