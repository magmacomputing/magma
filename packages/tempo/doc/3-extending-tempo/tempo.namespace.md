# Creating a Namespace Plugin

When building plugins that provide multiple related features, adding them directly to the `Tempo` prototype can clutter the root interface and increase the risk of naming collisions.

To solve this, Tempo provides the `defineNamespace` factory. This allows you to mount an entire suite of related tools under a single property (e.g., `Tempo().audit.complianceYear`).

## The Lazy-Evaluation Advantage

Namespaces in Tempo are **Lazy-Evaluated Proxies**. 
When a user extends Tempo with your namespace plugin, it adds exactly **0 CPU cycles** of overhead to instantiation. Your methods and resolvers are only initialized and executed if the user actually accesses the namespace property on that specific date instance!

## 1. The `defineNamespace` Factory

Let's build an `audit` plugin. We want to add an `.audit` namespace that provides tools like `complianceYear`, `retentionPeriod`, and `isRetentionExpired()`.

```typescript
// audit.ts
import { defineNamespace } from '@magmacomputing/tempo/plugin/sdk';
import { Tempo } from '@magmacomputing/tempo/core';

export const AuditNamespace = defineNamespace({
  // 1. Define the property name where this namespace will live on the Tempo instance
  name: 'audit',
  
  // 2. Define the lazy-resolvers
  resolvers: {
    // Static properties return values directly
    retentionPeriod: (tempo: Tempo): string => {
      return `${tempo.yy}-Q${Math.floor((tempo.mm - 1) / 3) + 1}`;
    },
    
    complianceYear: (tempo: Tempo): number => {
      return tempo.yy;
    },
    
    // Methods return callable functions
    isRetentionExpired: (tempo: Tempo): ((years?: number) => boolean) => {
      return (years: number = 7) => Tempo.compare(new Tempo(), tempo.add({ years })) >= 0;
    }
  }
});
```

Notice how every resolver receives the current `Tempo` instance as its first argument? This gives you full access to the date's underlying data (`tempo.mm`, `tempo.add()`, etc.) without ever needing to worry about `this` binding!

### The Memoized Closure Pattern (Methods with Parameters)

One of the most powerful features of the `defineNamespace` architecture is that your resolvers are **memoized closures**. Because a resolver is only evaluated the *very first time* the property is accessed on that specific `Tempo` instance, you can use the outer block to execute expensive setup logic or stash variables.

Let's zoom in on the `isRetentionExpired` method we defined above:

```typescript
isRetentionExpired: (tempo: Tempo) => {
  // 1. SETUP BLOCK (Runs exactly once per Tempo instance)
  // You can stash variables, run complex mathematical lookups, or build state here!
  const recordDate = tempo;

  // 2. INNER CLOSURE (Runs every time the consumer calls the method)
  // The consumer can pass their company's retention policy (e.g., 7 years). Defaults to 7.
  return (years: number = 7): boolean => {
    return Tempo.compare(new Tempo(), recordDate.add({ years })) >= 0;
  };
}
```

When a consumer types `t.audit.isRetentionExpired(5)`, they are executing that returned inner function to check if the record is at least 5 years old. This pattern allows you to write incredibly performant plugins with zero repeated overhead!

## 2. TypeScript Module Augmentation

Just like standard plugins, you must inform TypeScript about your new namespace so developers get full IDE autocomplete:

```typescript
// audit.ts
import { defineNamespace } from '@magmacomputing/tempo/plugin/sdk';

// ... (AuditNamespace implementation) ...

declare module '@magmacomputing/tempo/core' {
  interface Tempo {
    audit: {
      retentionPeriod: string;
      complianceYear: number;
      isRetentionExpired: (years?: number) => boolean;
    }
  }
}
```

## 3. Consuming the Namespace

Developers can now import your plugin, register it once, and enjoy your clean, isolated API!

```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { MutateModule } from '@magmacomputing/tempo/mutate';
import { AuditNamespace } from './audit.js';

// Extend the core Tempo engine
Tempo.use(MutateModule, AuditNamespace);

const t = new Tempo('2018-07-01');

// Access the static property (Evaluated instantly and memoized!)
console.log(t.audit.retentionPeriod); // '2018-Q3'

// Access the callable method (Checking against a 7-year retention policy)
console.log(t.audit.isRetentionExpired(7)); // true
```

---

## The Dual Architecture (OOP vs FP)

When building a Namespace plugin, you'll naturally face a choice between **Object-Oriented Programming (OOP)** and **Functional Programming (FP)**. 

*   **The Namespace (OOP)**: `t.audit.isRetentionExpired()`
    *   *Pros:* Incredible Developer Experience (DX). You get instant IDE autocomplete, and the `Tempo` object automatically carries your timezone and locale context.
    *   *Cons:* Extending Tempo means the entire namespace is attached to the prototype. It is not fully tree-shakeable.
*   **The Functional Approach (FP)**: `isRetentionExpired(t)`
    *   *Pros:* 100% tree-shakeable. Developers only import exactly the functions they need. Zero prototype pollution.
    *   *Cons:* Less discoverable. Developers must pass the `Tempo` object as the first argument manually.

### The Best of Both Worlds
A world-class plugin doesn't force developers to choose—it provides both! You can write all your logic as **pure functions first**, and then use `defineNamespace` to wrap those functions for OOP users.

```typescript
// 1. The Pure Functions (The FP layer)
import { Tempo } from '@magmacomputing/tempo/core';
import { MutateModule } from '@magmacomputing/tempo/mutate';

Tempo.use(MutateModule);

export function isRetentionExpired(t: Tempo, years: number = 7): boolean {
    return Tempo.compare(new Tempo(), t.add({ years })) >= 0; 
}
export function nextAuditDate(t: Tempo): Tempo { ... }

// 2. The Namespace Wrapper (The OOP layer)
export const AuditNamespace = defineNamespace({
    name: 'audit',
    resolvers: {
        // We simply wrap our pure functions and inject the 'tempo' context!
        isRetentionExpired: (tempo: Tempo) => (years?: number) => isRetentionExpired(tempo, years),
        nextAuditDate: (tempo: Tempo) => () => nextAuditDate(tempo)
    }
});
```

Because of this interleaving, developers can choose their preferred architecture based on their project needs (e.g. rapid prototyping with `t.audit.x` vs. strict bundle optimization with `isRetentionExpired(t)`).

---

## Advanced: Symbol Namespaces

If you are building a highly-specialized internal plugin and want to mathematically guarantee zero naming collisions, you can use a `Symbol` as your namespace key!

```typescript
// secret.ts
import { defineNamespace } from '@magmacomputing/tempo/plugin/sdk';
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
Tempo.use(FormatModule, SecretPlugin);

const t = new Tempo();
t[InternalTools].audit();
```

> [!WARNING] Symbol Tagging Requirement
> Tempo enforces a strict tagging policy for security and discovery. If you pass an undescribed Symbol (e.g., `Symbol()`) as a namespace, the factory will throw a `TempoError`. You must provide a description (e.g., `Symbol('myPlugin')`).

### Symbol Discovery in the Registry

When a developer calls `Tempo.versions` to view the loaded plugins, Tempo intelligently translates your Symbol namespaces into standard representations:
- Local Symbols (e.g., `Symbol('internal')`) are reported as `@internalNamespace`.
- Global Symbols (e.g., `Symbol.for('system')`) are reported as `@@systemNamespace`.
