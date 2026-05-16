Now that we have the 'Plugin' architecture, we need to determine how this will merge into the Tempo v2 strategy.

(All of the scenarios below assume the user has already installed Tempo and the desired Plugins)
$ npm install @magmacomputing/tempo
$ npm install @magmacomputing/tempo-plugin-astro

in the final static{} block of the tempo.class, we are running Tempo.init() automatically to bootstrap the application.

To keep Tempo feeling 'light'
*> if auto Tempo.init() discovers that there is no License Key, then it should not fetch the JWS revocation list.
*> if auto Tempo.init() discovers that there is a License Key, then it should kick off the **Optimistic Sync** process.
*> The license state should be stored in the `TempoRuntime` singleton (via the global `$Bridge` symbol) to ensure it is shared across all bundles and plugins.
*> If the license key is invalid / expired / revoked, a `console.warn` is issued immediately upon background detection, but application execution is not halted.

#### Architectural Roles

To maintain a clean separation of concerns, the licensing system is divided into three distinct roles:

1.  **The Validator (#tempo/license module)**: 
    *   **Async Heavyweight**: Only loaded via `import()` if a license key is discovered.
    *   **Cryptographic Authority**: Performs the actual RSA/ECDSA verification of the JWT against the Public Key.
    *   **JWS Synchronization**: Fetches and caches the JWS revocation list (persisted for 7 days).
    *   **State Enforcement**: If verification fails or a license is revoked, it updates the `TempoRuntime` status to `'revoked'` and wipes the Term cache for premium plugins.
2.  **The Gatekeeper (Tempo Core)**: 
    *   **Discovery Cascade**: Finds the license key string.
    *   **Optimistic Decoder**: Performs a synchronous Base64 decode of the JWT (without verification) to read the intended scopes and expiry.
    *   **Lazy Proxy Guard**: Implements the Proxy on `.term` that uses the current `TempoRuntime` state to decide whether to allow access.
3.  **The Plugins (e.g., Astro)**: 
    *   **License Agnostic**: They contain **zero** licensing or validation logic. They simply register their terms and trust the Gatekeeper.

#### Optimistic Sync & Background Verification

To keep `Tempo.init()` synchronous and the UX instantaneous, Tempo uses an optimistic model:

1.  **Init (Sync)**: Tempo discovers the key and does a "fast-decode" to see if it *claims* to have the right scopes. It sets the state to `'pending'`.
2.  **Access (Sync)**: The Proxy allows access to `.astro` based on the optimistic decode.
3.  **Verify (Async)**: In the background, Tempo dynamic-imports the `#tempo/license` module. The Validator then performs the real cryptographic check and JWS fetch.
4.  **The Reckoning**: If the background check fails (fake key or revoked), the Validator flips the state to `'revoked'`, wipes the premium caches, and logs a warning. This typically happens within 50ms of startup.

#### Discovery Cascade

Tempo will search for a license key in the following order (from most explicit to most global):

1. **Explicit**: `Tempo.init({ license: '...' })`
2. **Discovery**: `globalThis.__TEMPO_DISCOVERY__.license`
3. **Environment**: `process.env.TEMPO_LICENSE`
4. **Configuration**: `.temporc` or `tempo.config.json`
5. **Global**: `globalThis.TEMPO_LICENSE` (Legacy / Convenience)

#### Scalability & 3rd-Party Plugin Support

The "Decoupled Gatekeeper" architecture is designed to scale into a **Licensing as a Service (LaaS)** platform for 3rd-party developers.

1.  **Magma Authority Model**: Tempo Core acts as the centralized authority. A single "Magma Public Key" is used to verify all licenses, regardless of the plugin author.
2.  **Multi-Author Scopes**: License JWTs can contain granular scopes (e.g., `['astro', 'vendor-xyz-finance']`). The Core's Lazy Proxy Guard automatically handles the "Gatekeeping" for these 3rd-party keys without requiring the author to write any licensing logic.
3.  **Unified Marketplace**: This allows for "Bundle Licenses" where a single key can unlock a suite of plugins from different authors.
4.  **Zero Overhead for Authors**: 3rd-party plugins remain lightweight and focus solely on their functional logic, trusting Tempo to manage the monetization and security layer.


Here is the UX I am hoping to create for our Users:

### Scenario 1
The user has *not* purchased a License Key
```typescript
import {Tempo} from '@magmacomputing/tempo';

console.log(new Tempo().term.astro);

```
Expected outcome:
*> the 'Tempo.init()' that is part of the package import looks for a license key (discovery cascade) and finds nothing.
*> there is *no* fetch for the latest JWS revocation list.
*> console.log's "undefined"

### Scenario 2
The user has *not* purchased a License key
```typescript
import {Tempo} from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-astro';

console.log(new Tempo().term.astro);

```
Expected outcome:
*> Tempo.init()'s discovery cascade looks for a license key and finds nothing.
*> there is no fetch for the latest JWS revocation list.
*> the side-effect import of 'tempo-plugin-astro' loads the AstroTerm.
*> No checking of the license is done *until* an 'astro' property is accessed.
*> console.log's undefined, and warn's that the 'astro' term is not available and can be obtained by purchasing a license key.

### Scenario 3
The user has a valid License Key

```typescript
import {Tempo} from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-astro';

console.log(new Tempo().term.astro);
```

Expected Outcome:
*> If the license key is found in the discovery cascade, it fetches the JWS revocation list.
*> If the license is valid and not revoked, it returns the 'astro' term.

### Scenario 4
The user has an **Expired** License Key

```typescript
// Assume process.env.TEMPO_LICENSE is set to an expired JWT
import {Tempo} from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-astro';

console.log(new Tempo().term.astro);
```

Expected Outcome:
*> `Tempo.init()` detects the key, fetches the JWS.
*> Detection of expiry logs a warning: `⚠️ Tempo: License 'xxx' has expired.`
*> Accessing `.astro` returns `undefined` and logs: `⚠️ Tempo: 'astro' requires an active license.`

### Scenario 5
The user has a **Revoked** License Key

```typescript
// Assume the license JTI is present in the latest JWS revocation list
import {Tempo} from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-astro';

console.log(new Tempo().term.astro);
```

Expected Outcome:
*> `Tempo.init()` fetches the JWS list.
*> Validation detects the license JTI is revoked.
*> Immediate warning: `⚠️ Tempo: License 'xxx' has been revoked and is no longer valid.`
*> Accessing `.astro` returns `undefined`.

### Scenario 6
**Late Initialization** (Programmatic)

```typescript
import {Tempo} from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-astro';

// 1. Initial access without license
console.log(new Tempo().term.astro); // undefined + warning

// 2. Late initialization
Tempo.init({ license: 'VALID_JWT' });

// 3. Subsequent access
console.log(new Tempo().term.astro); // Returns AstroTerm
```

Expected Outcome:
*> The Proxy on `.term` re-evaluates the license state after a manual `Tempo.init()` call.
*> Transition from `undefined` to a valid Term is seamless within the same application process.

### Scenario 7
**Offline Mode / Network Failure**

```typescript
// Assume the JWS fetch fails due to network issues
import {Tempo} from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-astro';

console.log(new Tempo().term.astro);
```

Expected Outcome:
*> `Tempo.init()` attempts to fetch the JWS and fails.
*> Tempo "fails-safe": it logs a warning about the network failure but **allows** the license to remain valid (assuming the JWT itself is cryptographically sound and not yet expired).
*> Logic: Revocation checks are "best effort." We do not punish users for temporary offline status unless the license itself has expired.

#### Discoverability

To allow developers to inspect the license state (e.g., in a CLI or dashboard), a static `license` getter is provided.

**The `Pledge` Model**:
The JWS revocation fetch is an asynchronous operation. To handle this gracefully, `Tempo.license.jws` returns a **Pledge** (a specialized Tempo async container). 

```typescript
// Example: Checking status in a CLI or REPL
console.log(Tempo.license.status); // 'active' | 'expired' | 'revoked' | 'none'
console.log(Tempo.license.jws.status); // 'pending' | 'resolved' | 'rejected'

// Waiting for the fetch to complete
await Tempo.license.jws; 
console.log(Tempo.license.status); // Guaranteed to be final
```

### Scenario 8
**Discoverability and Async Handling**

```typescript
import {Tempo} from '@magmacomputing/tempo';

// 1. Immediate check
console.log(Tempo.license.jws.status); // 'pending'

// 2. Await the Pledge
await Tempo.license.jws;

// 3. Final check
console.log(Tempo.license.jws.status); // 'resolved'
console.log(Tempo.license.plugins.astro.status); // 'active'
```

Expected Outcome:
*> `Tempo.license` provides a synchronous snapshot of the `TempoRuntime`.
*> `Tempo.license.jws` acts as a `Pledge` that can be awaited to ensure the revocation list has been processed.
*> This allows the library to stay non-blocking while providing a standard way to synchronize when needed.
