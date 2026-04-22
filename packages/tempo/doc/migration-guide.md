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

Tempo v2.4.0 introduces a new `discrete/` folder for standalone utilities (`parse` and `format`).

### 🛠️ Standalone Imports
You can now import lightweight, tree-shakable versions of our parsing and formatting engines without the `Tempo` class:
```javascript
import { parse } from '@magmacomputing/tempo/parse';
import { format } from '@magmacomputing/tempo/format';
```

### ⚠️ Deprecated Paths
We have reorganized the internal file structure to optimize for standalone usage. The following internal paths are now **deprecated** and will be removed in a future release:

*   ❌ `@magmacomputing/tempo/module/parse`
*   ❌ `@magmacomputing/tempo/module/format`

**Action Required**:
1.  **Do not use `dist/` paths** in your imports. These are unstable and may change.
2.  **Use package subpath maps**: Update your imports to use the official entry points:
    *   ✅ `@magmacomputing/tempo/parse`
    *   ✅ `@magmacomputing/tempo/format`
3.  **Check your Import Maps**: If you use browser-side import maps, ensure they point to the new package-mapped locations rather than internal `plugin/module/` paths.

## 🧪 Testing and Stability
v2.x has been hardened with a 100% pass rate on our regression suite. If you were relying on undocumented "quirks" or bugs in v1.x parsing, you may find that v2.x is more strict and deterministic.
