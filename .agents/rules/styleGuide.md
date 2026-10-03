# General Code & Style Guide

This style guide defines common coding conventions, formatting standards, and TypeScript idioms across all packages in the repository.

---

## 1. Single-Line If Statements (Omit Braces)
- **Omit Braces on Single-Line Then-Branches**: When writing `if` statements where the body is a single statement/action, omit surrounding curly braces (`{}`) and place the statement indented on the next line (or inline where appropriate). This improves readability, reduces visual noise, and keeps the codebase concise:
  ```ts
  // Preferred
  if (condition)
  	return fallback;

  if (isUndefined(val))
  	throw new TypeError('Value must be defined');

  // Avoid unnecessary braces for single statements
  if (condition) {
  	return fallback;
  }
  ```

---

## 2. Prefer Assertion Library Functions
- **Assertion Functions First**: Always prefer fast, idiomatic assertion functions (e.g. from `#library/assertion.library.js` or package support modules) over manual `typeof`, `instanceof`, or bespoke null-checks:
  - **Primitives**: `isString(x)`, `isNumber(x)`, `isInteger(x)` (bigint), `isDigit(x)` (number or bigint), `isBoolean(x)`, `isSymbol(x)`.
  - **Strings & Text**: Prefer `isText(x)` over manual non-empty string checks like `isString(x) && x.trim().length > 0` or `!isString(x) || x.trim().length === 0`.
  - **Callables**: `isCallable(x)` or `isFunction(x)` for any invocable function, method, or class constructor (`typeof x === 'function'`).
  - **Objects**: `isPlainObject(x)` for plain dictionary `{}` or `Object.create(null)` objects. Avoid manual, fragile checks such as `typeof x === 'object' && x !== null` or `x.constructor === Object`.
  - **Nullish & Presence**: Prefer positive assertions: `isUndefined(x)`, `isNullish(x)`, `isNull(x)`, `isDefined(x)`. Prefer `isUndefined(x)` over negated `!isDefined(x)` for clearer readability.

---

## 3. Type Importing Discipline (Static `import type` vs Inline Dynamic Imports)
- **Always Prefer Top-Level Static `import type`**: In TypeScript source files (`.ts`), always declare and import types at the top of the file using `import type { Symbol } from '...'` (aliasing with `as` when necessary to prevent local naming collisions, e.g. `import type { Interval as TempoInterval } from '...'`).
- **Avoid Inline Dynamic Type Imports**: Do NOT use inlined dynamic type imports like `export type Interval = import('#library/scheduling/interval.class.js').Interval<Tempo>;` in source files. Static type imports ensure:
  - Clean, centralized dependency visibility at the top of every module.
  - Reliable IDE refactoring, symbol renaming (`F2`), and automated import organization.
  - Zero runtime footprint (fully elided during compilation with no bundle/performance impact).
  - Concise, predictable generated `.d.ts` declaration bundles.

---

## 4. Export Discipline & Internal API Marking (`@internal`)
- **Prefer Testing via Public Surface**: Always test modules through their public interface whenever possible.
- **Mark Internal Helpers with `@internal`**: When a helper, constructor, or internal engine mechanism must be exported across package or module boundaries (for discrete testing, engine consumption, or multi-package support), ALWAYS annotate it with `/** @internal */`. This ensures:
  - Documentation generators exclude them from public API documentation (e.g. TypeDoc when `excludeInternal` is enabled, or other documentation tools with equivalent filtering configured).
  - End users and external consumers are signaled that the symbol is private and subject to change without semver notices.

---

## 5. Trailing Commas in Multi-Line Structures
- **Always Include Trailing Commas**: In multi-line object literals, array literals, interface/type property declarations, parameter lists, and function call arguments, always include a trailing comma on the final item. This produces cleaner `git diff`s, prevents multi-line merge conflicts when adding/reordering items, and maintains formatting consistency:
  ```ts
  // Preferred
  const config = {
  	locale: 'en-US',
  	timezone: 'America/New_York',
  	localeInfo: true,
  };

  function calculateBounds(
  	origin: GeoCoordinate,
  	destination: GeoCoordinate,
  	options?: BoundsOptions,
  ): BoundingBox { ... }

  // Avoid omitting trailing comma on multi-line structures
  const config = {
  	locale: 'en-US',
  	timezone: 'America/New_York',
  	localeInfo: true
  };
  ```

---

## 6. Module-Level Regular Expression Constants
- **Hoist Regular Expressions to Module-Level `const`**: Always declare `RegExp` literals as top-level / module-scoped `const` constants (e.g. `const RE_DIGITS = /^\d+$/;`, `const REGEX_ISO_DATE = ...;`) rather than instantiating them inline inside functions, loops, or method bodies.
  - **Avoid Re-Compilation & Allocation**: Eliminates redundant regex compilation and heap allocation overhead on every function invocation.
  - **Maintainability & Reusability**: Centralizes pattern definitions and promotes consistent, descriptive naming across the module.
  - **Global/Sticky Flag Caution**: When using stateful flags (`/g` or `/y`), be mindful of stateful `lastIndex`, resetting it or using stateless methods (like `str.match(RE)`) where appropriate.


