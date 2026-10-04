# Implementation Proposal: Hardening Enumify & Static-First Migration

## 1. Executive Summary & Strategy

`enumify` enables lightweight, ergonomic enums combining dictionary property access (`Status.Active === 0`) with reflection utilities (`Enum.has(Status, 'Active')`, `Enum.keys(Status)`).

Historically, `enumify` attached reflection utilities directly to the enum instance's prototype (`Status.has()`, `Status.keys()`). However, sharing the member property namespace with prototype methods creates fundamental trade-offs when enums contain keys like `'has'`, `'get'`, `'keys'`, or `'values'` (e.g., HTTP verbs, permissions, lexer tokens).

### The Chosen Strategy: Progressive Deprecation (Dual-Mode v4.x $\rightarrow$ Pure Static v5.0.0)

1. **Static-First Reflection (`Enum.*`)**: Promote static helpers (`Enum.has`, `Enum.hasOwn`, `Enum.keys`, `Enum.values`, etc.) as the canonical, modern, 100% collision-proof paradigm—mirroring ECMAScript's standard `Object.hasOwn` and `Object.keys`.
2. **Defensive Construction Validation**: Validate input arrays/objects during construction to immediately catch structural developer errors (e.g. duplicate keys in arrays `['a', 'b', 'a']`), while allowing all valid key names (including `'has'`, `'get'`, `'keys'`).
3. **v4.x Backward Compatibility**: Keep prototype methods on `ENUM` for v4.x, hardened via call-binding and TypeScript `Omit` so colliding keys never crash and degrade gracefully.
4. **Formal Deprecation in v4.x**: Mark instance prototype methods (`enumObj.has()`, `enumObj.keys()`) with `@deprecated` in TypeScript definitions and JSDoc, steering developers to `Enum.*`.
5. **Pure Static in v5.0.0**: Remove prototype methods completely in `v5.0.0`. Enums become pure frozen data records (`Object.create(null)`) with static `Enum.*` reflection.
6. **No Member Name Bans or False Warnings**: Do **not** throw errors or emit console warnings on member name collisions. All member keys (including `'has'`, `'get'`, `'keys'`) are completely valid domain values and are fully supported by `Enum.*`.
7. **Aliased Inversion Support**: `Enum.invert()` uses last-key-wins semantics without throwing errors on duplicate values, fully supporting aliased enums (e.g. `HttpStatus.Ok = 200`, `HttpStatus.Success = 200`).

---

## 2. Motivation & Design Philosophy

### 2.1 The TC39 / ECMAScript Precedent (`Object.hasOwn`)
In ES2022, TC39 addressed the exact same conflict between dictionary properties and prototype methods on plain JavaScript objects. Calling `dict.hasOwnProperty(key)` was inherently fragile when `dict` had an own property named `hasOwnProperty` or was created with `Object.create(null)`.

TC39's permanent solution was **static reflection on the namespace**:
```typescript
Object.hasOwn(dict, key);
Object.keys(dict);
Object.values(dict);
```

Adopting `Enum.has(enumObj, key)`, `Enum.hasOwn(enumObj, key)`, and `Enum.keys(enumObj)` brings `enumify` into direct alignment with modern ECMAScript and TypeScript standards.

### 2.2 Why `Object.keys(Enum)` is an Anti-Pattern
In some parts of existing codebases, developers use `Object.keys(Enum)` or `Object.values(Enum)`. This is an anti-pattern for several reasons:
1. **Loose Typing**: `Object.keys(Enum)` returns generic `string[]`, losing all TypeScript literal key types (`readonly (keyof T)[]`).
2. **Missing Caching**: `Enum.keys()` uses internal memoization for instant, zero-allocation repeated calls.
3. **Reflection Guarantees**: `Enum.keys()` guarantees strict iteration over valid enum members without non-member property leakage.

The monorepo migration will sweep and replace `Object.keys(Enum)` with `Enum.keys(Enum)`.

---

## 3. Technical Specification (The 4 Hardening Pillars)

### 3.1 Pillar 1: Defensive Construction Validation & Property Definition

In `packages/library/src/common/runtime/enumerate.library.ts`:
1. **Duplicate Key Validation**: Catch duplicate array elements during construction (e.g. `enumify(['a', 'b', 'a'])`), throwing a descriptive `TypeError`.
2. **`Object.defineProperty`**: Prevent silent key drops by defining properties as non-configurable, non-writable own-properties directly on the target object.

```typescript
case 'Array':
  (arg.value as string[]).forEach((key, index) => {
    if (isNumber(key))
      throw new TypeError(`Enumify: numeric keys are not supported ("${key}").`);
    if (Object.prototype.hasOwnProperty.call(target, key))
      throw new TypeError(`Enumify: duplicate member key "${key}" found in array definition.`);
    
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

### 3.2 Pillar 2: The Canonical `Enum.*` Static Helper Suite

Export fully-typed static helper functions on the `Enum` namespace in `enumerate.library.ts`:

```typescript
export namespace Enum {
  /** Check if a key exists on the enum or any inherited parent enum */
  export function has<T extends Property<any>>(enumObj: T, key: PropertyKey): key is KeyOf<T> {
    return ENUM.has.call(enumObj, key);
  }

  /** Check if a key exists directly as an own property on the enum (mirrors Object.hasOwn) */
  export function hasOwn<T extends Property<any>>(enumObj: T, key: PropertyKey): key is KeyOf<T> {
    return Object.prototype.hasOwnProperty.call(enumObj, key);
  }

  /** Safely retrieve a member value by key, returning undefined if absent */
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

  /** Safely look up the key corresponding to a given value (reverse mapping) */
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

  /** 
   * Safely invert an enum into a Value -> Key lookup dictionary.
   * Supports aliased enums (last-key-wins on duplicate values).
   */
  export function invert<T extends Property<any>>(enumObj: T): Record<any, KeyOf<T>> {
    return ENUM.invert.call(enumObj);
  }

  /** Custom instance-of check supporting `val instanceof Enum` or predicate checking */
  export function [Symbol.hasInstance](instance: any): boolean {
    return instance != null && (instance[Symbol.toStringTag] === 'Enumify' || isFunction(instance?.has));
  }
}
```

#### Usage Example:
```typescript
const HttpMethod = enumify(['get', 'post', 'has', 'delete']);

// 1. Direct member property access (fast & clean):
HttpMethod.get;                  // 0
HttpMethod.has;                  // 2

// 2. Static reflection (100% collision-immune):
Enum.has(HttpMethod, 'get');     // true
Enum.hasOwn(HttpMethod, 'get');  // true
Enum.get(HttpMethod, 'post');    // 1
Enum.keys(HttpMethod);           // ['get', 'post', 'has', 'delete']
Enum.values(HttpMethod);         // [0, 1, 2, 3]
```

---

### 3.3 Pillar 3: Prototype Internal Call-Binding & Well-Known Symbols (v4.x Fallback)

To ensure un-migrated v4.x call sites continue working without cascading crashes when an enum defines a member like `keys` or `has`, bind prototype methods to call each other via `ENUM.*.call(this)`:

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
  hasOwn: value(function (this: any, key: PropertyKey) { 
    return Object.prototype.hasOwnProperty.call(this, key); 
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
  [Symbol.iterator]: value(function* (this: any) { 
    for (const entry of ENUM.entries.call(this)) yield entry as any; 
  }),
  [Symbol.toStringTag]: { enumerable: false, configurable: false, writable: false, value: 'Enumify' }
}));
```

---

### 3.4 Pillar 4: TypeScript Typings & Deprecation Annotations

#### Deprecation in `EnumMethods<T>`
Mark all instance methods as `@deprecated`:

```typescript
export interface EnumMethods<T extends Property<any> = any> {
  /** @deprecated Use `Enum.has(enumObj, key)` instead. Prototype methods will be removed in v5.0.0. */
  has(key: PropertyKey): boolean;
  /** @deprecated Use `Enum.hasOwn(enumObj, key)` instead. Prototype methods will be removed in v5.0.0. */
  hasOwn(key: PropertyKey): boolean;
  /** @deprecated Use `Enum.get(enumObj, key)` instead. Prototype methods will be removed in v5.0.0. */
  get(key: PropertyKey): ValueOf<T> | undefined;
  /** @deprecated Use `Enum.keys(enumObj)` instead. Prototype methods will be removed in v5.0.0. */
  keys(): readonly KeyOf<T>[];
  /** @deprecated Use `Enum.values(enumObj)` instead. Prototype methods will be removed in v5.0.0. */
  values(): readonly ValueOf<T>[];
  /** @deprecated Use `Enum.entries(enumObj)` instead. Prototype methods will be removed in v5.0.0. */
  entries(): readonly (readonly [KeyOf<T>, ValueOf<T>])[];
  /** @deprecated Use `Enum.count(enumObj)` instead. Prototype methods will be removed in v5.0.0. */
  count(): number;
  /** @deprecated Use `Enum.includes(enumObj, search)` instead. Prototype methods will be removed in v5.0.0. */
  includes(search: any): boolean;
  /** @deprecated Use `Enum.keyOf(enumObj, search)` instead. Prototype methods will be removed in v5.0.0. */
  keyOf(search: any): KeyOf<T> | undefined;
  /** @deprecated Use `Enum.invert(enumObj)` instead. Prototype methods will be removed in v5.0.0. */
  invert(): Record<any, KeyOf<T>>;
}

/** Enum properties & methods with collision protection */
export type EnumifyType<T extends Property<any> = any> = 
  Readonly<T> & Omit<EnumMethods<T>, keyof T> & Iterable<readonly [KeyOf<T>, ValueOf<T>]>;
```

---

## 4. Monorepo Codebase Sweep & Migration Plan

A comprehensive sweep of the Magma monorepo will migrate all internal enum call sites to the new standard:

### Phase 1: Instance Method Sweep
Search for calls like `.<enum>.keys()`, `.<enum>.has()`, `.<enum>.values()` and port them:
- **Before**: `MONTH.keys()`, `SEASON.has('Spring')`, `PLANET.entries()`
- **After**: `Enum.keys(MONTH)`, `Enum.has(SEASON, 'Spring')`, `Enum.entries(PLANET)`

### Phase 2: Anti-Pattern (`Object.keys`) Sweep
Search for `Object.keys(<Enum>)`, `Object.values(<Enum>)`, `Object.entries(<Enum>)` across all packages (`tempo`, `plugins/*`, `library`):
- **Before**: `Object.keys(MonthEnum).forEach(...)`
- **After**: `Enum.keys(MonthEnum).forEach(...)`

---

## 5. Documentation & Developer Guidance

1. **Documentation Rewrite**: Update all guides in `packages/tempo/doc/` and `packages/library/` to feature `Enum.*` static helpers exclusively.
2. **No Collision Warnings**: Since `Enum.*` works seamlessly with any member name, no console warnings or runtime checks are emitted during `enumify()` construction.
3. **Migration Note**: Include a migration note in release notes explaining that instance prototype methods are deprecated and scheduled for removal in `v5.0.0`.

---

## 6. Work Breakdown & Execution Checklist

- [ ] **Step 1: Runtime Implementation**
  - Implement duplicate key check and `Object.defineProperty` in array enum branch (`enumerate.library.ts`).
  - Implement `ENUM.*.call(this)` binding on prototype methods.
  - Export the static `Enum` helper suite (`Enum.has`, `Enum.hasOwn`, `Enum.keys`, `Enum.values`, `Enum.entries`, `Enum.get`, `Enum.invert`, `Enum.count`, `Enum.includes`, `Enum.keyOf`, `Symbol.hasInstance`).
  - Support aliased enums in `Enum.invert` with last-key-wins semantics.
- [ ] **Step 2: Typings & Deprecation**
  - Add `@deprecated` JSDoc annotations to `EnumMethods<T>`.
  - Update `EnumifyType<T>` with `Omit<EnumMethods<T>, keyof T>`.
  - Add `Enum.hasOwn` and `[Symbol.hasInstance]` to type definitions.
- [ ] **Step 3: Test Suite Expansion**
  - Add unit tests for `Enum.*` static helper suite and `Enum.hasOwn`.
  - Add unit tests verifying duplicate key rejection during `enumify(['a', 'b', 'a'])`.
  - Add unit tests verifying aliased enums invert cleanly without error.
  - Add unit tests verifying `Symbol.hasInstance` works.
  - Add unit tests verifying colliding enums (`['has', 'get', 'keys', 'values']`) work without error via `Enum.*`.
- [ ] **Step 4: Monorepo Codebase Sweep**
  - Sweep and migrate instance methods (`EnumObj.keys()`) across all packages.
  - Sweep and migrate `Object.keys(EnumObj)` anti-patterns across all packages.
- [ ] **Step 5: Documentation Updates**
  - Update documentation and examples to exclusively showcase `Enum.*`.
- [ ] **Step 6: Build & Test Verification**
  - Run `npm run build:all` and `npm test` across all workspaces.
