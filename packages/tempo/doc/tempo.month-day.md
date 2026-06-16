# Ambiguity Resolution (Month-Day Parsing)

Tempo provides sophisticated support for resolving ambiguous date formats, specifically the conflict between **Month-Day-Year** (common in the US) and **Day-Month-Year** (common in most of the rest of the world).

## Ambiguity Resolution

When Tempo encounters a date string like `04/01/2023`, it could be interpreted as April 1st or January 4th. To resolve this, Tempo uses a combination of environment detection and manual configuration.

### How Detection Works

Tempo automatically activates Month-Day-Year (MDY) parsing if the current **TimeZone** belongs to a region that prefers MDY (e.g., `America/New_York`), or if explicitly configured via the `monthDay.active` flag. Otherwise, it defaults to the more universally common Day-Month-Year (DMY) parsing patterns.

While the current **Locale** provides the metadata to map timezones (e.g. leveraging `Intl.Locale.getTimeZones()`), it is the timezone itself that instructs Tempo to apply MDY patterns first.

This logic is powered by the `MONTH_DAY` registry.

### Configuration: `monthDay`

The `monthDay` option (available in `Tempo.init()` or the constructor) allows you to control this behavior.

```typescript
import { Tempo } from '@magmacomputing/tempo';

// Shortcut: Force MDY parsing
const t = new Tempo('04/01/2023', { monthDay: true }); 

// Detailed: Force MDY parsing
const t2 = new Tempo('04/01/2023', { 
  monthDay: { active: true } 
}); // Resolves to April 1st

// Force DMY parsing
const t3 = new Tempo('04/01/2023', { 
  monthDay: { active: false } 
}); // Resolves to January 4th
```

### Registry: `MONTH_DAY`

The global `MONTH_DAY` registry defines the default rules for detection. You can augment this registry to support additional regions.

| Property | Description |
| :--- | :--- |
| `locales` | Array of BCP-47 locale names that prefer MDY. |
| `layouts` | Pairs of layout names to swap (e.g., `['dayMonthYear', 'monthDayYear']`). |
| `timezones` | Fallback IANA timezone names for environments where `Intl.Locale.getTimeZones()` is unavailable. |

#### Example: Adding a custom locale

```typescript
Tempo.init({
  monthDay: {
    locales: ['en-CA'], // Add Canada to the MDY preference list
    timezones: {
      'en-CA': ['America/Toronto', 'America/Vancouver']
    }
  }
});
```

## Internal Mechanism

When `monthDay.active` is true, Tempo performs two main actions:

1.  **Pattern Selection**: The `{dt}` composite-snippet (used in the default `dateTime` layout) is switched from the `dayMonthYear` pattern to the `monthDayYear` pattern.
2.  **Layout Swapping**: The internal order of tried layouts is adjusted. For example, the `monthDayYear` layout is moved ahead of `dayMonthYear` in the priority list.

This ensures that even complex or non-standard strings are interpreted according to the regional preference.

## Troubleshooting

If a date is being parsed in the wrong order:
1.  Check the `t.parse.monthDay.active` property to see if detection was successful.
2.  Ensure the `monthDay.layouts` registry includes the layouts you are using (default pairs cover most common formats).
3.  Use the `monthDay: { active: true }` override to verify that the patterns themselves match your input.

## Parsing "Ambiguous" Digits (US vs UK)

When processing numeric-only strings (like `04012026`), Tempo uses your timezone to decide if it means April 1st or January 4th.

```typescript
// US Context (en-US)
const us = new Tempo('04012026', { timeZone: 'America/New_York' }); 
console.log(us.format('{mon} {dd}')); // "April 01"

// UK/Elsewhere Context (en-GB)
const uk = new Tempo('04012026', { timeZone: 'Europe/London' });
console.log(uk.format('{mon} {dd}')); // "January 04"
```

For digits-only input, Tempo checks the most likely compact interpretation first:

- A **6-digit string** is *always* validated as compact time first (`hhmiss`) regardless of `timeZone`—this validation is timezone-independent. Only if validation fails does Tempo then try compact date layouts (like `ddmmyy` or `mmddyy`), where `timeZone` decides month-day vs day-month order.
- An **8-digit string** is checked as a compact date, with month-day-year vs day-month-year decided by the active Region/`timeZone` as described above.

To avoid ambiguity completely, prefer separators whenever you control the input format:
- Use `09:30:15` instead of `093015`.
- Use `2026-04-01`, `04/01/2026`, or `01/04/2026` instead of `04012026`.

## Forcing Resolution via the Parse Planner

If you need extreme, deterministic control over the priority of layout patterns (bypassing auto-detection completely), you can configure the Parse Planner's `layoutOrder`.

When a `layoutOrder` is provided, those specific layouts are pushed to the top of the parsing queue.

```typescript
import { Tempo } from '@magmacomputing/tempo';

// Forcing explicit priority
Tempo.init({
  planner: {
    layoutOrder: ['iso', 'dmy', 'mdy'] // Try ISO, then Day-Month, then Month-Day
  }
});
```

*For more details on parse optimization, see the [Parse Planner Guide](./tempo.planner.md).*
