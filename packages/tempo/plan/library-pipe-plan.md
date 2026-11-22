# Plan: Functional Composition (`pipe`, `flow`, `pipeAsync`) in `#library`

## 1. Overview & Motivation
Add general-purpose, strongly-typed functional composition helpers (`pipe`, `flow`, and optionally `pipeAsync`) to `@magmacomputing/library` (`#library`) inside [`function.library.ts`](file:///home/michael/Project/magma/packages/library/src/common/runtime/function.library.ts), which already exports `curry` and `memoizeFunction`.

Placing these helpers in `#library` rather than `tempo-fns`:
- Keeps `tempo-fns` clean and **data-first** (avoiding curried data-last API distortion and poor TypeScript overload diagnostics).
- Provides a zero-overhead, domain-agnostic composition utility usable across `tempo-kit` / `@magmacomputing/tempo`, `tempo-fns`, native `Temporal`, and arbitrary user code.
- Pairs naturally with `#library`'s existing `curry` helper and [`tempo.library.md`](file:///home/michael/Project/magma/packages/tempo/doc/6-utility-library/tempo.library.md).

---

## 2. Proposed API Surface

1. **`pipe(value, ...fns)`** (value-first synchronous pipeline):
   - Evaluates `value` through 1–10+ typed unary stages (`A → B → C → ...`), with a variadic fallback overload for longer chains.
   - Example with `tempo-fns` / `Temporal`:
     ```ts
     const label = pipe(
     	Temporal.PlainDate.from('2026-11-22'),
     	d => d.add({ days: 7 }),
     	d => d.toString(),
     );
     ```
2. **`flow(fn1, ...fns)`** (left-to-right function composition, returning a reusable unary/n-ary function):
   - Returns a composed function `(a: A) => Z` without taking an initial value upfront.
3. **`pipeAsync(value, ...fns)`** *(optional)*:
   - Awaits each stage sequentially (`Promise<A> | A`), returning `Promise<Z>` for mixed sync/async pipelines.

---

## 3. Implementation Scope

1. **[function.library.ts](file:///home/michael/Project/magma/packages/library/src/common/runtime/function.library.ts)**:
   - Implement `pipe`, `flow` (and `pipeAsync` if included) with strict TypeScript arity overloads (e.g. up to 10 stages) and JSDoc.
   - Validate callable stages if appropriate (`isFunction` from `#library/assertion.library.js`).
2. **Barrel & Re-exports**:
   - Confirm re-export via [`packages/library/src/common/runtime/index.ts`](file:///home/michael/Project/magma/packages/library/src/common/runtime/index.ts) and `@magmacomputing/tempo/library` (`packages/tempo/src/library.index.ts`).
3. **Tests**:
   - Add unit tests (runtime chaining, empty/single-stage edge cases, `this`-less pure calls, `curry` interop, and `expectTypeOf` TypeScript inference checks) in `packages/library/test/common/runtime/`.
4. **Documentation**:
   - Document `pipe` / `flow` in [`tempo.library.md`](file:///home/michael/Project/magma/packages/tempo/doc/6-utility-library/tempo.library.md) alongside `curry` and `memoizeFunction`.

---

## 4. Effort & SemVer Assessment

- **Estimated Effort**: ~2–3 hours (0.5 engineering days) — ~1h for typed overloads & implementation in `function.library.ts`, ~1h for unit + type inference tests, ~0.5h for docs and build verification.
- **SemVer Classification**: **Minor** (`0.x` / `5.x` additive feature) — introduces new exports (`pipe`, `flow`, `pipeAsync`) with zero breaking changes to existing APIs or signatures.
