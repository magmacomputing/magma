# Parse Planner Configuration

The Parse Planner allows you to configure exactly how Tempo's text-to-date parsing engine operates, prioritizing certain date layouts and optimizing the parsing phase using pre-filters.

These options are nested under the `planner` property when configuring Tempo.

## `layoutOrder`

By default, Tempo searches through a variety of date layouts (like ISO 8601, European, American, etc.) to understand user input. The `layoutOrder` configuration allows you to explicitly list which layout patterns should be evaluated first, prioritizing formats that you expect most often. 

This leads to performance gains and more predictable parsing behavior when ambiguous dates are input.

```ts
import { Tempo } from '@magmacomputing/tempo';

Tempo.init({
  planner: {
    layoutOrder: ['iso', 'dmy', 'mdy'] // Array of string layout names
  }
});
```

### Supported Layouts
Common layouts include:
- `iso` (e.g., `2024-05-20`)
- `mdy` (e.g., `05/20/2024`)
- `dmy` (e.g., `20/05/2024`)
- `ymd` (e.g., `2024/05/20`)

When a `layoutOrder` is provided, those specific layouts are pushed to the top of the parsing queue.

## `preFilter`

The `preFilter` option is a performance-optimization flag for the engine. When set to `true`, the parsing engine will pre-scan incoming text and immediately skip complex regex evaluation if the input contains no discernible date or time characters.

This is highly recommended for applications where non-date text is frequently evaluated by Tempo.

```ts
const t = new Tempo('some random text', {
  planner: {
    preFilter: true
  }
});

// `t` will quickly resolve to an errored state, saving CPU cycles
```
