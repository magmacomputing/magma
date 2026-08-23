# Extending Tempo with Plugins

Tempo is designed with a "lean core" philosophy. While it provides robust date-time manipulation and parsing out of the box, advanced functionality (like reactive Tickers or domain-specific business logic) is added through a flexible **Plugin System**.

In the Tempo ecosystem, a **Plugin** is the universal overarching term for any feature added to the core library. To make authoring plugins easy and consistent, Tempo provides two specialized factory functions:

1. **`definePlugin`**: The standard factory for general-purpose features (e.g., adding prototype instance methods, static tools, or altering configuration).
2. **`defineTerm`**: A specialized factory exclusively for defining temporal vocabulary constraints (a "Term" is technically just a highly-opinionated "Plugin" focused on date ranges and schedules).
3. **`defineNamespace`**: A factory for creating lazily-evaluated property landing pads (e.g., `Tempo().finance.taxYear`).

## Naming Convention Standard
To provide a consistent and intuitive developer experience, the exported symbol of your plugin should use a suffix that directly matches the factory used to construct it. This makes it instantly obvious to consumers how the extension will attach to the Tempo core:
- Built with `definePlugin` ➡️ **`[Name]Plugin`** (e.g., `TickerPlugin`)
- Built with `defineTerm` ➡️ **`[Name]Term`** (e.g., `AstroTerm`)
- Built with `defineNamespace` ➡️ **`[Name]Namespace`** (e.g., `FinanceNamespace`)

*(Note: The `Module` suffix and `defineModule` factory are strictly reserved for Tempo's core internal injection APIs like `ParseModule` and should not be used by external plugins.)*

To manually register a plugin, use the static `extend` method. This is typically used for "opt-in" features or when you need to provide specific configuration to a plugin factory.

```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { MyPlugin } from './my-plugin.js';
import { HolidayPlugin } from './my-holiday-plugin.js';

// Manual registration
Tempo.extend(MyPlugin);

// Registration with a Factory (providing options)
Tempo.extend(HolidayPlugin({ region: 'US-NY' }));
```

---

## 1. Creating a Custom Plugin

Tempo provides a dedicated step-by-step guide for developers wishing to author their own general-purpose plugins. 

👉 **[Read the Custom Plugin Guide (tempo.extension.md)](./tempo.extension.md)** to learn how to:
- Use the `definePlugin` factory
- Safely extend the `TempoClass.prototype`
- Build a full `BusinessDaysPlugin` from scratch

## Type Safety (TypeScript)

To ensure your plugin is discoverable by the IDE, use **Module Augmentation** to extend the `Tempo` namespace and the `Tempo` class interface.

```typescript
declare module '@magmacomputing/tempo/core' {
  namespace Tempo {
    // 1. Define new types/interfaces here
    interface HolidayOptions { ... }

    // 2. Add static methods to the Tempo namespace
    function myStaticMethod(): void;
  }

  interface Tempo {
    // 3. Add instance methods to the Tempo class
    toHoliday(): Tempo;
  }
}
```

> **Understanding Tempo Versions**:
> - **`@magmacomputing/tempo/core` (Lite)**: A bare-bones engine with zero side-effects. This is the recommended choice for production builds and plugin authoring.
> - **`@magmacomputing/tempo` (Full)**: The "Batteries Included" version which automatically imports and registers all standard modules.
>
> **Avoid Circular Dependencies**: When authoring a plugin, **never** import the `Tempo` class directly from the **Full** version (`@magmacomputing/tempo`). Doing so triggers the library's automatic registration sequence in a recursive loop, which will break your application's initialization. 
> 
> Instead:
> 1. **Use types**: `import type { Tempo } from '@magmacomputing/tempo/core'`.
> 2. **Use the argument**: Rely on the `TempoClass` argument passed into your plugin function for static method access.
> 3. **Use the engine**: If you need a class reference (e.g., for `instanceof` checks), import only from the **Lite** engine (`@magmacomputing/tempo/core`).

---

Modern Tempo plugins are designed to be "plug-and-play." By using the `definePlugin` factory, a plugin registers itself with the global Tempo registry as soon as it's imported.

```typescript
import { Tempo } from '@magmacomputing/tempo/core';   // 1. Load the `lite` engine
import { TickerPlugin } from '@magmacomputing/tempo-plugin-ticker'; // 2. Import the plugin

Tempo.init({ 
  extends: [TickerPlugin]                             // 3. Register and activate plugin during init
});

// Ticker is now available on the core Tempo class!
const pulse = Tempo.ticker(1); 
```

> [!NOTE] Dynamic Extension vs Startup Registration
> `Tempo.init({ extends: [...] })` establishes baseline configuration at startup and performs initial registration of plugins. In full Tempo (`@magmacomputing/tempo`), standard plugins are registered automatically upon import. To dynamically register custom plugins loaded later at runtime, use `Tempo.extend(Plugin)` directly rather than re-running `Tempo.init()`.

---

## Best Practices

### 1. Selective Immobility
The core methods of Tempo (like `add`, `set`, `format`) are **protected**. The `extend()` system will prevent you from accidentally overwriting these essential behaviors. By standardizing plugins through the Tempo module system, the entire library remains small and fast, while offering unbounded domain-specific customization.

### 2. Immutability
When adding instance methods that "modify" the date, always follow the Tempo pattern of returning a **new instance**. Do not mutate `this`. Rely on the core methods (like `this.add()`) inside your plugin, as they automatically guarantee a fresh, cloned instance.

### 3. Namespace Respect
If your plugin provides many related methods, consider grouping them under a single namespace property on the instance (e.g., `tempo.holiday.isPublic()` rather than `tempo.isPublicHoliday()`). This keeps the root `Tempo` interface clean and minimizes the risk of naming collisions. 

Instead of manually building these namespaces on the prototype, Tempo provides the `defineNamespace` factory to automate lazy-evaluation. 
👉 **[Read the Namespace Guide](./tempo.namespace.md)** to learn more.

### 4. Error Handling & The Diagnostic Engine
When building plugins that perform complex parsing or logic, follow Tempo's **"Fail-fast by Default"** principle.

- **Strict Mode (Default)**: If your plugin encounters a terminal error (e.g., invalid input that cannot be recovered), you should `throw` a descriptive error.
- **Catch Mode**: Respect the user's `catch` configuration. If `this.config.catch` is `true`, instead of throwing, you should log a warning using `this.warn()` and return a sensible fallback (or the original input).
- **Configuration Dependencies**: *You* are responsible for managing missing configuration keys that your plugin depends on. The core engine will not validate your plugin's specific requirements. If a required config key is missing (e.g., `sphere` for a Season plugin), either provide a reasonable default fallback value or warn the user explicitly using `this.warn()`. Do not make assumptions that lead to silent failures.

```typescript
// Example within a plugin instance method
if (errorCondition) {
  const msg = `Custom Error: ${details}`;
  if (this.config.catch === true) {
    this.warn(msg);
    return this; // or a fallback value
  }
  throw new Error(msg);
}
```

This pattern ensures that Tempo remains robust in production environments while providing strict validation during development.

## Alternative: Standalone Functions (`tempo-fns`)

The JavaScript ecosystem is divided between two architectural preferences: **Chained Fluent APIs** (like Tempo Plugins) and **Pure Standalone Functions** (for aggressive tree-shaking).

To support teams that mandate strict 0kb bundle-impacts and functional programming paradigms, Magma Computing provides the **`@magmacomputing/tempo-fns`** library.

```typescript
// The Pure, Tree-shakeable approach:
import { isFirstDayOfMonth } from '@magmacomputing/tempo-fns';
import { Tempo } from '@magmacomputing/tempo/core';

if (isFirstDayOfMonth(new Tempo('2024-01-01'))) { ... }
```

When building complex logic, consider whether it belongs as a core Plugin extension, or as a standalone utility in `tempo-fns` (or a hybrid wrapper of both!).

## Distributing Your Plugin

To make your plugin available to the community, package it as a standard NPM module. 

### Plugin Factories (with Options)
If your plugin requires its own configuration, export a **factory function** that returns the `Tempo.Plugin` function. This is the cleanest pattern for "marketplace" plugins.

```typescript
// tempo-plugin-holiday/index.ts
import { definePlugin } from '@magmacomputing/tempo/plugin/sdk';

export const HolidayPlugin = (pluginOptions = {}) => {
  return definePlugin((TempoClass, tempoOptions, factory) => {
    // ... use pluginOptions here ...
  });
};
```

### The Module Aggregator Pattern
If your plugin provides multiple related components, wrap them in an aggregator module to provide a uniform activation experience for the user.

```typescript
// index.ts
import { definePlugin } from '@magmacomputing/tempo/plugin/sdk';
import { PluginA } from './plugin.a.js';
import { PluginB } from './plugin.b.js';

export const MyFeaturePlugin = definePlugin((TempoClass, options) => {
  TempoClass.extend([PluginA, PluginB]);
});
```

### Commercial & Enterprise Extensions

If you require custom commercial plugins, domain-specific extensions, or enterprise-grade features with dedicated support, see our **[Commercial & Professional Services](../8-project-and-support/commercial.md)** guide.

---

## Consuming a Plugin

For developers using your plugin, the process should be as simple as a single import and one call to `extend()`.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { HolidayPlugin } from 'tempo-plugin-holiday';

// Initialize the plugin with its own options and register it with Tempo
Tempo.extend(HolidayPlugin({ 
  region: 'US-NY' 
}));
```

---

## Bulk Registration

`Tempo.extend()` supports **rest parameters** and **arrays**, allowing you to register multiple plugins in a single call. If the last argument is a plain object (and not a plugin/term), it is treated as a shared configuration for all plugins in that batch.

```ts
// Mix and match arrays and individual arguments
Tempo.extend(
  [PluginA, PluginB], 
  PluginC, 
  { debug: 5 } // applied to A, B, and C
);
```

---

## 🤝 Need Help Writing a Plugin?

If you have a complex business requirement or need a high-performance plugin built to professional standards, we can help. Our team can design, implement, and verify custom Tempo plugins tailored to your specific domain.

**[Contact Magma Computing Solutions](https://github.com/magmacomputing)** to discuss your requirements.

- [General Plugin Guide](./tempo.extension.md): Learn the "Tempo-way" to write a prototype plugin (like Business Days).
- [Tempo Terms Guide](./tempo.term.md): Documentation on the "Memoized Lookup" pattern for business logic.
