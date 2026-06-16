# Installation Guide

`Tempo` is designed to be environment-agnostic. Whether you are building a server-side application, a modern browser project with ESM, or a performance-critical "Lite" bundle, `Tempo` provides a specific path for you.

## Temporal Polyfill Note

`Tempo` expects the host environment to provide `Temporal`, either through native runtime support or a user-supplied polyfill.

`Temporal` is now at Stage 4 and is expected to land broadly in runtimes soon. To avoid needlessly inflating package size with a dependency that will increasingly become unnecessary, `Tempo` does not bundle a `Temporal` polyfill by default.

As of 13 January 2026, Chrome 144 has shipped `Temporal`, and Firefox 139 also includes native `Temporal` support. You can verify browser support at https://caniuse.com/temporal.

Node.js 26.0.0+ ships native `Temporal` fully enabled by default. Older Node versions may still require an external polyfill or experimental flags depending on the underlying engine version.

::: warning
Older Node.js releases that ship `Temporal` behind a feature flag may still have incomplete or experimental implementations. For mission-critical stability in those older environments, we strongly recommend using `@js-temporal/polyfill`.
:::

Please verify support in your actual target runtime(s) and add a polyfill only when needed.

You can check at runtime with a simple guard:

```js
if (typeof globalThis.Temporal === 'undefined') {
  // Load your Temporal polyfill for this environment
}
```

Note: The examples below include a polyfill for demonstration purposes only, so the snippets work consistently across environments.

---

## 💻 Server & Bundlers (Node.js, Bun, Vite)

For most modern projects using a package manager, install Tempo via the npm registry.

```bash
npm install @magmacomputing/tempo   # npm
yarn add @magmacomputing/tempo      # yarn
pnpm add @magmacomputing/tempo      # pnpm
bun add @magmacomputing/tempo       # bun
```

### Usage
```javascript
import { Tempo } from '@magmacomputing/tempo';
const t = new Tempo('next Friday');
```

### Node.js (with Native Temporal)

If you are using Node.js 26.0.0 or later, native `Temporal` is fully supported and enabled by default.

For older Node.js releases that still ship `Temporal` behind a flag, you can enable it with:

```bash
node --harmony-temporal my-app.js
```

> [!WARNING]
> Older Node.js releases that require `--harmony-temporal` may still have incomplete Temporal support. See [Temporal Polyfill Note](#temporal-polyfill-note) for details.

### Node.js (with Polyfill)

The polyfill import shown here is conditional guidance, not required for all environments.

```bash
npm install @js-temporal/polyfill
```

```javascript
import '@js-temporal/polyfill';
import { Tempo } from '@magmacomputing/tempo';

const t = new Tempo('next Friday');
```

---

## 🦕 Deno

Tempo is a native ESM package and works perfectly with Deno. You can add it via the `deno add` command which will resolve it from the npm registry.

```bash
deno add npm:@magmacomputing/tempo
```

### Usage
```javascript
import { Tempo } from "@magmacomputing/tempo";
const t = new Tempo();
```

---

## 🌐 Browser & Native Environments

Tempo provides multiple native browser distribution formats. Here is the quick breakdown of which approach to use:
- **Standard Usage** (No plugins): Use the Global Bundle.
- **Plugins without a bundler**: Use **esm.sh** (Easiest) OR use Granular Import Maps (Hardest, but maximum control).
- **Plugins with a bundler** (Vite/Webpack): Do nothing. Your bundler handles the resolution automatically.

### 1. The Global Bundle (Standard Usage)

The easiest way to use Tempo natively in the browser is via the pre-optimized ESM bundle. It includes the entire core engine in a single file, eliminating network waterfall effects.

```html
<script type="importmap">
{
  "imports": {
    "@js-temporal/polyfill": "https://cdn.jsdelivr.net/npm/@js-temporal/polyfill@0.5.1/dist/index.esm.js",
    "@magmacomputing/tempo": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@4/dist/tempo.bundle.esm.js"
  }
}
</script>
```

```html
<script type="module">
  import '@js-temporal/polyfill';
  import { Tempo } from '@magmacomputing/tempo';
  
  const t = new Tempo('tomorrow');
  console.log(t.format('{mon} {dd:ord}'));
</script>
```

### 2. Smart CDNs (The "Best-of-Both-Worlds")

If you want to use **Premium Plugins** natively in the browser *without* configuring the massive granular import map required by static CDNs, use an on-the-fly bundling CDN like [esm.sh](https://esm.sh). It reads the package resolution rules and bundles the complex internal dependencies automatically. 

While you *could* import directly from the URL everywhere, the best practice is to use a tiny, simple import map just for your top-level packages. This allows you to keep your actual application code clean and standard:

```html
<!-- 1. A tiny import map for your clean shortcuts -->
<script type="importmap">
{
  "imports": {
    "@magmacomputing/tempo": "https://esm.sh/@magmacomputing/tempo@4.0.0",
    "@magmacomputing/tempo-plugin-ticker": "https://esm.sh/@magmacomputing/tempo-plugin-ticker@1.0.4"
  }
}
</script>

<!-- 2. Your Application Code -->
<script type="module">
  // You can use standard bare specifiers thanks to the tiny import map above.
  // esm.sh handles all the complex internal plugin routing behind the scenes!
  import { Tempo } from '@magmacomputing/tempo';
  import { TickerModule } from '@magmacomputing/tempo-plugin-ticker';

  Tempo.extend(TickerModule);
</script>
```

### 3. Granular ESM (Advanced Plugin Architecture)

If you are strictly using a static CDN (like jsdelivr) and require Premium Plugins, you must use the Granular ESM distribution. The bundled engine drops internal builder-utilities to keep the global scope clean, but plugins require them to resolve their own dependencies.

To use Premium Plugins via static CDN, you must map the core library, its subpaths, and the internal licensing module directly to their granular equivalents:

```html
<script type="importmap">
{
  "imports": {
    "tslib": "https://cdn.jsdelivr.net/npm/tslib@2.8.1/tslib.es6.mjs",
    "@js-temporal/polyfill": "https://cdn.jsdelivr.net/npm/@js-temporal/polyfill@0.5.1/dist/index.esm.js",

    "@magmacomputing/tempo": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@4.0.0/dist/tempo.index.js",
    "@magmacomputing/tempo/core": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@4.0.0/dist/core.index.js",
    "@magmacomputing/tempo/library": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@4.0.0/dist/library.index.js",
    "@magmacomputing/tempo/plugin": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@4.0.0/dist/plugin/plugin.index.js",
    "@magmacomputing/tempo/enums": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@4.0.0/dist/support/support.enum.js",
    "@magmacomputing/tempo/term": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@4.0.0/dist/plugin/term/term.index.js",
    
    "#tempo/license": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@4.0.0/dist/plugin/license/license.validator.js",

    "@magmacomputing/tempo-plugin-astro": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo-plugin-astro@1.1.6/dist/index.js",
    "@magmacomputing/tempo-plugin-ticker": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo-plugin-ticker@1.0.4/dist/index.js"
  }
}
</script>
```

> [!WARNING] Cache Busting
> The jsdelivr CDN aggressively caches major version tags (like `@3`). When relying on precise granular resolution for plugins, it is highly recommended to use explicit patch versions (like `@3.0.1`) to avoid fetching mismatched or outdated sub-modules.

---

## 📦 Browser (UMD / Global Variable)

If you aren't using ESM or just want a simple `<script>` tag for rapid prototyping, use the UMD global bundle. This attaches `Tempo` to the `window` object.

```html
<!-- Load the Temporal Polyfill first -->
<script src="https://cdn.jsdelivr.net/npm/@js-temporal/polyfill@0.5.1/dist/index.umd.js"></script>

<!-- Load the Tempo Global Bundle -->
<script src="https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@4/dist/tempo.bundle.js"></script>

<script>
  const t = new Tempo('now');
  console.log(t.toString());
</script>
```

---

## 🧪 Granular "Lite" Builds (Advanced)

If you are extremely concerned about bundle size, you can bypass the "Batteries Included" entry point and import only the core engine. You then manually opt-in to the modules you need.

```javascript
import { Tempo } from '@magmacomputing/tempo/core';
import { MutateModule } from '@magmacomputing/tempo/mutate';

// Opt-in to specific functionality
Tempo.extend(MutateModule);

const t = new Tempo().add({ days: 1 });
```

::: warning
When using the Lite build, the `Tempo` class will have almost no methods (like `.add()`, `.set()`, or `.format()`) until you explicitly call `Tempo.extend()` with the appropriate module.
:::

---

## 🛡️ Versioning Policy

We recommend pinning your versions in production environments to ensure stability. 

*   **JSDelivr**: `https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@4/...` (Locks to major version 3)
*   **Latest**: `https://cdn.jsdelivr.net/npm/@magmacomputing/tempo/...` (Omit the version string to always receive the latest release. Note that JSDelivr will resolve a missing version tag to the latest published release).
