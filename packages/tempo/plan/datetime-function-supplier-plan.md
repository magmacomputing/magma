# Support Function-Valued DateTime Suppliers in `new Tempo()`

This plan details the design and implementation strategy for supporting function-valued `Tempo.DateTime` suppliers (i.e. `() => Tempo.DateTime`) as primary input arguments to `new Tempo(supplier, options)` and `Tempo(supplier)`.

## Executive Summary
Currently, `Tempo` supports function-valued suppliers for options (`options.timeZone`, `options.calendar`, `options.locale`, `options.sphere`, `options.anchor`) using `evaluate()`. However, passing a function supplier as the main date argument (e.g., `new Tempo(() => new Date())` or `new Tempo(() => '2026-08-26')`) is not evaluated during instance resolution. 

Extending lazy evaluation to the primary `tempo` input argument rounds out the v4.0.0 deliverables, providing complete dynamic functional context across both configuration and input parsing.

---

## User Review Required

> [!NOTE]
> This plan is scheduled for review and execution **after** the current CodeRabbit PR review split strategy (`coderabbit-review-split-strategy.md`) is finalized and merged.

> [!IMPORTANT]
> Class constructors vs. functions: `evaluate()` must safely distinguish plain supplier functions (`() => date`) from class constructors (`class MyDate {}`) to prevent runtime instantiation errors during argument evaluation.

---

## Proposed Changes

### Type Definitions

#### [MODIFY] [tempo.type.ts](file:///home/michael/Project/magma/packages/tempo/src/tempo.type.ts)
- Update `t.DateTime` union definition to accept zero-argument supplier functions: `(() => DateTime)`.

---

### Core Engine & Parsing

#### [MODIFY] [tempo.class.ts](file:///home/michael/Project/magma/packages/tempo/src/tempo.class.ts)
- **`#swap()` Argument Resolution**: Update `#swap(tempo, options)` to handle function-valued date inputs without misidentifying them as option objects.
- **`#resolve()` & `#parse()` Integration**: Apply `evaluate(this.#tempo)` inside `#resolve()` so that supplier functions resolve dynamically when producing the underlying `Temporal.ZonedDateTime`.
- **Lazy Mode & Input Guards**: Update string guard checks (`guard.test(...)`) to inspect the result of `evaluate(this.#tempo)` rather than coercing the function reference to a string.

---

### Unit & Integration Testing

#### [NEW] [dynamic_supplier.test.ts](file:///home/michael/Project/magma/packages/tempo/test/instance/dynamic_supplier.test.ts)
- Add comprehensive Vitest test coverage:
  - `new Tempo(() => '2026-08-26')`
  - `new Tempo(() => new Date('2026-08-26T12:00:00Z'))`
  - `new Tempo(() => Tempo('2026-01-01'))`
  - Dynamic supplier evaluation on access (`.iso`, `.toDateTime()`, `.format()`).
  - Verification with defer/lazy mode.

---

## Verification Plan

### Automated Tests
- Execute full Vitest suite in `packages/tempo`:
  ```bash
  npm test
  ```
- Run TypeScript type checker:
  ```bash
  npx tsc --noEmit
  ```

### Manual Verification
- Verify REPL interactive evaluation of function-valued date suppliers via `/interactive-testing`.
