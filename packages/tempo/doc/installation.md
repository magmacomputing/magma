# Installation Guide

Tempo is designed to be environment-agnostic. Whether you are building a server-side application, a modern browser project with ESM, or a performance-critical "Lite" bundle, Tempo provides a specific path for you.

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

## 🌐 Browser (Modern ESM)

For browser environments that support **Import Maps**, you can use the granular ESM modules. This is the recommended way to use Tempo in the browser as it allows for better caching and modularity.

### 1. Import Map Setup
Add this to your `<head>` to resolve the dependencies:

```html
<script type="importmap">
{
  "imports": {
    "jsbi": "https://cdn.jsdelivr.net/npm/jsbi@4.3.0/dist/jsbi.mjs",
    "@js-temporal/polyfill": "https://cdn.jsdelivr.net/npm/@js-temporal/polyfill@0.5/dist/index.esm.js",
    "@magmacomputing/tempo": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@2/dist/tempo.bundle.esm.js"
  }
}
</script>
```

### 2. Implementation
```html
<script type="module">
  import '@js-temporal/polyfill';
  import { Tempo } from '@magmacomputing/tempo';
  
  const t = new Tempo('tomorrow');
  console.log(t.format('{mon} {day}'));
</script>
```

---

## 📦 Browser (Legacy / Global Bundle)

If you aren't using ESM or just want a simple `<script>` tag for rapid prototyping, use the UMD global bundle. This attaches `Tempo` to the `window` object.

```html
<!-- Load the Temporal Polyfill first -->
<script src="https://cdn.jsdelivr.net/npm/@js-temporal/polyfill@0.5/dist/index.umd.js"></script>

<!-- Load the Tempo Global Bundle -->
<script src="https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@2/dist/tempo.bundle.js"></script>

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

> [!IMPORTANT]
> When using the Lite build, the `Tempo` class will have almost no methods (like `.add()`, `.set()`, or `.format()`) until you explicitly call `Tempo.extend()` with the appropriate module.

---

## 🛡️ Versioning Policy

We recommend pinning your versions in production environments to ensure stability. 

*   **JSDelivr**: `https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@2/...` (Locks to major version 2)
*   **Latest**: `https://cdn.jsdelivr.net/npm/@magmacomputing/tempo/...` (Omit the version string to always receive the latest release. Note that JSDelivr will resolve a missing version tag to the latest published release).
