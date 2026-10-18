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
- **Always Declare Static Regular Expressions as Module-Scoped Constants**: Static regular expression patterns must ALWAYS be implemented as module-scoped `const` variables using the `RE_*` naming prefix (for example, `RE_ORACLE_DETECTION`, `RE_INTERVAL`, `RE_OFFSET_WITH_SECONDS`). Never instantiate inline RegExp literals inside function, method, or loop bodies (e.g. avoid `str.match(/^[+-]\d{2}:?\d{2}$/)` inside hot paths):
  - **Self-Documenting Code**: Regular expressions are notoriously dense and hard to parse at a glance. Naming the constant (e.g. `RE_ORACLE_DETECTION`, `RE_INTERVAL`, `RE_OFFSET_WITH_SECONDS`) explicitly documents the semantic intent of the pattern, turning opaque syntax into readable code.
  - **Compilation & Execution Efficiency**: When a regular expression is declared inline, JavaScript engines (such as V8) must evaluate the literal expression on every invocation, allocating a new `RegExp` object instance on the heap and incurring pattern compilation checks. Hoisting it to the module level ensures the engine compiles the pattern bytecode (or Irregexp machine code) exactly once at module evaluation.
  - **Reduced Garbage Collection (GC) Pressure**: Reusing a single singleton RegExp instance across multiple test/match operations in high-throughput hot paths (e.g. date parsing, string normalization, loop filtering) eliminates short-lived object allocations, preventing minor GC scavenges and latency spikes.
  - **Stateless Matching Discipline**: When using regular expressions without the `/g` or `/y` flags (recommended for general string tests), operations like `.test()` and `str.match(RE)` are completely stateless and safe for concurrent calls across threads or async iterations. If stateful flags (`/g` or `/y`) are required, reset `RE.lastIndex = 0` before and after execution, or instantiate a localized instance.

---

## 7. Preferred Function Returns
- **Ternary for Dual Terminal Cases**: Where a function ends with two final cases (e.g. `if (test1) return 'xyz'; return 'abc';`), refactor to a clean ternary:
  ```ts
  // Preferred
  return (test1)
  	? 'xyz'
  	: 'abc';

  // Avoid multiple interspersed exit points at function termination
  if (test1) return 'xyz';
  return 'abc';
  ```
  This reads clearer, avoids multiple exit points interspersed through the function, and makes the terminal branches immediately obvious.

---

## 8. Avoid Internal Re-Exports (Use Root Barrels)
- **Avoid Cross-Module Re-Exports**: Do not re-export types or utility functions across internal submodules (e.g. avoid re-exporting types from `type.library.ts` inside `primitive.library.ts` or `assertion.library.ts`) unless specifically mandated to satisfy an external public packaging contract.
- **Import from Canonical Module or Curated Package Barrel**:
  - **Internal modules**: Import directly from the canonical defining module (e.g. import types from `#library/type.library.js`, primitives from `#library/primitive.library.js`).
  - **External / Package Consumers**: Import from the top-level package entry or curated barrel (e.g. `@magmacomputing/tempo/library` or `#library`) rather than hunting through internal submodules.
- **Benefits**:
  - **Prevents Circular Dependencies**: Eliminates subtle cycle loops between peer submodules.
  - **Clean Autocomplete**: Prevents IDEs from suggesting multiple duplicate import paths for the same symbol.
  - **Maintainability**: Makes symbol ownership clear and avoids proxy-re-export churn when refactoring internal file structures.

---

## 9. Avoid Overly Generous `export` Statements (Scope Discipline)
- **Evaluate Necessity**: Avoid reflexively prefixing declarations with `export`. Before exporting any symbol (`function`, `type`, `interface`, `const`, `enum`, `class`), evaluate whether it is genuinely required outside of its defining module.
- **Default to Module-Private**: Keep helper functions, internal assertion predicates, regex patterns, intermediate state types, and implementation details local to the file (unexported).
- **Public API Surface Protection**: An exported symbol becomes part of the module’s surface and attracts external coupling. Restricting exports:
  - **Minimizes Bundle Size & Dead Code**: Prevents tree-shaking ambiguities and unused symbols leaking into distribution bundles.
  - **Prevents Accidental Coupling**: Guarantees that internal implementation details can be refactored freely without breaking dependent modules.
  - **Keeps Autocomplete Focused**: Keeps IDE suggestion lists clean and relevant for consumers.
