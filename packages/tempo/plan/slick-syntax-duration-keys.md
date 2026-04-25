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
`t1.set({ week: ">2Mon" })` - advances to the 2nd following Monday.

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

Illustrative Phase 1 examples:
```javascript
// assign by weekday name (short/full)
t1.set({ wkd: 'Mon' });
t1.set({ wkd: 'Monday' });

// relative token: move to the next occurrence of the current weekday
t1.set({ dow: 'next' });

// numeric-relative offset: advance N weekdays
t1.set({ dow: '>2' });
```

Rationale:
- Strong existing parser support for weekday-relative logic.
- Lowest ambiguity.
- High utility for natural expressions.

### Phase 2
Evaluate `week` key support with explicit semantics.

Possible contract (to validate):
- `">2Mon"` means advance to the second following Monday using a defined week anchor policy.

Must define:
- What is the anchor week?
- How cross-boundary transitions are counted.
- Whether current-week matches are included/excluded.

### Phase 3 (Optional)
Evaluate month/year key Slick forms only after policies are formalized for overflow and day clamping.

## Suggested Semantics Guardrails
- Parse grammar should be key-aware, not global.
- Unsupported key+pattern combinations should throw descriptive errors.
  - Illustrative template (invalid pattern for `month` key): `Invalid Slick pattern for key "month": ">>3". Expected numeric offset or supported month-token form.`
  - Illustrative template (unsupported week-anchor modifier): `Unsupported week-anchor modifier for key "week": "^Mon". Supported modifiers are ">", ">=", "<", "<=" with a valid weekday anchor.`
  - These are illustrative templates for consistent feedback when throwing key+pattern validation errors in Slick syntax parsing logic.
- Keep existing numeric/object mutation behavior unchanged.
- Preserve term Slick behavior exactly unless explicitly version-gated.

## Compatibility & Risk Notes
- Main risk: user confusion between term and unit semantics when both accept similar modifiers.
- Mitigation:
  - Explicit per-key docs and examples.
  - Validation errors for unsupported combinations.
  - Incremental rollout with tests per key.
  - Backward compatibility: Scan for existing Slick patterns that could collide with new unit-key syntax, add compatibility tests for known legacy patterns, and use a staged deprecation/rollout strategy (for example opt-in flag + warnings before default-on behavior).
  - Performance: Measure parser impact in hot paths, publish benchmark/profile results, and add mitigation tactics such as caching parse results and fast-path guards for common valid forms.

## Testing Strategy (Future)
- Add table-driven tests for each supported key (`wkd`, `dow`, `week`).
- For each key (`wkd`, `dow`, `week`), include explicit edge-case categories:
  - DST transitions (spring-forward/fall-back behavior).
  - Leap-year boundaries (Feb 29 <-> Feb 28).
  - End-of-month rollovers (for example Jan 31 -> Feb 28/29).
  - Cross-year transitions (Dec -> Jan).
- For each edge-case category, include timezone-sensitive variants.
- Add regression tests proving existing Slick term behavior is unchanged.

## Open Questions
1. Should `week` Slick be interpreted relative to current date, start-of-week, or nearest matching weekday?
2. Should symbolic modifiers (`>`, `>=`, `<`, `<=`) map exactly to current term Slick semantics?
  - Recommended answer (Question 2): Yes. Symbolic modifiers (`>`, `>=`, `<`, `<=`) should map exactly to current term Slick semantics to preserve consistency and reduce cognitive load for existing users.
  - Justification: Reusing established modifier behavior minimizes migration friction, strengthens backward-compatibility expectations, and avoids introducing a second mental model for nearly identical syntax.
  - Action item (implementation/testing): Codify an explicit operator mapping table shared between term and unit Slick paths, and add parity tests plus backward-compatibility regression tests proving modifier behavior is unchanged.
3. Do we allow number words (`two`) in unit Slick counts, or numbers only?
4. Should this ship behind a parse/mutate option flag first?

## Recommendation
### Timeline & Priority (Optional)
- Priority: Medium
- Estimated effort:
  - Phase 1 (`wkd`/`dow`): ~2-3 days (spec + implementation + tests + docs)
  - Phase 2 (`week`): ~3-5 days due to additional semantic complexity

Proceed with a conservative, phased implementation:
1. Formal spec for `wkd`/`dow` first.
2. Implement + test + document.
3. Evaluate `week` syntax (`">2Mon"`) after semantics are signed off.
