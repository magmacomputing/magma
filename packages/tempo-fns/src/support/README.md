# Support Utilities
This directory contains internal support and generic networking tools. **Functions exported from this directory are internal and should not be exported from the public barrel (`src/index.ts`).**

To keep imports clean across the codebase, all support utilities are exported through the internal barrel file:
```typescript
import { fetchWithTimeout, isTempo, getTemporal } from '../support/index.js';
```

## Internal Functions

### `fetchWithTimeout`
A generic `fetch` wrapper that enforces a timeout via `AbortController`.

### `isTempo` / `isTemporal`
Robust type guards that rely on `Symbol.toStringTag` duck-typing to safely assert the identity of a date object across cross-bundle boundaries.

### `getTemporal`
A dynamic runtime resolver for the `Temporal` API. Because `tempo-fns` is a utility library, it strictly avoids bundling the massive 800KB `@js-temporal/polyfill`. Instead, it intercepts `globalThis.Temporal` at runtime and gracefully throws a developer-friendly error if a polyfill has not been loaded by the consumer.
