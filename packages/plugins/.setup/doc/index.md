# Tempo Plugin Setup Guide

This guide explains how to install, register, and activate Tempo plugins in your projects.

---

## 1. Overview

Tempo features an extensible plugin architecture that allows developers to add custom business logic, date generators, term calculators, and domain-specific APIs (such as financial tickers or astronomy calculations) to the Tempo engine.

All official and community plugins are 100% open source under the MIT license and run without runtime license checks or key configuration.

---

## 2. Installation

Tempo plugins are published as scoped packages on the standard npm registry (`npmjs.com`). Install plugins using your package manager of choice:

```bash
npm install tempo-kit @tempo-kit/plugin-ticker @tempo-kit/plugin-celestial  # npm
pnpm add tempo-kit @tempo-kit/plugin-ticker @tempo-kit/plugin-celestial     # pnpm
yarn add tempo-kit @tempo-kit/plugin-ticker @tempo-kit/plugin-celestial     # yarn
bun add tempo-kit @tempo-kit/plugin-ticker @tempo-kit/plugin-celestial      # bun
```

---

## 3. Registration & Activation

Tempo provides flexible registration options depending on your application structure and bundler setup.

### Option A: Initialization Option (Recommended)

Pass plugins directly to `Tempo.init()` during application initialization via the `plugins` array. This guarantees clean execution order regardless of import hoisting:

```javascript
import { Tempo } from 'tempo-kit';
import { TickerPlugin } from '@tempo-kit/plugin-ticker';

Tempo.init({
  plugins: [TickerPlugin]
});

const t = new Tempo();
console.log(Tempo.tickers);
```

### Option B: Explicit Extension (`Tempo.use`)

Register plugins dynamically at runtime using `Tempo.use()`:

```javascript
import { Tempo } from 'tempo-kit';
import { CelestialPlugin } from '@tempo-kit/plugin-celestial';

Tempo.use(CelestialPlugin);

const t = new Tempo('2026-03-20', { sphere: 'north' });
console.log(t.term.astro); // Discovers equinoxes and astronomical seasons
```

### Option C: Zero-Boilerplate Side-Effect Import (`/install`)

All official and community plugins provide an `/install` entry point that auto-registers the plugin onto `Tempo` upon import:

```javascript
import '@tempo-kit/plugin-celestial/install';
import { Tempo } from 'tempo-kit';

const t = new Tempo('2026-03-20', { sphere: 'north' });
console.log(t.term.astro);
```

---

## 4. Browser & Global Namespace Usage

When using pre-bundled scripts directly in HTML via `<script>` tags, plugins attach to the `Magma.plugins` global object:

```html
<!-- 1. Core Temporal Polyfill & Tempo -->
<script src="https://cdn.jsdelivr.net/npm/@js-temporal/polyfill@0.5.1/dist/index.umd.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tempo-kit@5/dist/tempo.bundle.min.js"></script>

<!-- 2. Plugin Script -->
<script src="https://cdn.jsdelivr.net/npm/@tempo-kit/plugin-celestial@1/dist/index.global.min.js"></script>

<script>
  const { Tempo, plugins } = Magma;

  // Register the plugin
  Tempo.use(plugins.celestial);

  const t = new Tempo('next friday');
  console.log(t.toString());
</script>
```

---

## 5. Authoring Custom Plugins

Interested in creating your own plugin? Check out the [Creating Custom Plugins Guide](../../../tempo/doc/3-extending-tempo/tempo.extension.md) and [Plugin Ecosystem Catalog](../../../tempo/doc/3-extending-tempo/ecosystem.md) to learn how to register custom getters, term definitions, and dynamic proxies.
