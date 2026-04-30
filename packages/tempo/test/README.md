# Tempo Test Suite

This directory contains the automated test suite for the `@magmacomputing/tempo` package, organized by functional domain.

## Directory Structure

| Directory | Responsibility |
| :--- | :--- |
| **`core/`** | Tests for class mechanics: constructor, configuration, discovery, and state management. |
| **`engine/`** | The internal parsing engine: lexer, planner, layout resolution, and pattern matching. |
| **`instance/`** | Public methods on the `Tempo` instance (e.g., `add()`, `since()`, `format()`, `set()`). |
| **`plugins/`** | Extension modules and registries: Terms, Tickers, and Duration modules. |
| **`discrete/`** | Standalone helper functions that operate independently of a `Tempo` instance. |
| **`issues/`** | Regression tests linked to specific bug reports or edge cases. |
| **`support/`** | Infrastructure, Vitest setup files, and general test utilities. |

## Running Tests

### All Tests
```bash
npm test
```

### Specific Domain
To run only a specific category of tests (e.g., the engine):
```bash
npx vitest test/engine
```

### CI Simulation
To simulate the CI environment (Strict mode, specific timezones):
```bash
npm run test:ci
```

## Conventions

- **Isolation Assertions**: Files ending in `.core.test.ts` or `.lazy.test.ts` are designed to assert behavior *before* modules are fully loaded. These are automatically excluded during the `test:ci:prefilter` run to avoid side-effects.
- **Console Suppression**: By default, `console` output is suppressed in tests via `test/support/setup.console-spy.ts`. To debug, you can use `(console.log as any).mockRestore()` within your test or comment out the suppression in the setup file.
- **Anchoring**: When testing relative dates, always provide a fixed anchor to ensure tests are deterministic.
