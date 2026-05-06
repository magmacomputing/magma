# Alias Migration: Phase 2 - Full Resolution Engine

This document outlines the remaining tasks to complete the migration from legacy alias management to the centralized `AliasEngine` architecture. The goal is to move all interpretation and mutation logic out of the Parser and into the Engine.

## 1. Consolidate Resolution Context (The "Host" Object)
Currently, `discrete.parse.ts` manually constructs a "pseudo-Tempo" `host` object to pass into functional aliases. This logic should be standardized and moved to a helper.

- [ ] Create a `getResolutionContext(state, dateTime)` helper in `support` or `AliasEngine`.
- [ ] Ensure the context provides `add`, `subtract`, `with`, `set`, and time-unit accessors.
- [ ] Remove the manual host construction from `discrete.parse.ts`.

## 2. Hardened Clock Snapping
Aliases that resolve to a time-string (`hh:mm[:ss]`) currently have two different paths depending on whether they are static or functional.

- [ ] **Standardize Paths**: Both static and functional aliases should trigger the "snap" path if they match `Match.clock`.
- [ ] **Fix Precision Leak**: Ensure that snapping to a clock-time clears ALL sub-second components (ms, us, ns) from the anchor.
- [ ] **Support High-Precision**: Update the snapping logic to support `hh:mm:ss.ffffff` patterns natively.
- [ ] **Engine-Level Detection**: Move the `Match.clock` test into `AliasEngine.resolveAlias`.

## 3. Rich Alias Results
Instead of returning a raw `string | number`, the `AliasEngine` should return a structured result object.

- [ ] Define `AliasResult` interface:
  ```typescript
  interface AliasResult {
    value: string;
    key: string;      // The original baseName (e.g., 'noon')
    type: 'evt' | 'per';
    source: 'global' | 'local';
    isClock: boolean; // True if it matched Match.clock
  }
  ```
- [ ] Update `resolveAlias` to return this structure.

## 4. Parser Cleanup
With the Engine handling the "what" and "how" of resolution, the Parser can focus on the "when".

- [ ] Refactor `parseGroups` in `discrete.parse.ts` to consume the new `AliasResult`.
- [ ] Remove manual string-splitting and mutation logic from the Parser.
- [ ] Leverage the `source` metadata from the result instead of manually parsing regex group names (like `evt1_0`).

## 5. Lifecycle & Monitoring
- [ ] Implement `AliasEngine.getVersion()` or similar to allow `Tempo` class to detect registry changes without deep-cloning.
- [ ] Audit `tempo.class.ts` for any remaining direct access to `parse.event` or `parse.period`.

---

> [!IMPORTANT]
> **Priority 1**: Hardening the clock-snapping logic and fixing the sub-second precision leak.
