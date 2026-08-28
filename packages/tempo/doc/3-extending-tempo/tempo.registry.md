# Registries and Dictionaries

Tempo uses internal dictionaries—called **Registries**—to map string keys to values, functions, or formats. This is how Tempo resolves timezone abbreviations like `EST`, parses custom month layouts, and translates numbers to words.

By standardizing these data stores under the `registry` namespace, you can deeply customize how Tempo parses, formats, and understands regional values.

## Accessing Registries

You can access active registries using the static `Tempo.registry` getter. These objects are **Read-Only Proxies**.

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

Tempo includes a built-in registry of common timezone abbreviations. **Most regional aliases map to DST-aware regional IANA zones, not fixed UTC offsets.** For example, both `est` and `edt` map to `America/New_York`, which means dates parsed during summer months will automatically adjust to Eastern Daylight Time (`-04:00`), whereas `gmt` and `utc` map to fixed `UTC` (`+00:00`). If your application requires a constant, non-shifting offset year-round (e.g. strict UTC-5 without Daylight Saving adjustments), use an explicit fixed offset like `"-05:00"` or `'Etc/GMT+5'` instead of a regional abbreviation.

| Alias | IANA Identifier |
| :--- | :--- |
| `utc`/ `gmt` | `UTC` |
| `est` / `edt` | `America/New_York` |
| `cst` / `cdt` | `America/Chicago` |
| `mst` / `mdt` | `America/Denver` |
| `pst` / `pdt` | `America/Los_Angeles` |
| `aest` / `aedt` | `Australia/Sydney` |
| `acst` / `acdt` | `Australia/Adelaide` |
| `awst` | `Australia/Perth` |
| `nzt` / `nzst` / `nzdt` | `Pacific/Auckland` |
| `cet` / `cest` | `Europe/Paris` |
| `eet` / `eest` | `Europe/Helsinki` |
| `ist` | `Asia/Kolkata` |
| `npt` | `Asia/Kathmandu` |
| `jst` | `Asia/Tokyo` |

::: tip
You can extend this list or override existing aliases using `Tempo.extend({ registry: { timeZones: { ... } } })`.
:::

---

## Other Internal Registries

Tempo leverages several other internal data dictionaries to parse and format dates. The `formats` and `locales` dictionaries are organized under the `registry` configuration namespace. 

- **Formats**: Named format aliases used by the `format()` engine.
- **Locales**: Translation dictionaries used by the `:locale` format modifier.
- **Events**: Custom aliases mapped to specific dates.
- **Periods**: Custom aliases mapped to specific times.
- **Snippets**: Reusable Regex patterns mapped to variables for parsing.
- **Layouts**: Composed string patterns mapped to Regex logic for parsing.
- **Numbers**: Word-to-number dictionaries (e.g., `"one" -> 1`).

*(Note: All dictionaries are consolidated into the `registry` namespace to separate data from behavior.)*

### Registry Merge Contracts

The core internal `registryUpdate()` utility applies an **additive-only** merge strategy. It deeply merges new keys into the registries but safely preserves existing root keys (preventing accidental overrides of built-in definitions).

When you pass an options object to `Tempo.extend()`, it acts differently depending on the data type:
- **Enum/Proxy-Backed Registries:** For explicitly wrapped structures (like `formats` and `locales`), `Tempo.extend()` can be used to forcefully shadow existing entries, making it the proper tool to change standard behaviors.
- **General Registries:** It does not provide a blanket, universal overwrite mechanism for the entire registry system.
