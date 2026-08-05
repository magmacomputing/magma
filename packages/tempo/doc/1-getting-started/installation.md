# Installation Guide

`Tempo` is designed to be environment-agnostic. Whether you are building a server-side application, a modern browser project with ESM, or a performance-critical "Lite" bundle, `Tempo` provides a specific path for you.

## Temporal Polyfill Note

`Tempo` expects the host environment to provide `Temporal`, either through native runtime support or a user-supplied polyfill.

`Temporal` has reached Stage 4 of the [TC39 standards process](https://tc39.es/proposal-temporal/) (the committee that evolves JavaScript) and is shipping natively in modern environments (Deno 2.7+, Node.js 26+, Chrome 144+, Firefox 139+). Note that Safari/iOS currently do not support Temporal natively and require a polyfill. You can verify current browser support at [caniuse.com/temporal](https://caniuse.com/temporal). To avoid needlessly inflating package sizes for modern apps, `Tempo` does not bundle a `Temporal` polyfill by default.

::: warning
Node.js environments that ship `Temporal` behind a feature flag (`--harmony-temporal`) may have incomplete implementations. For stability, we strongly recommend using `@js-temporal/polyfill` instead of the native flag until you upgrade to an official unflagged release.
:::

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

Native unflagged `Temporal` support is available in Node.js 26+ and is enabled by default.

```bash
node my-app.js
```

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

As of Deno 2.7, the Temporal API is fully stabilized and enabled by default. You no longer need to pass the --unstable-temporal flag to use it.

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
- **Standard Usage** (No plugins): Use the Native ESM Bundle.
- **Plugins without a bundler**: Use **Smart CDNs** (Easiest setup) OR **Static CDNs** (Best production performance).
- **Plugins with a bundler** (Vite/Webpack): Do nothing. Your bundler handles the resolution automatically.
- **Non-ESM Environments**: Use the UMD Global Variable approach.

### 1. The Global Bundle (Standard Usage)

The easiest way to use Tempo natively in the browser is via the pre-optimized ESM bundle. It includes the entire core engine in a single file, eliminating network waterfall effects.

```html
<script type="importmap">
{
  "imports": {
    "@js-temporal/polyfill": "https://cdn.jsdelivr.net/npm/@js-temporal/polyfill@0.5.1/dist/index.esm.js",
    "@magmacomputing/tempo": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@3/dist/tempo.bundle.esm.js"
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

If you want the absolute easiest setup for **Tempo Plugins** natively in the browser, use an on-the-fly bundling CDN like [esm.sh](https://esm.sh). Smart CDNs act like a Node environment—they read the package resolution rules and resolve nested dependencies automatically, meaning you don't have to map any internal subpaths.

While you *could* import directly from the URL everywhere, the best practice is to use a tiny import map for your top-level packages to keep your application code clean:

```html
<!-- 1. A tiny import map for your clean shortcuts -->
<script type="importmap">
{
  "imports": {
    "@js-temporal/polyfill": "https://esm.sh/@js-temporal/polyfill@0.5.1",
    "@magmacomputing/tempo": "https://esm.sh/@magmacomputing/tempo@3",
    "@magmacomputing/tempo-plugin-ticker": "https://esm.sh/@magmacomputing/tempo-plugin-ticker@2"
  }
}
</script>

<!-- 2. Your Application Code -->
<script type="module">
  // You can use standard bare specifiers thanks to the tiny import map above.
  // esm.sh handles all the complex internal plugin routing behind the scenes!
  import '@js-temporal/polyfill';
  import { Tempo } from '@magmacomputing/tempo';
  import { TickerPlugin } from '@magmacomputing/tempo-plugin-ticker';

  Tempo.init({ license: 'YOUR_JWT_KEY' });
  Tempo.extend(TickerPlugin);
</script>
```

<details>
<summary><b>⚠️ Trade-offs of using Smart CDNs in Production</b></summary>

While `esm.sh` is fantastic for prototyping and reducing import map complexity, there are architectural trade-offs to consider before using it in a mission-critical production environment:

1. **Network Waterfalls:** The browser must fetch the module, parse it, and then fetch its nested dependencies sequentially. This can slow down page load times compared to a fully bundled application.
2. **Uptime Dependency:** You are introducing a critical third-party dependency into your runtime. If the CDN experiences routing issues, your application could break for end-users.
3. **Sub-dependency Version Floating:** `esm.sh` automatically resolves sub-dependencies based on semver constraints. If a sub-dependency introduces an accidental breaking change, it could affect your app.
4. **Suboptimal Tree Shaking:** The browser will download the entire module graph for that package; you cannot easily tree-shake unused exports as you can with a dedicated bundler like Vite or Webpack.
5. **Environment Parity:** Handling development versus production environments (like `process.env.NODE_ENV`) requires query parameters (e.g., `?dev`), which complicates deployment.

</details>

### 3. Static CDNs (Production-Ready)

For production environments where uptime and load speeds are critical, you should use a static file CDN (like jsdelivr). Because static CDNs serve raw files without compiling them on the fly, they are significantly faster and more reliable than Smart CDNs.

To use **Tempo Plugins** via a static CDN, you simply need to explicitly map the unified `plugin-api` subpath so the browser knows how to resolve the internal connections:

```html
<script type="importmap">
{
  "imports": {
    "@js-temporal/polyfill": "https://cdn.jsdelivr.net/npm/@js-temporal/polyfill@0.5.1/dist/index.esm.js",
    "@magmacomputing/tempo": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@3/dist/tempo.index.js",
    "@magmacomputing/tempo/plugin-api": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@3/dist/plugin-api.index.js",

    "@magmacomputing/tempo-plugin-astro": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo-plugin-astro@2/dist/index.js",
    "@magmacomputing/tempo-plugin-ticker": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo-plugin-ticker@2/dist/index.js"
  }
}
</script>
```

> [!WARNING] Cache Busting
> The jsdelivr CDN aggressively caches major version tags (like `@3`). When relying on precise module resolution for plugins, it is highly recommended to use explicit patch versions (like `@3.0.1`) to avoid fetching mismatched or outdated sub-modules.

---

## 📦 Browser (Global Variable / Plugins)

If you aren't using ESM or just want a simple `<script>` tag for rapid prototyping, use our unified `Magma` global bundles. This clean approach ensures all plugins share a single, collision-free namespace on the `window` object.

```html
<!-- 1. Load the Temporal Polyfill first -->
<script src="https://cdn.jsdelivr.net/npm/@js-temporal/polyfill@0.5.1/dist/index.umd.js"></script>

<!-- 2. Load the Tempo Global Bundle (Creates window.Magma) -->
<script src="https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@3/dist/tempo.bundle.min.js"></script>

<!-- 3. Load any Community Plugins (Attaches to window.Magma.plugins) -->
<script src="https://cdn.jsdelivr.net/npm/@magmacomputing/tempo-plugin-astro@2/dist/index.global.min.js"></script>

<script>
  // 1. Extract what you need from the Magma namespace
  const { Tempo, plugins } = Magma;
  
  // 2. Extend the core engine
  Tempo.extend(plugins.astro);

  // 3. Create your instance!
  const t = new Tempo('next friday');
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

*   **JSDelivr**: `https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@3/...` (Locks to major version 3)
*   **Latest**: `https://cdn.jsdelivr.net/npm/@magmacomputing/tempo/...` (Omit the version string to always receive the latest release. Note that JSDelivr will resolve a missing version tag to the latest published release).

---

## 🤖 AI & IDE Integration (`llms.txt`)

> [!TIP]
> Using **Cursor**, **VS Code (GitHub Copilot)**, **Antigravity**, **ChatGPT**, or **Claude**? 
> Tempo publishes an official [`llms.txt`](https://tempo.magmacomputing.com.au/llms.txt) index to give AI assistants zero-hallucination context about Tempo's syntax, token grammar, and immutability rules.
> 
> 👉 **[Read the dedicated AI & IDE Integration Guide](./ai-integration.md)** for step-by-step setup instructions for your IDE or tool.

