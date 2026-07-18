# Mutation & Math

Tempo's API for modifying instances is intentionally microscopic. Rather than bloating the prototype with dozens of distinct methods (`.add()`, `.subtract()`, `.startOf()`, etc.), Tempo provides unified utilities that natively support intuitive shorthand strings.

> [!IMPORTANT] Immutability & Chainability
> All mutation methods in Tempo (`.add()`, `.set()`) are strictly **immutable**. They never modify the original instance. Instead, they evaluate the change and return a **new `Tempo` instance**, ensuring absolute safety and allowing for predictable method chaining.

## The `.add()` Method

The `.add()` method returns a new `Tempo` instance shifted by a specific amount.

```typescript
const t = tempo();
t.add({ days: 5 });           // Adds 5 days
```

### Where is `.subtract()`?

> [!NOTE] Design Choice
> **Where is `.subtract()`?**
> Tempo keeps its core API intentionally microscopic. Because `.add()` natively supports negative durations and Tempo's Slick math provides directional operators (e.g., `t.add('<5d')` or `t.add({ days: -5 })`), a separate `.subtract()` method is mathematically redundant. We chose a smaller bundle size over duplicate methods.

You can subtract time simply by using negative values:

```typescript
t.add({ days: -5 });          // Subtracts 5 days
```

Or using **[Slick Math](../4-advanced-reference/tempo.shorthand.md)**:

```typescript
t.add('>5d');                 // Adds 5 days
t.add('<5d');                 // Subtracts 5 days
```

## The `.set()` Method

While `.add()` *shifts* a date, the `.set()` method *replaces* components.

```typescript
t.set({ year: 2026, month: 1 }); // Sets to January 2026
```

### Navigating to Boundaries

[Slick Math](../4-advanced-reference/tempo.shorthand.md) also works inside `.set()` for boundary navigation:

```typescript
t.set('start.month');         // Start of the current month
t.set('end.year');            // End of the current year
```

## Chainability

Because all mutations return a new instance, you can safely chain `.add()` and `.set()` methods together to perform complex temporal logic in a single, readable line.

```typescript
const endOfQ1 = t
  .set('start.year')          // Snap to January 1st
  .add('>3mm')                // Shift forward 3 months (to April 1st)
  .set('end.month');          // Snap to April 30th at 23:59:59.999
```

## Relational vs. Navigation Shifting

When using custom terminology plugins (like Fiscal Quarters or Seasons), Tempo provides two distinct shorthand styles for mutation:

### 1. Navigation Mode (String)
Use a string to **jump** to a specific boundary. This relies on chronological momentum.

```typescript
t.set('#qtr.>q1');              // Snaps to the start of the next Q1
t.add('#timeOfDay.>afternoon'); // Jumps to the start of the next Afternoon
```

### 2. Relational Mode (Object)
Use an object to **shift** by a specific semantic step while preserving your relative position in the cycle.

```typescript
t.add({ '#qtr': 1 });           // Shift forward 1 quarter, preserving progress
```
If you are 20 days into Q1, relational shifting will put you exactly 20 days into Q2.

👉 **Learn More:** For deeper details on cycle preservation and directional operators, see the [Shorthand Engine Reference](../4-advanced-reference/tempo.shorthand.md).
