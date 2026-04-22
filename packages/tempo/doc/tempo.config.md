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

## 🔒 Registry Protection (Soft Freeze)

- **Read-Only Proxy**: Core registries (`TIMEZONE`, `FORMAT`, etc.) are returned as read-only proxies. Any attempt to directly assign to them will fail.
- **Controlled Extension**: To update a registry, you must use `Tempo.extend()` or `Tempo.init()`. This ensures internal caches (like the Master Guard regex) are synchronized.
- **Atomic Updates**: Multiple extensions are batched, ensuring that the parsing engine is only rebuilt once per change.

This strategy prevents accidental state corruption while maintaining the flexible, extensible nature of the library.

---

## 1. Persistent Configuration (`$Tempo`)

The first layer Tempo checks after its own internal defaults is persistent storage. This is ideal for "sticky" settings like a user's preferred timezone or locale that should persist across sessions without a database.

```javascript
// Write a preference to localStorage under the default key ('$Tempo')
Tempo.writeStore({ timeZone:'Australia/Sydney' });
// Write a preference to localStorage under the key 'userSettings'
Tempo.writeStore({ timeZone: 'America/New_York' }, 'userSettings');

// On the next page load or session, Tempo will use the default store ('$Tempo') automatically
// or to apply a different store on the next page load or session, initialize with that store:
Tempo.init({ store: 'userSettings' });
```

---

## 2. Global Discovery

To facilitate configuration in micro-frontend architectures or when using a `<script>` tag, Tempo automatically "discovers" a global configuration object before any instances are created.

### Using a Static Method (Recommended)
This is the most secure and ergonomic method to provide configuration, and is compatible with ESM hoisting.

```javascript
import { Tempo } from '@magmacomputing/tempo';

Tempo.extend({
   options: { timeZone: 'Europe/Paris' },
   timeZones: { 'MYTZ': 'Asia/Dubai' },
   formats: { 'myFormat': '{dd}!!{mm}!!{yyyy}' },
   terms: [ myCustomTermPlugin ]
 });
```

### Discovery Contract
Tempo looks for the following structure:

| Property | Type | Description |
| :--- | :--- | :--- |
| `options` | `Options \| (() => Options)` | Configuration options merged into global state. |
| `plugin` | `Plugin \| Plugin[]` | Modular plugin to be extended onto Tempo automatically. |
| `terms` | `TermPlugin \| TermPlugin[]` | Custom term plugin to be registered. |
| `timeZones` | `Record<string, string>` | Custom timezone aliases to be merged. |
| `formats` | `Record<string, string>` | Custom format strings to be merged into `Tempo.FORMAT`. |

---

## 3. Explicit Initialization (`Tempo.init`)

This is the **Standard Developer Tier**. Most applications should call `Tempo.init()` during startup to establish a predictable baseline for all instances.

```javascript
import { Tempo } from '@magmacomputing/tempo';

Tempo.init({
  timeZone: 'Australia/Sydney',
  locale: 'en-AU',
  pivot: 80,
  debug: false
});
```

### Available Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `timeZone` | `string` | System Zone | Default IANA time zone or alias. |
| `locale` | `string` | System Locale | Default BCP 47 language tag. |
| `calendar` | `string` | `'iso8601'` | Default calendar system. |
| `pivot` | `number` | `75` | Cutoff for parsing two-digit years. |
| `timeStamp`| `'ms' \| 'ns'` | `'ms'` | Precision for timestamps. |
| `sphere` | `'north' \| 'south'`| Auto-inferred | Hemisphere for seasonal plugins. |
| `rtfFormat` | `Intl.RTF` | `undefined` | Pre-configured relative time formatter. |
| `rtfStyle` | `'long' \| 'short' \| 'narrow'` | `'narrow'` | Default style for relative time formatting. |
| `debug` | `boolean` | `false` | Enables internal log tracking using context-aware Symbols. |
| `catch` | `boolean` | `false` | If true, invalid inputs return a Void instance instead of throwing. |
| `mode` | `'auto' \| 'strict' \| 'defer'` | `'auto'` | Controls the hydration strategy (e.g., `defer` for Zero-Cost creation). |
| `silent` | `boolean` | `false` | Suppresses console output. Combined with `catch: true` for silent failover. |
| `ignore` | `string \| string[]` | `['at']` | List of noise words to be stripped before parsing. |

---

## 4. Instance-Level Overrides

The final layer of precedence is the constructor itself. You can override *any* global setting for a specific calculation without affecting the rest of your application.

```javascript
// This instance uses UTC regardless of any global configuration
const t = new Tempo('now', { timeZone: 'UTC' });
```

---

## 5. Advanced Parsing Rules

Beyond basic settings, Tempo's parsing engine can be extended with custom rules and behaviors to handle specialized natural language or high-volume processing requirements.

### 📅 5.1 Custom Events and Periods

You can extend Tempo's intelligence by supplying custom **Events** (date aliases) and **Periods** (time aliases) at any global configuration tier.


```javascript
Tempo.init({
  event: {
    'launch date': '2026-05-20',
    'deadline': function () { return this.add({ days: 30 }) }
  },
  period: {
    'tea time': '15:00',
    'mid[ -]?after[ -]?noon': '16:00',  // regex-like key for 'mid after noon' or 'mid-after-noon' etc
  }
})

const delivery = new Tempo('deadline'); // Parsed using your custom logic
```

### ⚡ 5.2 Deferring Initialization (`mode: 'defer'`)

By default (`mode: 'auto'`), Tempo uses the **Master Guard** to determine if a string can be lazily evaluated. For exceptionally high-volume scenarios where you may be creating thousands of Tempo instances but only using them for calculations (not formatting or terms), you can force a standard lazy behavior using `mode: 'defer'`.

When `mode: 'defer'` is set, the registry-discovery logic is deferred until the first time you access a property on `t.fmt` or `t.term`.

```javascript
// Optimized for mass-creation
const t = new Tempo('now', { mode: 'defer' });

console.log(t.format('{yyyy}')); // Discovery triggers NOW, only once.
```

When initialized this way, no registries are built upfront. The constructor returns in $O(1)$ time.

> [!TIP]
> **Zero-Cost Constructor**: Combining the **Master Guard** (automatic) and the **`defer`** mode allows Tempo to satisfy the "Zero-Cost Constructor" requirement for mass-processing applications.


### 🧹 5.3 Noise Word Filtering (`ignore`)

Tempo allows you to specify "noise words" that should be ignored during natural language parsing. This is particularly useful for handling human-readable strings that contain connectors or filler words.

By default, Tempo ignores the word **"at"** (e.g., `"Friday at 3pm"` becomes `"Friday 3pm"` internally).

```javascript
// Extend globally via Tempo.init()
// This adds 'the' and 'o-clock' to the existing default list (['at'])
Tempo.init({ ignore: ['the', 'o-clock'] });

// Use in a specific instance via the Tempo constructor (new Tempo(...))
// This instance will ignore 'at', 'the', and 'o-clock'
const t = new Tempo('next Friday at 3 o-clock', { 
  ignore: 'o-clock' 
}); 

console.log(t.toString()); // Resolved correctly (noise words stripped)
```

> [!TIP]
> **Registry Structure**: The `ignore` registry accepts a **String** or an **Array** of strings. These are converted to a high-performance internal format to support efficient prototype-based shadowing. Note that values provided via `Tempo.init()` or the `new Tempo()` constructor **merge** with the default ignore list rather than replacing it.


---

## 📊 Summary of Tiers

| Tier | Precedence | Best For... |
| :--- | :--- | :--- |
| **Defaults** | 🐚 Baseline | Out-of-the-box reasonable settings. |
| **Persistence**| 🏅 Low (Default) | Sticky user preferences (merges into baseline). |
| **Discovery** | 🥉 Medium | Micro-frontends and third-party integrations. |
| **Global Init** | 🥈 High | Standard baseline for the whole application. |
| **Instance** | 🥇 Highest | Ad-hoc overrides for specific calculations. |

> [!TIP]
> **Observability**: When `debug: true` is set, Tempo logs its discovery path to the console (e.g., "Global Discovery found via Symbol"), making it easy to trace exactly where a setting originated.

> [!NOTE]
> **Hidden Keys**: The `tempo.config` getter excludes internal properties like `anchor` and input-only properties like `value` to keep the public API clean. These properties are still used internally for relative date resolution and instance hydration.

---

## 📅 TIMEZONE Registry
Tempo includes a built-in registry of common timezone abbreviations. These are stored in the `TIMEZONE` export.

| Alias | IANA Identifier |
| :--- | :--- |
| `utc` | `UTC` |
| `gmt` | `Europe/London` |
| `est` | `America/New_York` |
| `cst` | `America/Chicago` |
| `mst` | `America/Denver` |
| `pst` | `America/Los_Angeles` |
| `aest` | `Australia/Sydney` |
| `acst` | `Australia/Adelaide` |
| `awst` | `Australia/Perth` |
| `nzt` | `Pacific/Auckland` |
| `cet` | `Europe/Paris` |
| `eet` | `Europe/Helsinki` |
| `ist` | `Asia/Kolkata` |
| `npt` | `Asia/Kathmandu` |
| `jst` | `Asia/Tokyo` |

> [!TIP]
> You can extend this list or override existing aliases using `Tempo.extend({ timeZones: { ... } })`.
