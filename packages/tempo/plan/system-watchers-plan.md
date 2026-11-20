# Implementation Plan: Isomorphic System Locale & Time-Zone Watchers

## Goal
Enable applications using `@magmacomputing/library`, `@magmacomputing/tempo`, and `@magmacomputing/tempo-plugin-signals` to react automatically when the host environment's locale or IANA time zone changes (e.g., laptop travel across time zones, OS clock/region updates, browser language changes) with **zero background polling by default**, deterministic `Disposable` cleanup (`using`), and full SSR/Node/Electron compatibility.

---

## Can This Work Beyond the Browser?
Yes — with a clear distinction between **event-driven (zero-polling)** and **host-triggered** runtimes:

| Runtime | Detection Mechanism | Polling Required? |
| :--- | :--- | :--- |
| **Browser / PWA** | `window` (`languagechange`, `focus`), `document` (`visibilitychange`), `navigator.connection` (`change`) | **No** (100% event-driven) |
| **Electron / Tauri / Mobile WebView** | Same browser events + optional `subscribe(trigger)` hook for `powerMonitor` (`resume`, `unlock-screen`) | **No** (host-event-driven) |
| **Node.js / CLI / Server** | Manual `watcher.check()` or `subscribe(trigger)` (e.g., `SIGUSR2` / custom wake event); optional opt-in `pollIntervalMs` (default `false`) for headless daemons | **No by default** (opt-in only) |

> [!NOTE]
> Node.js / V8 does not emit a native OS event when the system time zone changes, and on some platforms ICU caches the startup `TZ` until `process.env.TZ` or OS zone state is refreshed. Providing `.check()` + `subscribe(trigger)` keeps the API 100% isomorphic and zero-polling by default while still supporting Node/Electron hosts cleanly.

---

## Proposed Architecture

### Layer 1: `@magmacomputing/library` (`packages/library`)
Add a Tempo-agnostic, tree-shakeable primitive (exported from `@magmacomputing/library` and `@magmacomputing/tempo/plugin/sdk`):

- **Location**: `packages/library/src/common/runtime/system-intl.library.ts` (re-exported from `common.index.ts` and `packages/tempo/src/library.index.ts`).
- **API**:
  ```ts
  export interface SystemIntlSnapshot {
  	readonly locale: string;
  	readonly timeZone: string;
  }

  export interface WatchSystemIntlOptions {
  	/** Optional custom event subscription (e.g. Electron powerMonitor or Node signal). */
  	subscribe?: (trigger: () => void) => (() => void) | void;
  	/** Optional opt-in polling interval in ms for headless Node daemons (default: false / disabled). */
  	pollIntervalMs?: number | false;
  	/** Invoke `onChange` immediately with the initial snapshot (default: false). */
  	immediate?: boolean;
  }

  export interface SystemIntlWatcher extends Disposable {
  	/** Synchronously re-reads `Intl.DateTimeFormat().resolvedOptions()` and notifies if changed. */
  	check(): boolean;
  	/** Current last-observed `{ locale, timeZone }` snapshot. */
  	readonly current: SystemIntlSnapshot;
  	dispose(): void;
  	[Symbol.dispose](): void;
  }

  export function watchSystemIntl(
  	onChange: (next: SystemIntlSnapshot, prev: SystemIntlSnapshot) => void,
  	options?: WatchSystemIntlOptions,
  ): SystemIntlWatcher;
  ```
- **Behavior**:
  - Reads `Intl.DateTimeFormat().resolvedOptions()` (`locale || 'en'`, `timeZone || 'UTC'`).
  - Feature-detects `window`, `document`, and `navigator.connection` safely (SSR-safe, no-ops if missing).
  - Attaches `languagechange`, `focus`, `visibilitychange` (when `visibilityState === 'visible'`), and `navigator.connection.change` (if present).
  - Attaches optional `options.subscribe?.(check)` and optional `options.pollIntervalMs` (calling `.unref()` on Node timer handles via `isFunction((t as any)?.unref)`).
  - Fires `onChange(next, prev)` **only** when `next.locale !== prev.locale || next.timeZone !== prev.timeZone`.
  - `dispose()` / `[Symbol.dispose]()` removes all listeners, unsubscribes `options.subscribe`, and clears any optional timer.

### Layer 2: `@magmacomputing/tempo-plugin-signals` (`packages/plugins/signals`)
Bridge `watchSystemIntl` into `Tempo.init()` and reactive config signals without adding any default listeners unless opted in:

- **Location**: `packages/plugins/signals/src/functions/watch-system.ts` (exported from `src/index.ts` and exposed on `Tempo.signals.watchSystem`).
- **API**:
  ```ts
  export interface WatchSystemConfigOptions extends WatchSystemIntlOptions {
  	/** Sync `Tempo.init({ locale })` on system locale changes (default: true). */
  	locale?: boolean;
  	/** Sync `Tempo.init({ timeZone })` on system time-zone changes (default: true). */
  	timeZone?: boolean;
  	/** Target `Tempo` class or sandbox (default: `Tempo`). */
  	target?: typeof Tempo;
  }

  export function watchSystemConfig(options?: WatchSystemConfigOptions): SystemIntlWatcher;
  ```
- **Behavior**:
  - Calls `watchSystemIntl(({ locale, timeZone }) => { ... })`.
  - Builds a minimal `Tempo.init(patch)` call containing only enabled keys (`locale`, `timeZone`), so `Tempo.config`, `Tempo.signals.locale`, `Tempo.signals.timeZone`, `toRelativeSignal()`, and future `new Tempo()` instances all update in one place.
  - Because `SignalsPlugin` already wraps `SandboxTempo.init` (when installed at sandbox creation), passing `target: sb` also updates sandbox-scoped signals cleanly.
  - Zero side effects on import: nothing attaches until the user calls `watchSystemConfig()` or `Tempo.signals.watchSystem()`.

---

## Verification Plan
1. **Unit Tests (`packages/library/test/common/runtime/system-intl.test.ts`)**:
   - Mock `Intl.DateTimeFormat().resolvedOptions()` and verify:
     - Initial snapshot & `immediate: true` option.
     - Browser events (`languagechange`, `focus`, `visibilitychange` visible-only) trigger `check()` and fire `onChange` only on actual changes.
     - `subscribe` hook receives `trigger`, fires `onChange`, and cleans up on `dispose()` / `using`.
     - Optional `pollIntervalMs` fires on fake timers and is `.unref()`-safe.
     - SSR safety when `window` / `document` are `undefined`.
2. **Integration Tests (`packages/plugins/signals/test/watch-system.test.ts`)**:
   - Verify `watchSystemConfig()` calls `Tempo.init({ timeZone })` / `{ locale }` and reactively updates `Tempo.signals.timeZone`, `Tempo.signals.locale`, and `toRelativeSignal()`.
   - Verify `{ locale: false }` preserves a pinned locale while still updating `timeZone`.
   - Verify `using watcher = Tempo.signals.watchSystem()` detaches cleanly on scope exit.
   - Verify `packages/plugins/signals/test/purity.test.ts` continues to confirm zero side effects on root import.
3. **Full Build & Docs**:
   - `npm run build:all && npm test`
   - Update `packages/plugins/signals/doc/index.md` and `packages/tempo/doc/6-utility-library/tempo.library.md`, then verify `npx vitepress build`.

---

## SemVer Classification
- **`@magmacomputing/library`**: **Minor** (`5.x.0` if bumping post-5.0.0, or included in the **5.0.0** initial v5 release) — strictly additive `watchSystemIntl` export with zero breaking changes to existing APIs.
- **`@magmacomputing/tempo-plugin-signals`**: **Minor** (`1.1.0` if published after `1.0.0`, or included in `1.0.0` before initial npm publish) — strictly additive `watchSystemConfig` export and `Tempo.signals.watchSystem` namespace method.
- **`@magmacomputing/tempo`**: **Patch / No API change** (only re-exports `watchSystemIntl` from `library.index.ts` / `plugin/sdk` if desired).

---

## Estimated Effort
| Task | Estimate | Complexity |
| :--- | :--- | :--- |
| `watchSystemIntl` in `@magmacomputing/library` + unit tests | 2.0 – 3.0 hrs | Low–Medium (browser/SSR feature guards + listener cleanup) |
| `watchSystemConfig` + `Tempo.signals.watchSystem` + types + tests | 1.5 – 2.0 hrs | Low (thin bridge over `watchSystemIntl` and `Tempo.init`) |
| Documentation (`signals/doc/index.md`, `tempo.library.md`) & full build/test verification | 1.0 hr | Low |
| **Total** | **~4.5 – 6.0 hrs (~0.75 engineering day)** | **Low–Medium** |
