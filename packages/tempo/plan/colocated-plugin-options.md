# Architectural Plan: Colocated Plugin Options & Callable Plugin Factories

## Executive Summary

This plan proposes an architectural enhancement to Tempo's plugin registration pipeline to eliminate "action-at-a-distance" configuration.

Currently, configuring a plugin in `tempo.config.ts` requires a disconnected two-place declaration:
```typescript
// Legacy / Disconnected Syntax
export default defineConfig({
  plugins: [TickerPlugin],
  pluginOptions: {
    ticker: { interval: 1000 } // Requires knowing the magic string key 'ticker'
  }
});
```

This plan introduces **Colocated Plugin Configuration**, allowing options to be provided directly alongside the plugin in the `plugins` array:
```typescript
// Modern Colocated Syntax (Vite / Rollup Model)
export default defineConfig({
  plugins: [
    AstroTerm,                         // 1. Bare plugin (default options)
    TickerPlugin({ interval: 1000 }),  // 2. Colocated callable factory (Pattern 1)
    [GeoPlugin, { timeout: 5000 }],    // 3. Tuple syntax (Pattern 2)
  ]
});
```

Behind the scenes, Tempo's registration engine unpacks call-site options, passes them directly to the plugin's `install(Tempo, options)` lifecycle hook, and automatically merges them into `config.pluginOptions[plugin.name]`.

---

## Release & Effort Assessment

- **Estimated Effort**: **Small to Medium (~3–5 hours / 0.5–1 engineering day)**
  - **Scope**: Modifies `definePlugin` and `defineTerm` in `plugin.util.ts`, desugars tuple/factory arguments in `Tempo.use()`, updates plugin type signatures in `tempo.type.ts`/`plugin.type.ts`, and adds targeted unit test suites.
  - **Complexity**: Low-risk; primary technical hurdle is non-destructive array unwrapping in `Tempo.use()` (preserving 2-element `[Plugin, Options]` tuples while flattening standard nested plugin arrays) and TypeScript overload definitions for callable hybrid plugin factories.
- **SemVer Classification**: **Minor (`v4.3.0`)**
  - **Rationale**: Introduces new, backwards-compatible public API features and syntax (callable plugin factories `TickerPlugin({ ... })` and tuple configuration `[Plugin, options]`). Fully preserves existing bare plugin registration (`plugins: [TickerPlugin]`) and legacy `pluginOptions` dictionary workflows without breaking changes.

---

## 1. Guiding Principles & Design Goals

1. **Zero Breaking Changes**:
   - Bare plugin registration (`plugins: [TickerPlugin]`) remains 100% supported.
   - External/shared `pluginOptions` dictionaries remain supported for cascading configurations and lazy-loaded plugins.
2. **No Magic String Coupling**:
   - Developers no longer need to look up documentation to find whether the config slot is `'ticker'`, `'tickers'`, or `'tempo-plugin-ticker'`.
3. **Dual-Mode Callability**:
   - Official and community plugins created with `definePlugin()` can be used either as bare objects (`TickerPlugin`) or called as factory functions (`TickerPlugin(options)`).
4. **Tuple Fallback for Third-Party Objects**:
   - If a third-party plugin was not created with `definePlugin` (a plain object), it can still be colocated via tuple syntax: `[MyThirdPartyPlugin, options]`.

---

## 2. Technical Specifications

### A. Dual-Mode `definePlugin` Enhancement (`packages/tempo/src/plugin/plugin.util.ts`)

Currently, `definePlugin` accepts a plugin descriptor object and returns that object frozen with metadata.

We enhance `definePlugin` so the returned value is a **callable hybrid function** that also carries all plugin properties:

```typescript
export type PluginFactory<T extends Plugin<TempoType>, Opts = any> = T & {
  (options?: Opts): T & { options?: Opts };
};

export function definePlugin<T extends Plugin<TempoType>, Opts = any>(plugin: T): PluginFactory<T, Opts> {
  // 1. The factory invoked when called: TickerPlugin({ interval: 1000 })
  const factory = function (options?: Opts) {
    return {
      ...plugin,
      options,
      [sym.$PluginType]: 'plugin'
    };
  };

  // 2. Copy properties onto the function (excluding non-writable 'name'), then define name cleanly
  const { name, ...rest } = plugin;
  const result = Object.assign(factory, rest, { [sym.$PluginType]: 'plugin' });
  if (name) {
    Object.defineProperty(result, 'name', { value: name, configurable: true });
  }
  
  registerPlugin(result);
  return result as unknown as PluginFactory<T, Opts>;
}
```

#### Dual-Mode Behavior:
- When referenced as `TickerPlugin`: It has `TickerPlugin.name`, `TickerPlugin.install`, and `TickerPlugin[sym.$PluginType]`.
- When invoked as `TickerPlugin({ interval: 1000 })`: It returns an enriched descriptor carrying `options: { interval: 1000 }`.

---

### B. Engine Desugaring in `Tempo.use()` (`packages/tempo/src/tempo.class.ts`)

In `Tempo.use(...)` (which processes the `plugins` array during bootstrap and initialization), we update the argument resolver to handle tuples, colocated option objects, and factory closures:

```typescript
// Recognize tuples [Plugin, Options] before flattening so option objects are not split
const isPluginTuple = (entry: any): entry is [any, any] =>
  Array.isArray(entry) && entry.length === 2 && !Array.isArray(entry[0]) && isObject(entry[1]);

// Flatten nested arrays while keeping [Plugin, Options] tuples intact
const items = args.flatMap(arg => (isPluginTuple(arg) ? [arg] : Array.isArray(arg) ? arg.flat(Infinity) : [arg]));

// Inside Tempo.use() items loop:
items.forEach(item => {
  let plugin = item;
  let callSiteOptions: any = undefined;

  // 1. Handle Tuple Syntax: [Plugin, Options]
  if (isPluginTuple(item)) {
    plugin = item[0];
    callSiteOptions = item[1];
  }

  // 2. Handle Factory Execution or Callable Plugins
  if (isFunction(plugin)) {
    // If the function is a callable plugin descriptor from definePlugin
    if (plugin.install && plugin.name) {
      // It was passed as a bare function: [ TickerPlugin ]
      callSiteOptions = (plugin as any).options;
    } else if (plugin.length >= 3) {
      // Legacy standard plugin callback: function(Tempo, options, rehydrator)
      (plugin as any)(this, callSiteOptions ?? options, (val: any) => new this(val));
      return;
    } else {
      // Uncalled factory function: execute to get descriptor
      const res = (plugin as any)(this, callSiteOptions ?? options);
      if (res && isObject(res) && (res.install || res.define)) {
        plugin = res;
        callSiteOptions = (res as any).options ?? callSiteOptions;
      }
    }
  }

  // 3. Extract options stashed by TickerPlugin(opts)
  if (isObject(plugin) && (plugin as any).options) {
    callSiteOptions = { ...((plugin as any).options), ...(callSiteOptions ?? {}) };
  }

  // 4. Resolve Final Merged Options for this Plugin (Precedence: config -> trailing options -> call-site tuple/closure)
  const pluginName = (plugin as any)?.name;
  const existingConfigOpts = pluginName ? this[$Internal]().config.pluginOptions?.[pluginName] : undefined;
  const resolvedOptions = {
    ...(existingConfigOpts ?? {}),
    ...(options ?? {}),
    ...(callSiteOptions ?? {}),
  };

  // 5. Automatically Synchronize to state.config.pluginOptions
  if (pluginName && !isEmpty(resolvedOptions)) {
    const state = this[$Internal]();
    state.config.pluginOptions = {
      ...(state.config.pluginOptions ?? {}),
      [pluginName]: resolvedOptions
    };
  }

  // 6. Invoke install hook with resolved options
  if (isObject(plugin) && isFunction((plugin as any).install))
    (plugin as TempoPlugin).install.call(this, this, resolvedOptions);
});
```

---

## 3. Handling Unused or Lazy Plugin Options (The `ai` Question)

In `tempo.config.ts`, declaring options for a plugin that is not currently imported (e.g. `pluginOptions: { ai: { timeout: 10000 } }` without importing `@magmacomputing/tempo-plugin-ai`) is **completely safe and supported by design**.

### Why This is Safe & Beneficial:
1. **Passive Storage**: `Tempo.config.pluginOptions` acts as a passive, decoupled key-value registry (`Record<string, any>`). Tempo core never validates or requires that every key in `pluginOptions` corresponds to an active plugin.
2. **Lazy / On-Demand Loading**: Heavy plugins (like AI, Geo, or Complex Ephemeris) are often not imported in the main bundle. When an application route dynamically imports `@magmacomputing/tempo-plugin-ai` at runtime, the AI plugin's discovery logic reads `Tempo.config.pluginOptions.ai` and boots with those pre-configured defaults.
3. **Shared Base Configs (`extends`)**: A shared corporate base configuration (`tempo-base.config.jsonc`) can safely define enterprise defaults for `ai`, `ticker`, `finance`, and `geo`. Individual microservices inherit the base config without being forced to install or import plugins they do not use.

---

## 4. Implementation Phasing

### Phase 1: Core SDK (`packages/tempo/src/plugin/plugin.util.ts`)
- Update `definePlugin` to return callable hybrid functions carrying `.options`.
- Update `defineTerm` with identical option-carrying factory support.
- Add TypeScript overloads for `PluginFactory<T, Opts>`.

### Phase 2: Engine Desugaring (`packages/tempo/src/tempo.class.ts`)
- Update `Tempo.use(...)` to unpack:
  - Callable descriptors: `item.options`
  - Tuples: `[plugin, options]`
  - Factory closures
- Automatically sync extracted options into `state.config.pluginOptions[name]`.
- Pass resolved options into `plugin.install(Tempo, resolvedOptions)`.

### Phase 3: Monorepo Plugin Adaptation
- Update plugins in `packages/plugins/*` (e.g. `ticker`, `geo`, `ai`) to export their options type interfaces so consumers get instant IDE intellisense inside `TickerPlugin({ ... })`.

---

## 5. Verification & Test Plan

### Automated Vitest Suite (`packages/tempo/test/plugin/colocated-options.test.ts`)

1. **Callable Plugin Execution**:
   - Register via `Tempo.use(TickerPlugin({ interval: 500 }))`.
   - Assert `Tempo.config.pluginOptions.ticker.interval === 500`.
   - Assert `Ticker.active` reflects the configured 500ms interval.
2. **Tuple Syntax**:
   - Register via `Tempo.use([TickerPlugin, { interval: 750 }])`.
   - Assert `Tempo.config.pluginOptions.ticker.interval === 750`.
3. **Bare Plugin Backward-Compatibility**:
   - Register via `Tempo.use(TickerPlugin)`.
   - Assert clean registration with default options.
4. **Configuration Precedence**:
   - Test `plugins: [TickerPlugin({ interval: 1000 })]` combined with `pluginOptions: { ticker: { interval: 2000 } }`.
   - Verify explicit `pluginOptions` overrides call-site defaults (or vice-versa according to documented precedence).
5. **Inert Unused Options**:
   - Pass `pluginOptions: { nonExistentPlugin: { foo: 'bar' } }` and assert zero warnings, errors, or performance overhead.
