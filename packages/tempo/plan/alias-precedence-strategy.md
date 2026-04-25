# Alias Precedence Strategy (Custom Over Built-in)

## Context
A parser conflict was identified where a user-defined alias (`half-hour`) did not override the built-in pattern (`half[ -]?hour`).

Implemented behavior now gives user-defined `event` and `period` aliases precedence over existing built-ins by placing incoming aliases first in evaluation order.

## Risks Of Custom-First Precedence
1. Behavioral change risk
   - Existing consumers that relied on built-ins winning may observe changed parse results.

2. Pattern overlap ambiguity
   - Regex-like aliases can overlap in non-obvious ways, making the selected winner surprising.

3. Global side effects
   - A single custom alias can change parsing behavior globally after `Tempo.init()` or plugin registration.

4. Ordering sensitivity
   - If precedence is based only on merge order, results can vary depending on discovery/store/options composition.

## Why Not Use Symbol Keys For Public Aliases
Using `Symbol` for alias keys is not recommended as a public API:
- Alias definitions are string/regex patterns and must be converted into regex groups.
- Discovery and storage payloads are JSON/string keyed; Symbols are not portable in that flow.
- Symbols reduce inspectability and debuggability for users.

Recommended: keep string keys for matching, optionally use internal metadata (including Symbols if desired) for identity bookkeeping only.

## Current Mitigation Implemented
1. Custom aliases are evaluated before existing aliases.
2. Collision warnings are emitted when an incoming alias appears to overlap an existing alias pattern.

## Recommended Follow-Up Improvements
1. Add explicit priority metadata
   - Introduce structured alias records with fields like `source`, `priority`, and `insertionIndex`.
   - Suggested default ordering: custom > plugin > built-in.

2. Add strict conflict mode
   - Optional config mode that throws on ambiguous overlaps instead of only warning.

3. Improve collision diagnostics
   - Include winning and losing aliases and origin (`builtin/custom/plugin`) in warning messages.

4. Add deterministic override tests
   - Custom exact override over built-in regex.
   - Plugin override over built-in.
   - Non-overlapping aliases remain stable.
   - Strict mode throws on overlap.

5. Add canonicalization policy (optional)
   - Consider normalizing common punctuation/spacing variants for consistency.
   - Only apply if it does not break existing regex-driven alias power.

## Practical Guidance For Future Alias Additions
- Prefer specific patterns over broad regexes.
- Avoid introducing aliases that can match common built-in forms unless override is intentional.
- When overriding a built-in alias, add tests that assert both match winner and output behavior.
