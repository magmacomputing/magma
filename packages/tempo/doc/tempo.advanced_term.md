# Advanced Terminology & Slick Shorthand

Tempo's Shorthand Engine provides a high-performance, intuitive syntax for navigating complex temporal cycles. This guide details the "Slick" resolution logic and the critical constraints for creating custom Terminology Plugins.

## 1. Range-Key Constraints

When defining ranges in a Terminology Plugin (e.g., `q1` for quarters, `aries` for zodiac), you must adhere to the **Golden Rules of Range-Keys**. Failure to follow these rules will cause lexer collisions with direction modifiers and repeat counts.

> [!CAUTION]
> **Reserved Characters**: Range-Keys **MUST NOT** contain any of the following characters:
> `> < + = , . ! @ # $ % ^ & * ( ) [ ] { }`
> These characters are reserved for directional shifters and lexer boundaries.

> [!WARNING]
> **Numeric Anchoring**: Range-Keys **MUST NOT** start with a digit (0-9). 
> For example: `1q` is **INVALID**, use `q1` instead. Leading numbers are reserved for repetition counts (e.g., `#qtr.2q1` means "the 2nd instance of Q1").

---

## 2. Slick Shorthand Modifiers

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

## 3. Method Behaviors

The shorthand resolves differently depending on the method invoked.

### `.set(shorthand)` - The Anchor
Aligns the instance forward or backward to the matched term.
- `t.set('#qtr.q1')`: Snaps to the start of the current cycle's Q1.
- `t.set('#qtr.>q1')`: Snaps to the start of the *next* available Q1.

### `.add(shorthand)` - The Momentum
Advances the instance relative to its current position.
- `t.add('#qtr')`: Moves to the start of the next quarter boundary.
- `t.add('#qtr.>2')`: Moves forward exactly two quarter boundaries.

### `.until(shorthand)` - Future Measurement
Returns a **Duration** representing the time remaining **until** the target is reached.
- `t.until('#qtr.>')`: Returns duration until the next quarter start.

### `.since(shorthand)` - Past Measurement
Returns a **Duration** representing the time elapsed **since** the target was passed.
- `t.since('#qtr.<')`: Returns duration since the last quarter start.

---

## 4. Resolution Logic: Proximity vs. Momentum

The engine uses a bifurcated sorting strategy to ensure results are intuitive:

  1. **Absolute Terms** (`#namespace.id`): 
     Uses **Distance-Based Sorting**. The engine finds the candidate whose start date is physically closest to the current instance (even if it's in the past).
     
  2. **Shifters & Directed Targets** (`#namespace.>id`): 
     Uses **Chronological Momentum**. 
     - Modifiers `>` and `<` are **exclusive** (start/end must be strictly after/before cursor).
     - Modifiers `>=` and `<=` are **inclusive** (current term is allowed if it contains the cursor).

### Examples

```typescript
// Assume today is Dec 25th 2024
const t = new Tempo('2024-12-25');

// ABSOLUTE: Finds the Q1 closest to Dec 25th (Jan 1st 2025)
t.set('#qtr.q1'); 

// DIRECTED: Finds the next Q1 AFTER current (Jan 1st 2025)
// (In this case same as above, but deterministic)
t.add('#qtr.>q1'); 

// MULTI-SHIFT: Advances two quarters forward (into Q3 2025)
t.add('#qtr.>2'); 
```
