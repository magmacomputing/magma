<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-dialects</a>
</div>

<br>

# Design Strategy & Deliberate Omissions

Why Tempo Chose `{token:modifier}` Over Historical Dialects

The `@magmacomputing/tempo-plugin-dialects` plugin exists to provide complete interoperability and zero-downtime migration paths for codebases written in **Moment.js**, **Day.js**, **Luxon**, **date-fns**, **POSIX `strftime`**, **PHP**, and **SQL `TO_CHAR`**.

However, when engineering Tempo's native formatting engine, we deliberately chose **not** to adopt any single historical token system. Decades of formatting history have accumulated conflicting token semantics, capitalization traps, and combinatorial token explosions that frequently cause catastrophic production bugs.

This document outlines the architectural principles behind Tempo's `{token:modifier}` syntax and explains the specific dialect features we deliberately chose to omit.

---

## 🏛️ Part A: The Token:Modifier Design Strategy

Tempo's format syntax is founded on four core principles:

### 1. The All-Lowercase Principle: Eliminating the Capitalization Trap

In historical dialects, a single shift-key difference changes the entire semantic target of a format string. This is the single largest source of date-formatting bugs in modern software:

* **Month vs. Minute (`MM` vs `mm`)**: In Moment, LDML, and SQL, `MM` is month and `mm` is minute. An accidental typo like `HH:MM:ss` silently formats the month where minutes should appear.
* **The New Year Billing Catastrophe (`YYYY` vs `yyyy`)**: In Unicode LDML (Luxon, date-fns), `yyyy` is the standard calendar year, while `YYYY` represents a **locale-dependent week-based year** (which resolves to the ISO week-numbering year under ISO/European week rules, or the local week year in US locales). Under ISO rules, a format mask like `YYYY-MM-dd` outputs `2026-12-31` on December 31, 2025 because that day belongs to Week 1 of 2026. This bug has repeatedly broken payment gateways, reporting systems, and billing pipelines across the tech industry.
* **Day of Month vs. Day of Week (`D` vs `d`)**: In Moment, `D` is day of month (`1-31`) and `d` is day of week (`0-6`). In LDML, `d` is day of month (`1-31`) and `e` / `c` is day of week.

**The Tempo Solution**:  
All primary Tempo format tokens are **strictly lowercase** and uniquely named:
* `{yyyy}`: 4-digit calendar year (`2026`)
* `{yy}`: 2-digit calendar year (`26`)
* `{yow}`: 4-digit ISO week-numbering year (`2026`)
* `{mm}`: Zero-padded month (`01`-`12`)
* `{mi}`: Zero-padded minute (`00`-`59`)
* `{dd}`: Zero-padded day of month (`01`-`31`)
* `{hh}`: 24-hour clock (`00`-`23`)
* `{h12}`: 12-hour clock (`01`-`12`)
* `{ss}`: Zero-padded second (`00`-`59`)

You never need to remember whether a token was uppercase or lowercase. Capitalization in Tempo is reserved strictly for modifier transformations (e.g. `:upper`, `:lower`, `:title`).

---

### 2. Getter-to-Token Symmetry: Zero Context Switching

In legacy libraries, there is a total disconnect between how you read a property in code and how you format it in a template:

| Concept | Native JS / Moment Method | Legacy Format Token | Tempo Getter Property | Native Tempo Format Token |
| :--- | :--- | :--- | :--- | :--- |
| **Year** | `d.getFullYear()` | `YYYY` / `yyyy` / `%Y` | `t.yy` | `{yy}` / `{yyyy}` |
| **Month** | `d.getMonth() + 1` | `MM` / `%m` / `m` | `t.mm` | `{mm}` |
| **Day** | `d.getDate()` | `DD` / `dd` / `%d` | `t.dd` | `{dd}` |
| **Hour (24h)** | `d.getHours()` | `HH` / `%H` / `H` | `t.hh` | `{hh}` |
| **Minute** | `d.getMinutes()` | `mm` / `%M` / `i` | `t.mi` | `{mi}` |
| **Second** | `d.getSeconds()` | `ss` / `%S` / `s` | `t.ss` | `{ss}` |
| **Millisecond** | `d.getMilliseconds()` | `SSS` / `%f` / `v` | `t.ms` | `{ms}` |
| **ISO Week Year** | `d.isoWeekYear()` | `GGGG` / `YYYY` / `%G` | `t.yow` | `{yow}` |
| **ISO Week** | `d.isoWeek()` | `WW` / `ww` / `%V` | `t.woy` | `{woy}` |
| **Weekday** | `d.isoWeekday()` | `E` / `%u` / `N` | `t.dow` | `{dow}` |

When you learn Tempo's instance properties, you have already learned the format tokens. There is zero mental translation required between writing business logic (`if (t.hh >= 12)`) and writing format strings (`"{hh}:{mi}"`).

---

### 3. Composable Modifiers vs. Combinatorial Token Explosion

Historical dialects solve formatting variations by inventing hundreds of arbitrary, single-purpose tokens:

* **LDML**: `M`, `MM`, `MMM`, `MMMM`, `MMMMM`, `L`, `LL`, `LLL`, `LLLL`, `LLLLL`
* **POSIX `strftime`**: `%b`, `%B`, `%h`, `%m`, `%-m`, `%_m`, `%d`, `%-d`, `%e`, `%j`
* **Moment**: `D`, `DD`, `Do`, `DDD`, `DDDD`, `DDDo`, `d`, `dd`, `ddd`, `dddd`, `do`

Developers cannot realistically memorize all these tokens, leading to constant documentation lookups.

**The Tempo Solution**:  
Tempo decouples the **semantic data token** from its **presentation modifier**. Modifiers are composable and chainable using a colon (`:`):

| Modifiers Applied | Expression | Output (for 2026-10-24 15:05:09) | Description |
| :--- | :--- | :--- | :--- |
| *None (default)* | `{mon}` | `October` | Base token (capitalized name) |
| `:upper` | `{mon:upper}` | `OCTOBER` | Forced uppercase |
| `:lower` | `{mon:lower}` | `october` | Forced lowercase |
| `:short` | `{mon:short}` | `Oct` | Abbreviated name (alias: `{mmm}`) |
| `:locale` | `{mon:locale}` | `octobre` (in French) | Full localized name |
| `:locale:title` | `{mon:locale:title}` | `Octobre` | Localized name with title-casing |
| `:ord` | `{dd:ord}` | `24th` | Ordinal suffix |
| `:raw` | `{mi:raw}` | `5` | Unpadded number |
| `:space` | `{dd:space}` | ` 4` (for day 4) | Space-padded instead of zero-padded |
| `:<width>` | `{yyyy:-2}` | `26` | Sliced to last 2 digits |
| `:roman` | `{mm:roman}` | `X` | Roman numeral representation |
| `:roman:lower` | `{mm:roman:lower}` | `x` | Lowercase Roman numeral |

Instead of memorizing dozens of distinct tokens, developers learn a small set of orthogonal modifiers (`:ord`, `:raw`, `:upper`, `:locale`, `:space`) that can be applied consistently across **any** token.

---

### 4. Braced Architecture vs. Literal Escaping Nightmares

In historical libraries, arbitrary literal text embedded in format strings is notoriously fragile:

* **Moment / Day.js**: Requires square brackets (`[Recorded on] YYYY-MM-DD`). Forgetting brackets results in `Recorded on` converting characters like `d`, `a`, `y`, `M`, and `o` into date parts. Escaping an actual bracket requires `[\[nested\]]`.
* **Unicode LDML**: Requires single quotes (`'Recorded on' yyyy-MM-dd`). Escaping single quotes requires double quotes (`'It''s time'`).
* **Go `time.Format`**: Has **no escape mechanism whatsoever**. Literal text containing Go reference tokens (`Jan`, `Mon`, `1`, `2`, `02`, `2006`) cannot be escaped and will unpredictably mutate.
* **POSIX `strftime`**: Unescapable literal `%` characters require `%%`.

**The Tempo Solution**:  
In Tempo, **all text outside curly braces is literal by default**:
```typescript
t.format("Recorded on {yyyy}-{mm}-{dd} at {hh}:{mi}!");
// "Recorded on 2026-10-24 at 15:30!"
```
To print literal braces, simply double them: `{{` produces `{` and `}}` produces `}`. No quotes, brackets, or backslash escapes needed.

---

## 🚫 Part B: Deliberate Omissions & Architectural Boundaries

When building the `@magmacomputing/tempo-plugin-dialects` compatibility engine, we identified several legacy dialect behaviors that we deliberately chose **not** to adopt into native Tempo or promote as best practices:

### 1. Non-ISO Locale Week-Numbering Years (Moment `gggg` / `gg`)
* **The Legacy Behavior**: Moment's `gggg` and `gg` compute week-numbering years based on the locale's first day of the week (e.g. Sunday in the US, Monday in ISO, Saturday in the Middle East). In contrast, PHP `o` and POSIX `%G` strictly compute the ISO 8601 week-numbering year, which Tempo directly supports via `{yow}`.
* **Why We Omitted It**: Locale-dependent week-year calculations lack an unambiguous international standard. In the US, week 1 is often defined simply as the week containing January 1st, whereas ISO 8601 requires week 1 to contain the first Thursday (or 4 days in January). This divergence creates non-deterministic calendar drift across client machines depending on their browser locale. Tempo anchors strictly to the international ISO 8601 standard (`{yow}`, `{woy}`, `{dow}`), guaranteeing consistent results across all runtime environments.

### 2. Confusing 1–24 and 0–11 Hour Systems (LDML `k` / `K`)
* **The Legacy Behavior**: LDML defines `k` (hours 1–24, where midnight is `24`) and `K` (hours 0–11 for 12-hour clocks, where midnight is `0` AM and noon is `0` PM).
* **Why We Omitted It**: Representing midnight as `24:00:00` or 11:00 AM as `00:00 AM` is widely recognized as a source of confusion that causes parsing edge cases and serialization bugs. Tempo provides standard 24-hour (`{hh}`) and standard 12-hour (`{h12}`). When localized display conventions are required, applying `:locale` (e.g. `{hh:locale}`) queries the underlying ECMAScript `Intl` engine to seamlessly adopt the target locale's preferred `hourCycle` (`h11`, `h12`, `h23`, or `h24`).

### 3. Duplicate Standalone vs. Format Inflections (LDML `LLLL` vs `MMMM`, `cccc` vs `EEEE`)
* **The Legacy Behavior**: In inflected languages (such as Russian, Polish, or Finnish), month and weekday names change form depending on whether they appear alone (nominative case: `LLLL`, `cccc`) or alongside a day number (genitive case: `MMMM`, `EEEE`).
* **Why We Omitted It**: Doubling the format token surface (two parallel token hierarchies for every month and weekday) burdens developers with linguistic trivia. Tempo delegates localized inflection directly to ECMAScript `Intl.DateTimeFormat`. Using `{mon:locale}` or `{wkd:locale}` allows the runtime engine to automatically select the grammatically correct inflection based on the surrounding date context.

### 4. Mnemonic Reference Date Formatting (Go `time.Format`)
* **The Legacy Behavior**: Go formats dates using a magic reference timestamp: `Mon Jan 2 15:04:05 MST 2006` (`1 2 3 4 5 6 -0700`).
* **Why We Omitted It**: While memorable in isolation, reference timestamps break down as soon as format masks include arbitrary words containing reference numbers (e.g. `ref1`, `page2`, `step3`) because Go lacks an escape syntax. In Tempo, braced tokens eliminate any possibility of token-literal collision.

### 5. Hardcoded Business / Fiscal Quarter Assumptions
* **The Legacy Behavior**: Many SQL engines and reporting dialects hardcode assumptions that quarters strictly align to Gregorian three-month boundaries (Q1 = Jan–Mar, Q2 = Apr–Jun, etc.).
* **Why We Omitted It**: In real-world enterprise applications, fiscal years, tax cycles, and academic quarters frequently start on arbitrary months (e.g. July 1st in Australia, April 1st in the UK/India, October 1st for the US federal government). Rather than baking inflexible Gregorian quarter tables into core tokens, Tempo encapsulates specialized domain concepts into modular Terms (`#quarter`, `#fiscalYear`). This allows developers to configure custom fiscal calendars without breaking standard date formatting.

---

## 📊 Summary Comparison

| Feature / Trait | Legacy Dialects (LDML, Moment, strftime) | Native Tempo Approach |
| :--- | :--- | :--- |
| **Case Sensitivity** | Critical (typos silently alter data targets) | All lowercase primary tokens (`{yyyy}`, `{mm}`, `{dd}`, `{hh}`) |
| **API Alignment** | Methods and tokens use completely different vocabularies | Direct mirror (`t.yy` $\longleftrightarrow$ `{yy}` / `{yyyy}`, `t.mm` $\longleftrightarrow$ `{mm}`) |
| **Variations & Styling**| Hundreds of arbitrary single-character tokens | Orthogonal, chainable modifiers (`:upper`, `:lower`, `:ord`, `:roman`, `:locale`) |
| **Literal Text** | Requires quotes (`'...'`), brackets (`[...]`), or is unescapable (Go) | Literal by default; doubled braces (`{{`, `}}`) for escape |
| **Week-Year Standard**| Mixes ISO and divergent locale-based week years | Anchored strictly to deterministic ISO 8601 (`{yow}`, `{woy}`) |
| **Grammatical Inflection**| Duplicate token families (`LLLL` vs `MMMM`, `cccc` vs `EEEE`) | Automatic via standard `Intl` integration (`{mon:locale}`) |
| **Domain Terms** | Rigid, static token sets | Extensible Terms (`#quarter`, `#isoWeek`, `#dayOfYear`) |

---

> [!TIP]
> **Use Dialects for Migration, Native Tempo for Greenfield**  
> While `@magmacomputing/tempo-plugin-dialects` provides extensive, high-fidelity compatibility for standard legacy masks, we recommend standardizing on native Tempo `{token}` syntax for new development to maximize clarity, performance, and maintainability.
