# Prototype-Chain Walker Refactor Plan (`walkPrototype`)

**Status:** Proposed (deferred until after PR #115 merges to keep PR #115 under CodeRabbit's 100-file limit)
**SemVer Classification:**
- `@magmacomputing/library`: **Minor** (if `walkPrototype` is exported as a public utility) or **Patch** (if marked `@internal`).
- `@magmacomputing/tempo`: **Patch** (internal deduplication with zero public API or behaviour changes).

**Estimated Effort:** ~2–3 hours (0.5 engineering days)
- 1 hr: Implement `walkPrototype` in `#library` (`primitive.library.ts`) + unit tests (cycles, `Proxy` unwrapping, `null`-prototype chains, early break).
- 1 hr: Migrate duplicated loops across `#library` and `#tempo`.
- 0.5–1 hr: Full monorepo build (`npm run build:all`) and test suite verification (`npm test`).

---

## 1. Motivation

There are currently **10** `while (... !== Object.prototype)` prototype-chain climbing loops across `@magmacomputing/library` and `@magmacomputing/tempo`. In particular:

1. **`engine.lexer.ts` (`findRegistryEntry`)** and **`module.parse.ts` (`collectOrdinals`)** duplicate the exact same ~20-line loop:
   - Maintaining a `WeakSet` cycle guard
   - Iterating `Object.entries(curr)`
   - Unwrapping proxies via `unwrap(curr)` and iterating `ownEntries(level)`
   - Stepping via `Object.getPrototypeOf(level)` until `null` or `Object.prototype`
2. **`module.parse.ts`** also defines a third inline `keys(obj)` prototype walker (`ownKeys(curr)` per level).
3. **`#library`** repeats `WeakSet` + `unwrap()` + `Object.getPrototypeOf()` across `enumerate.library.ts`, `primitive.library.ts`, and `proxy.library.ts`.

Centralizing the traversal in `#library` eliminates copy-pasted boilerplate and guarantees `WeakSet` cycle safety and consistent `Proxy` unwrapping everywhere.

---

## 2. Proposed `#library` Helper

In `packages/library/src/common/primitives/primitive.library.ts`:
(or `reflection.library.ts`)
```ts
/**
 * Lazily yields each object along `target`'s prototype chain up to (excluding) `Object.prototype`,
 * guarding against cyclic prototype chains and optionally unwrapping Proxy layers.
 */
export function* walkPrototype(
	target: unknown,
	unwrapProxies = true,
	maxDepth = 256,
): Generator<object> {
	if (!isReference(target) || isFunction(target))
		return;

	const visited = new WeakSet<object>();
	let curr: any = target;
	let depth = 0;

	while (curr && curr !== Object.prototype) {
		if (depth++ >= maxDepth)
			throw new RangeError(`walkPrototype: prototype chain exceeded maximum traversal depth (${maxDepth}).`);
		if (visited.has(curr))
			break;
		visited.add(curr);

		const level = unwrapProxies ? unwrap(curr) : curr;
		if (level !== curr) {
			if (visited.has(level))
				break;
			visited.add(level);
		}

		yield level;
		curr = Object.getPrototypeOf(level);
	}
}
```

> **Finite Depth Budget (`maxDepth = 256`):** Even with `visited: WeakSet`, an adversarial `Proxy` with a `getPrototypeOf` trap that synthesizes a fresh object on every step will bypass identity-based cycle detection and loop forever. Enforcing a finite `maxDepth = 256` budget (throwing `RangeError` on exhaustion, matching `ownEntries`) guarantees termination.

> **Note for `findRegistryEntry` / `collectOrdinals`:** Verify during implementation whether `Object.entries(curr)` (on the Proxy wrapper) and `ownEntries(level)` (on the unwrapped target) can be unified or whether `walkPrototype` should yield `[curr, level]` pairs (or `unwrapProxies = false` + `unwrap` at the call site) so proxy-trap semantics in `Proxy`-wrapped `Enum`s remain identical.

---

## 3. Target Refactor Sites

### High-Value Targets (Replace Inline Loops)
1. `packages/tempo/src/engine/engine.lexer.ts` (`findRegistryEntry`, lines 27–46)
2. `packages/tempo/src/module/module.parse.ts` (`collectOrdinals`, lines 563–585)
3. `packages/tempo/src/module/module.parse.ts` (inline `keys(obj)`, lines 710–718)
4. `packages/library/src/common/primitives/primitive.library.ts` (`ownEntries` deep traversal, lines 64–75)
5. `packages/library/src/common/runtime/enumerate.library.ts` (`isChainFrozen`, lines 46–55)
6. `packages/library/src/common/runtime/proxy.library.ts`:
   - `isEnumifyTarget` (lines 43–55)
   - `snapshotInspect` prototype collection (lines 146–153)
   - `createTargetInspectHook` (`sym.$Inspect` lookup, lines 180–191)

### Non-Targets (Leave Inline)
- `packages/library/src/common/runtime/reflection.library.ts` (lines 189, 201): walks constructor chains (`Function.prototype`) with custom depth limits.
- `packages/library/src/common/primitives/object.library.ts` (line 36): simple 4-line depth-capped check.

---

## 4. Verification

1. Add unit tests for `walkPrototype` in `packages/library/test/common/primitives/primitive.library.test.ts` covering:
   - Null-prototype chains (`Object.create(null)`) and `Object.prototype` termination
   - Multi-tier `Enum.extend(...)` prototype chains
   - `Proxy` unwrapping (`unwrapProxies = true` vs `false`)
   - Non-reference / function inputs returning empty immediately
2. Run `npm run build:all && npm test` and verify all workspaces pass with zero regressions (especially `ordinal_offset.test.ts`, `enumerate.test.ts`, `proxy.library.test.ts`).

---

## 5. Follow-Up Companion Refactor: `Object.defineProperty` / `Object.defineProperties` Helpers

### Existing Specialized Wrappers (Do Not Duplicate)
- `setProperty` / `setProperties` (`packages/tempo/src/support/support.util.ts`): Tempo-internal mutable/enumerable property setters with `Object.isExtensible` guard + `logWarn`.
- `markSymbol` (`packages/library/src/common/primitives/symbol.library.ts`): non-enumerable symbol markers (`enumerable: false, writable: true, configurable: true`).
- `memoizeMethod` (`packages/library/src/common/runtime/function.library.ts`): property descriptor factory for self-memoizing methods.
- `defineProperty` / `defineProperties` / `attachStatics` (`packages/tempo/src/plugin/plugin.util.ts`): Tempo plugin SDK helpers for registering getters/properties/statics on `Tempo`.

### General-Purpose `#library` Descriptor Helpers
Across `#library` and `#tempo`, ~50 raw `Object.defineProperty` / `Object.defineProperties` calls repeat 4 common patterns that can be consolidated alongside `ownKeys` / `ownEntries` in `packages/library/src/common/primitives/primitive.library.ts` (or `object.library.ts`):

1. **`defineHidden(target, key, value, writable?)`** — non-enumerable metadata/internal properties (`enumerable: false`).
2. **`defineReadonly(target, key, value, configurable?)`** — enumerable read-only values (`writable: false`).
3. **`defineLazy(target, key, factory)`** — enumerable, configurable getter that reifies itself on first access via `Object.defineProperty(this, key, { value })`.
4. **`defineFrom(target, source)`** — descriptor-preserving copy (`Object.defineProperties(target, Object.getOwnPropertyDescriptors(source))`).

---

## 6. Follow-Up Companion Refactor: `Object.fromEntries(ownEntries(..., true))`

There are **5** identical `Object.fromEntries(ownEntries(x, true))` calls flattening prototype chains into plain objects:
- `packages/library/src/common/runtime/reflection.library.ts:136`
- `packages/tempo/src/support/support.init.ts:375, 376, 409, 417`

### Generator vs. `flattenObject` Trade-Off
- **Generator (`*walkEntries`):** `Object.fromEntries()` natively consumes any `Iterable`/`Generator` without an intermediate `entries[]` array. Walking child-to-parent with a `seen` `Set` avoids allocating `levels[]`, though it changes key insertion order (child keys first vs. parent-first via `levels.reverse()`). Where parent-first insertion order is required (e.g. `Enum` tests), `levels.reverse()` is still needed.
- **`flattenObject(obj)` helper:** Even without changing `ownEntries` to a generator, exporting a concise `flattenObject(obj)` (e.g. `Object.fromEntries(ownEntries(obj, true))`) in `#library` eliminates all 5 repeated expressions cleanly.
