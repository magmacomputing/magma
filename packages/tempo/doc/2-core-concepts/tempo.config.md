# Configuration Guide

**Tempo** provides a flexible, multi-tiered configuration system. Settings are applied in a specific order of precedence, allowing you to set broad defaults that can be refined at the application or instance level.

## Precedence Hierarchy

Settings are loaded in the following order (where later stages override earlier ones):
1.  **Library Defaults**: Sensible out-of-the-box baseline.
2.  **Persistent Storage**: Sticky user preferences (which merge into Defaults).
3.  **Global Discovery**: Enterprise-level setup discovered via `Symbol.for('$Tempo')`.
4.  **Library Extension**: Dynamic feature registration via `Tempo.extend()`.
5.  **Explicit Initialization**: Baseline configuration via `Tempo.init()`.
6.  **Instance Constructor**: Specific overrides for a single `new Tempo()` call.

---

## 🏆 Best Practice: The `tempo.config.ts` Pattern

Rather than scattering `Tempo.init()` or `Tempo.extend()` calls throughout your application, the recommended best practice is to centralize your environment setup into a single `tempo.config.ts` (or `.js`) file. 

This mirrors modern ecosystem standards (like `vite.config.ts` or `tailwind.config.js`) and ensures that plugins, timezones, and custom aliases are consistently applied before any domain logic executes.

::: info
**Target Environment**: This automatic configuration discovery pattern relies on Node.js file system capabilities and is designed for Server, Fullstack, or Bundled environments (like Vite or Webpack). If you are using Tempo via a `<script>` tag in a pure Browser environment, skip to [Explicit Initialization](#3-explicit-initialization-tempoinit) to configure Tempo synchronously!
:::

```typescript
// tempo.config.ts
import { defineConfig } from '@magmacomputing/tempo';
import { AstroTerm } from '@magmacomputing/tempo-plugin-astro';
import { TickerPlugin } from '@magmacomputing/tempo-plugin-ticker';

export default defineConfig({
  timeZone: 'Australia/Sydney',     // Set your baseline timezone
  extends: [AstroTerm, TickerPlugin], // Register executable plugins
  plugins: {
    // Plugin configuration dictionaries
    ai: {
      mode: 'fallback',
      timeout: 10000,
    }
  },
  registry: {
    periods: { 
      'market-open': '09:30',
      'market-close': '16:00' 
    }
  }
});
```

You can then bootstrap this environment at the very top of your application's entry point (e.g., `main.ts` or `index.js`) to guarantee the configuration is locked in before any other files run:

```typescript
// main.ts
import { Tempo } from '@magmacomputing/tempo';

// Automatically discovers and loads 'tempo.config.ts'
await Tempo.bootstrap(); 

// Dynamic import ensures domain logic loads ONLY AFTER configuration is complete
const { App } = await import('./app.js');
// ...
```
### Benefits vs. Drawbacks

Using `tempo.config.ts` is the modern standard, but it introduces specific architectural tradeoffs due to Node.js ES Module constraints.

#### 🌟 Benefits
- **TypeScript Autocomplete**: Using `defineConfig` provides instant IDE intellisense and type-safety for all configuration options.
- **Plugin Execution**: You can import and instantiate plugins directly inside the configuration file, keeping your application logic clean.
- **Dynamic Configuration**: Enables runtime logic (e.g., `debug: process.env.NODE_ENV !== 'production'`) that strict JSON cannot provide.

#### ⚠️ Drawbacks
- **Asynchronous Requirement**: Because `tempo.config.ts` is evaluated as an ES Module, the JavaScript engine *forces* it to be loaded asynchronously via dynamic `import()`. This means you **must** use `await Tempo.bootstrap()` instead of the synchronous `Tempo.init()`.

#### 🛑 Risks
- **Node.js Environment Only**: The `bootstrap()` automatic file discovery relies on Node.js (`fs`, `path`). If you are running strictly in a browser (e.g., via CDN without a bundler), automatic discovery will safely abort, and `bootstrap()` will simply act as a pass-through to `Tempo.init()`. In these environments, you must bundle your config or manually pass your options to `Tempo.init(options)`.
- **Floating Promises**: You must ensure you actually `await` the bootstrap call. If you forget the `await` keyword, your application will continue booting before Tempo finishes reading your config file, leading to race conditions where early instances use default settings.

::: tip
**Looking to configure Internationalization?**  
Tempo offers deep integration with native `Intl` APIs for both parsing and formatting foreign languages out-of-the-box. See [The Role of Locale](../4-advanced-reference/tempo.locale.md) for a general guide, and the [Internationalized Parsing](./tempo.parse.md#internationalized-parsing-locales) and [Format Modifiers & Localization](../1-getting-started/tempo.cookbook.md#format-modifiers--localization) guides for configuration details.
:::

---

## 1. Persistent Configuration (`$Tempo`)

The first layer Tempo checks after its own internal defaults is persistent storage. This is ideal for "sticky" settings like a user's preferred timezone or locale that should persist across sessions without a database.

```javascript
// Write a preference to localStorage under the default key ('$Tempo')
Tempo.writeStore({ timeZone:'Australia/Sydney' });
// Write a preference to localStorage under the key 'mySettings'
Tempo.writeStore({ timeZone: 'America/New_York' }, 'mySettings');

// Later, or in another file, initialize Tempo pointing to that key
// It will automatically read 'America/New_York' and apply it
Tempo.init({ store: 'mySettings' });
```

---

## 2. Global Discovery

To facilitate configuration in micro-frontend architectures or script-first bootstraps, `Tempo` can discover a Discovery object from `globalThis` during `Tempo.init()`.

The intended flow is:
1. Write a Discovery object into `globalThis` under the configured discovery symbol key.
2. Import a module containing `Tempo`.
3. `Tempo` class static initialization runs `Tempo.init()`.
4. `Tempo.init()` reads the global discovery slot and merges it.

By default, the key is `Symbol.for('$Tempo')`.

### Pre-Bootstrap Discovery (globalThis)

```javascript
// Must run before the first Tempo module is evaluated
globalThis[Symbol.for('$Tempo')] = Object.freeze({
  options: { timeZone: 'Europe/Paris' },
  timeZones: { MYTZ: 'Asia/Dubai' },
  registry: { formats: { myFormat: '{dd}!!{mm}!!{yyyy}' } },
  terms: [myCustomTermPlugin]
});

// Load Tempo after the discovery object is in place
const { Tempo } = await import('@magmacomputing/tempo');
```

::: info
With static ESM imports, import evaluation happens before module body execution. If you need discovery to apply on first load, assign `globalThis` in an earlier script/module, or use dynamic `import()` as shown above.
:::

### Explicit Runtime Registration (Not Global Discovery)
Using `Tempo.extend(...)` is explicit registration after `Tempo` is loaded. It is ergonomic and strongly recommended for normal application code, but it is a different mechanism from pre-bootstrap global discovery.

```javascript
import { Tempo } from '@magmacomputing/tempo';

Tempo.extend({
  options: { timeZone: 'Europe/Paris' },
  timeZones: { MYTZ: 'Asia/Dubai' },
  registry: { formats: { myFormat: '{dd}!!{mm}!!{yyyy}' } },
  terms: [myCustomTermPlugin]
});
```

### Security and Ergonomics Notes
- **Tamper Prevention**: When utilizing Global Discovery in a shared environment (like micro-frontends), it is highly recommended to `Object.freeze()` your configuration. Tempo only reads from this object, so freezing it prevents third-party scripts from injecting unauthorized plugins before Tempo boots up.
- Global Discovery is convenient for host-controlled bootstraps and cross-bundle handoff.
- `Tempo.extend(...)` is usually safer in app code because configuration is explicit, local, and easier to trace.
- Use Global Discovery when you must configure `Tempo` before the first `Tempo` import executes.

### Discovery Contract
Tempo looks for the following structure:

| Property | Type | Description |
| :--- | :--- | :--- |
| `options` | `Options \| (() => Options)` | Configuration options merged into global state. |
| `intl` | `IntlOptions` | Internationalization configuration grouping `relativeTimeFormat`, `numberFormat`, `durationFormat`, and `dateTimeFormat`. |
| `extends` | `Plugin \| Plugin[]` | Modular plugin(s) (including `TermPlugin`s) to be extended onto Tempo automatically. |
| `plugins` | `Record<string, any>` | Plugin configuration dictionary. |
| `timeZones` | `Record<string, string>` | Custom timezone aliases to be merged. |
| `registry` | `{ formats?, locales?, numbers?, events?, periods?, snippets?, layouts?, ignores?, modifiers?, tokens? }` | Custom configuration for internal dictionary registries. |

---

## 3. Explicit Initialization (`Tempo.init`)

This is the **Standard Developer Tier**. Most applications should call `Tempo.init()` during startup to establish a predictable baseline for all instances.

```javascript
import { Tempo } from '@magmacomputing/tempo';

Tempo.init({
  timeZone: 'Australia/Sydney',
  locale: 'en-AU',
  pivot: 80,
  debug: 0
});
```

### Available Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `timeZone` | `Evaluable<string>` | System Zone | Default IANA time zone, alias, or dynamic supplier (`() => string`). |
| `locale` | `Evaluable<string \| string[]>` | System Locale | Default BCP 47 language tag(s) or dynamic supplier. |
| `calendar` | `Evaluable<string>` | `'iso8601'` | Default calendar system or dynamic supplier. |
| `pivot` | `number` | `75` | Cutoff for parsing two-digit years. |
| `monthDay` | `MonthDay \| boolean` | `undefined` | Regional date-parsing configuration (grouped). Includes `active`, `locales`, `layouts`, and `timezones`. |
| `timeStamp`| `'ss' \| 'ms' \| 'us' \| 'ns'` | `'ms'` | Precision for numeric inputs and the `.ts` property. |
| `sphere` | `Evaluable<'north' \| 'south'>`| Auto-inferred | Hemisphere for seasonal plugins or dynamic supplier. |
| `intl` | `IntlOptions` | `undefined` | Internationalization configuration grouping `relativeTimeFormat`, `numberFormat`, and `durationFormat`. |
| `registry` | `{ formats?, locales?, numbers?, events?, periods?, snippets?, layouts?, ignores?, modifiers? }` | Built-in registries | Custom data augmentation registries (e.g., format aliases, number-to-word mappings, parsing logic, localization). |
| `extends` | `Plugin \| Plugin[]` | `[]` | Plugins/modules to extend during initialization. `Tempo.init()` applies each plugin with `Tempo.extend(p)`. |
| `plugins` | `Record<string, any>` | `{}` | Plugin configuration dictionaries (e.g. `plugins: { ai: { ... } }`). |
| `store` | `string` | `'$Tempo'` | Persistent storage key used by `readStore`/`writeStore`. |
| `discovery` | `string \| symbol` | `'$Tempo'` symbol key | Discovery slot used to resolve global discovery config. |
| `debug` | `number \| string` | `'info'` | Controls log verbosity via direct `LOG` levels (`0=Off ... 5=Trace`) or string labels (`'trace'`, `'info'`, etc). |
| `catch` | `boolean` | `false` | If true, invalid inputs return a Void instance instead of throwing. |
| `mode` | `'auto' \| 'strict' \| 'defer'` | `'auto'` | Controls the hydration strategy (e.g., `defer` for Zero-Cost creation). |
| `silent` | `boolean` | `false` | Suppresses console output. Combined with `catch: true` for silent failover. |
| `planner` | `PlannerOptions` | `undefined` | Grouped configuration for `layoutOrder` and `preFilter`. |

---

::: info
`debug` accepts numeric level values (`0` through `5`) or lowercase string labels (`'off'`, `'error'`, `'warn'`, `'info'`, `'debug'`, `'trace'`).
:::

## 4. Instance-Level Overrides

The final layer of precedence is the constructor itself. You can override *any* global setting for a specific calculation without affecting the rest of your application.

```javascript
// This instance uses UTC regardless of any global configuration
const t = new Tempo('now', { timeZone: 'UTC' });
```

---

## 4.1 Dynamic & Functional Context Evaluation

In modern multi-tenant, serverless, or micro-service architectures (such as Next.js, Express, or Fastify), user timezone and locale preferences frequently change on a per-request basis.

To eliminate repetitive instance options and prevent global configuration mutation churn (`Tempo.init()`), Tempo supports **`Evaluable<T>`** (`T | (() => T)`) suppliers across all core context properties (`timeZone`, `locale`, `calendar`, `sphere`):

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { AsyncLocalStorage } from 'node:async_hooks';

interface UserSession {
  tenantId: string;
  timeZone: string;
  locale: string;
}

export const sessionContext = new AsyncLocalStorage<UserSession>();

// Initialize global baseline with dynamic supplier functions once:
Tempo.init({
  timeZone: () => sessionContext.getStore()?.timeZone || 'UTC',
  locale: () => sessionContext.getStore()?.locale || 'en-US'
});

// In request handlers, instantiate Tempo without manual option boilerplate:
app.get('/api/report', (req, res) => {
  sessionContext.run({ tenantId: 'tenant-123', timeZone: 'America/Chicago', locale: 'en-US' }, () => {
    const t = new Tempo(); // Automatically resolves to 'America/Chicago'
    res.json({ formatted: t.format('{mon} {dd}, {yyyy}') });
  });
});
```

### Determinism and Immutability Guarantees

When a `Tempo` instance is constructed:
1. All functional suppliers (`timeZone`, `locale`, `calendar`, `sphere`) are **evaluated synchronously** at the moment of instantiation.
2. The resolved scalar values are locked into the instance's immutable `Temporal.ZonedDateTime` engine and `#state` record.
3. The instance is **strictly frozen** (`Object.freeze`).

> [!NOTE]
> **Zero Configuration Drift**: Because suppliers are resolved at creation time into an immutable snapshot, an existing `Tempo` instance will never drift or become out-of-sync if external session state changes later in the request lifecycle. Subsequent `new Tempo()` or plugin calls will cleanly evaluate contemporary session state anew.

---

## 5. Advanced Parsing Rules

Beyond basic settings, Tempo's parsing engine can be extended with custom rules and behaviors to handle specialized natural language or high-volume processing requirements.

### 📅 5.1 Custom Events and Periods

You can extend Tempo's intelligence by supplying custom **Events** (date aliases) and **Periods** (time aliases) at any global configuration tier.


```javascript
Tempo.init({
  registry: {
    events: {
      'launch date': '2026-05-20',
      'deadline': function () { return this.add({ days: 30 }) }
    },
    periods: {
      'tea time': '15:00',
      'mid[ -]?after[ -]?noon': '16:00',  // regex-like key for 'mid after noon' or 'mid-after-noon' etc
    }
  }
})

const delivery = new Tempo('deadline'); // Parsed using your custom logic, adds 30-days to current-date
```

### ⚡ 5.2 Deferring Initialization (`mode: 'defer'`)

By default (`mode: 'auto'`), Tempo uses the **Master Guard** to determine if a string can be lazily evaluated. For exceptionally high-volume scenarios where you may be creating thousands of Tempo instances but only using them for calculations (not formats or Terms), you can force a standard lazy behavior using `mode: 'defer'`.

When `mode: 'defer'` is set, the registry-discovery logic is deferred until the first time you access a property on `t.fmt` or `t.term`.

```javascript
// Optimized for mass-creation
const t = new Tempo('now', { mode: 'defer' });

console.log(t.format('{yyyy}')); // Discovery triggers NOW, only once.
```

When initialized this way, no registries are built upfront. The constructor returns in `O(1)` time.

::: tip
**Zero-Cost Constructor**: Combining the **Master Guard** (automatic) and the **`defer`** mode allows Tempo to satisfy the "Zero-Cost Constructor" requirement for mass-processing applications.
:::


### 🧹 5.3 Noise Word Filtering (`ignore`)

Tempo allows you to specify "noise words" that should be ignored during natural language parsing. This is particularly useful for handling human-readable strings that contain connectors or filler words.

By default, Tempo ignores the word **"at"** (e.g., `"Friday at 3pm"` becomes `"Friday 3pm"` internally).

```javascript
// Extend globally via Tempo.init()
// This adds 'the' and 'o-clock' to the existing default list (['at'])
Tempo.init({ registry: { ignores: ['the', 'o-clock'] } });

// Use in a specific instance via the Tempo constructor (new Tempo(...))
// This instance will ignore 'at', 'the', and 'o-clock'
const t = new Tempo('next Friday at 3 o-clock', { 
  registry: { ignores: 'o-clock' }
}); 

console.log(t.toString()); // Resolved correctly (noise words stripped)
```

::: tip
**Registry Structure**: The `ignore` registry accepts a **String** or an **Array** of strings. These are converted to a high-performance internal format to support efficient prototype-based shadowing. Note that values provided via `Tempo.init()` or the `new Tempo()` constructor **merge** with the default ignore list rather than replacing it.
:::


---

### 🚀 5.4 Parse Planner & Pre-filtering

For high-performance applications, you can enable the **Parse Planner** to optimize the pattern-matching loop. 

#### `planner.preFilter` (Boolean)
When enabled, Tempo performs a fast upfront classification of the input string (detecting digits, letters, colons, etc.) and skips layouts that cannot possibly match.

- **Purely numeric inputs**: Skips `event`, `period`, `wkd`, and `rel` layouts.
- **Alpha-only inputs**: Skips time-heavy layouts like `hms` or `off`.
- **Colon detected**: Prioritizes time-based layouts (`tm`, `dtm`) to find a match faster.

```javascript
Tempo.init({ 
  planner: { preFilter: true } 
});
```

#### `planner.layoutOrder` (Array)
You can manually define the order in which layouts are attempted. This is useful if you know your data primarily uses a specific format (e.g., ISO dates) and want to avoid checking other layouts first.

```javascript
Tempo.init({ 
  planner: { layoutOrder: ['ymd', 'dt', 'tm', 'rel'] } 
});
```

::: tip
**Observability**: Set `debug: 'debug'` along with `planner.preFilter` to see a detailed "Planner summary" in the console, showing how many layouts were skipped for a given input.
:::

---

## 📊 Summary of Tiers

| Tier | Precedence | Best For... |
| :--- | :--- | :--- |
| **Defaults** | 🐚 Baseline | Out-of-the-box reasonable settings. |
| **Persistence**| 🏅 Low (Default) | Sticky user preferences (merges into baseline). |
| **Discovery** | 🥉 Medium | Micro-frontends and third-party integrations. |
| **Global Init** | 🥈 High | Standard baseline for the whole application. |
| **Instance** | 🥇 Highest | Ad-hoc overrides for specific calculations. |

::: tip
**Observability**: When `debug: 'debug'` is set, Tempo logs its discovery path to the console (e.g., "Global Discovery found via Symbol"), making it easy to trace exactly where a setting originated.
:::

::: info
**Hidden Keys**: The `tempo.config` getter excludes internal properties like `anchor` and input-only properties like `value` to keep the public API clean. These properties are still used internally for relative date resolution and instance hydration.
:::

