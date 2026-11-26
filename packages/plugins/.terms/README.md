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
| `Fiscal` | `fiscal` | Jurisdictional & corporate fiscal quarters (FQ1, FQ2, FQ3, FQ4) — Opt-in (`CulturalTerms` / `./terms`) |
| `Season` | `meteorological` | Meteorological & tropical seasons (Spring, Summer, Autumn, Winter, Wet, Dry) — Core (`CivicTerms`) |
| `Timeline` | `timeOfDay` | Daily time-of-day periods (Morning, Midday, Afternoon, Evening, Night) — Core (`CivicTerms`) |
| `Zodiac` | `astrological` | Western Zodiac sun signs — Opt-in (`CulturalTerms` / `./terms`) |
| `Eastern` | `shengxiao` | Eastern Lunar Zodiac cycle — Opt-in (`CulturalTerms` / `./terms`) |

## Usage for End-Users
Civic terms are bundled natively and auto-loaded when importing Tempo:
```ts
import { Tempo } from 'tempo-kit';
// The CivicTerms are auto-loaded and available natively on the Tempo instance.
```
Or to import cultural or standard terms manually via the explicit `./terms` sub-path:
```ts
import { Tempo } from 'tempo-kit';

// Import cultural terms collectively
import { CulturalTerms } from 'tempo-kit/terms';
Tempo.use(CulturalTerms);

// Or import a specific term individually
import { ZodiacTerm } from 'tempo-kit/terms/zodiac';
Tempo.use(ZodiacTerm);
```

## Contributing
> [!IMPORTANT]
> **Do not add custom or domain-specific terms here.** 
> If you are building a new term for Tempo, create a new standalone plugin directory at `packages/plugins/<name>/` instead.

**Build Notes**:
- Source lives in `packages/plugins/.terms/src/`
- Output is routed to `packages/tempo/dist/term/` during the main Tempo build.
