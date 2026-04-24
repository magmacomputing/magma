# Sandbox Factory Pattern

Tempo v2.5.0 introduces the **Sandbox Factory** pattern, allowing for deep isolation of configurations and parsing rules. This is particularly useful in complex applications where different modules may require different date-time aliases or behaviors without polluting the global `Tempo` namespace.

## The Problem
Historically, `Tempo.init()` modified the global library state. This meant that:
1. Only one set of custom `Event` or `Period` aliases could exist.
2. Large applications or libraries using Tempo internally would step on each other's configurations.
3. Testing multiple configurations required careful cleanup between tests.

## The Solution
`Tempo.init()` now returns a **derived class** when provided with configuration options. Each derived class maintains its own isolated `State` and `Registry`.

### Example: Creating a Sandbox
```typescript
import { Tempo } from '@magmacomputing/tempo';

// Create a specialized Sandbox for a Financial app
const FinTempo = Tempo.init({
  period: {
    'market-open': '09:30',
    'market-close': '16:00'
  }
});

// Standard Tempo remains untouched
const t1 = new Tempo('market-open'); // Error: Unknown alias
const t2 = new FinTempo('market-open'); // Success: 09:30
```

## Traceability & Collision Management
When using sandboxes, it's important to know which configuration resolved an input. Tempo now records the **source** of every match in the `parse.result` array.

### Hierarchy of Resolution
When a conflict occurs (e.g., you redefine "noon"), Tempo uses a **"Last One Wins"** strategy:
1. **Local (Instance)**: Options passed to `new Tempo(val, options)`.
2. **Sandbox (Factory)**: Options passed to `Tempo.init(options)`.
3. **Plugins**: Aliases registered via `Tempo.extend()`.
4. **Global Defaults**: Built-in aliases like "xmas", "midnight", etc.

### Checking the Trace
You can inspect the `parse.result` to see exactly which layer provided the definition:

```typescript
const t = new FinTempo('market-open');
console.log(t.parse.result);
/*
[
  {
    type: "Period",
    value: "market-open",
    source: "sandbox", // Resolved from FinTempo (factory/sandbox layer)
    match: "tm",
    ...
  }
]
*/
```

## Immutability & Security
Sandboxed classes created via `Tempo.init()` are protected by the same `@Immutable` and `@Serializable` decorators as the base class. 
- The Sandbox class itself is hardened against static member modification.
- Instances of the Sandbox are frozen upon construction.
- The internal state is stored in a `WeakMap`, inaccessible to external code.

## Best Practices
1. **Initialize Once**: Create your application-specific Sandbox once and export it as your primary entry point.
2. **Prefer Sandboxes for Custom Aliases**: Avoid modifying the base `Tempo` class if your app is intended to be used as a library.
3. **Use Debug Mode**: When developing new aliases, set `debug: true` to receive console warnings about naming collisions.
