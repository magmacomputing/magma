# Relative & Weekday Parsing

Tempo parses both **general relative-time offsets** (across any time unit, such as `"3 hours ago"` or `"1 month from now"`) and **directional weekday / ordinal expressions** (such as `"next Mon"`, `"<=Wed"`, or `"3rd Wednesday of Oct"`).

> [!TIP]
> **Looking for `>q1` or `<=afternoon` on custom cycles?**
> Symbolic operators (`>`, `>=`, `<`, `<=`, `+`, `-`) on bare month names or times (such as `>Oct` or `<=10:00pm`) are not supported in general constructor parsing. For non-weekday cyclic navigation, use the [Shorthand Engine](./tempo.shorthand.md) (`#qtr.>q1`, `#timeOfDay.<=afternoon`).

---

## 1. General Relative Phrases (All Units)

Count-based relative expressions work across seconds, minutes, hours, days, weeks, months, and years relative to an `anchor` (or the current instant):

| Pattern | Example | Meaning (from `2026-11-20 10:00:00`) |
| :--- | :--- | :--- |
| `<count> <unit> ago` | `3 hours ago` | `2026-11-20 07:00:00` |
| `in <count> <unit>` | `in 5 minutes` | `2026-11-20 10:05:00` |
| `<count> <unit> hence` | `2 weeks hence` | `2026-12-04 10:00:00` |
| `<count> <unit> from now` | `1 month from now` | `2026-12-20 10:00:00` |

```typescript
const anchor = new Tempo('2026-11-20T10:00:00[Australia/Sydney]');

new Tempo('3 hours ago', { anchor });     // 2026-11-20 07:00:00
new Tempo('in 5 minutes', { anchor });    // 2026-11-20 10:05:00
new Tempo('1 month from now', { anchor }); // 2026-12-20 10:00:00
```

> [!NOTE]
> Standalone keyword shifts without a count (such as `"next month"`) are not supported directly. Use a counted offset (`"1 month from now"`) or `.add({ months: 1 })`.

---

## 2. Weekday & Ordinal Formats

Weekday inputs consist of an optional **modifier**, an optional **count**, and the **Weekday name**.

### Simple Weekday Names
When no modifier is provided, Tempo resolves the Weekday in the **current week**:
- `Mon`, `Monday`
- `Wed`, `Wednesday`
- `Sun`, `Sunday`

### Symbolic Modifiers
Symbols indicate relative weeks or directional boundaries around the anchor date:

| Modifier | Meaning | Example | Results in... |
| :--- | :--- | :--- | :--- |
| `+` | Next week | `+Mon` | Monday of next week |
| `-` | Previous week | `-Tue` | Tuesday of last week |
| `<=` | Prior to (inclusive) | `<=Wed` | The Wednesday on or immediately before today |
| `<` | Prior to (strict) | `<Thu` | The Thursday strictly before today |
| `>=` | Subsequent to (inclusive) | `>=Fri` | The Friday on or immediately after today |
| `>` | Subsequent to (strict) | `>Sat` | The Saturday strictly after today |

For example, if today is **Wednesday**:
```typescript
new Tempo('<Wed')  // → returns LAST Wednesday (strictly before today)
new Tempo('<=Wed') // → returns TODAY (inclusive match)
```

### Keyword & Count Modifiers
- **Keywords**: `this Wed`, `next Monday`, `prev Fri`, `last Sunday`
- **Counts**: `-3 Wed` (three Wednesdays ago), `+2 Mon` (two Mondays from now)
- **Relative Suffixes**: `3 Wed ago`, `2 Mon hence`, `2 Mon from now`
- **Ordinals**: `3rd Wednesday of Oct`, `last day of May`

### Time Suffixes
You can append a time component to a Weekday string. Tempo resolves the date first and then applies the time:

- `Mon 10:00am`
- `>Friday noon`
- `<3 Wed 15:30:00`

---

## 3. How Weekday Resolution Works
1. **Normalization**: Weekday names are normalized to their 3-letter proper-case prefix (e.g., `monday` → `Mon`).
2. **Anchor**: If no `anchor` option is provided, Tempo uses the current instant in the active `timeZone`.
3. **Calculation**: The modifier and count determine the number of weeks to shift from the anchor date to locate the target Weekday.
4. **Time Constraint**: If time components are provided, they are set on the resolved date; otherwise the time defaults to `00:00:00` on a primary parse pass.
