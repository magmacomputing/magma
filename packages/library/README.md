# <img src="https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/library-logo.svg" width="48" height="48" style="vertical-align:middle; display:inline-block; margin-right:8px;" alt="Tempo Library Logo" /> Magma Library (Internal Reference)

> [!NOTE]
> **Internal Reference Package**: `packages/library` is an internal monorepo utility suite used across Tempo packages. It is **not** published as a standalone package on npm, and is provided in the documentation as a reference guide for internal architectural utilities and shared routines.

**Magma Library** provides platform-agnostic utilities for type-safe development, data manipulation, and asynchronous operations across Browser and Node.js environments.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript Ready](https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Native ESM](https://img.shields.io/badge/Native-ESM-green)](https://nodejs.org/api/esm.html)

---

## 🚀 Key Modules

The library is organized into specialized modules, each designed for maximum efficiency and tree-shakability.

| Module | Description |
| :--- | :--- |
| **Type System** | Advanced runtime type detection (`getType`), strict type-guards, and complex TS utility types. |
| **Array** | Sorted insertion, multi-key sorting, grouping (`byKey`), and cartesian products. |
| **String** | Proper-casing, pluralization helpers, sprintf-style formatting, and template evaluation. |
| **Serialization** | JSON-compatible stabilization with deep support for **Temporal**, **BigInt**, and custom Classes. |
| **Cipher** | Simple, secure class-based encryption and decryption wrappers. |
| **Pledge** | A robust wrapper for native Promises with settled-state tracking and timeout support. |
| **Reflection** | Clean access to own-properties, values, and entries without prototype pollution. |
| **Temporal** | Lightweight helpers and polyfill integration for the native `Temporal` API. |
| **Recurrence** | Zero-dependency RFC 5545 recurrence rule parsing, expansion, and finiteness evaluation. |

---

## ✨ Quick Start

### Runtime Type Detection
The `getType` utility provides human-readable, proper-cased type names, even for custom classes that have been registered.

```typescript
import { getType, isType } from '@magmacomputing/tempo/library';

getType([]);            // "Array"
getType(new Map());     // "Map"
getType(42n);           // "BigInt"

if (isType(val, 'String', 'Number')) {
  // val is now narrowed to string | number
}
```

### Advanced Array Sorting
Sort complex collections of objects by multiple fields with ease.

```typescript
import { sortKey } from '@magmacomputing/tempo/library';

const users = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
  { name: 'Alice', age: 22 }
];

// Sort by name (ASC) then age (DESC)
const sorted = sortKey(users, 'name', { field: 'age', dir: 'desc' });
```

### Secure Serialization
Unlike standard `JSON.stringify`, Magma's serialization handles complex types like `Temporal` and `BigInt` out of the box.

```typescript
import { stringify, objectify } from '@magmacomputing/tempo/library';

const data = {
  at: Temporal.Now.instant(),
  count: 100n,
  pattern: /abc/gi
};

const json = stringify(data);
const restored = objectify(json); // Fully restored types!
```

---

## 📚 Documentation

For deep dives into specific APIs, please refer to the internal documentation:

- **Common Utilities**: [packages/library/doc/common/](./doc/common/)
- **Browser-Specific**: [packages/library/doc/browser/](./doc/browser/)
- **Server/Node.js**: [packages/library/doc/server/](./doc/server/)

---

## 💬 Contact & Support

If you have questions, need architectural consulting, or want to report a bug, please reach out to us:

- **Email**: [hello@magmacomputing.com.au](mailto:hello@magmacomputing.com.au)
- **Issues**: [GitHub Issues](https://github.com/magmacomputing/magma/issues)
- **Discussions**: [GitHub Discussions](https://github.com/magmacomputing/magma/discussions)

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

© 2026 Magma Computing.
