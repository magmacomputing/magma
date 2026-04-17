# Tempo Shorthand Engine

The Tempo Shorthand Engine (the "Slick" engine) provides a powerful, namespace-based syntax for navigating and manipulating complex date/time cycles (Terms). It allows you to treat high-level concepts like Quarters, Seasons, and Daily Periods as first-class units of measure.

## 1. The Three Modes of Shorthand

Shorthand behavior changes depending on whether you provide a **String**, an **Object**, or a **Structural Key**.

### A. Navigation Mode (String Shorthand)
**Used in:** `.set()`, `.add()`, `.until()`, `.since()`, and the Ticker.  
**Pattern:** `#[namespace].[modifier][repeat][range]`  
**Best for:** Jumping to specific boundaries (e.g., "the start of the next Q1").

```javascript
t.set('#qtr.>q1'); // Snaps to the start of the next available Q1
t.add('#period.next'); // Jumps to the start of the next defined period
```

### B. Relational Mode (Object Shorthand)
**Used in:** `.add()` and `.set()`.  
**Pattern:** `{ '#namespace': value }`  
**Best for:** Shifting by semantic "steps" while preserving your relative position.

```javascript
// Relational Add: Preserves your offset within the cycle
t.add({ '#qtr': 1 }); // If you are 20 days into Q1, you resolve to 20 days into Q2.

// Relational Set: Absolute index alignment
t.set({ '#qtr': 2 }); // Aligns to the start of the 2nd quarter of the current year
```

### C. Structural Mode (Key Shorthand)
**Used in:** `.set()`.  
**Pattern:** `{ start: '#namespace', end: '#namespace' }`  
**Best for:** Snapping a date to the precise boundaries of its current term.

```javascript
t.set({ start: '#qtr' }); // Snaps to the exact start of the current quarter
t.set({ end: '#year' });  // Snaps to the final nanosecond of the current year
```

---

## 2. Navigation Modifiers

Modifiers control the direction and inclusivity of the search.

| Modifier | Meaning | Behavior |
| :--- | :--- | :--- |
| `>` | **Forward (Exclusive)** | Finds the next boundary strictly *after* the current time. |
| `<` | **Backward (Exclusive)** | Finds the previous boundary strictly *before* the current time. |
| `>=` | **Forward (Inclusive)** | Returns the current term if it contains the cursor; otherwise, the next. |
| `<=` | **Backward (Inclusive)** | Returns the current term if it contains the cursor; otherwise, the previous. |
| `+` | **Relative Future** | Alias for `>`. |
| `-` | **Relative Past** | Alias for `<`. |
| `this` | **Identity** | Resolves the term currently containing the cursor. |

---

## 3. Proximity vs. Momentum

The "Slick" engine uses two different sorting strategies to ensure results feel "natural."

### Proximity Resolution (Identifiers)
When you use a simple identifier like `#zodiac.aries`, Tempo uses **Past-Leaning Resolution**. It finds the most recent instance of Aries that has already started. If you are *currently* in Aries, it returns the start of the current one.

### Momentum Resolution (Shifters)
When you use a shifter like `>q1`, Tempo uses **Chronological Momentum**. It ignores where you are now and looks exclusively into the future for the next occurrence.

---

## 4. The "Cycle Preservation" Guarantee

One of Tempo's premium features is its ability to maintain your **relative offset** when shifting across terms.

If you are 45% of the way through a **Morning** period and you call `t.add({ '#period': 1 })`, Tempo doesn't just add a fixed number of hours. It:
1.  Determines your relative percentage/offset within the current Morning.
2.  Finds the boundaries of the *next* registered period (e.g., Afternoon).
3.  Calculates the same 45% point within that new period.

This ensures that "shifting by a quarter" or "shifting by a period" feels mathematically correct even when those terms have different durations.

---

## 5. Development Constraints

When building custom Terminology Plugins, you must follow the **Golden Rules of Range-Keys** to ensure the lexer can resolve them:

> [!IMPORTANT]
> **No Reserved Characters**: Range-Keys (e.g., `q1`, `aries`) must not contain:  
> `> < + = , . ! @ # $ % ^ & * ( ) [ ] { }`

> [!WARNING]
> **No Leading Numbers**: Range-Keys must not start with a digit.  
> `1q` is **Invalid** (Lexer thinks it's a repeat count). Use `q1` instead.

---

## 6. Best Practices

- **Explicit Spheres**: Always set `sphere: 'north'` or `'south'` in your config if using seasonal terms.
- **Method Intent**: Use **String shorthand** for "Jumping" to boundaries and **Object shorthand** for "Shifting" relative to your current time.
- **Fail-Safe**: Use `catch: true` in your global config to allow shorthand resolution to fail silently (returning a `void` instance) instead of throwing.
