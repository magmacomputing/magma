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
npm install @magmacomputing/tempo-plugin-ticker  # npm
pnpm add @magmacomputing/tempo-plugin-ticker     # pnpm
yarn add @magmacomputing/tempo-plugin-ticker     # yarn
bun add @magmacomputing/tempo-plugin-ticker      # bun
```

---

## 3. Registration & Activation

Tempo provides flexible registration options depending on your application structure and bundler setup.

### Option A: Initialization Option (Recommended)

Pass plugins directly to `Tempo.init()` during application initialization. This guarantees clean execution order regardless of import hoisting:

```javascript
import { Tempo } from '@magmacomputing/tempo';
import { TickerPlugin } from '@magmacomputing/tempo-plugin-ticker';

Tempo.init({
  extends: [TickerPlugin]
});

const t = new Tempo();
console.log(t.tickers);
```

### Option B: Explicit Extension (`Tempo.extend`)

Register plugins dynamically at runtime using `Tempo.extend()`:

```javascript
import { Tempo } from '@magmacomputing/tempo';
import { AstroPlugin } from '@magmacomputing/tempo-plugin-astro';

Tempo.extend(AstroPlugin);

const t = new Tempo('2026-03-20');
console.log(t.season); // Discovers equinoxes and astronomical seasons
```

### Option C: Auto-Registration via Side-Effect Import

Many plugins support self-registration on import. Simply import the plugin module:

```javascript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-ticker'; // Auto-registers TickerPlugin

const t = new Tempo();
console.log(t.tickers);
```

---

## 4. Browser & Global Namespace Usage

When using pre-bundled scripts directly in HTML via `<script>` tags, plugins attach to the `Magma.plugins` global object:

```html
<!-- 1. Core Temporal Polyfill & Tempo -->
<script src="https://cdn.jsdelivr.net/npm/@js-temporal/polyfill@0.5.1/dist/index.umd.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@4/dist/tempo.bundle.min.js"></script>

<!-- 2. Plugin Script -->
<script src="https://cdn.jsdelivr.net/npm/@magmacomputing/tempo-plugin-astro@2/dist/index.global.min.js"></script>

<script>
  const { Tempo, plugins } = Magma;

  // Register the plugin
  Tempo.extend(plugins.astro);

  const t = new Tempo('next friday');
  console.log(t.toString());
</script>
```

---

## 5. Authoring Custom Plugins

Interested in creating your own plugin? Check out the [Creating Custom Plugins Guide](../../../tempo/doc/3-extending-tempo/tempo.extension.md) and [Plugin Ecosystem Catalog](../../../tempo/doc/3-extending-tempo/ecosystem.md) to learn how to register custom getters, term definitions, and dynamic proxies.
