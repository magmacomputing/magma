// Global console suppression for all tests
// (You can comment out lines to allow specific console methods)

declare global {
  // eslint-disable-next-line no-var
  var _consoleSpies: Array<ReturnType<typeof vi.spyOn>>;

  // Note: To use mockClear/mockRestore on console methods in tests, use (console.error as any).mockClear()
}

/** setup global console spies before all tests */
globalThis._consoleSpies = [
  vi.spyOn(console, 'error').mockImplementation(() => {}),
  vi.spyOn(console, 'warn').mockImplementation(() => {}),
  vi.spyOn(console, 'debug').mockImplementation(() => {}),
  vi.spyOn(console, 'log').mockImplementation(() => {}),
  vi.spyOn(console, 'info').mockImplementation(() => {}),
];

/** restore global console spies after all tests */
afterAll(() => {
  globalThis._consoleSpies.forEach(spy => spy.mockRestore());
});

/** clear global console spies before each test */
beforeEach(() => {
  globalThis._consoleSpies.forEach(spy => (spy as any).mockClear());
});
