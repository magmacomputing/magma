# Slick Syntax Extension for Duration Keys

## Status
- Proposed for a future release (not scheduled in the current release).
- Intent: evaluate design and rollout without breaking existing term-based Slick behavior.

## Context
Today, Slick Syntax is centered on Term mutation resolution (for example `#term` and `#term.modifier` forms).
Mutation routing for object inputs currently distinguishes:
- Term-style mutations (`#...` or discovered term plugins)
- Standard unit mutations (`year`, `month`, `week`, `day`, etc.)
- Parser-backed set operations (`period`, `event`, `time`, `date`, `dow`, `wkd`)

This creates an opportunity to support human-friendly modifier strings on selected duration/unit keys.

## Goal
Allow selected non-term mutation keys to accept Slick-style strings, starting with the most intuitive use-cases.

Example candidate syntax:
- `t1.set({ week: ">2Mon" })`

## Key Architectural Principle
Keep two concepts distinct:
- Term Slick: range-based/cycle-aware term navigation.
- Unit Slick: field-oriented mutation grammar interpreted per key.

Do not merge these conceptually into one generic resolver until semantics are explicit and deterministic per key.

## Why Not Full Unification Immediately
Term ranges and unit fields have different semantics:
- Terms represent named cyclical windows.
- Duration keys represent arithmetic or calendar-field operations.

A single generic parser without key-scoped rules risks ambiguous behavior and regressions.

## Proposed Direction
Introduce key-scoped Slick handling for duration/unit keys in phases.

### Phase 1 (Recommended First Step)
Add Slick support for weekday-style keys only:
- `wkd`
- `dow`

Rationale:
- Strong existing parser support for weekday-relative logic.
- Lowest ambiguity.
- High utility for natural expressions.

### Phase 2
Evaluate `week` key support with explicit semantics.

Possible contract (to validate):
- `">2Mon"` means advance to the second next Monday using a defined week anchor policy.

Must define:
- What is the anchor week?
- How cross-boundary transitions are counted.
- Whether current-week matches are included/excluded.

### Phase 3 (Optional)
Evaluate month/year key Slick forms only after policies are formalized for overflow and day clamping.

## Suggested Semantics Guardrails
- Parse grammar should be key-aware, not global.
- Unsupported key+pattern combinations should throw descriptive errors.
- Keep existing numeric/object mutation behavior unchanged.
- Preserve term Slick behavior exactly unless explicitly version-gated.

## Compatibility & Risk Notes
- Main risk: user confusion between term and unit semantics when both accept similar modifiers.
- Mitigation:
  - Explicit per-key docs and examples.
  - Validation errors for unsupported combinations.
  - Incremental rollout with tests per key.

## Testing Strategy (Future)
- Add table-driven tests per supported key (`wkd`, `dow`, later `week`).
- Include boundary tests across month/year transitions.
- Include timezone-sensitive cases.
- Add regression tests proving existing term Slick behavior is unchanged.

## Open Questions
1. Should `week` Slick be interpreted relative to current date, start-of-week, or nearest matching weekday?
2. Should symbolic modifiers (`>`, `>=`, `<`, `<=`) map exactly to current term Slick semantics?
3. Do we allow number words (`two`) in unit Slick counts, or numbers only?
4. Should this ship behind a parse/mutate option flag first?

## Recommendation
Proceed with a conservative, phased implementation:
1. Formal spec for `wkd`/`dow` first.
2. Implement + test + document.
3. Evaluate `week` syntax (`">2Mon"`) after semantics are signed off.
