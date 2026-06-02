# Creating an Extension Plugin

While [Term Plugins](./tempo.term.md) are excellent for providing static, memoized data (like astrological signs or fiscal quarters), **Extension Plugins** allow you to fundamentally enhance the `Tempo` class with entirely new methods and behaviors.

This guide will teach you the "Tempo-way" of authoring an Extension Plugin by building a classic, real-world example: **The Business Days Extension**.

## The Goal

We want to add an `.addBusinessDays()` method to the Tempo instance that adds or subtracts a specific number of working days (defaulting to 1), skipping weekends automatically.

```typescript
const t = new Tempo('2026-05-22'); // Friday
console.log(t.addBusinessDays(2).format('{www}')); // Output: 'Tue'
```

---

## 1. The `defineExtension` Factory

The safest and most efficient way to author a plugin is using the `defineExtension` factory. This handles the internal registration automatically.

```typescript
// src/index.ts
import { defineExtension } from '@magmacomputing/tempo/plugin';
import type { Tempo } from '@magmacomputing/tempo/core';

export const BusinessDaysPlugin = defineExtension({
  name: 'BusinessDaysPlugin',
  install(TempoClass: any) {
    // Plugin implementation goes here!
  }
});
```

## 2. Extending the Prototype

To add an instance method, you extend the `TempoClass.prototype`. 

> [!WARNING] Immutability is King
> Tempo is strictly immutable. When authoring an instance method that modifies the date, **never mutate `this`**. Instead, use the core methods (like `this.add` or `this.set`) which automatically generate and return a fresh, isolated clone for you.

Let's implement our `.addBusinessDays()` logic:

```typescript
export const BusinessDaysPlugin = defineExtension({
  name: 'BusinessDaysPlugin',
  install(TempoClass: any) {
    TempoClass.prototype.addBusinessDays = function(days: number = 1) {
      let next = this;
      const direction = days >= 0 ? 1 : -1;
      let remaining = Math.abs(days);
      
      // Loop using the underlying Temporal API data
      // dayOfWeek: 1 = Monday ... 7 = Sunday
      while (remaining > 0) {
        next = next.add({ days: direction });
        
        // Only count Monday-Friday as a valid jump
        if (next.toDateTime().dayOfWeek <= 5) {
          remaining--;
        }
      }
      
      // Return the new clone! (Tempo's native .add() already guarantees a fresh instance)
      return next;
    };
  }
});
```

Notice how we drop into `.toDateTime()` to access the raw zone-aware `Temporal.ZonedDateTime` object? This is a common pattern in plugins when you need to access raw calendar properties (like `dayOfWeek`, `dayOfYear`, or `daysInMonth`) while preserving zone information without triggering unnecessary string formatting.

## 3. TypeScript Module Augmentation

If you are using TypeScript (highly recommended), your IDE will not know about `.addBusinessDays()` until you augment the `Tempo` interface. 

You must declare this augmentation in the same file that exports your plugin:

```typescript
// src/index.ts
import { defineExtension } from '@magmacomputing/tempo/plugin';

// ... (plugin implementation) ...

// Inform TypeScript that the core Tempo class now has this method
declare module '@magmacomputing/tempo/core' {
  interface Tempo {
    addBusinessDays(days?: number): Tempo;
  }
}
```

## 4. Packing it as a Configurable Module

Sometimes, you want your plugin to accept options (e.g., passing in a custom array of public holidays to skip). To do this, wrap your `defineExtension` call in a standard factory function:

```typescript
export type BusinessDayOptions = {
  skipHolidays?: boolean;
};

export const BusinessDaysModule = (pluginOptions: BusinessDayOptions = {}) => {
  return defineExtension({
    name: 'BusinessDaysModule',
    install(TempoClass: any) {
      TempoClass.prototype.addBusinessDays = function(days: number = 1) {
        let next = this;
        const direction = days >= 0 ? 1 : -1;
        let remaining = Math.abs(days);
        
        while (remaining > 0) {
          next = next.add({ days: direction });
          if (next.toDateTime().dayOfWeek <= 5) {
            // We can now use 'pluginOptions' in our logic!
            if (!pluginOptions.skipHolidays /* || !isHoliday(next) */) {
               remaining--;
            }
          }
        }
        
        return next;
      };
    }
  });
};
```

## Consuming the Plugin

Your users can now import and register your extension elegantly:

```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { BusinessDaysModule } from 'my-business-days-plugin';

Tempo.extend(BusinessDaysModule({ skipHolidays: true }));

const t = new Tempo();
const nextBiz = t.addBusinessDays(2);
```

---

> [!TIP] Need something more complex?
> If you need to build advanced scheduling engines, AsyncGenerators, or precision arithmetic tools that you plan to distribute commercially, check out our **[Premium Plugin Registry ↗](https://magmacomputing.github.io/tempo-plugin-docs/)** for inspiration, or contact Magma Computing for professional plugin development.
