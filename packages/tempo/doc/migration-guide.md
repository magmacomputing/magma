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

- **v1.x:** Some term properties were ad-hoc on the instance.
- **v2.x:** All term logic is centralized under the `.term` property or accessible via the `#` shorthand in `.set()` and `.add()`.

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

Season term scope output has been simplified.

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
The individual `rtfFormat` and `rtfStyle` options have been consolidated into a single `relativeTime` object.
- **v2.6.x:** `new Tempo({ rtfStyle: 'long' })`
- **v2.7.x:** `new Tempo({ relativeTime: { style: 'long' } })`

### Action Required:
Only the deprecated top-level keys `rtfFormat` and `rtfStyle` are still accepted as legacy fallbacks in the current release, handled specifically in the `Tempo` class constructor for backward compatibility. 

In contrast, the old `mdyLocales` and `mdyLayouts` keys are **not** treated as aliases and will be ignored; these must be migrated to the new nested `monthDay` structure. Update your configuration to ensure compatibility with future versions and the Release-C optimization engine. Refer to the `Tempo` constructor for implementation details on legacy alias handling.

## 🧪 Testing and Stability
v2.x has been hardened with a 100% pass rate on our regression suite. If you were relying on undocumented "quirks" or bugs in v1.x parsing, you may find that v2.x is more strict and deterministic.
