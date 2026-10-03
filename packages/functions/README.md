<table>
  <tbody>
    <tr>
      <td width="100" valign="top">
        <img src="https://raw.githubusercontent.com/magmacomputing/magma/main/packages/functions/img/functions-logo.svg" width="90" height="90" alt="@magmacomputing/tempo-fns">
      </td>
      <td valign="middle">
        <h1 style="border-bottom: none; margin-bottom: 0;"><code>@magmacomputing/tempo-fns</code></h1>
        <p style="font-weight: 600; font-size: 1.1rem; color: #2c3e50; margin-top: 0;">The "date-fns" of the Temporal Era</p>
      </td>
    </tr>
  </tbody>
</table>

A library of highly granular, fully tree-shakeable utility functions built directly on top of the JavaScript Temporal API. 

This package provides a bridge for developers transitioning from legacy date wrappers (like Moment or `date-fns`) into the modern Temporal API. 

### Why `tempo-fns`?
1. **Tree-shakeable**: Import exactly what you need. `import { isFirstDayOfMonth } from '@magmacomputing/tempo-fns'` pulls in zero extra bloat.
2. **Native Temporal & Universal Inputs**: Functions accept native `Temporal.PlainDate`, `Temporal.ZonedDateTime`, ISO date strings, standard JS `Date` objects, and timestamps. No wrapper required.
3. **Synergy**: If you *do* use the `Tempo` class wrapper, `tempo-fns` functions seamlessly accept `Tempo` instances and provide advanced business-intelligence utilities that understand Tempo's Terms engine (e.g., `isSameFiscalQuarter`).

## Usage (NPM / Modern Bundlers)

Every function is a standalone, pure export:

```typescript
import { isFirstDayOfMonth, isBusinessDay, nextBusinessDay, haversineDistance } from '@magmacomputing/tempo-fns';

// 1. Works with simple ISO strings
isFirstDayOfMonth('2026-10-01'); // true
isBusinessDay('2026-10-02');    // true (Friday)

// 2. Works with native Temporal objects
const today = Temporal.Now.plainDateISO();
const nextTradingDay = nextBusinessDay(today);

// 3. Works with standard JS Dates & timestamps
isFirstDayOfMonth(new Date(2026, 9, 1)); // true

// 4. Geodesic & Navigation math with zero dependencies
const distanceKm = haversineDistance(
  { lat: 40.7128, lng: -74.006 }, // NYC
  { lat: 51.5074, lng: -0.1278 }   // London
);
```

## Usage (Static CDN / Browser Global)

If you aren't using a bundler (like Vite, Webpack, or Rollup), we provide a pre-bundled script that exposes a `Functions` global object.

```html
<script src="https://cdn.jsdelivr.net/npm/@magmacomputing/tempo-fns/dist/tempo-fns.global.js"></script>
<script>
  // Access functions via the Functions global
  Functions.isFirstDayOfMonth(Temporal.Now.plainDateISO());
  Functions.isBusinessDay('2026-10-02');
</script>
```
