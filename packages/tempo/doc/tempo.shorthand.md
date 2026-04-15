# Tempo Shorthand Engine

The Tempo Shorthand Engine provides a powerful, namespace-based syntax for resolving complex date/time ranges (Terms) such as fiscal quarters, daily periods, and zodiac signs. It allows you to navigate temporal cycles with high-performance, intuitive expressions.

## 1. Syntax Overview

Shorthand follows the pattern: `#[namespace].[modifier][repeat][range]`

- **Namespace**: The registered key of a Term Plugin (e.g., `qtr`, `period`, `zodiac`).
- **Separator**: A literal dot `.` used to trigger range-mode.
- **Modifier**: Optional symbols to control direction and inclusivity (e.g., `>`, `<=`).
- **Repeat**: Optional digit to shift by multiple boundaries (e.g., `>2`).
- **Range (Optional)**: A specific range identifier defined by the plugin (e.g., `q1`, `morning`, `aries`).

> [!IMPORTANT]
> **Prerequisite**: Shorthand resolution requires the Terms Module to be activated in Core environments (e.g., `Tempo.extend(TermsModule)` or `import '@magmacomputing/tempo/term/standard'`).

> Shorthand literals are **not** supported in the `Tempo` constructor. They are resolved relative to an existing instance and must be used via instance methods (`.set()`, `.add()`, `.until()`, `.since()`) or the Ticker.

---

## 2. Shorthand Modifiers

The engine supports a variety of modifiers to control how a term is resolved. Modifiers can be combined with optional repeat counts (e.g., `>2`).

| Modifier | Type | Meaning | Example |
| :--- | :--- | :--- | :--- |
| `>` | **Forward Shifter** | Move forward to the next term boundary. | `#qtr.>` |
| `<` | **Backward Shifter** | Move backward to the previous term boundary. | `#qtr.<` |
| `>=` | **Inclusive Forward** | Matches current term or next forward boundary. | `#qtr.>=q1` |
| `<=` | **Inclusive Backward** | Matches current term or previous backward boundary. | `#qtr.<=q1` |
| `+` | **Future Relative** | Offset forward by N instances (default 1). | `#qtr.+2` |
| `-` | **Past Relative** | Offset backward by N instances (default 1). | `#qtr.-1` |
| `next` | **Alias (>)** | Semantically identical to `>`. | `#qtr.next` |
| `prev` | **Alias (<)** | Semantically identical to `<`. | `#qtr.prev` |
| `last` | **Alias (<)** | Semantically identical to `<`. | `#qtr.last` |
| `this` | **Identity** | Resolves the term containing the current point. | `#qtr.this` |
| *none* | **Contextual** | Resolves the nearest instance (absolute). | `#qtr.q1` |

---

## 3. Usage & Method Behaviors

The shorthand resolves differently depending on the method invoked.

### `.set(shorthand)` - Absolute Alignment
Aligns the instance forward or backward to the matched term boundary.
- `t.set('#zodiac.aries')`: Snaps to the start of the current year's Aries.
- `t.set('#qtr.>q1')`: Snaps to the start of the *next* available Q1.

### `.add(shorthand)` - Targeted Momentum
Advances the instance relative to its current position.
- **Cycle Shifting**: `t.add('#qtr')` shifts forward by one quarter cycle, preserving the relative duration from cycle start (e.g. 2 months in -> 2 months into next quarter).
- **Multi-Boundary**: `t.add('#qtr.>2')` moves forward exactly two quarter boundaries, preserving the relative cycle offset.
- **Step Shifting**: Providing an object like `t.add({ '#qtr': 1 })` allows shifting by a specific number of "slots" or "steps" within the term's cycle while preserving your relative duration from the start of the term.

### `.until(shorthand)` - Duration Forward
Returns a **Duration** representing the time remaining **until** the target is reached.
- `t.until('#qtr.q1', 'days')`: Calculates days until the next Q1.

### `.since(shorthand)` - Duration Backward
Returns a **Duration** representing the time elapsed **since** the target was passed.
- `t.since('#period.morning')`: Calculates time elapsed since the start of the current morning.

---

## 4. Resolution Logic: Proximity vs. Momentum

The "Slick" engine uses a bifurcated sorting strategy to ensure results are intuitive:

1.  **Absolute Terms** (`#namespace.id`): 
    Uses **Past-Leaning Resolution**. The engine finds the latest matching range whose start date is at or before the current cursor (this favors the current or most recent instance).
      
2.  **Shifters & Directed Targets** (`#namespace.>id`): 
    Uses **Chronological Momentum**. 
    - Modifiers `>` and `<` are **exclusive** (start/end must be strictly after/before cursor).
    - Modifiers `>=` and `<=` are **inclusive** (current term is allowed if it contains the cursor).

### Examples

```typescript
// Assume today is Dec 25th 2024 (Explicitly North Hemisphere, Q4)
const t = new Tempo('2024-12-25', { sphere: 'north' });

// ABSOLUTE: Finds latest Q1 at or before Dec 25th (Jan 1st 2024)
t.set('#qtr.q1'); // 2024-01-01

// DIRECTED: Finds the next Q1 AFTER current and applies current Q-offset (~85 days)
t.add('#qtr.>q1'); // 2025-03-27

// MULTI-SHIFT: Advances two boundary quarters forward and applies current Q-offset
t.add('#qtr.>2'); // 2025-06-25
```

---

## 5. Advanced Behaviors

### Cycle Identity Preservation
The engine is "context-aware" across boundaries. When shifting by term, Tempo maintains the identity of the current state:
- If you are in **Q2 2026** and shift by `+1` Quarter, it resolves to **Q3 2026**.
- If you are in **morning** of Jan 1st and shift by `+1` Period, it resolves to the next registered period (e.g., `midmorning`).

### Multi-Day & Multi-Year Resolution
Terms automatically resolve across logical boundaries:
- **Daily Cycles**: (e.g., `#period`) resolve within a 3-day window (`yesterday`, `today`, `tomorrow`) to ensure smooth transit across midnight.
- **Yearly Cycles**: (e.g., `#qtr`, `#zodiac`) resolve within a 3-year window to handle boundary-crossing ranges (like North vs South fiscal years).

---

## 6. Development Constraints (Range-Keys)

When defining ranges in a Terminology Plugin, you must adhere to the **Golden Rules of Range-Keys** to avoid lexer collisions with modifiers.

> [!CAUTION]
> **Reserved Characters**: Range-Keys **MUST NOT** contain any of the following characters:
> `> < + = , . ! @ # $ % ^ & * ( ) [ ] { }`
> These characters are reserved for directional shifters and lexer boundaries.

> [!WARNING]
> **Numeric Anchoring**: Range-Keys **MUST NOT** start with a digit (0-9). 
> For example: `1q` is **INVALID**, use `q1` instead. Leading numbers are reserved for repetition counts.

---

## 7. Best Practices

- **Sphere Locking**: When working with hemisphere-dependent terms (like Quarters), ensure your Tempo instance has an explicit `sphere` config (`north` or `south`) for deterministic results.
- **Error Handling**: Use `{ catch: true }` in your Tempo config if you want to gracefully handle unknown shorthand without throwing.
- **Step Shifting**: Use integer values (e.g. `{ '#qtr': 1 }`) in a **Ticker** to create standard recurring intervals.
