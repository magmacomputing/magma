# Localized Mathematical Modifiers

## Objective
Enable full localization of mathematical modifier terms (e.g., mapping `"prochain"` to `">"` or `"next"`) and gracefully handle grammatical structure variations, such as inverted word ordering (e.g., trailing modifiers like `[weekday] [modifier]` vs. the English default `[modifier] [weekday]`).

## Architectural Considerations

### 1. Decoupling Math from Hardcoded English
Currently, the `parseModifier` function in `engine.lexer.ts` uses a strict `switch` statement that evaluates literal English strings (e.g., `case 'next': return 1`). 
- **Challenge**: Passing foreign strings like `"prochain"` directly to this switch fails and defaults to `0`.
- **Solution Space**: Introduce a pre-lexing normalization step or a `modifier` registry that maps foreign string literals to standard internal mathematical tokens (like `>`, `<`, `+`, `-`) before they hit the mathematical evaluator.

### 2. Lexer & Master Guard Layout Flexibility
Tempo’s `Token.wkd` and standard layouts (e.g., `Pattern.WkdTime`) currently expect modifiers in specific positions (often as prefixes, with limited hardcoded suffixes like `next|last` for English).
- **Challenge**: When `parse: { localize: true }` is enabled, the localized snippet overrides completely drop trailing suffix captures.
- **Solution Space**: Update `support.init.ts` and `support.default.ts` to dynamically generate both prefix and suffix capture groups (`<mod_pre>` and `<mod_suf>`) in the localized regexes, allowing the parser to extract the modifier regardless of which side of the noun it appears.

### 3. Locale-Specific Grammatical Nuances
Different languages place modifiers in different structural positions depending on the entity.
- **Challenge**: A language might use a suffix for days (e.g., "vendredi prochain") but a prefix for other temporal periods.
- **Solution Space**: Should structural expectations be strictly tied to `Intl` locale codes, or should the engine use a "greedy" approach where it just attempts to extract modifiers from either side of the token without strictly enforcing grammatical correctness?

### 4. Configuration API Design
How will developers interact with this new capability?
- **Option A**: A brand new top-level configuration registry: `Tempo.init({ modifier: { 'prochain': 'next', 'dernier': 'last' } })`.
- **Option B**: Expanding the existing `event` or `snippet` objects.
- **Option C**: Can we extract these modifier words automatically from `Intl.RelativeTimeFormat`? (Investigate if `Intl` provides sufficient grammatical connector data).

### 5. Performance Implications
The core speed of Tempo relies heavily on Master Guard (RegEx) optimization and caching.
- **Challenge**: Adding multiple optional prefix and suffix capture branches to core snippets (like `wkd` and `rel`) will increase the complexity and backtracking potential of the Master Guard patterns.
- **Solution Space**: Ensure careful benchmarking when adding dynamic `<sfx>` groups to localized patterns.
