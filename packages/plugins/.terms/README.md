# tempo-kit-terms

> [!WARNING]
> **Not published separately.** This directory contains the standard built-in Terms that are natively bundled into the `tempo-kit` package. 

## Why does this exist?
This package acts as a canonical "showcase" implementation of the Tempo Terms engine. By co-locating the standard Terms alongside other standalone plugins (like Astro or Finance), contributors and plugin authors have a clear reference for how to build their own Terms.

At build time, the Rollup pipeline inlines these terms directly into the Tempo bundle, and build tasks route them to `tempo-kit/dist/term/` to power the `tempo-kit/terms` subpath exports, meaning end-users get them automatically without needing to install a separate NPM package.

## Standard Built-in Terms

| Key | Scope | Description |
|---|---|---|
| `Quarter` | `calendar` | ISO 8601-2 calendar quarters (Q1, Q2, Q3, Q4) — Core (`CivicTerms`) |
| `Fiscal` | `fiscal` | Jurisdictional & corporate fiscal quarters (FQ1, FQ2, FQ3, FQ4) — Opt-in (`./terms`) |
| `Season` | `meteorological` | Meteorological & tropical seasons (Spring, Summer, Autumn, Winter, Wet, Dry) — Core (`CivicTerms`) |
| `Timeline` | `timeOfDay` | Daily time-of-day periods (Morning, Midday, Afternoon, Evening, Night) — Core (`CivicTerms`) |

## Usage for End-Users
Civic terms are bundled natively and auto-loaded when importing Tempo:
```ts
import { Tempo } from 'tempo-kit';
// The CivicTerms are auto-loaded and available natively on the Tempo instance.
```
Or import opt-in built-in terms (such as `FiscalTerm`) via the `./terms` sub-path:
```ts
import { Tempo } from 'tempo-kit';

import { FiscalTerm } from 'tempo-kit/terms';
Tempo.use(FiscalTerm);

// Or import a specific civic term individually
import { QuarterTerm } from 'tempo-kit/terms/quarter';
Tempo.use(QuarterTerm);
```

## Contributing
> [!IMPORTANT]
> **Do not add custom or domain-specific terms here.** 
> If you are building a new term for Tempo, create a new standalone plugin directory at `packages/plugins/<name>/` instead.

**Build Notes**:
- Source lives in `packages/plugins/.terms/src/`
- Output is routed to `packages/tempo/dist/term/` during the main Tempo build.
