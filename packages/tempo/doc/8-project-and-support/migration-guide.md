# ⚠️ Migrating to Tempo v4.x

Tempo v4.x introduces a standardized plugin & registry architecture, strict configuration namespaces, cascading configuration inheritance, and deterministic resource disposal while excising legacy v3.x deprecated interfaces.

## ⚡ Dynamic Functional Context (DFC) & Supplier Options

In v4.0.0, core configuration options (`timeZone`, `locale`, `calendar`, `sphere`) accept lazy `Evaluable<T>` supplier functions (`() => T`) as well as static scalars. This enables dynamic, per-request context resolution (e.g. multi-tenant session headers, request-scoped localizations) without recreating `Tempo` options or rebuilding configuration objects.

```typescript
// ✅ v4.0.0 - Dynamic per-request timezone resolution
import { Tempo } from '@magmacomputing/tempo';
import { getActiveTenantTimezone } from './session';

Tempo.init({
  timeZone: () => getActiveTenantTimezone(), // Re-evaluated dynamically when context getters execute
  locale: () => getCurrentUserLocale()
});
```

---

## 🛠️ Plugin SDK Subpath (`@magmacomputing/tempo/plugin/sdk`)

In v4.0.0, all custom plugin, term, module, and namespace development is standardized on `@magmacomputing/tempo/plugin/sdk`.

- **Legacy Imports**: Deprecated `plugin-api.index.ts` and `#tempo/license` subpath imports have been removed.
- **SDK Import**: Import `definePlugin`, `defineTerm`, `defineModule`, `defineNamespace`, `defineRange`, and evaluation utilities directly from `@magmacomputing/tempo/plugin/sdk`.

```typescript
// ❌ v3.x (Deprecated)
import { definePlugin } from '@magmacomputing/tempo/plugin-api';

// ✅ v4.0.0
import { definePlugin } from '@magmacomputing/tempo/plugin/sdk';
```

---

## 📄 Zero-`await` Synchronous JSONC Config Discovery

Tempo v4.0.0 introduces `resolveConfigSync()` for zero-`await` synchronous configuration discovery when using `.json` or `.jsonc` configuration files.

- `.json` / `.jsonc` files: Dynamically discovered and parsed synchronously during module initialization via `parseJSONC`.
- `.ts` / `.mts` / `.mjs` / `.js` files: Asynchronously loaded via `resolveConfig()`.
- Deprecated `.cjs` config discovery files are no longer automatically scanned.

---

## 🔓 100% Open-Source Community Core

Tempo v4.0.0 Community Core is 100% open-source without commercial license validation hooks or JWT scope checks.

- License keys (`licenseKey`, `TEMPO_LICENSE_KEY`) are no longer required or checked in the Community Edition.
- `Tempo.ready()` returns `'none'` for community core compatibility.
- Commercial plugin management and domain-locking hooks have been relocated into the `@magmacomputing/tempo-pro` enterprise package.

---

# 🚀 Tempo v4.1.0 Updates

Tempo v4.1.0 introduces cascading configuration inheritance (`extends`), a dedicated `pluginOptions` configuration slot, and overloaded `Tempo.create()` with deterministic resource cleanup (TC39 `using`).

## 🔌 Configuration Inheritance (`extends`), `plugins`, and `pluginOptions`

In v4.1.0, configuration, plugin registration, and runtime options have been cleanly separated:

- **Configuration Inheritance (`extends`)**: The `extends` option in `Tempo.init()` or `tempo.config.json` is strictly reserved for cascading configuration inheritance via URLs or file paths (mirroring `tsconfig.json` and ESLint conventions): `extends: 'https://company.org/tempo-base.json'`.
- **Plugin Registration (`plugins`)**: Pass executable plugins, terms, and modules into `plugins: [TickerPlugin, AstroTerm]`.
- **Plugin Configuration Slot (`pluginOptions`)**: Pass runtime configuration defaults for plugins into `pluginOptions: { ticker: { interval: 500 } }`. Passing plain configuration dictionaries directly under `plugins` is `@deprecated`.
- **Imperative Registration (`Tempo.use`)**: Use the standard `Tempo.use(Plugin)` static method to register plugins, terms, or modules at runtime. `Tempo.extend()` is `@deprecated Use Tempo.use(...) instead.`.

### Example:
```javascript
// ✅ v4.1.0: Clean Separation
Tempo.init({
  extends: 'https://central-governance.company.com/tempo-base.json', // Configuration inheritance
  plugins: [TickerPlugin, AstroTerm],                               // Feature & Term registration
  pluginOptions: {                                                  // Plugin runtime options
    ticker: { interval: 500 }
  }
});

// ✅ Imperative registration
Tempo.use(TickerPlugin);
```

---

## 🔒 Overloaded `Tempo.create()` & Scoped Disposal (`using`)

In v4.1.0, `Tempo.create()` introduces deterministic resource cleanup via TC39 Explicit Resource Management:

- **Scoped Callback Mode**: Run isolated operations without leaking sandbox state to the global scope:
  ```typescript
  const season = Tempo.create((sb) => {
    sb.use(AstroPlugin);
    return sb('2026-06-21').term.astronomy.season;
  }); // sandbox automatically disposed upon completion
  ```
- **TC39 Explicit Resource Management (`using`)**:
  ```typescript
  {
    using sb = Tempo.create({ discovery: 'ephemeral' });
    sb.use(MyPlugin);
  } // sb[Symbol.dispose]() called automatically
  ```

---

## 📂 Data Augmentation (`registry: { ... }`)

All custom format definitions, locale mappings, modifiers, tokens, snippets, layouts, events, periods, ignores, and number-word definitions are consolidated under the `registry` namespace.

- **Number-Word Mappings**: Top-level `numbers: { ... }` has been moved to `registry: { numbers: { ... } }`.
- **Custom Formats**: Top-level `formats: { ... }` has been moved to `registry: { formats: { ... } }`.
- **Global Discovery**: Discovery objects (`Symbol.for('$Tempo')`) use `registry: { numbers: { ... }, formats: { ... } }` instead of top-level `discovery.numbers` or `discovery.formats`.

### Example Migration:
```javascript
// ❌ v3.x (Deprecated)
Tempo.init({
  numbers: { un: 1, deux: 2 },
  formats: { customDate: '{yyyy}-{mm}-{dd}' }
});

// ✅ v4.0.0
Tempo.init({
  registry: {
    numbers: { un: 1, deux: 2 },
    formats: { customDate: '{yyyy}-{mm}-{dd}' }
  }
});
```

---

## 🧹 Deprecated Type & API Cleanup

- **`Tempo.use` vs `Tempo.uses`**: The legacy alias `Tempo.uses` has been excised. Use `Tempo.use()`.
- **`TempoInstance` Type**: `TempoInstance` interface alias has been removed in favor of standard `Tempo` class/instance types.
- **`Mutable<T>` to `MutableObject<T>`**: The utility type `Mutable<T>` has been renamed to `MutableObject<T>` to prevent naming collisions with the `@Mutable` member decorator and clarify object-level `readonly` stripping.

---

# ⚠️ Migrating to Tempo v3.x

Tempo v3.x finalizes the plugin ecosystem by extracting advanced features into standalone, licensed packages.

## 🔁 Migrating to Tempo v3.x (Ticker Extraction)

The `TickerPlugin` has been extracted from the core engine into a standalone open-source Community plugin (`@magmacomputing/tempo-plugin-ticker`).

**Action Required**:
1. If you use `Tempo.ticker()`, install `@magmacomputing/tempo-plugin-ticker` alongside `@magmacomputing/tempo`.
2. Import and register the plugin in your application initialization:
   ```javascript
   import { Tempo } from '@magmacomputing/tempo';
   import { TickerPlugin } from '@magmacomputing/tempo-plugin-ticker';

   Tempo.init({
     plugins: [TickerPlugin]
   });
   ```

# ⚠️ Migrating to Tempo v2.x

Tempo v2.x introduces architectural improvements and a more modular engine. While we strive for backward compatibility, there are some key changes to consider when upgrading from v1.x.

## 📦 Modular Architecture
Tempo is now split into a `core` engine and optional modules.

### If you use the full package:
If you import from `@magmacomputing/tempo`, everything (except Plugin extensions, like .ticker()) is included and works exactly like v1.x. No changes are required.

### If you want a lean bundle:
You can now import the core engine only:
```javascript
import { Tempo } from '@magmacomputing/tempo/core';
```
If you do this, you must manually import the features you need. Built-in features now self-register on import via side-effects.

## 🔌 Feature Registration
Features like `mutation`, `duration`, `format`, and the `ticker` are now modular.

### v1.x (Automatic)
In v1.x, all features were always present.

### v2.x (Opt-in for Core)
If using the Core engine, simply import the module to activate the feature:
```javascript
import '@magmacomputing/tempo/duration';
import '@magmacomputing/tempo/ticker';
```

## 🗓️ Term Logic Refactor
The way Terms (Quarters, Seasons, Zodiacs, etc.) are handled has been unified.

- **v1.x:** Some Term properties were ad-hoc on the instance.
- **v2.x:** All Term logic is centralized under the `.term` property or accessible via the `#` shorthand in `.set()` and `.add()`.

Example of new syntax:
```javascript
// Snap to start of quarter
t.set({ start: '#quarter' });

// Add two quarters while preserving day-of-quarter
t.add({ '#quarter': 2 });
```

## 🚀 Tempo v2.4.0: Standalone Utilities & Path Deprecation

Tempo v2.4.0 introduces standalone utility entry points for `parse` and `format`.

### 🛠️ Standalone Imports
You can now import lightweight, tree-shakable versions of our parsing and formatting engines without the `Tempo` class:
```javascript
import { parse } from '@magmacomputing/tempo/parse';
import { format } from '@magmacomputing/tempo/format';
```

### ⚠️ Reorganized Paths
We have reorganized the package structure to support these standalone entry points more cleanly.

**Action Required**:
1.  **Use package subpath maps**: Update your imports to use the official entry points:
    *   ❌ `@magmacomputing/tempo/module/parse`
    *   ❌ `@magmacomputing/tempo/module/format`
    *   ✅ `@magmacomputing/tempo/parse`
    *   ✅ `@magmacomputing/tempo/format`
2.  **Check your Import Maps**: If you use browser-side import maps, ensure they point to package subpath locations rather than internal folder paths. A maintained `importmap.json` is included in the package root (`packages/tempo/importmap.json`) as the sanctioned reference for each release.

    > Note: The shipped `packages/tempo/importmap.json` is the supported exception for version-locked internal mappings. Use it as-is for your installed Tempo version instead of hand-authoring `dist/` paths.

    Example:
```json
{
    "imports": {
        "@magmacomputing/tempo/parse": "./node_modules/@magmacomputing/tempo/parse",
        "@magmacomputing/tempo/format": "./node_modules/@magmacomputing/tempo/format"
    }
}
```

## 🔁 Migrating from version 2.4

As Tempo grows, it has become much more efficient for our developers to logically re-group certain modules.

**Action Required**:
1.  Review your browser `importmap` entries.
2.  Replace any older internal paths with the current package subpath entries (for example, `@magmacomputing/tempo/duration`, `@magmacomputing/tempo/mutate`, `@magmacomputing/tempo/parse`, and `@magmacomputing/tempo/format`).
3.  Do not pin imports in your code directly to internal folder layouts in `dist/`, since those paths may change as modules are reorganized.  Instead rely wholly on your import maps.

## 🔁 Migrating from version 2.6.0

Season Term scope output has been simplified.

**Action Required**:
1.  If you previously relied on the Chinese-specific object attached to `term.season` scope output, remove that dependency.
2.  Resolve Chinese season context by creating a dedicated `Tempo` instance with the appropriate Chinese `timeZone` for the interpretation you need.

## 🔁 Migrating from version 2.7.0 (Grouped Options)

Tempo has rationalized its configuration surface by grouping related options into nested objects. This improves discoverability and allows for easier additive merging across the prototype chain.

### Month-Day (Regional Parsing)
The individual `mdyLocales` and `mdyLayouts` options have been consolidated into a single `monthDay` object.
- **v2.6.x:** `new Tempo({ mdyLocales: ['en-US'] })`
- **v2.7.x:** `new Tempo({ monthDay: { locales: ['en-US'] } })`
- **Shortcut:** `new Tempo({ monthDay: true })` (enables forced MDY parsing using default locales).

### Relative Time
The individual `rtfFormat` and `rtfStyle` options have been consolidated into a single `relativeTimeFormat` object.
- **v2.6.x:** `new Tempo({ rtfStyle: 'long' })`
- **v2.7.x:** `new Tempo({ relativeTimeFormat: { style: 'long' } })`

### Action Required:
Only the deprecated top-level keys `rtfFormat` and `rtfStyle` are still accepted as legacy fallbacks in the current release, handled specifically in the `Tempo` class constructor for backward compatibility. 

In contrast, the old `mdyLocales` and `mdyLayouts` keys are **not** treated as aliases and will be ignored; these must be migrated to the new nested `monthDay` structure. Update your configuration to ensure compatibility with future versions and the optimization engine. Refer to the `Tempo` constructor for implementation details on legacy alias handling.

## 🔁 Migrating to version 2.9.3

### 📏 BigInt Precision Resolution
A breaking change was introduced to harmonize `BigInt` handling with numeric inputs.

- **Pre-v2.9.3:** `BigInt` inputs were always treated as raw nanoseconds, regardless of the `timeStamp` configuration.
- **v2.9.3+:** `BigInt` inputs now respect the configured `unit` (default `'ms'`).

#### Example:
```javascript
// Before v2.9.3
new Tempo(1000n).ts; // 1000 (nanoseconds)

// After v2.9.3
new Tempo(1000n).ts; // 1000 (milliseconds)
```

#### Action Required:
If you previously relied on `BigInt` being treated as nanoseconds, you must now explicitly set the `timeStamp` unit to `'ns'`:
```javascript
new Tempo(1000n, { timeStamp: 'ns' });
```

## 🔁 Removed Features (v3.0.0)

### Deprecated Boolean Debug Flag
The `debug` configuration property no longer accepts `boolean` values. It has been strictly typed to accept numeric verbosity levels matching the internal `LOG` enum, or lowercase string labels (e.g. `'trace'`, `'info'`).

- **Removed:** `new Tempo({ debug: true })`
- **Recommended:** `new Tempo({ debug: 4 })`, `new Tempo({ debug: 'debug' })`, or `new Tempo({ debug: LOG.Debug })` (for parsing verbosity).

### Internationalization Naming
To better align with ECMAScript standards (specifically `Intl.RelativeTimeFormat`), the `relativeTime` configuration option inside `intl` is no longer supported in v3.0.0.

- **Removed:** `new Tempo({ intl: { relativeTime: { style: 'long' } } })`
- **Recommended:** `new Tempo({ intl: { relativeTimeFormat: { style: 'long' } } })`

Please migrate your configurations from `relativeTime` to `relativeTimeFormat`.

## 🧪 Testing and Stability
v2.x has been hardened with a 100% pass rate on our regression suite. If you were relying on undocumented "quirks" or bugs in v1.x parsing, you may find that v2.x is more strict and deterministic.
