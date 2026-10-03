<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-dialects</a>
</div>

<br>

# Migration & Legacy Compatibility

The `@magmacomputing/tempo-plugin-dialects` plugin is engineered to provide frictionless, zero-downtime migration paths for codebases transitioning to Tempo from **Moment.js**, **Day.js**, **Luxon**, or **date-fns**, as well as legacy backend systems that emit standard **POSIX `strftime`** specifiers.

---

## The Migration Challenge: Token Traps & Gotchas

Directly porting format strings between date libraries without validation often introduces subtle production regressions due to conflicting token semantics across ecosystems:

### 1. The Year Trap: `YYYY` vs `yyyy`

One of the most dangerous formatting bugs in modern web applications occurs during late December and early January:

* **In Moment.js & Day.js**: `YYYY` represents the standard calendar year (e.g. `2026`).
* **In Unicode LDML (Luxon, date-fns)**: `yyyy` represents the calendar year, while `YYYY` represents the **ISO week-numbering year**.
* **The Pitfall**: Formatting `2025-12-31` with `YYYY` under LDML outputs `2026` because December 31st belongs to the first week of 2026. This has historically caused catastrophic financial and billing errors.
* **The Tempo Solution**: Tempo Core uses `{yyyy}` for the 4-digit calendar year and `{yw}` for the ISO week-numbering year. The Dialects plugin automatically normalizes these semantics when evaluating legacy masks.

### 2. Month vs Minute: `MM` vs `mm` vs `mi`

In legacy libraries, uppercase `MM` designates months, while lowercase `mm` designates minutes. Accidental capitalization (e.g., `HH:MM:ss`) prints the month instead of the minute.

Tempo solves this ambiguity at the foundational syntax level:
* `{mm}`: Zero-padded month (`01-12`)
* `{mi}`: Zero-padded minute (`00-59`)
* `{mon}`: Full month name (`October`)
* `{mmm}`: Short month name (`Oct`)

### 3. Escaping Literals: Quotes vs Brackets

Different ecosystems handle arbitrary literal text within format strings inconsistently:

| Ecosystem | Literal Escaping Syntax | Example | Escaping Quotes / Brackets |
| :--- | :--- | :--- | :--- |
| **Tempo Core** | Braced tokens; all outer text is literal | `Recorded on {yyyy}-{mm}-{dd}` | <span v-pre><code>&#123;&#123;</code></span> &rarr; <code>&#123;</code>, <span v-pre><code>&#125;&#125;</code></span> &rarr; <code>&#125;</code> |
| **Moment.js / Day.js** | Square brackets `[...]` | `[Recorded on] YYYY-MM-DD` | `[\[literal\]]` |
| **Unicode LDML** | Single quotes `'...'` | `'Recorded on' yyyy-MM-dd` | `''` (two single quotes) |
| **POSIX `strftime`** | Direct text; `%` prefixes tokens | `Recorded on %Y-%m-%d` | `%%` produces `%` |

---

## Automated Migration Engine: `Tempo.dialects.explain()`

To eliminate guesswork and avoid manual regex translation, the Dialects plugin includes a built-in static AST analyzer: `Tempo.dialects.explain()`.

It inspects any legacy format mask, auto-detects or confirms the originating dialect, and translates it into the equivalent native Tempo `{token}` pattern alongside a token-by-token metadata breakdown:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '@magmacomputing/tempo-plugin-dialects';

Tempo.use(DialectsPlugin);

// 1. Analyze a legacy Moment.js mask with bracketed literals and ordinals
const analysis = Tempo.dialects.explain('[Report for] MMMM Do, YYYY [at] hh:mm A', DIALECT.Moment);

console.log(analysis.pattern);
// Output: "Report for {mon} {dd:ord}, {yyyy} at {h12}:{mi} {mer:upper}"

console.log(analysis.dialect);
// Output: "moment"

// Inspect the mapped token array
console.log(analysis.tokens);
// [
//   { source: 'MMMM', tempo: '{mon}', desc: 'Full month name (e.g. October)' },
//   { source: 'Do',   tempo: '{dd:ord}', desc: 'Day of month with ordinal suffix (1st-31st)' },
//   { source: 'YYYY', tempo: '{yyyy}', desc: '4-digit year' },
//   { source: 'hh',   tempo: '{h12}', desc: '12-hour clock (01-12)' },
//   { source: 'mm',   tempo: '{mi}', desc: 'Zero-padded minute (00-59)' },
//   { source: 'A',    tempo: '{mer:upper}', desc: 'AM/PM marker (uppercase)' }
// ]
```

### Programmatic Mask Upgrades in Build Pipelines

You can use `explain()` in a code-mod or lint rule to audit and rewrite legacy format strings across your codebase:

```typescript
function migrateLegacyMask(legacyMask: string, dialect?: string): string {
  const result = Tempo.dialects.explain(legacyMask, dialect);
  return result.pattern;
}

// Convert Luxon masks to native Tempo
const modernPattern = migrateLegacyMask("yyyy-MM-dd 'T' HH:mm:ss.SSS zzzz", 'ldml');
console.log(modernPattern);
// Output: "{yyyy}-{mm}-{dd} T {hh}:{mi}:{ss}.{ms} {tz:long}"
```

---

## Drop-In API Compatibility Shims

For large codebases where updating thousands of call sites simultaneously is impractical, installing `DialectsPlugin` attaches drop-in convenience methods directly onto `Tempo`:

### 1. Luxon Drop-In: `t.toFormat()`

Existing Luxon format invocations can be ported by replacing the instance with `Tempo` without changing the formatting calls:

```typescript
const t = new Tempo('2026-10-24T15:30:45');

// Luxon drop-in instance method
console.log(t.toFormat('dd LLL yyyy'));
// Output: "24 Oct 2026"

console.log(t.toFormat("'Time:' HH:mm:ss"));
// Output: "Time: 15:30:45"
```

### 2. Static Parsers: `Tempo.fromFormat()` & `Tempo.fromFormats()`

```typescript
// Parse a single known format
const t1 = Tempo.fromFormat('24/10/2026', 'dd/MM/yyyy');
console.log(t1.iso); // "2026-10-24T00:00:00+..."

// Multi-candidate fallback parsing (evaluates candidates until a match succeeds)
const t2 = Tempo.fromFormats('10/24/2026 15:30', [
  'yyyy-MM-dd HH:mm',
  'dd/MM/yyyy HH:mm',
  'MM/dd/yyyy HH:mm'
]);
console.log(t2.dd); // 24
console.log(t2.mm); // 10
```

---

## Performance Comparison: Native Tempo vs Dialects

While `@magmacomputing/tempo-plugin-dialects` is highly optimized with an internal compiled closure cache, **native Tempo `{token}` syntax remains significantly faster**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Formatting Performance Comparison (100,000 Iterations)                │
├────────────────────────────────────────────────────────────────────────┤
│ Native Tempo Core ({yyyy}-{mm}-{dd})   ████████████████████ 1.8x - 2.5x│
│ Dialects LDML (yyyy-MM-dd)             ██████████           Cached     │
│ Dialects strftime (%Y-%m-%d)           █████████            Cached     │
│ Moment.js Library (Legacy Reference)   ████                 Baseline   │
└────────────────────────────────────────────────────────────────────────┘
```

### Why Native Syntax is Faster
1. **Zero Intermediate Token Mapping**: Native Tempo tokens map directly to Temporal ZonedDateTime getters (`zdt.year`, `zdt.month`, `zdt.day`) inside Core.
2. **Zero Regex Dialect Routing**: External masks require regex tokenization and token AST resolution before execution.
3. **No Plugin Overhead**: Native formatting requires zero plugins loaded into memory, keeping bundle size minimal.

### Recommended Migration Strategy
1. **Phase 1 (Immediate)**: Install `@magmacomputing/tempo-plugin-dialects`. Keep existing format strings untouched using `t.format(mask, { dialect })`, `t.toFormat()`, and `Tempo.fromFormat()`.
2. **Phase 2 (Automated Audit)**: Run `Tempo.dialects.explain()` across your format strings to generate native `{token}` equivalents.
3. **Phase 3 (Optimization)**: Transition critical hot-paths and high-throughput logging routines to native Tempo format patterns for peak throughput.
