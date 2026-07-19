# Creating a Namespace Plugin

When building plugins that provide multiple related features, adding them directly to the `Tempo` prototype can clutter the root interface and increase the risk of naming collisions.

To solve this, Tempo provides the `defineNamespace` factory. This allows you to mount an entire suite of related tools under a single property (e.g., `Tempo().finance.taxYear`).

## The Lazy-Evaluation Advantage

Namespaces in Tempo are **Lazy-Evaluated Proxies**. 
When a user extends Tempo with your namespace plugin, it adds exactly **0 CPU cycles** of overhead to instantiation. Your methods and resolvers are only initialized and executed if the user actually accesses the namespace property on that specific date instance!

## 1. The `defineNamespace` Factory

Let's build a `finance` plugin. We want to add a `.finance` namespace that provides tools like `fiscalQuarter` and `isFiscalYearStart()`.

```typescript
// finance.ts
import { defineNamespace } from '@magmacomputing/tempo/plugin-api';
import type { Tempo } from '@magmacomputing/tempo/core';

export const FinanceNamespace = defineNamespace({
  // 1. Define the property name where this namespace will live on the Tempo instance
  name: 'finance',
  
  // 2. Define the lazy-resolvers
  resolvers: {
    // Static properties return values directly
    fiscalQuarter: (tempo: Tempo): number => {
      const month = tempo.mm;
      return Math.floor((month - 1) / 3) + 1;
    },
    
    taxYear: (tempo: Tempo): number => {
      return tempo.yy;
    },
    
    // Methods return callable functions
    isFiscalYearStart: (tempo: Tempo): ((startMonth?: number) => boolean) => {
      const currentMonth = tempo.mm;
      const currentDay = tempo.dd;
      return (startMonth: number = 1) => currentMonth === startMonth && currentDay === 1;
    }
  }
});
```

Notice how every resolver receives the current `Tempo` instance as its first argument? This gives you full access to the date's underlying data (`tempo.mm`, `tempo.add()`, etc.) without ever needing to worry about `this` binding!

### The Memoized Closure Pattern (Methods with Parameters)

One of the most powerful features of the `defineNamespace` architecture is that your resolvers are **memoized closures**. Because a resolver is only evaluated the *very first time* the property is accessed on that specific `Tempo` instance, you can use the outer block to execute expensive setup logic or stash variables.

Let's zoom in on the `isFiscalYearStart` method we defined above:

```typescript
isFiscalYearStart: (tempo: Tempo) => {
  // 1. SETUP BLOCK (Runs exactly once per Tempo instance)
  // You can stash variables, run complex mathematical lookups, or build state here!
  const currentMonth = tempo.mm;
  const currentDay = tempo.dd;

  // 2. INNER CLOSURE (Runs every time the consumer calls the method)
  // The consumer can pass their company's fiscal start month (e.g., 7 for July). Defaults to 1.
  return (startMonth: number = 1): boolean => {
    return currentMonth === startMonth && currentDay === 1;
  };
}
```

When a consumer types `t.finance.isFiscalYearStart(7)`, they are executing that returned inner function to check if the date is July 1st. This pattern allows you to write incredibly performant plugins with zero repeated overhead!

## 2. TypeScript Module Augmentation

Just like standard plugins, you must inform TypeScript about your new namespace so developers get full IDE autocomplete:

```typescript
// finance.ts
import { defineNamespace } from '@magmacomputing/tempo/plugin-api';

// ... (FinanceNamespace implementation) ...

declare module '@magmacomputing/tempo/core' {
  interface Tempo {
    finance: {
      fiscalQuarter: number;
      taxYear: number;
      isFiscalYearStart: (startMonth?: number) => boolean;
    }
  }
}
```

## 3. Consuming the Namespace

Developers can now import your plugin, register it once, and enjoy your clean, isolated API!

```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { FinanceNamespace } from './finance.js';

// Extend the core Tempo engine
Tempo.extend(FinanceNamespace);

const t = new Tempo('2024-07-01');

// Access the static property (Evaluated instantly and memoized!)
console.log(t.finance.fiscalQuarter); // 3

// Access the callable method (Checking if it's the start of the Australian fiscal year)
console.log(t.finance.isFiscalYearStart(7)); // true
```

---

## The Dual Architecture (OOP vs FP)

When building a Namespace plugin, you'll naturally face a choice between **Object-Oriented Programming (OOP)** and **Functional Programming (FP)**. 

*   **The Namespace (OOP)**: `t.finance.isFiscalYearStart()`
    *   *Pros:* Incredible Developer Experience (DX). You get instant IDE autocomplete, and the `Tempo` object automatically carries your timezone and locale context.
    *   *Cons:* Extending Tempo means the entire namespace is attached to the prototype. It is not fully tree-shakeable.
*   **The Functional Approach (FP)**: `isFiscalYearStart(t)`
    *   *Pros:* 100% tree-shakeable. Developers only import exactly the functions they need. Zero prototype pollution.
    *   *Cons:* Less discoverable. Developers must pass the `Tempo` object as the first argument manually.

### The Best of Both Worlds
A world-class plugin doesn't force developers to choose—it provides both! You can write all your logic as **pure functions first**, and then use `defineNamespace` to wrap those functions for OOP users.

```typescript
// 1. The Pure Functions (The FP layer)
export function isFiscalYearStart(t: Tempo, startMonth: number = 1): boolean {
    return t.mm === startMonth && t.dd === 1; 
}
export function nextTaxYear(t: Tempo): Tempo { ... }

// 2. The Namespace Wrapper (The OOP layer)
export const FinanceNamespace = defineNamespace({
    name: 'finance',
    resolvers: {
        // We simply wrap our pure functions and inject the 'tempo' context!
        isFiscalYearStart: (tempo: Tempo) => (startMonth?: number) => isFiscalYearStart(tempo, startMonth),
        nextTaxYear: (tempo: Tempo) => () => nextTaxYear(tempo)
    }
});
```

Because of this interleaving, developers can choose their preferred architecture based on their project needs (e.g. rapid prototyping with `t.finance.x` vs. strict bundle optimization with `isFiscalYearStart(t)`).

---

## Advanced: Symbol Namespaces

If you are building a highly-specialized internal plugin and want to mathematically guarantee zero naming collisions, you can use a `Symbol` as your namespace key!

```typescript
// secret.ts
import { defineNamespace } from '@magmacomputing/tempo/plugin-api';
import type { Tempo } from '@magmacomputing/tempo/core';

export const InternalTools = Symbol('internal');

export const SecretPlugin = defineNamespace({
  name: InternalTools,
  resolvers: {
    audit: (tempo: Tempo) => () => console.log(`Audited: ${tempo.format('{yyyy}-{mm}-{dd}')}`)
  }
});
```

```typescript
// Consumer's code
import { Tempo } from '@magmacomputing/tempo/core';
import { FormatModule } from '@magmacomputing/tempo/format';
// The consumer must import BOTH the Plugin (to extend Tempo) and the Symbol (to access the namespace)
import { SecretPlugin, InternalTools } from './secret.js';

// Register both modules so tempo.format() is available for the audit method
Tempo.extend(FormatModule, SecretPlugin);

const t = new Tempo();
t[InternalTools].audit();
```

> [!WARNING] Symbol Tagging Requirement
> Tempo enforces a strict tagging policy for security and discovery. If you pass an undescribed Symbol (e.g., `Symbol()`) as a namespace, the factory will throw a `TempoError`. You must provide a description (e.g., `Symbol('myPlugin')`).

### Symbol Discovery in the Registry

When a developer calls `Tempo.versions` to view the loaded plugins, Tempo intelligently translates your Symbol namespaces into standard representations:
- Local Symbols (e.g., `Symbol('internal')`) are reported as `@internalNamespace`.
- Global Symbols (e.g., `Symbol.for('system')`) are reported as `@@systemNamespace`.
