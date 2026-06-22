# Snippet Keys for Slick Object Mutations

## Status
- Proposed for a future release (not scheduled in the current release).
- Intent: Evaluate introducing Snippet/Format Token keys to `.set()` specifically for Slick relative mutations, avoiding union types on standard duration keys.

## Context
Today, Slick Syntax is centered on Term mutation resolution (for example `#term` and `#term.modifier` forms). 
We previously considered adding Slick string support to standard duration keys (e.g., `month: '>5'`), but this introduces significant typing issues in TypeScript (forcing `number | string` union types) and runtime parsing ambiguity.

By introducing **Snippet Keys** (Format Tokens) as the exclusive keys for Slick string operations, we establish perfect separation of concerns:
- **Absolute Assignment:** Uses standard duration keys (e.g., `{ month: 5 }`). Strictly typed as `number`.
- **Relative Slick Math:** Uses snippet keys (e.g., `{ mm: '>5' }`). Strictly typed as `string`.

## Goal
Allow developers to use a core subset of Tempo's Format Tokens (Snippet keys) within `.set()` to perform powerful, relative Slick mutations. We explicitly exclude this functionality from `.add()` to preserve the architectural separation between assignment/navigation (`.set()`) and simple arithmetic (`.add()`).

Supported subset of Snippet keys:
- `yy` (Year)
- `mm` (Month)
- `ww` (Week - *New addition needed*)
- `dd` (Day)
- `hh` (Hour)
- `mi` (Minute - Note: intentionally distinct from `minute` to prevent `m`/`M` ambiguity)
- `ss` (Second)
- `wkd` (Weekday)

*(Note: We intentionally exclude format-only tokens like `ord`, `ff`, `mer`, `sfx`, `nbr`, `afx`, `mod`, `sep`, `unt`, `brk`, `slk`)*

## Example Syntax & Payload Types
Different keys expect slightly different string payloads:
- **Numeric Keys (`yy`, `mm`, `dd`, `ww`, `hh`, `mi`, `ss`):** Expect a shift operator and an optional number (defaulting to 1). Example: `{ yy: '>' }` (implies 1 year forward) or `{ dd: '>5' }`.
- **Named Keys (`wkd`):** Expect a shift operator, an optional number, and an optional name. Example: `{ wkd: '>' }` (implies 1 weekday forward) or `{ wkd: '>2fri' }`.

```javascript
// Set the absolute month to December, then advance to the next Friday
t1.set({ month: 12, wkd: '>Fri' });

// Advance 3 months, then find the 2nd following Monday
t1.set({ mm: '>3', wkd: '>2Mon' });
```

## Key Architectural Principles
### 1. Pure Types
The TypeScript compiler remains happy. Standard keys (`month`, `day`) are strictly numeric. Snippet keys (`mm`, `dd`) are strictly strings containing Slick syntax.

### 2. Alignment with Term Slick Syntax
The proposed syntax does not depart from established styles; it fully harmonizes with existing Term Slick syntax. Just as `#year.>` implies exactly 1 year forward, an optional number in `{ yy: '>' }` perfectly mirrors that convention without stepping on any toes.

### 3. Execution Order and Linter Warnings
Because JavaScript execution relies on object key insertion order, there is a risk that auto-formatters (like ESLint's `sort-keys`) might alphabetize keys on save, silently breaking sequential date math.
**Our Posture:** We process the keys in JS insertion order. We will explicitly document this behavior with a disclaimer: *"If you use an auto-formatter that sorts object keys alphabetically, complex multi-key math may break. For guaranteed deterministic order, stick with `.set()` chaining."*

```javascript
// Vulnerable to auto-formatters:
t1.set({ wkd: '>Fri', mm: '>3' });

// Safe and recommended:
t1.set({ wkd: '>Fri' }).set({ mm: '>3' });
```

## Open Questions & Edge Cases

### Double Negation & Math Synonyms
How does the parser handle `{ mm: '>-2' }`?
- **Analysis:** Mathematically, advancing by a negative number is stepping backwards. `>-2` should evaluate exactly the same as `<2` (and similarly `<-2` = `>2`).
- **Recommendation:** The Slick parser must natively support negative numbers and handle the mathematical synonym logic gracefully without failing.

### The `{ tzd: '+10:00' }` Edge Case
Can we support explicitly mutating the `timeZone` of the instance using a special syntax like `{ tzd: '+10:00' }`?
- **Analysis:** This would allow a user to instantly shift a Tempo instance to a different timezone offset (e.g., for a dashboard tracking East Coast and West Coast clocks). However, setting absolute timezones via an object mutation crosses a conceptual boundary (mutating context vs mutating time).
- **Recommendation:** Do not include `tzd` in the initial `SLICK_KEYS` implementation. Users can already achieve this cleanly without Slick syntax by using standard properties (e.g., passing `{ timeZone: '+10:00' }` directly if supported, or cloning the instance).

## Proposed Direction & Phasing

### Phase 1: Core Snippet Implementation
1. Add `ww` (weeks) to the internal mapping to round out the duration subset.
2. Introduce a dedicated type/constant (e.g., a `SLICK_KEYS` array) to systematically define valid keys and cleanly generalize the `conform()` mapping.
3. Update the `conform()` engine to accept the core subset (`yy, mm, ww, dd, hh, mi, ss, wkd`) as strictly strings.
4. Route these specific keys directly to the Slick regex parser.
5. Add clear validation errors: e.g., if a user passes `'>5'` to `month`, throw `"For relative Slick math, use the 'mm' snippet key instead of 'month'."`

### Phase 2: Documentation & Testing
1. Add table-driven tests for each supported snippet key.
2. Ensure test cases comprehensively cover **negative shifts** as well (e.g., `<1`, `<2wkd` to step backwards).
3. Ensure chaining tests prove out deterministic behavior.
4. Update the cookbook with the ESLint/Prettier chaining warning.

### Phase 3 (Future): Evaluate `tzd`
Revisit `{ tzd: '>1' }` once the core snippet slick logic has stabilized.
