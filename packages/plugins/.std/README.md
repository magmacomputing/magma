# @magmacomputing/tempo-std

> [!WARNING]
> **Not published separately.** This directory contains the standard built-in Terms that are natively bundled into the `@magmacomputing/tempo` package. 

## Why does this exist?
This package acts as a canonical "showcase" implementation of the Tempo Terms engine. By co-locating the standard Terms alongside other standalone plugins (like Astro or Finance), contributors and plugin authors have a clear reference for how to build their own Terms.

At build time, the Rollup pipeline inlines these files directly into `@magmacomputing/tempo/dist/term/`, meaning end-users get them automatically without needing to install a separate NPM package.

## Standard Built-in Terms

| Key | Scope | Description |
|---|---|---|
| `Quarter` | `financial` | Fiscal quarters (Q1, Q2, Q3, Q4) |
| `Season` | `meteorological` | Meteorological seasons (Spring, Summer, Autumn, Winter) |
| `Zodiac` | `astrological` | Western Zodiac sun signs |
| `Timeline` | `calendar` | Century and Millennium terms |

## Usage for End-Users
Because these are bundled natively, end-users can access them automatically when importing Tempo:
```ts
import { Tempo } from '@magmacomputing/tempo';
// The StandardTerms are auto-loaded and available natively on the Tempo instance.
```
Or to import them manually via the explicit sub-path:
```ts
// Import all standard terms collectively
import { StandardTerms } from '@magmacomputing/tempo/term/standard';

// Or import a specific term individually
import { QuarterTerm } from '@magmacomputing/tempo/term/quarter';
```

## Contributing
> [!IMPORTANT]
> **Do not add custom or domain-specific terms here.** 
> If you are building a new term for Tempo, create a new standalone plugin directory at `packages/plugins/<name>/` instead.

**Build Notes**:
- Source lives in `packages/plugins/.std/src/`
- Output is routed to `packages/tempo/dist/term/` during the main Tempo build.
