# 🛠️ Tempo Prototype Extension Mixins (`src/plugin/extend/`)

This directory contains **opt-in prototype extension mixins** that augment `Tempo.prototype` and TypeScript's `interface Tempo` declaration merging.

---

## 🚫 Why Barrel (`index.ts`) Files are Omitted

Mixins in this directory perform **module-level side effects** when loaded (e.g. assigning methods to `Tempo.prototype`). 

To preserve strict tree-shaking and prevent accidental side-effect execution across the codebase, **barrel index files (`index.ts`) are intentionally omitted** from this directory. Importing a barrel file would eagerly load all mixins and mutate the prototype for consumers who did not request those extensions.

---

## 📦 How to Import Mixins

Always import mixins via explicit subpath imports:

```typescript
// Explicitly opt into the recurrence mixin (patches Tempo.prototype.nextOccurrence)
import '#tempo/plugin/extend/extend.recurrence.js';

// Or in external consumption:
import '@magmacomputing/tempo/extend/recurrence';
```

---

## ✍️ How to Author a Prototype Mixin

When creating a new mixin in this directory:

1. **Augment the TypeScript `Tempo` interface**:
   ```typescript
   declare module '../../tempo.class.js' {
     interface Tempo {
       myCustomMethod(arg: string): Tempo;
     }
   }
   ```

2. **Assign the implementation to `Tempo.prototype`**:
   ```typescript
   Tempo.prototype.myCustomMethod = function (this: Tempo, arg: string): Tempo {
     // Implementation...
     return this;
   };
   ```

3. **Avoid top-level barrel exports** so the mixin remains strictly opt-in via subpath import.
