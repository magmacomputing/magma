# Package Deprecation & Sunset Plan: `@magmacomputing/tempo-plugin-astro`

> **Status**: Scheduled (Post-Release)  
> **Target Successor**: [`@magmacomputing/tempo-plugin-celestial`](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-celestial)  
> **Author**: Magma Computing Solutions  
> **Date**: October 2026

---

## 1. Executive Summary & Rationale

`@magmacomputing/tempo-plugin-astro` provided astronomical season and equinox boundaries. The capabilities of this plugin have been significantly expanded and consolidated into the unified [`@magmacomputing/tempo-plugin-celestial`](../packages/plugins/celestial) package, which integrates:
- **Astronomical Seasons & Solstices/Equinoxes** (`t.term.astro`, `t.term.equinox`, `t.term.solstice`)
- **Solar Day Cycles & Ephemeris** (`t.term.sun`, `t.term.solar`)
- **Lunar Ephemeris & Phase Tracking** (`t.term.moon`, `t.term.lunar`)
- **Astronomical Tidal Mechanics** (`t.term.tide`, `t.term.tides`)

To avoid package fragmentation and provide a single authoritative astronomical plugin, `@magmacomputing/tempo-plugin-astro` will be sunset and deprecated on the npm registry.

---

## 2. Deprecation Policy: Deprecate vs. Unpublish

- **DO NOT `npm unpublish`**: Unpublishing historical versions breaks downstream CI pipelines, Docker builds, and locked package manifests (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`).
- **Use `npm deprecate`**: Deprecation maintains historical build stability while actively alerting developers during installation and on package registries.

---

## 3. Step-by-Step Execution Checklist

### Phase 1: NPM Registry Deprecation Notice

Execute the following CLI command to flag all historical versions of the package with an official deprecation warning:

```bash
npm deprecate @magmacomputing/tempo-plugin-astro \
  "This package has been deprecated and rolled into @magmacomputing/tempo-plugin-celestial. Please install @magmacomputing/tempo-plugin-celestial instead."
```

---

### Phase 2: Final Tombstone Release

Publish a final patch/minor version of `@magmacomputing/tempo-plugin-astro` that provides runtime warnings and documentation banners:

#### 1. Update `packages/plugins/astro/README.md`
Add a prominent deprecation warning at the top of the README:

```markdown
# ⚠️ DEPRECATED — MOVED TO CELESTIAL

> **Important Notice**: `@magmacomputing/tempo-plugin-astro` is deprecated and will no longer receive updates.
> All astronomical ephemeris, season, equinox, and solstice calculations have been rolled into **[`@magmacomputing/tempo-plugin-celestial`](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-celestial)**.

## Migration Guide

### 1. Uninstall the legacy plugin
```bash
npm uninstall @magmacomputing/tempo-plugin-astro
```

### 2. Install the Celestial plugin
```bash
npm install @magmacomputing/tempo-plugin-celestial
```

### 3. Update Code Imports
```diff
- import { AstroPlugin } from '@magmacomputing/tempo-plugin-astro';
+ import { CelestialPlugin } from '@magmacomputing/tempo-plugin-celestial';

- Tempo.use(AstroPlugin);
+ Tempo.use(CelestialPlugin);
```
```

#### 2. Runtime Forwarding & Deprecation Console Warning (`src/index.ts`)
```typescript
if (typeof console !== 'undefined' && console.warn) {
  console.warn(
    '[Tempo Deprecation Warning] @magmacomputing/tempo-plugin-astro has been deprecated. ' +
    'Please migrate your dependencies to @magmacomputing/tempo-plugin-celestial.'
  );
}

// Forward exports to Celestial so existing code remains functional during migration
export * from '@magmacomputing/tempo-plugin-celestial';
```

---

### Phase 3: Monorepo Housekeeping

1. **Publish Workflow ([`.github/workflows/publish.yml`](../../.github/workflows/publish.yml))**:
   - Ensure `@magmacomputing/tempo-plugin-astro` is omitted from automated monorepo publication dispatches.
2. **CI Pipeline ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml))**:
   - Verified that CI test workspaces target `@magmacomputing/tempo-plugin-celestial`.
3. **Documentation & VitePress Catalog**:
   - In the documentation site and catalog, redirect all links pointing to `/astro` to `/celestial/astro.md`.
