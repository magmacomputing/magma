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

```ts
/**
 * Lazily yields each object along `target`'s prototype chain up to (excluding) `Object.prototype`,
 * guarding against cyclic prototype chains and optionally unwrapping Proxy layers.
 */
export function* walkPrototype(
	target: unknown,
	unwrapProxies = true,
): Generator<object> {
	if (!isReference(target) || isFunction(target))
		return;

	const visited = new WeakSet<object>();
	let curr: any = target;

	while (curr && curr !== Object.prototype) {
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
