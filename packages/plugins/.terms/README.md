# @magmacomputing/tempo-terms

> [!WARNING]
> **Not published separately.** This directory contains the standard built-in Terms that are natively bundled into the `@magmacomputing/tempo` package. 

## Why does this exist?
This package acts as a canonical "showcase" implementation of the Tempo Terms engine. By co-locating the standard Terms alongside other standalone plugins (like Astro or Finance), contributors and plugin authors have a clear reference for how to build their own Terms.

At build time, the Rollup pipeline inlines these files directly into `@magmacomputing/tempo/dist/term/`, meaning end-users get them automatically without needing to install a separate NPM package.

## Standard Built-in Terms

| Key | Scope | Description |
|---|---|---|
| `Quarter` | `financial` | Fiscal quarters (Q1, Q2, Q3, Q4) — Core (`CivicTerms`) |
| `Season` | `meteorological` | Meteorological seasons (Spring, Summer, Autumn, Winter) — Core (`CivicTerms`) |
| `Timeline` | `timeOfDay` | Daily time-of-day periods (Morning, Midday, Afternoon, Evening, Night) — Core (`CivicTerms`) |
| `Zodiac` | `astrological` | Western Zodiac sun signs — Opt-in (`CulturalTerms` / `./terms`) |
| `Eastern` | `shengxiao` | Eastern Lunar Zodiac cycle — Opt-in (`CulturalTerms` / `./terms`) |

## Usage for End-Users
Civic terms are bundled natively and auto-loaded when importing Tempo:
```ts
import { Tempo } from '@magmacomputing/tempo';
// The CivicTerms are auto-loaded and available natively on the Tempo instance.
```
Or to import cultural or standard terms manually via the explicit `./terms` sub-path:
```ts
// Import cultural or standard terms collectively
import { CulturalTerms, StandardTerms } from '@magmacomputing/tempo/terms';
Tempo.use(CulturalTerms);

// Or import a specific term individually
import { ZodiacTerm } from '@magmacomputing/tempo/terms/zodiac';
```

## Contributing
> [!IMPORTANT]
> **Do not add custom or domain-specific terms here.** 
> If you are building a new term for Tempo, create a new standalone plugin directory at `packages/plugins/<name>/` instead.

**Build Notes**:
- Source lives in `packages/plugins/.terms/src/`
- Output is routed to `packages/tempo/dist/term/` during the main Tempo build.
