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

## 🧪 Testing and Stability
v2.x has been hardened with a 100% pass rate on our regression suite. If you were relying on undocumented "quirks" or bugs in v1.x parsing, you may find that v2.x is more strict and deterministic.
