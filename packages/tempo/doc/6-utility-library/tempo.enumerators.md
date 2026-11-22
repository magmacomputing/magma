# Tempo Enumerators (`Enum.from`)

Tempo uses `Enum.from` to define enumerations rather than relying on native TypeScript `enum`s. This gives consumers of the library access to a robust set of iteration and lookup methods out-of-the-box.

This guide explains how they are defined, how you use them as a consumer of the `Tempo` library, and why this design pattern was chosen.

## 1. How Tempo Enums are Defined

Tempo's core enumerators (like Weekdays, Months, Seasons) are built using `Enum.from`.

Under the hood, `Enum.from` returns a **`Proxy`-wrapped, frozen object based on a null-prototype**:
1. **Null-Prototype Root (`Object.create(null)`):** The base prototype is completely detached from `Object.prototype`. Standard prototype properties like `toString`, `valueOf`, `constructor`, or `hasOwnProperty` do not exist on the object, eliminating key collision and prototype pollution risks.
2. **Strict Runtime Immutability:** The object is locked down with `Object.freeze()` and wrapped in a read-only `Proxy` that rejects writes, deletions, or runtime property additions.
3. **Prototypal Extensibility:** Even though each enum's top-level properties are read-only and immutable, enums remain extensible through JavaScript prototypal inheritance via `Enum.extend()`.

### Array-based Definitions
When you pass an array to `Enum.from`, the strings become the **keys**, and the **values** are their zero-indexed positions:

```typescript
export const STATUS = Enum.from(['Active', 'Inactive', 'Pending']);
// Result: { Active: 0, Inactive: 1, Pending: 2 }
```

### Object-based Definitions
When you need explicit values (such as 1-based calendar indices or custom string mappings), you pass an object literal directly:

```typescript
export const WEEKDAY = Enum.from({
	Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7
});

export const SEASON = Enum.from({ Summer: 'summer', Autumn: 'autumn', Winter: 'winter', Spring: 'spring' });
```

### Lock-Down Flag (`frozen`)
Both `Enum.from(source, frozen = true)` and `Enum.extend(base, source, frozen = true)` accept an optional `frozen` boolean:
- **`true` (default):** Freezes the top-level target with `Object.freeze()` and wraps it in a read-only `Proxy` that rejects writes, deletions, and extensions (note: `deepFreeze` skips targets carrying the `Enumify` tag, so nested object values remain mutable through existing external references).
- **`false`:** Leaves the underlying target object unfrozen/extensible while the returned `Proxy` wrapper still enforces read-only access for consumers.

### Type Inference
After defining an `Enum` object, simple TypeScript helper aliases pull out the types so you can use them reliably in function signatures:

```typescript
export type SEASON = ValueOf<typeof SEASON>; // Type: 'summer' | 'autumn' | 'winter' | 'spring'
export type Season = KeyOf<typeof SEASON>;   // Type: 'Summer' | 'Autumn' | 'Winter' | 'Spring'
```
The above types allow for the use of `Season` and `SEASON` to type function parameters, variables, and return types.

When calling `Enum.*` reflection helpers (`Enum.has()`, `Enum.hasOwn()`, `Enum.get()`, `Enum.includes()`, `Enum.keyOf()`), rely on TypeScript inference or pass `typeof SEASON` as the generic argument rather than `KeyOf` or `ValueOf`.

**Note:** TypeScript provides automatic typing for native `enum`s, whereas `Enum.from` uses `KeyOf` / `ValueOf` type helpers.

## 2. Using Enums Outside of Tempo

For consumers of the library, these enumerations are exposed via **public package exports**:

- As static properties on `Tempo` (convenient in app code already using `Tempo`)
- As the default export from `@magmacomputing/tempo/enums`
- As individual named exports from `@magmacomputing/tempo/enums`

Avoid referencing internal source files (such as `tempo.index.ts`) in application code.

### 1. Static Properties on `Tempo`
You can access all enums via the unified `Tempo.enums` getter, or use top-level getters for core calendar and direction enums (`WEEKDAY`, `WEEKDAYS`, `MONTH`, `MONTHS`, `DURATION`, `DURATIONS`, `SEASON`, `COMPASS`):

```typescript
import { Tempo } from '@magmacomputing/tempo';

// Core domain enums directly on Tempo:
const direction = Tempo.COMPASS.North; // 'north'
const monthIndex = Tempo.MONTH.Feb;    // 2 (1-based calendar index)

// All enums via the unified Tempo.enums accessor:
const first = Tempo.enums.ORDINAL.first; // 1
const dateFormat = Tempo.enums.FORMAT.date;
```

### 2. Canonical Namespace Import
Import the full `enums` object via the default export:

```typescript
import enums from '@magmacomputing/tempo/enums';

const { COMPASS, MONTH } = enums;
const direction = COMPASS.North;
const monthIndex = MONTH.Feb;
```

### 3. Direct Named Import
Import individual enumerators directly:

```typescript
import { COMPASS, MONTH, WEEKDAY, ORDINAL, Enum } from '@magmacomputing/tempo/enums';

console.log('compass keys: ', Enum.keys(COMPASS));
```

### Static-First Reflection Suite (`Enum.*`)

In modern Tempo, enum reflection is performed using the **`Enum.*` static helper suite**, mirroring ECMAScript's standard `Object.hasOwn` and `Object.keys`:

```typescript
import { Enum } from '@magmacomputing/tempo/enums';
// or: import { Enum } from '@magmacomputing/tempo/library';

// Iterating over properties (Type-safe & collision-proof)
const days = Enum.keys(Tempo.WEEKDAY);                  // readonly ('Mon' | 'Tue' | 'Wed' | ...)[]
const values = Enum.values(Tempo.WEEKDAY);              // readonly (1 | 2 | 3 | ...)[]
const entries = Enum.entries(Tempo.WEEKDAY);            // readonly (readonly [key, value])[]
const count = Enum.count(Tempo.WEEKDAY);                // 7

// Validation
if (Enum.has(Tempo.SEASON, 'Spring')) { ... }           // true if 'Spring' is a key
if (Enum.hasOwn(Tempo.SEASON, 'Spring')) { ... }        // true if 'Spring' is a direct own key
if (Enum.includes(Tempo.SEASON, 'spring')) { ... }      // true if 'spring' is a value

// Reverse lookups! Get the Key Name from the Value
const keyName = Enum.keyOf(Tempo.MONTH, 2);             // 'Feb'

// Inversion & Aliasing support (last-key-wins)
const byCode = Enum.invert(Tempo.SEASON);               // { summer: 'Summer', ... }

// Native iteration
for (const [key, val] of Tempo.WEEKDAY) {
  console.log(key, val);
}
```

## 3. Creating Custom Enums

You can utilize the same `Enum.from` engine for your own application logic by importing `Enum` from the library subpath. This is particularly useful for maintaining consistent data patterns and iteration capabilities throughout your project.

### Basic Custom Enum

```typescript
import { Enum } from '@magmacomputing/tempo/library';

// 1. Define your Enum
export const STATUS = Enum.from(['Pending', 'Active', 'Resolved', 'Archived']);

// 2. Use the static reflection helpers
const allKeys = Enum.keys(STATUS);           // ['Pending', 'Active', 'Resolved', 'Archived']
const isActive = Enum.has(STATUS, 'Active'); // true
const value = STATUS.Resolved;               // 2
```

### Deriving Enums via Prototypal Inheritance (`Enum.extend()`)

A standout capability of Tempo's `Enum` is that instances are **immutable yet extendable**.

Developers typically assume that freezing an object (`Object.freeze`) prevents adding fields. However, `Enum.extend()` achieves non-destructive extensibility through JavaScript prototype delegation:

```typescript
import { Enum } from '@magmacomputing/tempo/library';

// Base enum (frozen and immutable)
export const BASE_ROLE = Enum.from(['Viewer', 'Editor']);

// Derive new enum with additional roles
export const ADMIN_ROLE = Enum.extend(BASE_ROLE, { Admin: 2, SuperAdmin: 3 });

console.log(Enum.keys(ADMIN_ROLE));             // ['Viewer', 'Editor', 'Admin', 'SuperAdmin']
console.log(Enum.count(ADMIN_ROLE));            // 4
console.log(Enum.has(ADMIN_ROLE, 'Viewer'));    // true (inherited from BASE_ROLE)
console.log(Enum.hasOwn(ADMIN_ROLE, 'Viewer')); // false (inherited, not an own property)
console.log(Enum.hasOwn(ADMIN_ROLE, 'Admin'));  // true (direct own property on ADMIN_ROLE)
```

#### How Prototypal Inheritance Works Here:
- **Zero Mutation on Parent:** `BASE_ROLE` remains untouched and completely immutable. Existing code relying on `BASE_ROLE` is guaranteed never to see unwanted keys.
- **Prototype Delegation (`Object.create(this)`):** Calling `Enum.extend(parent, entries)` creates a new frozen child enum whose prototype is the parent enum. The child inherits all parent keys and values.
- **Stealth Traversal:** Reflection helpers like `Enum.keys()`, `Enum.values()`, `Enum.entries()`, `Enum.count()`, and even `JSON.stringify()` seamlessly traverse the prototype chain to treat the extended enum as a unified collection.
- **Key Shadowing:** Child enums can cleanly shadow inherited keys with new values without polluting the ancestor.
- **Multi-tier Hierarchies:** Enums can be extended multiple times (`BASE → TENANT → USER`) while keeping each level individually sealed and safe.

### Merging Enums into a Flat Registry (`Enum.merge()`)

When you want to combine multiple enums, plain objects, or string arrays into a single flat `Enum` without a prototype chain, use `Enum.merge(...sources)`:

```typescript
import { Enum } from '@magmacomputing/tempo/library';

const BASE_TAGS = Enum.from(['core', 'date']);
const PLUGIN_TAGS = Enum.from({ date: 10, astro: 20 });

// Flattened left-to-right; later sources override earlier keys
const ALL_TAGS = Enum.merge(BASE_TAGS, PLUGIN_TAGS, { custom: 30 });

console.log(Enum.entries(ALL_TAGS)); // [['core', 0], ['date', 10], ['astro', 20], ['custom', 30]]
console.log(Enum.isEnum(ALL_TAGS));  // true (frozen Proxy-wrapped Enum)
```

### `Enum.merge()` vs. `Enum.extend()`

| Feature | `Enum.merge(...sources)` | `Enum.extend(base, entries, frozen?)` |
| --- | --- | --- |
| **Structure** | Single flat `Enum` (all own properties) | Prototype-chained `Enum` (`child → parent`) |
| **Lookup Speed** | Direct `O(1)` own-property lookup | Walks prototype chain for inherited keys |
| **`Enum.hasOwn()`** | `true` for all merged keys | `true` only for keys added in that layer |
| **Precedence** | Last-source-wins by exact key; string keys preserve insertion order, while integer-like keys enumerate in ascending numeric order | Exact-key shadows resolve child → parent; `Enum.entries()` enumerates ancestor keys first (prototype-walking lookups such as `registry.numbers` inspect child → parent directly) |
| **Memory on Chain** | Copies entries into a new flat object | Allocates only the delta properties |
| **`frozen` Flag** | Always `true` | Configurable (`true` by default) |

**Rule of thumb:** Prefer **`Enum.merge()`** for combining independent or flat configuration dictionaries (e.g., `formats`, `locales`, `tokens`, `dialects`). Prefer **`Enum.extend()`** when you need hierarchical overrides, `Enum.hasOwn()` layer distinction, or incremental chaining over a large base enum.

## 4. How They Are Used Inside Tempo

Internally, the `Tempo` logic relies heavily on these enumerators. This gives the parsing and formatting engines guaranteed type-safety and robust lookup dictionaries.

For instance, the `.format()` logic can map tokens efficiently, and parser configuration (e.g., regex `Snippet` mapping) loops through them safely without manually declaring `Object.keys()` combinations everywhere.

The overarching design ensures the library stays strongly typed, internally consistent, and protected against accidental runtime mutation via `Object.freeze()`.

## 5. Tempo `Enum` vs. TypeScript `enum` (The Trade-Offs)

TypeScript's native `enum` is one of the few TS features that generates structural runtime JavaScript, and it has known friction points in the JavaScript community.

Using Tempo's `Enum` is a deliberate choice for high-quality library design.

### The Wins for Tempo `Enum`
* **Rich Static API:** Native TS enums are plain JavaScript objects at runtime. To get the keys, you must write `Object.keys(MyEnum)`. The `Enum` reflection suite gives developers `Enum.keys()`, `Enum.values()`, `Enum.has()`, `Enum.includes()`, `Enum.invert()`, `Enum.count()`, and native iteration (`[Symbol.iterator]`).
* **Clean Namespace (Null-Prototype):** Native enums and plain objects inherit from `Object.prototype`, creating potential collisions with keys like `toString`, `valueOf`, or `constructor`. Tempo `Enum`s use a `null` prototype, keeping the namespace completely unpolluted.
* **Prototypal Extensibility & Merging (`Enum.extend()` / `Enum.merge()`):** TypeScript native enums cannot be extended, inherited, or composed. Tempo `Enum`s can inherit from base enums via `Enum.extend()` or be combined via `Enum.merge()` without mutating the source enums.
* **Predictable Serialization:** TypeScript numeric enums generate strange "reverse mappings" in compiled JS (e.g., `{ 0: "Up", "Up": 0 }`). This makes iterating over them or stringifying them to JSON very messy. Tempo `Enum` objects serialize cleanly and safely.
* **Immutability:** `Enum.from` freezes the object at runtime (`Object.freeze`) and seals it with a `Proxy`. Standard TS enums can technically be mutated at runtime by malicious or sloppy ES code.
* **NodeJS/ESM Compatibility:** Standard TS enums can cause friction with isolated module compilers (like Vite or esbuild) or when importing into vanilla JS. `Enum.from` generates 100% standard ES2015 JavaScript.

### The Losses (Trade-offs) for Tempo `Enum`
* **Slightly More Boilerplate Definition:** Defining an `Enum` dictionary takes 2–3 lines of code (exporting the const, then exporting the `type` alias). TS native enums do both (value and type) as part of the `enum` keyword.
* **Missing Nominal Typing:** TypeScript native enums offer "nominal" typing (e.g., `enum A { X }` cannot be passed to a function expecting `enum B { X }` even if the keys/structures match). Tempo `Enum`s rely on structural typing (union of literals), meaning TypeScript allows passing the raw string `'spring'` into a function rather than forcing you to strictly use `Tempo.SEASON.Spring`.
* **Slight Runtime Overhead:** Instantiating the proxy/prototype wrapper and freezing it adds a microscopic runtime cost compared to evaluating a plain object literal, though parsing the library is typically a one-time engine cost.
* **Explicit Object Values:** While `Enum.from(['A', 'B'])` auto-indexes from `0`, object-based definitions require explicit values for each key (unlike TS numeric enums that auto-increment from a starting number).
