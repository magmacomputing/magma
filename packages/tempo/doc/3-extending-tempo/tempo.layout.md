# Layout Patterns Guide

Tempo's parsing engine is driven by regular expression patterns and named capture-groups. By understanding and extending these layouts, you can teach Tempo to understand entirely new terminology, formats, and relative units.

## What is a Snippet?

A **Snippet** is a pre-defined regex pattern that can be combined with other snippets to create a **Layout**.

## What is a Layout?

A **Layout** is a string that combines pre-defined **Snippets** and strings. When you provide a layout to `Tempo`, it is translated into an anchored, case-insensitive Regular Expression used to match and extract date-time values.

## Available Snippets

Snippets represent specific date or time units. When arranged in a layout, they form the blueprint for the parser:

| Snippet | Description | Regex Match (approx) |
| :--- | :--- | :--- |
| `{yy}` | Year (2 or 4 digits) | `([0-9]{2})?[0-9]{2}` |
| `{mm}` | Month (01-12, Jan-Dec, etc.) | `01-12` or names |
| `{dd}` | Day (01-31) | `01-31` |
| `{hh}` | Hour (00-24) | `00-24` |
| `{mi}` | Minute (prefixed by `:`) | `:[0-5][0-9]` |
| `{ss}` | Second (prefixed by `:`) | `:[0-5][0-9]` |
| `{ff}` | Fraction (prefixed by `.`) | `\.[0-9]{1,9}` |
| `{wkd}` | Weekday (Mon-Sun) | Name strings |
| `{era}` | Historical era marker | `BC`, `a.d.`, `c.e.`, etc. |
| `{tzd}` | Time zone offset | `Z` or `±hh:mm` |
| `{sep}` | Separator character | `/`, `-`, `.`, `,`, or ` ` |
| `{mod}` | Modifier and count | `+`, `-`, `next`, `prev` |
| `{unt}` | Time units | `year(s)`, `day(s)`, etc. |
| `{evt}` | Event alias | `xmas`, `nye`, etc. |
| `{per}` | Period alias | `midnight`, `noon`, etc. |
| `{sfx}` | Time-pattern suffix | `T {tm} Z` |
| `{brk}` | Zone/Calendar brackets | `[UTC][u-ca=iso8601]` |
| `{www}` | Short weekday name | `Mon`, `Tue`, etc. |
| `{nbr}` | Numeric value or word | `1`, `two`, etc. |
| `{afx}` | Relative affix | `ago`, `hence`, `from now` |

### Composite Snippets

- `{dt}`: Matches a date (e.g., `{dd}{sep}{mm}`) OR an event alias `{evt}`.
- `{tm}`: Matches a time (e.g., `{hh}{mi}`) OR a period alias `{per}`.

## Built-in Layouts

| Key | Layout | Description |
| :--- | :--- | :--- |
| `dtm` | `({dt}){sfx}?{brk}?` | Calendar/event and clock/period |
| `dmy` | `{www}?{dd}{sep}?{mm}({sep}{yy})?{sfx}?{brk}?` | Day-month(-year) |
| `mdy` | `{www}?{mm}{sep}?{dd}({sep}{yy})?{sfx}?{brk}?` | Month-day(-year) |
| `ymd` | `{www}?{yy}{sep}?{mm}({sep}{dd})?{sfx}?{brk}?` | Year-month(-day) |
| `ye` | `{mod}?{yy}{era}` | Explicit year and era (e.g., 200 BC) |
| `ey` | `{mod}?{era}{sep}?{yy}` | Explicit leading era and year (e.g., BC 200) |
| `unt` | `{nbr}{sep}?{unt}{sep}?{afx}` | Relative duration |


## Customizing Layouts

You can supply your own parsing tokens to Tempo globally via `Tempo.init()` or locally per-instance.

```typescript
Tempo.init({
  registry: {
    layouts: {
      'myCustomFormat': '{dd}{sep}?{mm}{sep}?{yy}'
    }
  }
});

const t = new Tempo('20-05-2024'); // Parsed using 'myCustomFormat'
```

### Instance-Specific Layout

```typescript
const t = new Tempo('20240520', { registry: { layouts: '{yy}{mm}{dd}' } });
```

## Advanced Capture Groups

When crafting raw regex, the following capture groups are used by the engine:
- `yy`, `mm`, `dd`: Year, Month, Day digits
- `hh`, `mi`, `ss`, `ff`: Hour, Minute, Second, Fractional digits
- `mer`: Meridiem (`am`, `pm`)
- `evt`: Event string offset
- `per`: Period string offset
- `unt`: Relative unit (e.g., `days`, `weeks`)

## Prototyping with `Tempo.regexp()`

You can use the static `Tempo.regexp()` method to "preview" how a layout string will be compiled by the engine. This is useful for testing custom regex logic before applying it to your configuration.

```typescript
// Expands {dd}, {sep}, {mm}, etc. into a final anchored RegExp
const regex = Tempo.regexp('{dd}{sep}{mm}{sep}{yy}');

console.log(regex.source); 
// Output (illustrative): ^((?<dd>...)(?<sep>...)(?<mm>...)(?<sep_1>...)(?<yy>...))$
```

---

## 🤖 AI & LLM Layout Prompting

When prompting AI assistants (Cursor, GitHub Copilot, ChatGPT, Claude) to write custom `Tempo` regular expression snippets and layout extensions:

1. **Ingest AI Rules**: Provide the assistant with our official `llms.txt` rules by referencing `@https://tempo.magmacomputing.com.au/llms.txt` in Cursor or pasting `llms.txt` context into ChatGPT.
2. **Explicit Token Request**: Ask the LLM to use Tempo's standard snippet tokens (`{yy}`, `{mon}`, `{dd}`, `{hh}`, `{mi}`, `{ss}`, `{tzd}`) rather than raw, un-anchored regular expressions.
3. **Example AI Prompt**:
   ```text
   "Using https://tempo.magmacomputing.com.au/llms.txt, register a custom layout for strings like 'Q3 2026' using Tempo.init({ registry: { layouts: { ... } } }) and snippet tokens."
   ```

---

## Professional Services

If your project involves specialized terminology, complex financial calendars, or legacy application log formats, the **Magma Computing Solutions** team offers professional services to design and test custom `Tempo` Layouts optimized for your business needs. 

Contact us at [Magma Computing Solutions](https://github.com/magmacomputing).
