# Tempo Modularity

Tempo is designed as a modular library, allowing you to include only the features you need. This reduces the core bundle size and prevents your application from being polluted with unused functionality.

## Module Activation Quick Guide

If you are using module entry points, use this rule of thumb:

1. `import 'tempo-kit/<module>'` (side-effect import): auto-registers that module. You usually do **not** need `Tempo.use(...)` for the same module.
2. `import { SomeModule } from 'tempo-kit/<module>'` (named import): requires explicit activation via `Tempo.use(SomeModule)`.
3. `Tempo.init()` is primarily for baseline configuration and initial discovery. Call it at startup for config; if you load modules later at runtime, use `Tempo.use(...)` for deterministic activation.
4. Import order is usually only relevant when modules are loaded dynamically/lazily. For deterministic activation in those cases, prefer explicit `Tempo.use(...)` immediately after import.

## Core vs. Full

* **tempo-kit/core**: The bare-bones Tempo engine. Includes parsing (standard ISO string or a native `Temporal` object), basic getters, and internal state management.
* **tempo-kit**: The "batteries included" version. Includes all standard modules (Duration, Format, Term Registry, Mutate, etc.).

```typescript
import { Tempo } from 'tempo-kit/core';
import { DurationModule } from 'tempo-kit/duration';
import { FormatModule } from 'tempo-kit/format';
import { MutateModule } from 'tempo-kit/mutate';
import { ParseModule } from 'tempo-kit/parse';
import { TermsModule } from 'tempo-kit/term';


// Individual extension...
Tempo.use(DurationModule);

// ...or bulk extension!
Tempo.use(DurationModule, FormatModule, TermsModule, MutateModule, ...);
```

## Available Modules

### Duration Module (tempo-kit/duration)
Adds support for `.until()` and `.since()` instance methods, as well as the static `Tempo.duration()` factory.

### Format Module (tempo-kit/format)
Adds support for the `.format()` method and custom layout resolution.

### Mutate Module (tempo-kit/mutate)
Adds support for the `.add()`, `.subtract()`, and `.set()` instance methods, enabling time manipulation.

### Parse Module (tempo-kit/parse)
Handles string parsing and token extraction. This is included automatically in the `full` package, but must be explicitly opted-in when using `core`.



### Terms Module (tempo-kit/term)
Adds support for semantic Terms like `quarter`, `season`, `zodiac`, and `period`. There are three ways to enable Terms:

#### 1. The Side-Effect (Standard Activation)
Fastest way to enable all standard Terms in a Core environment.
```typescript
import 'tempo-kit/term'; // One-line activation
```

#### 2. The Explicit Module (Uniform Sync)
Recommended for consistency with other modules.
```typescript
import { Tempo } from 'tempo-kit/core';
import { TermsModule } from 'tempo-kit/term';

Tempo.use(TermsModule);
```

#### 3. The Surgical Strike (Data-Only)
Best for maximum bundle-size optimization by picking only what you need. Note that specific standard terms have their own dedicated sub-paths natively bundled within the main package.
```typescript
import { Tempo } from 'tempo-kit/core';
import { QuarterTerm } from 'tempo-kit/term/quarter';

Tempo.use(QuarterTerm);
```

## Custom Modules

You can create your own modules to extend Tempo's internal engine or its public API.

```typescript
import { defineModule } from 'tempo-kit/plugin';

export const MyModule = defineModule((TempoClass, options) => {
    // Add instance methods
    TempoClass.prototype.sayHello = function() { return 'Hello!'; };
    
    // Add static methods
    (TempoClass as any).greet = () => 'Greetings!';
});
```

To ensure TypeScript recognizes your new methods without throwing augmentation errors (such as `TS2669`), you must properly declare the module augmentation in a `.d.ts` file alongside an explicit import:

```typescript
// my-module.d.ts
import 'tempo-kit';

declare module 'tempo-kit' {
    interface Tempo {
        sayHello(): string;
    }
    namespace Tempo {
        export function greet(): string;
    }
}
```

::: warning
**Dual Module Hazard**: If you are using `tempo-kit/core` and `tempo-kit` in the same project, ensure you use the `development` condition or consistent import paths to avoid registering the same classes twice.
:::

## ⚠️ The Registration "Gotcha"

There is a subtle but important distinction between how features are activated in Core mode:

*   **`Tempo.use(Module)`**: This is **Immediate and Explicit**. It applies the module or plugin to the class exactly when the line is executed. This is the recommended pattern for modular applications.
*   **`Tempo.init()`**: Establishes global baseline configuration at application startup and registers plugins specified in the `plugins` array during initial startup discovery.

::: note
**Startup Initialization Lifecycle**: `Tempo.init()` establishes baseline configuration during application startup. Built-in plugins are registered automatically via static imports in full Tempo (`tempo-kit`), while explicit plugin lists are registered during `Tempo.init({ plugins: [...] })`. Note that subsequent calls to `Tempo.init()` re-evaluate and merge configuration options rather than executing as an idempotent no-op. To register additional plugins dynamically after startup, use `Tempo.use(...)`.
:::

