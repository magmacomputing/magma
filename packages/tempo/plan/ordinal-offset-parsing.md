> [!WARNING]
> **SHELVED: THOUGHT-EXPERIMENT ONLY**
> This document is a conceptual thought-experiment exploring the architecture for ordinal offset parsing. It is currently shelved and is **not** a definite plan for any future release.

# Ordinal Offset Parsing Strategy

**Goal**: Investigate the feasibility and architecture required to allow Tempo to parse "Ordinal Offset" queries, such as "1st day of May", "3rd Thursday of November", or "3rd day of #qtr.2".

## 1. Core Concepts & Use Cases

An "Ordinal Offset" query can be broken down into three logical components:
1. **The Nth Index** (`{nth}`): A numeric value (1st, 2nd, 3rd, 100th) or semantic keyword ("last" = -1).
2. **The Constraint** (`{wkd}` or `{unt}`): The unit being counted (e.g., "Thursday", "day", "week").
3. **The Boundary** (`{mm}{yy}` or `{slk}`): The context in which the counting occurs (e.g., "November", "2026", "#qtr.2", "month").

**Primary Use Cases**:
- **Nth Unit of Term/Month**: "3rd day of #qtr", "100th day of year", "last day of May"
- **Nth Weekday of Term/Month**: "3rd Thursday of November", "1st Sunday of #szn", "last Friday of month"

## 2. Proposed Architecture & Additions

To natively support this without breaking the existing Regex Layout engine, we would need to introduce the following:

### A. New Snippets (Lexical Tokens)
Currently, `{dd}` only captures `01 - 31`. For ordinal counts, we need a dedicated numeric index capture that also understands semantic time-shifting words.
- `[Token.nth]`: `/(?<nth>(?:[1-9][0-9]{0,2}){ord}?|first|last|next|prev)/`
  *(Matches: '3rd', '100th', 'last', 'first', 'next', 'prev')*

### B. New Layouts (Pattern Combinations)
We combine our tokens into new ordinal-specific layouts, omitting the word "of" since it is already stripped by the `Ignore` array.
- `[Token.ordWkdBound]`: `'{nth} {wkd} ({mm}({sep}?{yy})?|(?<slk>{slk}))'`  
  *(Matches: "3rd Thursday November", "last Friday #qtr")*
- `[Token.ordUntBound]`: `'{nth} {unt} ({mm}({sep}?{yy})?|(?<slk>{slk}))'`  
  *(Matches: "100th day 2026", "3rd day #qtr.2")*

### C. Resolution Engine (Temporal Math)
When `engine.lexer.ts` successfully extracts these groups, the `Tempo` parser engine will delegate the arithmetic to the underlying `Temporal` API.

**Example 1: "3rd Thursday of November 2026"**
1. **Resolve Boundary**: Engine parses "November 2026" and creates an `Interval` bounding start/end.
2. **Find Anchor**: Determine the date of the *first* Thursday within that month.
3. **Shift**: Add `(3 - 1) = 2` weeks to that anchor.
4. **Validate**: Assert that the resulting date still falls within the November boundary (e.g., there might not be a 5th Thursday).

**Example 2: "last day of #qtr.2"**
1. **Resolve Boundary**: Delegate to `module.term.ts` to get the `Interval` for Quarter 2.
2. **Shift**: Because `nth` is "last" (-1), start at the `Interval.end` and subtract 1 day.

## 3. Challenges & Considerations

1. **The Word "of"**: Currently, "of" is in the global `Ignore` array and is blindly stripped. This is great for parsing, but we must ensure stripping "of" doesn't accidentally collide with other natural language formats.
2. **Boundary Validation**: A query like "100th day of February" or "6th Friday of May" is mathematically impossible. The engine would need to gracefully catch the out-of-bounds result and throw a meaningful `TempoError`.
3. **Slick Math Collisions**: Slick Math currently supports shifting (e.g., `#qtr > 3d`). Ordinal parsing introduces an alternative way to express the same intent in natural language. We'd need to ensure the AST doesn't confuse `3rd day of #qtr` with `#qtr > 3d`.

## 4. Impact Analysis & Tempo-Ethos

When proposing any new feature, we must evaluate the architectural blast radius:

### Estimated Impact
- **Lines of Code**: ~50-80 lines of new logic.
- **Modules Affected**: 
  - `support.default.ts` (adding 1 Token, 2 Layouts)
  - `support.symbol.ts` (adding the `ordWkdBound` and `ordUntBound` symbols)
  - `engine.normalizer.ts` or `module.mutate.ts` (adding the AST resolution branch for these new layouts).

### Opt-in vs. Auto-provided (Core vs. Plugin)
**Recommendation**: Make it a core feature (Auto-provided).
- *Why?* Tempo's ethos heavily favors keeping date-math and natural language parsing in the core engine out-of-the-box, ensuring that fundamental time-expressions work universally without users having to hunt for plugins. Since this only requires two new lightweight layouts and leverages the existing AST parsing tree, the bundle-size impact is negligible, and it aligns perfectly with the "it just works" philosophy of Tempo.

### Alignment with Tempo-Ethos
This fits beautifully into the existing ethos. The core `Snippet -> Layout -> Pattern` pipeline was specifically designed so that new natural-language expressions could be added declaratively without writing brittle procedural parsing code. Expanding `{nth}` to gracefully handle `first`, `last`, `next`, and `prev` directly mirrors our existing robust keyword support in other areas (like `[Token.afx]`).

## Conclusion
**Can we do it?** Yes, absolutely. The current architecture is already perfectly shaped for it.
**Should we do it?** It adds significant natural-language capability for developers building scheduling apps (e.g., "Schedule meeting for 1st Monday of every Month"), with a very low architectural impact and high alignment with Tempo's design philosophy.
