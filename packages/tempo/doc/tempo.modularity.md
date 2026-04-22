# Tempo Modularity

Tempo is designed as a modular library, allowing you to include only the features you need. This reduces the core bundle size and prevents your application from being polluted with unused functionality.

## Core vs. Full

* **@magmacomputing/tempo/core**: The bare-bones Tempo engine. Includes parsing (standard ISO string or a native `Temporal` object), basic getters, and internal state management.
* **@magmacomputing/tempo**: The "batteries included" version. Includes all standard modules (Duration, Format, Term Registry, Mutate, etc.).

```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { DurationModule } from '@magmacomputing/tempo/duration';
import { FormatModule } from '@magmacomputing/tempo/format';
import { MutateModule } from '@magmacomputing/tempo/mutate';
import { ParseModule } from '@magmacomputing/tempo/parse';
import { TermsModule } from '@magmacomputing/tempo/term';

// and an optional ticker module (for reactive time pulsing)
import { TickerModule } from '@magmacomputing/tempo/ticker';

// Individual extension...
Tempo.extend(DurationModule);

// ...or bulk extension!
Tempo.extend(DurationModule, FormatModule, TermsModule, MutateModule, ...);
```

## Available Modules

### Duration Module (@magmacomputing/tempo/duration)
Adds support for `.until()` and `.since()` instance methods, as well as the static `Tempo.duration()` factory.

### Format Module (@magmacomputing/tempo/format)
Adds support for the `.format()` method and custom layout resolution.

### Mutate Module (@magmacomputing/tempo/mutate)
Adds support for the `.add()` and `.set()` instance methods, enabling time manipulation.

### Parse Module (@magmacomputing/tempo/parse)
Handles string parsing and token extraction. This is included automatically in the `full` package, but must be explicitly opted-in when using `core`.

### Ticker Module (@magmacomputing/tempo/ticker)
Adds support for reactive time-pulsing via the static `Tempo.ticker()` method.

### Terms Module (@magmacomputing/tempo/term)
Adds support for semantic terms like `qtr`, `szn`, `zdc`, and `per`. There are three ways to enable terms:

#### 1. The Side-Effect (Standard Activation)
Fastest way to enable all standard terms in a Core environment.
```typescript
import '@magmacomputing/tempo/term/standard'; // One-line activation
```

#### 2. The Explicit Module (Uniform Sync)
Recommended for consistency with other modules.
```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { TermsModule } from '@magmacomputing/tempo/term';

Tempo.extend(TermsModule);
```

#### 3. The Surgical Strike (Data-Only)
Best for maximum bundle-size optimization by picking only what you need.
```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { QuarterTerm } from '@magmacomputing/tempo/term/quarter';

Tempo.extend(QuarterTerm);
```

## Custom Modules

You can create your own modules to extend Tempo's internal engine or its public API.

```typescript
import { defineModule } from '@magmacomputing/tempo/plugin';

export const MyModule = defineModule((options, TempoClass) => {
    // Add instance methods
    TempoClass.prototype.sayHello = function() { return 'Hello!'; };
    
    // Add static methods
    (TempoClass as any).greet = () => 'Greetings!';
});
```

> [!IMPORTANT]
> **Dual Module Hazard**: If you are using `@magmacomputing/tempo/core` and `@magmacomputing/tempo` in the same project, ensure you use the `development` condition or consistent import paths to avoid registering the same classes twice.

## ⚠️ The Registration "Gotcha"

There is a subtle but important distinction between how features are activated in Core mode:

*   **`Tempo.extend(Module)`**: This is **Immediate and Explicit**. It applies the module to the class exactly when the line is executed. This is the recommended pattern for modular applications.
*   **`Tempo.init()`**: This is **Discovery-Driven**. It scans the global environment for any plugins that were imported via side effects (e.g., `import '@magmacomputing/tempo/ticker'`) and hydrates the engine all at once.

> [!CAUTION]
> **The Initialization Lifecycle**: `Tempo.init()` performs a **full state refresh**. It resets configuration, term registries, and formatting maps to defaults before re-applying all currently discovered plugins. To ensure your custom logic is managed correctly, always use `Tempo.extend()` or encapsulate changes within a formal plugin.

**The Side-Effect Trap**: If you import a side-effect plugin *after* you have already called `Tempo.init()`, the feature will **not** automatically appear on the `Tempo` class. You would need to call `Tempo.init()` again or use `Tempo.extend()` to pick up the latecomers.

