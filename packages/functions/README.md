<table>
  <tbody>
    <tr>
      <td width="100" valign="top">
        <img src="./img/functions-logo.svg" width="90" height="90" alt="@magmacomputing/tempo-fns">
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
2. **Native Temporal**: Functions accept native `Temporal.ZonedDateTime` and `Temporal.PlainDate` objects. You don't *have* to use the `Tempo` class.
3. **Synergy**: If you *do* use the `Tempo` class wrapper, `tempo-fns` provides advanced business-intelligence utilities that inherently understand Tempo's Terms engine (e.g., `isSameFiscalQuarter`).

## Usage (NPM / Modern Bundlers)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { isFirstDayOfMonth, isSameFiscalQuarter } from '@magmacomputing/tempo-fns';

const today = new Tempo();

if (isFirstDayOfMonth(today)) {
  console.log('Rent is due!');
}
```

## Usage (Static CDN / Browser Global)

If you aren't using a bundler (like Vite, Webpack, or Rollup), we provide a pre-bundled script that exposes a `Functions` global object.

```html
<script src="https://cdn.jsdelivr.net/npm/@magmacomputing/tempo-fns/dist/tempo-fns.global.js"></script>
<script>
  // Access functions via the Functions global
  Functions.isFirstDayOfMonth(Temporal.Now.plainDateISO());
</script>
```
