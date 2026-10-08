# Implementation Plan: Term Plugin Lifecycle Hooks

**Goal**: Establish a zero-overhead, pluggable lifecycle hook architecture in Core Tempo (`@magmacomputing/tempo`), enabling Term Plugins to extend parsing, formatting, arithmetic, boundaries, and comparative intervals without bloating the lean core engine.

---

## 1. Architectural Philosophy & Constraints

1. **Strict Domain Scoping (Terms Only)**:
   * Hooks exist **exclusively for domain Terms** (e.g. quarters, fiscal years, agile sprints).
   * Core Tempo ISO parsing, Temporal primitives, and standard date arithmetic (`2026-10-08`, `t.add({ month: 1 })`) are **immutable, deterministic, and sealed**. There are **no** global arbitrary interceptors or monkey-patching mechanisms.
2. **Zero Hot-Path Penalty (The `#` Fast-Path Guard)**:
   * Standard date strings and standard arithmetic must incur **0ns penalty**.
   * Hook dispatch is gated behind a strict `#` sigil check (`if (!input.includes('#')) return nativeParse()`). Standard dates bypass hook tables in a single branch check.
3. **Canonical Modern Object Syntax (`t.add({ '#qtr': 1 })`)**:
   * All arithmetic and mutation hooks adhere strictly to modern dictionary/object syntax (`t.add({ '#qtr': 1 })`, `t.sub({ '#sprint': 2 })`, `t.set({ '#qtr': 'start' })`).
   * Positional two-argument syntax (`t.add(1, 'unit')`) is explicitly avoided in hook signatures, as it is scheduled for deprecation in v5.0.0.
4. **Symbol-Protected Well-Known Protocol (`Symbol.for()`)**:
   * Hook identifiers are defined using the global registry via **`Symbol.for('magmacomputing/tempo/term/...')`**, consistent with [`packages/tempo/src/support/support.symbol.ts`](file:///home/michael/Project/magma/packages/tempo/src/support/support.symbol.ts).
   * **Why `Symbol.for()` over `Symbol()`?**:
     - While exporting `TermHook` from `@magmacomputing/tempo/plugin/sdk` aligns imports between Core and Term plugins, npm dependencies often produce dual package instances (e.g., nested `node_modules` or bundler chunk splits).
     - Standard `Symbol('key')` is instance-unique: if a plugin resolves a distinct copy of the SDK module, `Symbol('key') !== Symbol('key')`, causing silent hook dispatch failures.
     - `Symbol.for('key')` guarantees that the symbol resolves to the exact same pointer across all bundles, packages, microfrontends, and iframe realms.
5. **Phased Rollout**:
   * **Phase 1 (Core Foundation - v4.6.0)**: Implement the complete 6-hook symbol definitions, runtime registry slots, and dispatch points in Core Tempo.
   * **Phase 2 (Term Application)**: Implement concrete domain logic in individual Term plugins (`QuarterTerm`, `FiscalTerm`, `SprintTerm`, etc.) in subsequent package releases without requiring Core patches.

---

## 2. Risk & Community Perception Analysis

| Risk Vector | Potential Pitfall | Architectural Countermeasure |
| :--- | :--- | :--- |
| **Community Perception** | Developers fear "Moment.js-style monkey-patching" where 3rd-party plugins alter core date parsing behavior across a codebase. | **Confined Blast Radius**: Core ISO parsing cannot be intercepted. Hooks only fire when the developer explicitly requests a `#term` in their expression (e.g. `t.add({ '#qtr': 1 })`, `"3rd day of #qtr.2"`). |
| **Hot-Path Deoptimization** | Checking hook registries inside tight loops degrades V8 inline caches (monomorphic to megamorphic). | **`#` Sigil Guard**: Standard operations bypass hook lookups before any registry or hook table is touched. |
| **Name Collisions & Typo Bugs** | String-named hooks (e.g. `onTermStep`, `step`) can collide with user methods or future API additions. | **Well-Known Symbols**: `TermHook.step = Symbol.for('magmacomputing/tempo/term/step')` guarantees 100% collision immunity and strict TypeScript typing. |
| **Dual Package Hazards** | Bundlers or nested `node_modules` resolving separate instances of Tempo, breaking local `Symbol()` references. | **Global Registry (`Symbol.for`)**: Symbols are guaranteed identical regardless of how or where the SDK module was bundled. |

---

## 3. The Complete 6-Hook Lifecycle Matrix

When developers interact with a date-time instance in relation to a domain Term, they perform 6 fundamental operations:

| Hook Symbol | Triggering API Expression | Operational Responsibility |
| :--- | :--- | :--- |
| **`[TermHook.parse]`** | `new Tempo('#qtr.2')`<br>`new Tempo('FY27-Q1')` | **Ingestion**: Parses custom Term expressions in strings into a resolved `Tempo` anchor. |
| **`[TermHook.ordinal]`** | `new Tempo('3rd day of #qtr.2')`<br>`new Tempo('last Friday of #sprint')` | **Relational Anchoring**: Computes relative ordinals inside the Term's boundaries. |
| **`[TermHook.step]`** | `t.add({ '#qtr': 1 })`<br>`t.sub({ '#sprint': 2 })` | **Stepping Arithmetic**: Performs forward/backward stepping arithmetic by whole Term units. |
| **`[TermHook.diff]`** | `t1.diff(t2, '#qtr')`<br>`t1.until(t2, { unit: '#sprint' })` | **Distance Measurement**: Calculates count of whole or fractional Term units between two dates. |
| **`[TermHook.bound]`** | `t.set({ '#qtr': 'start' })`<br>`t.set({ '#sprint': 'end' })` | **Boundary Snapping**: Computes exact timestamp boundaries for dynamic/irregular terms. |
| **`[TermHook.format]`** | `t.format('{#FY}-{#FQ}')`<br>`t.format('Sprint {#sprint}')` | **Output**: Interpolates custom `{#[token]}` placeholders in formatting templates. |

---

## 4. Hook Extension Slots Architecture

```mermaid
graph TD
    subgraph Core ["Core Tempo Engine"]
        RT["Runtime State (getRuntime().state.pluginsDb.terms)"]
        LP["Lexer & Parser Fast-Path"]
        AR["Arithmetic Engine (add / sub / diff)"]
        SN["Boundary Snapper (set start/mid/end)"]
        FM["Format Engine"]
    end

    subgraph WellKnownSymbols ["Symbol-Protected Extension Protocol (Symbol.for)"]
        H_PARSE["🪝 [TermHook.parse](input, context)"]
        H_ORDINAL["🪝 [TermHook.ordinal](match, anchor)"]
        H_STEP["🪝 [TermHook.step](unit, count, tempo)"]
        H_DIFF["🪝 [TermHook.diff](other, unit, tempo)"]
        H_BOUND["🪝 [TermHook.bound](boundary, unit, tempo)"]
        H_FORMAT["🪝 [TermHook.format](token, tempo)"]
    end

    subgraph Plugins ["Domain Term Plugins (Phase 2)"]
        T_QTR["QuarterTerm"]
        T_FISC["FiscalTerm"]
        T_SPRINT["SprintTerm"]
    end

    RT --> WellKnownSymbols
    LP -->|If '#' detected| H_PARSE
    LP -->|Ordinal + '#' detected| H_ORDINAL
    AR -->|add/sub {'#term': n}| H_STEP
    AR -->|diff/until '#term'| H_DIFF
    SN -->|set {'#term': 'start'/'end'}| H_BOUND
    FM -->|Custom '{#token}'| H_FORMAT

    T_QTR -.->|Implements Protocol| RT
    T_FISC -.->|Implements Protocol| RT
    T_SPRINT -.->|Implements Protocol| RT
```

---

## 5. Detailed Specifications for Phase 1 (Core Foundation - v4.6.0)

### A. Well-Known Hook Symbols & Interface
Define the symbol constants and protocol interface in [`packages/tempo/src/plugin/term/term.type.ts`](file:///home/michael/Project/magma/packages/tempo/src/plugin/term/term.type.ts):

```typescript
/**
 * Well-Known Symbols for Term Lifecycle Protocol.
 * Utilizing Symbol.for() to guarantee consistency across module boundaries and dual package instances.
 */
export const TermHook = {
  parse: Symbol.for('magmacomputing/tempo/term/parse'),
  ordinal: Symbol.for('magmacomputing/tempo/term/ordinal'),
  step: Symbol.for('magmacomputing/tempo/term/step'),
  diff: Symbol.for('magmacomputing/tempo/term/diff'),
  bound: Symbol.for('magmacomputing/tempo/term/bound'),
  format: Symbol.for('magmacomputing/tempo/term/format')
} as const;

export type TermHookSymbol = typeof TermHook[keyof typeof TermHook];

/**
 * Protocol contract for Term Plugins implementing lifecycle hooks.
 */
export interface TermLifecycleHooks {
  /** Invoked when the lexer/parser encounters an explicit '#' term expression */
  [TermHook.parse]?: (input: string, context: TermParseContext) => Tempo | undefined;

  /** Invoked for ordinal offsets anchored to terms (e.g. "3rd day of #qtr.2") */
  [TermHook.ordinal]?: (groups: Record<string, string>, anchor: Tempo) => Tempo | undefined;

  /** Stepping arithmetic for t.add({ '#term': n }) or t.sub({ '#term': n }) */
  [TermHook.step]?: (unit: string, count: number, tempo: Tempo) => Tempo | undefined;

  /** Difference arithmetic for t1.diff(t2, '#term') or t1.until(t2, { unit: '#term' }) */
  [TermHook.diff]?: (other: Tempo, unit: string, tempo: Tempo) => number | undefined;

  /** Boundary snapping for t.set({ '#term': 'start' | 'mid' | 'end' }) */
  [TermHook.bound]?: (boundary: 'start' | 'mid' | 'end', unit: string, tempo: Tempo) => Tempo | undefined;

  /** Invoked when the format engine encounters a custom term token (e.g. '{#FQ}') */
  [TermHook.format]?: (token: string, tempo: Tempo) => string | undefined;
}
```

### B. Core Lexer & Parser Hook Slot ([`engine.lexer.ts`](file:///home/michael/Project/magma/packages/tempo/src/engine/engine.lexer.ts))
- In the synchronous lexer, check for the presence of `#` (`if (!input.includes('#')) return standardLex()`) before performing any hook lookups.
- If `#` is present and an installed Term implements `[TermHook.ordinal]` or `[TermHook.parse]`, delegate execution.
- If no hook is registered or no match is returned, fall back to standard parser error handling.

### C. Arithmetic & Navigation Slot ([`module.mutate.ts`](file:///home/michael/Project/magma/packages/tempo/src/module/module.mutate.ts))
- In `mutate()` for `type === 'add' | 'subtract'`:
  - When encountering an entry with key starting with `#` (e.g., `{ '#qtr': 1 }`):
    - Retrieve matching Term via `findTermPlugin(key, state)`.
    - Check if `term[TermHook.step]` is defined.
    - Compute step count (`type === 'subtract' ? -count : count`) and delegate to `term[TermHook.step](key, count, tempo)`.
- In `mutate()` for `type === 'set'`:
  - When encountering `{ '#qtr': 'start' | 'mid' | 'end' }`:
    - Check if `term[TermHook.bound]` is defined.
    - Delegate boundary resolution to `term[TermHook.bound](boundary, key, tempo)`.

### D. Difference / Duration Slot ([`module.duration.ts`](file:///home/michael/Project/magma/packages/tempo/src/module/module.duration.ts))
- When evaluating `diff()` / `until()` where the target unit starts with `#` (e.g. `start.until(end, '#sprint')`):
  - Retrieve matching Term via `findTermPlugin(unit, state)`.
  - If `term[TermHook.diff]` is implemented, delegate calculation to `term[TermHook.diff](other, unit, tempo)`.

### E. Format Token Slot ([`module.format.ts`](file:///home/michael/Project/magma/packages/tempo/src/module/module.format.ts))
- Custom brace tokens matching `{#[a-zA-Z0-9_.]+}` (e.g. `{#FQ}`, `{#sprint}`) query registered Terms implementing `[TermHook.format]`.
- Standard formatting tokens (`{yyyy}`, `{MM}`, `{dd:ord}`) remain untouched and zero-cost.

---

## 6. Phase 2: Term Plugin Implementation Pattern

Example of how `QuarterTerm` implements the full protocol cleanly using dictionary syntax:

```typescript
import { defineTerm, TermHook, type TermPlugin, type TermLifecycleHooks } from '@magmacomputing/tempo/plugin/sdk';

export const QuarterTerm = defineTerm({
  key: 'quarter',
  aliases: ['qtr'],

  // Stepping arithmetic: t.add({ '#qtr': 1 }) or t.sub({ '#qtr': 2 })
  [TermHook.step](unit: string, count: number, tempo: Tempo): Tempo | undefined {
    if (unit === '#qtr' || unit === '#quarter') {
      return tempo.add({ months: count * 3 });
    }
    return undefined;
  },

  // Distance arithmetic: t1.diff(t2, '#qtr')
  [TermHook.diff](other: Tempo, unit: string, tempo: Tempo): number | undefined {
    if (unit === '#qtr' || unit === '#quarter') {
      const monthDiff = tempo.diff(other, 'months');
      return Math.trunc(monthDiff / 3);
    }
    return undefined;
  },

  // Boundary snapping: t.set({ '#qtr': 'start' | 'end' })
  [TermHook.bound](boundary: 'start' | 'mid' | 'end', unit: string, tempo: Tempo): Tempo | undefined {
    const qtrMonth = Math.floor((tempo.month - 1) / 3) * 3 + 1; // 1, 4, 7, 10
    if (boundary === 'start') {
      return tempo.set({ month: qtrMonth, day: 1, hour: 0, minute: 0, second: 0, ms: 0 });
    }
    if (boundary === 'end') {
      return tempo.set({ month: qtrMonth + 2 }).set({ month: 'end', day: 'end', hour: 'end' });
    }
    return undefined;
  },

  // Format token: t.format('{#Q}') -> 'Q4'
  [TermHook.format](token: string, tempo: Tempo): string | undefined {
    if (token === '#Q') {
      return `Q${Math.ceil(tempo.month / 3)}`;
    }
    return undefined;
  }
});
```

---

## 7. Verification & Testing Strategy

1. **Zero-Overhead Benchmark**:
   - Run microbenchmarks on `new Tempo('2026-10-08')`, `new Tempo('3rd Thursday of November')`, and `t.add({ months: 1 })` to ensure execution times are unchanged with hook slots in place.
2. **Mock Term Hook Suite**:
   - Implement test suite in `packages/tempo/test/plugin/term_hooks.test.ts` verifying:
     - Dynamic registration via `Tempo.use(MockTermWithHooks)`.
     - Fast-path fallback when no term hook is present or when `#` is absent.
     - Successful dispatch of all 6 hooks:
       - `[TermHook.parse]`
       - `[TermHook.ordinal]`
       - `[TermHook.step]` with `t.add({ '#mock': 2 })` and `t.sub({ '#mock': 1 })`
       - `[TermHook.diff]` with `t1.diff(t2, '#mock')`
       - `[TermHook.bound]` with `t.set({ '#mock': 'start' })`
       - `[TermHook.format]` with `t.format('{#mockToken}')`
     - Cross-module symbol identity verification (`Symbol.for`).
