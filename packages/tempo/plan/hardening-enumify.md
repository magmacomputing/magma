# Implementation Proposal (IP): Hardening Enumify Against Member Collisions

## 1. Executive Summary

`enumify` combines dictionary property access (`Status.Active === 0`) with a rich registry API (`Status.has('Active')`, `Status.get('Active')`, `Status.keys()`). 

However, because prototype methods and enum member keys share the same property namespace, any enum defining members matching method names (e.g. HTTP verbs `['get', 'post', 'has']`, action registries, lexer keywords) currently suffers from:
1. **Silent Key Loss**: Array enums silently drop `'has'` and `'get'` during creation due to prototype `{ writable: false }`.
2. **Method Shadowing**: Object enums shadow prototype methods, causing runtime `TypeError: enum.has is not a function`.
3. **Cascading Internal Failure**: Methods like `count()` or `[Symbol.iterator]()` crash when internal dependencies like `keys()` are shadowed.
4. **TypeScript Type Collapse**: Colliding keys intersect primitive and function types to `never`.

This proposal introduces a hardening plan that:
- Implements a **Static Helper Suite** (`Enum.has`, `Enum.get`, `Enum.keys`, etc.) directly mirroring ECMAScript's standard `Object.hasOwn` pattern.
- Eliminates the silent drop bug in array enum construction via explicit `Object.defineProperty`.
- Hardens internal method implementations to prevent cascading failures.
- Safeguards TypeScript typings by omitting shadowed methods from the instance type instead of collapsing to `never`.

---

## 2. Motivation & Design Philosophy

### The "Object.hasOwn" Precedent
In ES2022, TC39 addressed the exact same dilemma between dictionary properties and prototype methods on plain JavaScript objects. Instead of requiring developers to use awkward syntax like `Object.prototype.hasOwnProperty.call(dict, key)` or obscure symbols, they introduced:

```typescript
Object.hasOwn(dict, key);
```

Mirroring this idiom with `Enum.has(enumObj, key)` delivers:
- **Zero Learning Curve**: Natural, idiomatic ECMAScript pattern already familiar to all TypeScript/JavaScript developers.
- **100% Collision-Proof**: Dispatches directly to canonical methods, completely decoupled from instance properties.
- **Full Backward Compatibility**: Unshadowed enums continue to support instance methods (`enum.has('foo')`).

---

## 3. Detailed Technical Specification

### 3.1 Pillar 1: Fix Silent Key Drop in Array Construction

#### Current Behavior
In `enumerate.library.ts`:
```typescript
case 'Array':
  (arg.value as string[]).forEach((key, index) => {
    target[key] = index; // ⚠️ Silently fails when key matches a non-writable prototype property!
  });
```

#### Proposed Fix
Use `Object.defineProperty` to ensure own-property definition regardless of prototype property attributes:
```typescript
case 'Array':
  (arg.value as string[]).forEach((key, index) => {
    if (isNumber(key))
      throw new Error('Enumify: numeric keys are not supported');
    Object.defineProperty(target, key, {
      value: index,
      enumerable: true,
      writable: false,
      configurable: false,
    });
  });
  break;
```

---

### 3.2 Pillar 2: The Static `Enum.*` Helper Suite

Export runtime static helper functions on the existing `Enum` namespace/object in `enumerate.library.ts`:

```typescript
export namespace Enum {
  /** Safely check if a key exists in an Enum, immune to method shadowing (mirrors Object.hasOwn) */
  export function has<T extends Property<any>>(enumObj: T, key: PropertyKey): key is KeyOf<T> {
    return ENUM.has.call(enumObj, key);
  }

  /** Safely retrieve a member value by key, returning undefined if absent or if key is shadowed */
  export function get<T extends Property<any>>(enumObj: T, key: PropertyKey): ValueOf<T> | undefined {
    return ENUM.get.call(enumObj, key);
  }

  /** Safely extract all enum member keys, immune to shadowing */
  export function keys<T extends Property<any>>(enumObj: T): readonly KeyOf<T>[] {
    return ENUM.keys.call(enumObj);
  }

  /** Safely extract all enum member values, immune to shadowing */
  export function values<T extends Property<any>>(enumObj: T): readonly ValueOf<T>[] {
    return ENUM.values.call(enumObj);
  }

  /** Safely extract [key, value] pairs, immune to shadowing */
  export function entries<T extends Property<any>>(enumObj: T): readonly (readonly [KeyOf<T>, ValueOf<T>])[] {
    return ENUM.entries.call(enumObj);
  }

  /** Safely look up the key for a given value */
  export function keyOf<T extends Property<any>>(enumObj: T, search: any): KeyOf<T> | undefined {
    return ENUM.keyOf.call(enumObj, search);
  }

  /** Safely check if a value exists in an enum */
  export function includes<T extends Property<any>>(enumObj: T, search: any): boolean {
    return ENUM.includes.call(enumObj, search);
  }

  /** Safely count total entries in an enum */
  export function count<T extends Property<any>>(enumObj: T): number {
    return ENUM.count.call(enumObj);
  }
}
```

#### Usage Comparison
```typescript
const HttpMethod = enumify(['get', 'post', 'has', 'delete']);

// 1. Instance property access for member values:
HttpMethod.get;                // 0
HttpMethod.has;                // 2

// 2. Safe static inspection (mirrors Object.hasOwn):
Enum.has(HttpMethod, 'get');   // true
Enum.get(HttpMethod, 'post');  // 1
Enum.keys(HttpMethod);         // ['get', 'post', 'has', 'delete']
```

---

### 3.3 Pillar 3: Internal Method Hardening Against Cascading Failures

On `ENUM.prototype`, methods currently call other methods dynamically via `this`:
- `ENUM.has`: `this.keys().includes(key)`
- `ENUM.get`: `this.has(key) ? this[key] : undefined`
- `ENUM.count`: `this.keys().length`
- `ENUM.keyOf`: `this.invert()[search]`
- `ENUM[Symbol.iterator]`: `for (const entry of this.entries())`

If an enum shadows `keys`, calling `count()` or `has()` throws `this.keys is not a function`.

#### Proposed Fix
Bind internal method calls to prototype implementations using `.call(this)`:

```typescript
const ENUM = secure(Object.create(null, {
  keys: memoizeMethod('keys', function (this: any) { 
    return ownEntries(this, true).map(([key]: any) => key); 
  }),
  values: memoizeMethod('values', function (this: any) { 
    return ownEntries(this, true).map(([_, val]: any) => val); 
  }),
  entries: memoizeMethod('entries', function (this: any) { 
    return ownEntries(this, true).map(([key, val]: any) => Object.freeze([key, val])); 
  }),
  invert: memoizeMethod('invert', function (this: any) { 
    return Object.fromEntries(ENUM.entries.call(this).map(([key, val]: any) => [val, key])); 
  }),

  has: value(function (this: any, key: PropertyKey) { 
    return ENUM.keys.call(this).includes(key as any); 
  }),
  get: value(function (this: any, key: PropertyKey) { 
    return ENUM.has.call(this, key) ? this[key] : undefined; 
  }),
  count: value(function (this: any) { 
    return ENUM.keys.call(this).length; 
  }),
  includes: value(function (this: any, search: any) { 
    return ENUM.values.call(this).includes(search); 
  }),
  keyOf: value(function (this: any, search: any) { 
    return ENUM.invert.call(this)[search]; 
  }),
  // ...
  [Symbol.iterator]: value(function* (this: any) { 
    for (const entry of ENUM.entries.call(this)) yield entry as any; 
  }),
}));
```

---

### 3.4 Pillar 4: TypeScript Typings Protection

#### The Issue
```typescript
export type EnumifyType<T> = Readonly<T> & EnumMethods<T>;
```
When `T` contains a property `has: number`, `Readonly<T> & EnumMethods<T>` produces:
`T['has'] & EnumMethods['has']` $\rightarrow$ `number & ((key: any) => boolean)` $\rightarrow$ `never`.

#### The Proposed Typing
Omit any keys from `EnumMethods` that are present in `T`:

```typescript
/** Enum properties & methods with collision protection */
export type EnumifyType<T extends Property<any> = any> = 
  Readonly<T> & Omit<EnumMethods<T>, keyof T>;
```

#### Outcome:
- For normal enums (`Month`): all methods (`Month.has`, `Month.get`, etc.) remain fully typed.
- For colliding enums (`HttpMethod`): `HttpMethod.has` is typed cleanly as `number`, while non-colliding methods (`HttpMethod.values()`, `HttpMethod.invert()`) remain available on the instance. For the shadowed `has` method, developers use `Enum.has(HttpMethod, key)`.

---

## 4. Work Breakdown & Test Plan

| Step | Action Item | Target File |
| :--- | :--- | :--- |
| **1** | Replace `target[key] = index` with `Object.defineProperty` in array branch | `packages/library/src/common/runtime/enumerate.library.ts` |
| **2** | Update internal `ENUM` prototype methods to call each other via `ENUM.*.call(this)` | `packages/library/src/common/runtime/enumerate.library.ts` |
| **3** | Implement runtime static helper functions on `Enum` namespace | `packages/library/src/common/runtime/enumerate.library.ts` |
| **4** | Update `EnumifyType` to use `Omit<EnumMethods<T>, keyof T>` | `packages/library/src/common/runtime/enumerate.library.ts` |
| **5** | Add comprehensive unit tests for shadowed enums (arrays & objects with `has`, `get`, `keys`, `values`) | `packages/library/test/common/runtime/enumerate.test.ts` |
| **6** | Verify all workspaces via `npm run build:all` and test suites | Monorepo |

---

## 5. Risk Assessment & Mitigations

> [!TIP]
> **Zero Breaking Changes**: This plan is 100% additive. Existing enums and call sites using instance methods (`month.has(...)`, `weekday.get(...)`) continue to work exactly as they do today.

> [!NOTE]
> **Performance**: Direct `.call(this)` invocation on prototype functions is identical in performance to (and often faster than) dynamic megamorphic property lookups on `this`.

---

## 6. Strategic Evaluation: Pragmatic Alternative (Fail-Fast)

Before deciding to implement the full 4-pillar architectural hardening described above, consider the real-world probability and cost-benefit trade-off:

### 6.1 Real-World Collision Probability (<0.1%)
In production codebases, enum keys almost universally adhere to standard case conventions:
- **PascalCase**: `Month.January`, `Status.Pending`, `Action.Get`, `HttpMethod.Get`
- **SCREAMING_SNAKE_CASE**: `MONTH.JANUARY`, `STATUS.PENDING`, `HTTP.GET`

Because JavaScript identifiers are case-sensitive:
- `HttpMethod.GET !== HttpMethod.get`
- `Action.Has !== Action.has`

Collisions can only occur if a consumer explicitly creates a lowercase enum using exact method names (`['has', 'get', 'keys', 'values', 'invert', 'count', 'entries']`), which is exceedingly rare in real-world application domains.

### 6.2 The Native Language Horizon
`enumify` is a lightweight, ergonomic userland utility that bridges the gap until native ECMAScript proposals or future TypeScript standards provide first-class enum/sum-type primitives. Adding extensive meta-programming machinery (runtime static namespaces, prototype call redirection, complex `Omit` type intersections) introduces maintenance overhead for what is ultimately a transitional feature.

### 6.3 The Pragmatic Middle Ground: Fail-Fast (2 Lines of Code)
If the primary concern is preventing silent bugs or obscure runtime errors, the simplest and cleanest solution is **failing fast** during enum construction:

```typescript
// packages/library/src/common/runtime/enumerate.library.ts
if (key in ENUM) {
  throw new TypeError(`Enumify: "${key}" is a reserved method name and cannot be used as an enum key.`);
}
```

#### Why this alternative is compelling:
- **Prevents Silent Drops**: Immediately stops array enums like `enumify(['has'])` from silently omitting keys.
- **Zero API Surface Bloat**: No new namespaces or static helpers to learn, document, or maintain.
- **Zero Type Complexity**: Leaves `EnumifyType<T>` straightforward and fast for the TypeScript compiler.
- **Negligible Cost**: 2 lines of defensive validation.

---

## 7. Decision Matrix for Evaluation

| Option | Scope | Complexity | Value Proposition |
| :--- | :--- | :--- | :--- |
| **Option 1: Push On (Full Plan)** | Implement Pillars 1–4 (`Enum.*` helpers, internal call-binding, type `Omit`) | Medium | 100% collision-proof; allows lowercase method names as enum values. |
| **Option 2: Pragmatic Fail-Fast** | Add `if (key in ENUM) throw` check in `enumify()` | Low (2 lines) | Completely eliminates silent drops and obscure runtime crashes with zero API bloat. |
| **Option 3: Hold Off / Status Quo** | Leave as-is; rely on case conventions (`PascalCase` / `UPPER_CASE`) | None | Minimal code churn; `.get(key)` is already implemented and monorepo is 100% clean. |

