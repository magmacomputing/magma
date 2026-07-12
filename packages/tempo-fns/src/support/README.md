# Support Utilities
This directory contains internal support and generic networking tools. **Functions exported from this directory are internal and should not be exported from the public barrel (`src/index.ts`).**

## Internal Functions

### `fetchWithTimeout`
A generic `fetch` wrapper that enforces a timeout via `AbortController`.

```typescript
function fetchWithTimeout(url: string, timeoutMs?: number, options?: RequestInit): Promise<Response>;
```
**Example (Internal Usage):**
```typescript
import { fetchWithTimeout } from '../support/fetch.js';

const response = await fetchWithTimeout('https://api.example.com', 2000);
```
