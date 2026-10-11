# Tempo Enumerators (`enumify`)

Tempo uses a custom `enumify` utility to define enumerations rather than relying on native TypeScript `enum`s. This gives consumers of the library access to a robust set of iteration and lookup methods out-of-the-box.

This guide explains how they are defined, how you use them as a consumer of the `Tempo` library, and why this design pattern was chosen.

## 1. How Tempo Enums are Defined

Tempo's core enumerators (like Weekdays, Months, Seasons) are built using the exported `enumify` function. 

Under the hood, `enumify` returns a **`Proxy`-wrapped, frozen object based on a null-prototype**:
1. **Null-Prototype Root (`Object.create(null)`):** The base prototype is completely detached from `Object.prototype`. Standard prototype properties like `toString`, `valueOf`, `constructor`, or `hasOwnProperty` do not exist on the object, eliminating key collision and prototype pollution risks.
2. **Strict Runtime Immutability:** The object is locked down with `Object.freeze()` and wrapped in a read-only `Proxy` that rejects writes, deletions, or runtime property additions.
3. **Prototypal Extensibility:** Even though each enum is deeply frozen and immutable, enums remain extensible through JavaScript prototypal inheritance via `.extend()`.

### Array-based Definitions
When you pass an array to `enumify`, the strings become the **keys**, and the **values** are their zero-indexed positions:

```typescript
export const WEEKDAY = enumify(['All', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
// Result: { All: 0, Mon: 1, Tue: 2 ... }
```

### Object-based Definitions
When you need specific string-to-string mappings, you pass an object literal directly:

```typescript
export const SEASON = enumify({ Summer: 'summer', Autumn: 'autumn', Winter: 'winter', Spring: 'spring' });
```

### Type Inference
After defining the enumify object, simple TypeScript helper aliases pull out the types so you can use them reliably in function signatures:

```typescript
export type SEASON = ValueOf<typeof SEASON>; // Type: 'summer' | 'autumn' | 'winter' | 'spring'
export type Season = KeyOf<typeof SEASON>;   // Type: 'Summer' | 'Autumn' | 'Winter' | 'Spring'
```
The above types allow for the use of `Season` and `SEASON` as type arguments, providing type safety for both the keys and values of the enum.

It is generally recommended to use the **values** (lowercase) as type arguments, as they are used as the actual values in the enumify object. This allows for easier use of the enumify methods, which operate on the values.

**Note:** TypeScript provides automatic typing for native enums, but it is not the case with enumify.

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
const monthIndex = Tempo.MONTH.Feb;    // 2 (since 'All' was index 0)

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
const days = Enum.keys(Tempo.WEEKDAY);                  // readonly ('All' | 'Mon' | 'Tue' | ...)[]
const values = Enum.values(Tempo.WEEKDAY);              // readonly (0 | 1 | 2 | ...)[]
const entries = Enum.entries(Tempo.WEEKDAY);            // readonly (readonly [key, value])[]
const count = Enum.count(Tempo.WEEKDAY);                // 8

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

You can utilize the same `enumify` engine for your own application logic by importing it from the library subpath. This is particularly useful for maintaining consistent data patterns and iteration capabilities throughout your project.

### Basic Custom Enum

```typescript
import { enumify, Enum } from '@magmacomputing/tempo/library';

// 1. Define your Enum
export const STATUS = enumify(['Pending', 'Active', 'Resolved', 'Archived']);

// 2. Use the static reflection helpers
const allKeys = Enum.keys(STATUS);           // ['Pending', 'Active', 'Resolved', 'Archived']
const isActive = Enum.has(STATUS, 'Active'); // true
const value = STATUS.Resolved;               // 2
```

### Extending Enums via Prototypal Inheritance (`Enum.extend()`)

A standout capability of `enumify` is that enums are **immutable yet extendable**.

Developers typically assume that freezing an object (`Object.freeze`) prevents adding fields. However, `enumify` achieves non-destructive extensibility through JavaScript prototype delegation:

```typescript
import { enumify, Enum } from '@magmacomputing/tempo/library';

// Base enum (frozen and immutable)
export const BASE_ROLE = enumify(['Viewer', 'Editor']);

// Extend with additional roles
export const ADMIN_ROLE = Enum.extend(BASE_ROLE, ['Admin', 'SuperAdmin']);

console.log(Enum.keys(ADMIN_ROLE));             // ['Viewer', 'Editor', 'Admin', 'SuperAdmin']
console.log(Enum.count(ADMIN_ROLE));            // 4
console.log(Enum.has(ADMIN_ROLE, 'Viewer'));    // true (inherited from BASE_ROLE)
console.log(Enum.hasOwn(ADMIN_ROLE, 'Viewer')); // false (inherited, not an own property)
console.log(Enum.hasOwn(ADMIN_ROLE, 'Admin'));  // true (direct own property on ADMIN_ROLE)
```

#### How Prototypal Inheritance Works Here:
- **Zero Mutation on Parent:** `BASE_ROLE` remains untouched and completely immutable. Existing code relying on `BASE_ROLE` is guaranteed never to see unwanted keys.
- **Prototype Delegation (`Object.create(this)`):** Calling `extend()` creates a new frozen child enum whose prototype is the parent enum. The child inherits all parent keys, values, and methods.
- **Stealth Traversal:** Methods like `.keys()`, `.values()`, `.entries()`, `.count()`, and even `JSON.stringify()` seamlessly traverse the prototype chain to treat the extended enum as a unified collection.
- **Key Shadowing:** Child enums can cleanly shadow inherited keys with new values without polluting the ancestor.
- **Multi-tier Hierarchies:** Enums can be extended multiple times (`BASE -> TENANT -> USER`) while keeping each level individually sealed and safe.

## 4. How They Are Used Inside Tempo

Internally, the `Tempo` logic relies heavily on these enumerators. This gives the parsing and formatting engines guaranteed type-safety and robust lookup dictionaries.

For instance, the `.format()` logic can map tokens efficiently, and parser configuration (e.g., regex `Snippet` mapping) loops through them safely without manually declaring `Object.keys()` combinations everywhere.

The overarching design ensures the library stays strongly typed, internally consistent, and protected against accidental runtime mutation via `Object.freeze()`.

## 5. `enumify` vs. TypeScript `enum` (The Trade-Offs)

TypeScript's native `enum` is one of the few TS features that generates structural runtime JavaScript, and it has known friction points in the JavaScript community. 

Using `enumify` is a deliberate choice for high-quality library design.

### The Wins for `enumify`
* **Rich API (Methods):** Native TS enums are plain JavaScript objects at runtime. To get the keys, you must write `Object.keys(MyEnum)`. The `enumify` wrapper gives developers `.keys()`, `.values()`, `.has()`, `.includes()`, `.map()`, `.filter()`, and native iteration (`[Symbol.iterator]`).
* **Clean Namespace (Null-Prototype):** Native enums and plain objects inherit from `Object.prototype`, creating potential collisions with keys like `toString`, `valueOf`, or `constructor`. `enumify` uses a `null` prototype, keeping the namespace completely unpolluted.
* **Prototypal Extensibility (`.extend()`):** TypeScript native enums cannot be extended, inherited, or composed. `enumify` allows enums to inherit from base enums cleanly without mutating the parent.
* **Predictable Serialization:** TypeScript numeric enums generate strange "reverse mappings" in compiled JS (e.g., `{ 0: "Up", "Up": 0 }`). This makes iterating over them or stringifying them to JSON very messy. `enumify` objects serialize cleanly and safely.
* **Immutability:** `enumify` freezes the object at runtime (`Object.freeze`) and seals it with a `Proxy`. Standard TS enums can technically be mutated at runtime by malicious or sloppy ES code.
* **NodeJS/ESM Compatibility:** Standard TS enums can cause friction with isolated module compilers (like Vite or esbuild) or when importing into vanilla JS. `enumify` generates 100% standard ES2015 JavaScript.

### The Losses (Trade-offs) for `enumify`
* **Slightly More Boilerplate Definition:** Defining an `enumify` dictionary takes 2-3 lines of code (exporting the const, then exporting the `type` alias). TS native enums do both (value and type) as part of the `enum` keyword. 
* **Missing Nominal Typing:** TypeScript native enums offer "nominal" typing (e.g., `enum A { X }` cannot be passed to a function expecting `enum B { X }` even if the keys/structures match). `enumify` relies on structural typing (union of literals), meaning TypeScript allows passing the raw string `'spring'` into a function rather than forcing you to strictly use `Tempo.SEASON.Spring`. 
* **Slight Runtime Overhead:** Instantiating the proxy/prototype wrapper and freezing it adds a microscopic runtime cost compared to evaluating a plain object literal, though parsing the library is typically a one-time engine cost.
* **More Verbose Setup:** TypeScript's enum can use auto-incrementing numeric values, but `enumify` requires explicit values for each key.
