# Creating a Custom Plugin

While [Term Plugins](./tempo.term.md) are excellent for providing static, memoized data (like astrological signs or fiscal quarters), a general **Plugin** allows you to fundamentally enhance the `Tempo` class with entirely new methods and behaviors.

This guide will teach you the "Tempo-way" of authoring a custom plugin by building a classic, real-world example: **The Business Days Plugin**.

> [!TIP] Adding a group of properties?
> If you are building a plugin that adds multiple related properties or methods (like `.finance.taxYear` and `.finance.fiscalQuarter`), you should use the `defineNamespace` factory instead! It automatically lazy-loads your methods and prevents prototype pollution. 
> 👉 **[Read the Namespace Guide](./tempo.namespace.md)**

## The Goal

We want to add an `.addBusinessDays()` method to the Tempo instance that adds or subtracts a specific number of working days (defaulting to 1), skipping weekends automatically.

```typescript
const t = new Tempo('2026-05-22'); // Friday
console.log(t.addBusinessDays(2).format('{www}')); // Output: 'Tue'
```

---

## 1. The `definePlugin` Factory

The safest and most efficient way to author a plugin is using the `definePlugin` factory. This handles the internal registration automatically.

```typescript
// src/index.ts
import { definePlugin, type TempoPlugin } from '@magmacomputing/tempo/plugin/sdk';

export const BusinessDaysPlugin: TempoPlugin = definePlugin({
  name: 'BusinessDaysPlugin',
  install(TempoClass) {
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
export const BusinessDaysPlugin: TempoPlugin = definePlugin({
  name: 'BusinessDaysPlugin',
  install(TempoClass) {
    TempoClass.prototype.addBusinessDays = function(days: number = 1) {
      let next = this;
      const direction = days >= 0 ? 1 : -1;
      let remaining = Math.abs(days);
      
      // Loop using the underlying Temporal API data
      // dayOfWeek: 1 = Monday ... 7 = Sunday
      while (remaining > 0) {
        next = next.add({ days: direction });
        
        // Only count Monday-Friday as a valid jump
        if (next.dow <= TempoClass.WEEKDAY.Fri) {
          remaining--;
        }
      }
      
      // Return the new clone! (Tempo's native .add() already guarantees a fresh instance)
      return next;
    };
  }
});
```

Notice how we used the `next.dow` getter to easily read the Day Of Week? Tempo instances have many lightweight getters (like `.yy`, `.mm`, `.dd`, `.hh`) built-in.

However, if you ever need to calculate advanced calendar math (like `dayOfYear`, `daysInMonth`, or `weeksInYear`), you can drop into `this.toDateTime()` to access the raw, underlying `Temporal.ZonedDateTime` object.

## 3. TypeScript Module Augmentation

If you are using TypeScript (highly recommended), your IDE will not know about `.addBusinessDays()` until you augment the `Tempo` interface. 

You must declare this augmentation in the same file that exports your plugin:

```typescript
// src/index.ts
import { definePlugin } from '@magmacomputing/tempo/plugin/sdk';

// ... (plugin implementation) ...

// Inform TypeScript that the core Tempo class now has this method
declare module '@magmacomputing/tempo/core' {
  interface Tempo {
    addBusinessDays(days?: number): Tempo;
  }
}
```

## 4. Packing it as a Configurable Module

Sometimes, you want your plugin to accept options (e.g., passing in a custom array of public holidays to skip). To do this, wrap your `definePlugin` call in a standard factory function:

```typescript
export type BusinessDayOptions = {
  skipHolidays?: boolean;
};

export const BusinessDaysPlugin = (pluginOptions: BusinessDayOptions = {}): TempoPlugin => {
  return definePlugin({
    name: 'BusinessDaysPlugin',
    install(TempoClass) {
      TempoClass.prototype.addBusinessDays = function(days: number = 1) {
        let next = this;
        const direction = days >= 0 ? 1 : -1;
        let remaining = Math.abs(days);
        
        while (remaining > 0) {
          next = next.add({ days: direction });
          if (next.dow <= TempoClass.WEEKDAY.Fri) {
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

Your users can now import and register your plugin elegantly:

```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { BusinessDaysPlugin } from 'my-business-days-plugin';

Tempo.extend(BusinessDaysPlugin({ skipHolidays: true }));

const t = new Tempo();
const nextBiz = t.addBusinessDays(2);
```

---

> [!TIP] Need something more complex?
> If you need to build advanced scheduling engines, AsyncGenerators, or precision arithmetic tools that you plan to distribute commercially, check out our **[Plugin Ecosystem ↗](./ecosystem.html)** for inspiration, or contact Magma Computing Solutions for professional plugin development.
