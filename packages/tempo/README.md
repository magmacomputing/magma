<table>
  <tbody>
    <tr>
      <td width="100" valign="top">
        <img src="./img/logo.svg" width="90" height="90" alt="Tempo Logo">
      </td>
      <td valign="middle">
        <h1 style="border-bottom: none; margin-bottom: 0;">Tempo</h1>
        <p style="font-weight: 600; font-size: 1.1rem; color: #2c3e50; margin-top: 0;">The Professional Date-Time Library for the Temporal API</p>
      </td>
    </tr>
  </tbody>
</table>


**Tempo** is a premium, high-performance wrapper for the ECMAScript `Temporal` API. Designed for professionals, it combines **immutable** state-management with a **fluent**, natural-language engine. It is the modern, type-safe successor to legacy libraries like Moment.js and Luxon.



<table align="center">
  <tbody>
    <tr>
      <td align="center"><a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a></td>
      <td align="center"><a href="https://tc39.es/proposal-temporal/"><img src="https://img.shields.io/badge/Temporal-Stage%204-green" alt="Temporal"></a></td>
      <td align="center"><a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript" alt="TypeScript Ready"></a></td>
      <td align="center"><a href="https://nodejs.org/api/esm.html"><img src="https://img.shields.io/badge/Native-ESM-green" alt="Native ESM"></a></td>
      <td align="center"><a href="https://magmacomputing.github.io/magma/"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress" alt="Documentation"></a></td>
    </tr>
  </tbody>
</table>



---

## ⚡ Quick Start
```javascript
import { Tempo } from '@magmacomputing/tempo';

// 🎯 Natural Language Parsing (Deterministic anchor)
const event = new Tempo('next Friday 3pm', { anchor: '2026-10-15' });

// 🔄 Fluent Mutations (Immutable)
const reminder = event.add({ hours: 2 }).set({ minute: 0 });

// ⏳ Comparative Durations
const diff = event.until('2026-12-25');
console.log(diff.iso); // P2M2D

// 📝 Beautiful Formatting
console.log(event.format('{mon} {day}, {yyyy}')); // October 23, 2026
```

---

## 📦 Installation

```bash
npm install @magmacomputing/tempo       # npm
yarn add @magmacomputing/tempo          # yarn
pnpm add @magmacomputing/tempo          # pnpm
bun add @magmacomputing/tempo           # bun
deno add npm:@magmacomputing/tempo      # deno
```

<details>
<summary><b>🌐 Browser & Native Environments</b></summary>

Tempo provides multiple native browser distribution formats. Here is the quick breakdown of which approach to use:
- **Standard Usage** (No plugins): Use the Global Bundle.
- **Plugins without a bundler**: Use **esm.sh** (Easiest) OR use Granular Import Maps (Hardest, but maximum control).
- **Plugins with a bundler** (Vite/Webpack): Do nothing. Your bundler handles the resolution automatically.

#### 1. The Global Bundle (Standard Usage)
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

#### 2. Smart CDNs (The "Best-of-Both-Worlds")
If you want to use **external plugins** natively in the browser *without* configuring massive import maps, use an on-the-fly bundling CDN like [esm.sh](https://esm.sh). It reads the package resolution rules and bundles dependencies automatically. You do not need an import map!

```html
<script type="module">
  // esm.sh automatically resolves subpaths and bundles dependencies on the fly
  import { Tempo } from 'https://esm.sh/@magmacomputing/tempo@3.0.1';
  import { TickerModule } from 'https://esm.sh/@magmacomputing/tempo-plugin-ticker@1.0.4';

  Tempo.extend(TickerModule);
</script>
```

#### 3. Granular ESM (Advanced Plugin Architecture)
If you are strictly using a static CDN (like jsdelivr) and require external plugins, you must use the Granular ESM distribution. The bundled engine drops internal builder-utilities to keep the global scope clean, but plugins require them to resolve their own dependencies.

To use Premium Plugins via static CDN, you must map the core library, its subpaths, and the internal licensing module directly to their granular equivalents:

```html
<script type="importmap">
{
  "imports": {
    "@js-temporal/polyfill": "https://cdn.jsdelivr.net/npm/@js-temporal/polyfill@0.5.1/dist/index.esm.js",

    "@magmacomputing/tempo": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@3.0.1/dist/tempo.index.js",
    "@magmacomputing/tempo/core": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@3.0.1/dist/core.index.js",
    "@magmacomputing/tempo/library": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@3.0.1/dist/library.index.js",
    "@magmacomputing/tempo/plugin": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@3.0.1/dist/plugin/plugin.index.js",
    "@magmacomputing/tempo/enums": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@3.0.1/dist/support/support.enum.js",
    "@magmacomputing/tempo/term": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@3.0.1/dist/plugin/term/term.index.js",
    
    "#tempo/license": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@3.0.1/dist/plugin/license/license.validator.js",

    "@magmacomputing/tempo-plugin-astro": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo-plugin-astro@1.1.6/dist/index.js",
    "@magmacomputing/tempo-plugin-ticker": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo-plugin-ticker@1.0.4/dist/index.js"
  }
}
</script>
```

*(Note: When resolving version caching issues on jsdelivr, use explicit patch versions like `@3.0.1` instead of `@3`)*

#### UMD (Rapid Prototyping)
For rapid prototyping without a package manager or module scope:
```html
<script src="https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@3/dist/tempo.bundle.js"></script>
```
</details>

---

## ✨ Why Tempo?
*   **🏗️ Future Standard**: Built natively on the TC39 `Temporal` proposal. Inherit the reliability of the future standard.
*   **🗣️ Natural Language**: Resolve complex terms like "two days ago" with zero configuration.
*   **🧠 Functional Aliases**: Extend the parser with custom logic using a powerful resolution context for relative date math.
*   **🔄 Cycle Persistence**: Shift by semantic terms (Quarters, Seasons) while preserving your relative day-of-period offset.
*   **⚡ Zero-Cost Parsing**: Lazy evaluation and smart matching ensure instantiation overhead is near-zero.
*   **🛡️ Monorepo Resilient**: Built for stability in complex environments with proxy-protected registries.
*   **📦 Tree-Shakable**: Keep your bundle light. Only load what you need—from Fiscal calendars to high-performance Tickers.

---

## 📚 Documentation

For a deeper dive into the API, architecture, and advanced features:

*   **[Official Documentation Website](https://magmacomputing.github.io/magma/)** — Tutorials, interactive demos, and "Getting Started" guides.
*   **[Full API Reference Guide](https://magmacomputing.github.io/magma/doc/api/)** — Detailed technical documentation for every class and method.

---

## 💬 Contact & Support

1. **Bug Reports & Features**: Please open an [Issue](https://github.com/magmacomputing/magma/issues).
2. **Questions & Ideas**: Start a thread in [Discussions](https://github.com/magmacomputing/magma/discussions).
3. **Direct Contact**: You can reach me at `hello@magmacomputing.com.au`.

---

## 🗳️ Feedback & Reactions

[🚀 Premium!](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20🚀%20Premium!) &nbsp; | &nbsp; 
[⭐ Loving it!](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20⭐%20Loving%20it!) &nbsp; | &nbsp; 
[💡 Needs work](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20💡%20Needs%20work) &nbsp; | &nbsp; 
[🐞 Found a bug](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20🐞%20Found%20a%20bug)

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.
