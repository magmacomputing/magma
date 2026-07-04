<table>
  <tbody>
    <tr>
      <td width="100" valign="top">
        <img src="./img/tempo-logo.svg" width="90" height="90" alt="Tempo Logo">
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



<div align="center">
  <a href="https://stackblitz.com/edit/vitejs-vite-4uqmmr1i?file=src%2Fmain.ts&terminal=dev">
    <img src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" height="36">
  </a>
</div>

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
console.log(event.format('{mon} {dd:ord}, {yyyy}')); // October 23rd, 2026
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

For standard usage natively in the browser, use the pre-optimized **Global ESM Bundle**. It includes the entire core engine in a single file:

```html
<script type="importmap">
{
  "imports": {
    "@js-temporal/polyfill": "https://cdn.jsdelivr.net/npm/@js-temporal/polyfill@0.5.1/dist/index.esm.js",
    "@magmacomputing/tempo": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@3/dist/tempo.bundle.esm.js"
  }
}
</script>

<script type="module">
  import '@js-temporal/polyfill';
  import { Tempo } from '@magmacomputing/tempo';
  
  const t = new Tempo('next Friday');
</script>
```

> **Advanced Usage (Tempo Plugins & CDNs)**
> If you need to use **Tempo Premium Plugins** natively in the browser, require granular module resolution, or want to use on-the-fly bundling CDNs (like `esm.sh`), please see our comprehensive [**Installation Guide**](https://magmacomputing.github.io/magma/doc/installation.html) for detailed import map configurations.

</details>

---

## ✨ Why Tempo?

While the native Temporal API gives you perfect primitives (`ZonedDateTime`, `PlainDate`), it doesn't give you business logic. Tempo bridges that gap.

| Feature | Native `Temporal` API | The `Tempo` Ecosystem |
| :--- | :--- | :--- |
| **Primitives** | Perfect (`Instant`, `ZonedDateTime`) | Powered by Native Primitives ✨ |
| **Timezones** | IANA String Support | Advanced fallback & auto-syncing |
| **Domain Logic** | ❌ Build it yourself | ✅ Plugins (`astro`, `sync`) |
| **Natural Language**| ❌ Manual parsing | ✅ "next Friday 3pm" |

### The Missing Domain Layer

*   **🏗️ Future Standard**: Built natively on the TC39 `Temporal` proposal. Inherit the reliability of the future standard.
*   **🧩 Premium Ecosystem**: Don't build temporal math from scratch. Drop in our cryptographically-secured plugins for Astronomical seasons (`astro`) and atomic state syncing (`sync`).
*   **🌍 Zero-Bundle Localization**: Best-in-class multi-language parsing and formatting powered natively by the `Intl` API—no massive static locale dictionaries required.
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
3. **Direct Contact**: You can reach us at `hello@magmacomputing.com.au`.

---

## 🗳️ Feedback & Reactions

[🚀 Premium!](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20🚀%20Premium!) &nbsp; | &nbsp; 
[⭐ Loving it!](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20⭐%20Loving%20it!) &nbsp; | &nbsp; 
[💡 Needs work](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20💡%20Needs%20work) &nbsp; | &nbsp; 
[🐞 Found a bug](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20🐞%20Found%20a%20bug)

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.
