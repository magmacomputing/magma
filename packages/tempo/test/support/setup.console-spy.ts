import { vi, afterAll, beforeEach } from 'vitest';

// Named spies for each console method
export const spies = {
  error: vi.spyOn(console, 'error').mockImplementation(() => { }),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => { }),
  debug: vi.spyOn(console, 'debug').mockImplementation(() => { }),
  log: vi.spyOn(console, 'log').mockImplementation(() => { }),
  info: vi.spyOn(console, 'info').mockImplementation(() => { }),
}

beforeEach(() => {
  Object.values(spies).forEach(spy => spy.mockClear());
});

afterAll(() => {
  Object.values(spies).forEach(spy => spy.mockRestore());
});
