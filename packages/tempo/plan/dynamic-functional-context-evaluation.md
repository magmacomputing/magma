# Dynamic Functional Context & Lazy Evaluation Strategy

**Target**: Tempo `v3.12.0` & AI Plugin `v1.1.0`  
**Status**: Planned / Shelved for Next Minor Point-Release  
**Pattern**: `T | (() => T)` and `T | (() => Promise<T>)` Lazy Evaluation

---

## 1. Executive Summary & Release Timing

The `T | (() => T)` lazy evaluation pattern allows configurations, inputs, and context bindings to accept both static scalar values and dynamic evaluation hooks. While simple on the surface, integrating lazy and asynchronous resolution touches core dispatch pipelines, constructor argument normalization, multi-tenant state isolation, and secret management lifecycles.

### Why Defer to the Next Point-Release (`v1.1.0` / `v3.12.0`)?
1. **Release Stability**: Tempo `v3.11.1` and AI Plugin `v1.0.0` have stabilized with 100% green coverage across 131 test files (1,021 passing tests).
2. **Dispatch & Lifecycle Architecture**: Supporting async key getters (`() => Promise<string>`) requires moving key resolution from `Tempo.init()` discovery time into request dispatch time (`executeProviderRequest`), ensuring tokens are refreshed per-request without being prematurely flattened into static strings at boot time.
3. **Constructor & Instantiation Pipeline**: Supporting `new Tempo(() => DateTime)` requires updating `#swap()`, `#resolve()`, and argument overloading in `tempo.class.ts` so supplier functions aren't confused with options objects or eagerly parsed in defer mode.
4. **Multi-Tenant Testing**: Testing thread-local and `AsyncLocalStorage` binding for dynamic `timeZone` / `locale` requires dedicated concurrent test fixtures.
5. **Conclusion**: Deferring this to `v1.1.0` / `v3.12.0` ensures we deliver a production-grade, hardened implementation with full async secret provider, lazy instantiation, and multi-tenant test suites without delaying the `v1.0.0` milestone.

---

## 2. Core Architecture & Target Enhancements

### Track 1: AI Plugin (`@magmacomputing/tempo-ai` v1.1.0)

#### A. Dynamic / Rotating API Keys
* **Current Signature**: `key?: string`
* **Target Signature**: `key?: string | (() => string | Promise<string>)`
* **Use Cases**:
  * **Short-Lived Cloud IAM / STS Tokens**: Google Cloud Vertex AI and Azure OpenAI access tokens that expire after 60 minutes.
  * **Secret Vaults**: On-demand retrieval from AWS Secrets Manager, HashiCorp Vault, Doppler, or GCP Secret Manager.
  * **Zero Plaintext In-Memory Persistence**: Sensitive credentials are evaluated ephemerally per request and immediately cleared from scope.
* **Pipeline Change**:
  * Update `discovery.ts`: Preserve functional `p.key` as a callable hook during discovery merging instead of eagerly flattening via `resolveProviderApiKey`.
  * Update `dispatch.ts`: Await `typeof p.key === 'function' ? await p.key() : p.key` immediately before dispatching the HTTP fetch request.

#### B. Dynamic Anchor Grounding
* **Current Signature**: `anchor?: TempoDateInput`
* **Target Signature**: `anchor?: TempoDateInput | (() => TempoDateInput)`
* **Use Cases**:
  * Long-lived configuration objects and reusable query presets (e.g., `const options = { anchor: () => Tempo.now }`).
  * Prevents "anchor drift" where relative expressions (*"tomorrow"*, *"next Friday"*) calculate against the stale process startup timestamp rather than the invocation moment.
* **Pipeline Change**:
  * Update `resolveFullContext()` in `support.ts` to unwrap `typeof options.anchor === 'function' ? options.anchor() : options.anchor`.

#### C. Dynamic URLs & Model Routing
* **Target Signatures**: `url?: string | (() => string)`, `model?: string | (() => string)`
* **Use Cases**:
  * **Ephemeral Test Ports**: Dynamic URLs for local mock servers and WireMock containers in CI environments.
  * **Time-of-Day / Budget Routing**: Switch between high-speed models (`llama-3.1-8b-instant`) and large reasoning models (`llama-3.3-70b-versatile`) based on load, quota, or time.

---

### Track 2: Tempo Core (`@magmacomputing/tempo` v3.12.0)

#### A. Dynamic Instantiation Targets (`new Tempo( () => DateTime )`)
* **Target Signatures**:
  * `constructor(tempo?: t.DateTime | (() => t.DateTime), options?: t.Options | (() => t.Options))`
  * `Tempo.from(value: t.DateTime | (() => t.DateTime), options?: t.Options | (() => t.Options))`
* **Use Cases**:
  * **True Lazy / Deferral Construction**: `const t = new Tempo(() => getLatestDatabaseTimestamp());`
    Constructing the instance incurs zero parsing or database access overhead until a property or format (`t.iso`, `t.ts`, `t.format()`) is accessed.
  * **Live Dynamic / Reactive Anchors**: `const clock = new Tempo(() => Tempo.now);`
  * **Functional Argument Disambiguation**: Updating `#swap(tempo, options)` so supplier functions are cleanly distinguished from functional options or format mutators.
* **Pipeline Change**:
  * In `tempo.class.ts`:
    * Update `#swap()` to treat `isFunction(tempo)` as a `DateTimeSupplier` when it does not return an `Options` dictionary.
    * In `#resolve()`, evaluate `const raw = isFunction(this.#tempo) ? this.#tempo() : this.#tempo;` before passing to `#parse()`.

#### B. Multi-Tenant Request Isolation (`timeZone` & `locale`)
* **Target Signatures**:
  * `timeZone?: Temporal.TimeZoneLike | (() => Temporal.TimeZoneLike)`
  * `locale?: string | string[] | (() => string | string[])`
* **Use Cases**:
  * **SSR / Server Multi-Tenancy**: In Next.js, Fastify, Express, and Remix, concurrent requests share a single runtime process.
  * **Zero-Overhead Binding**: Instead of generating a new `Tempo.create({...})` sandbox on every incoming HTTP request, developers can configure Tempo globally once:
    ```ts
    Tempo.init({
      timeZone: () => asyncLocalStorage.getStore()?.userTimeZone ?? 'UTC',
      locale: () => asyncLocalStorage.getStore()?.userLocale ?? 'en-US',
    });
    ```
  * Every standard call to `Tempo.now`, `Tempo.today`, or `.format()` automatically resolves against the active request context.

#### C. Dynamic Enterprise Licensing
* **Target Signature**: `license?: string | (() => string | Promise<string>)`
* **Use Cases**:
  * Fetching signed JWS license tokens from remote license servers, Kubernetes secrets, or cloud vaults upon renewal without restarting the Node.js process.

---

## 3. Impact Analysis & Blast Radius

| Component | Files Affected | Complexity | Risk Level |
| :--- | :--- | :--- | :--- |
| **Dynamic Instantiation** | `tempo/src/tempo.type.ts`<br>`tempo/src/tempo.class.ts` | Low-Medium | Low (backward-compatible overload) |
| **AI Provider Keys** | `ai/src/types/base.type.ts`<br>`ai/src/core/discovery.ts`<br>`ai/src/core/dispatch.ts` | Low-Medium | Low (backward-compatible union) |
| **AI Anchor Grounding** | `ai/src/types/base.type.ts`<br>`ai/src/core/support.ts` | Low | Very Low |
| **AI URLs & Models** | `ai/src/types/base.type.ts`<br>`ai/src/core/dispatch.ts` | Low | Very Low |
| **Core Multi-Tenant Context** | `tempo/src/tempo.type.ts`<br>`tempo/src/tempo.class.ts`<br>`tempo/src/engine/engine.normalizer.ts` | Medium | Medium (performance in hot parsing loops) |

---

## 4. Verification & Testing Strategy

1. **Lazy Instantiation Test**:
   * Instantiate `new Tempo(() => { supplierCalled = true; return '2026-08-17'; }, { mode: Tempo.MODE.Defer })`.
   * Assert `supplierCalled === false` at instantiation.
   * Access `.iso` and assert `supplierCalled === true` and `.iso === '2026-08-17T00:00:00Z'`.
2. **AI Dynamic Key Rotation Test**:
   * Mock a provider key generator that yields an expired token on request #1 and a refreshed token on request #2. Assert automatic resolution.
3. **AI Dynamic Anchor Drift Test**:
   * Create a shared options fixture with `anchor: () => Tempo.now`. Advance simulated timers with `vi.advanceTimersByTime()` and assert relative parsing outputs shift accordingly.
4. **Multi-Tenant Concurrent Context Test**:
   * Execute parallel `Promise.all()` workers across 50 simulated requests with distinct `AsyncLocalStorage` stores; verify zero context bleed between concurrent `Tempo.now` calls.

---

## 5. Conclusion & Recommendation

The lazy evaluation pattern aligns with Tempo’s modern developer ergonomics and production-readiness philosophy. Scheduling this for **Tempo v3.12.0** and **AI Plugin v1.1.0** allows for thorough multi-tenant concurrency testing, async credential provider integration, constructor disambiguation, and documentation updates without putting the pending `v1.0.0` / `v3.11.1` release at risk.
