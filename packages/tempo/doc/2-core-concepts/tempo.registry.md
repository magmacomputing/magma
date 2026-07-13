# Registries and Dictionaries

Tempo uses internal dictionaries—called **Registries**—to map string keys to values, functions, or formats. This is how Tempo resolves timezone abbreviations like `EST`, parses custom month layouts, and translates numbers to words.

By standardizing these data stores under the `registry` namespace, you can deeply customize how Tempo parses, formats, and understands regional values.

## Accessing Registries

In v3.1.0+, you can access active registries using the static `Tempo.registry` getter. These objects are **Read-Only Proxies**.

```javascript
import { Tempo } from '@magmacomputing/tempo';

console.log(Tempo.registry.formats);
// { '{iso}': '{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}', ... }
```

::: warning
Because these registries are frozen proxies, attempting to mutate them directly (e.g., `Tempo.registry.formats.custom = '...'`) will throw an error. This guarantees that internal caches and parser guards remain synchronized. 
:::

To add or override values, you must use `Tempo.extend()` or `Tempo.init()`:

```javascript
Tempo.extend({
  registry: {
    formats: {
      custom: '{yyyy}!!{mm}!!{dd}'
    }
  }
});
```

---

## 📅 TIMEZONE Registry

Tempo includes a built-in registry of common timezone abbreviations. **These aliases map to DST-aware regional IANA zones, not fixed UTC offsets.** For example, `gmt` maps to `Europe/London` and `est` maps to `America/New_York`, which means they will automatically adjust to British Summer Time (BST) or Eastern Daylight Time (EDT) seasonally. If your application strictly requires a literal fixed offset (e.g., standard EST year-round), you should use an appropriate fixed-offset zone instead of these regional aliases.

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

::: tip
You can extend this list or override existing aliases using `Tempo.extend({ timeZones: { ... } })`. (Note: in v4.x, this will be fully migrated to `registry.timeZones`).
:::

---

## Other Internal Registries

Tempo leverages several other internal data dictionaries to parse and format dates. As of v3.1.0, the `formats` and `locales` dictionaries have been officially moved to the `registry` configuration namespace. 

- **Formats**: Named format aliases used by the `format()` engine.
- **Locales**: Translation dictionaries used by the `:locale` format modifier.
- **Events**: Custom aliases mapped to specific dates.
- **Periods**: Custom aliases mapped to specific times.
- **Snippets**: Reusable Regex patterns mapped to variables for parsing.
- **Layouts**: Composed string patterns mapped to Regex logic for parsing.
- **Numbers**: Word-to-number dictionaries (e.g., `"one" -> 1`).

*(Note: The overarching architectural goal for v4.0.0 is to consolidate all remaining dictionaries fully into the `registry` namespace to separate data from behavior.)*

### Registry Merge Contracts

The core internal `registryUpdate()` utility applies an **additive-only** merge strategy. It deeply merges new keys into the registries but safely preserves existing root keys (preventing accidental overrides of built-in definitions).

When you pass an options object to `Tempo.extend()`, it acts differently depending on the data type:
- **Enum/Proxy-Backed Registries:** For explicitly wrapped structures (like `formats` and `locales`), `Tempo.extend()` can be used to forcefully shadow existing entries, making it the proper tool to change standard behaviors.
- **General Registries:** It does not provide a blanket, universal overwrite mechanism for the entire registry system.
