<table>
  <tbody>
    <tr>
      <td width="100" valign="top">
        <img src="https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/img/tempo-logo.svg" width="90" height="90" alt="Tempo Logo">
      </td>
      <td valign="middle">
        <h1 style="border-bottom: none; margin-bottom: 0;">Tempo</h1>
        <p style="font-weight: 600; font-size: 1.1rem; color: #2c3e50; margin-top: 0;">The Professional Date-Time Library for the Temporal API</p>
      </td>
    </tr>
  </tbody>
</table>


**Tempo** is a premium, high-performance wrapper for the ECMAScript `Temporal` API. Designed for professionals, it combines **immutable** state-management with a **fluent**, natural-language engine. It is the modern, type-safe successor to legacy libraries like Moment.js and Luxon.


<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://socket.dev/npm/package/@magmacomputing/tempo"><img src="https://img.shields.io/badge/Socket-81%2F100-brightgreen?logo=socket" alt="Socket Security" style="display: inline-block; margin: 0 4px;"></a> <a href="https://tc39.es/proposal-temporal/"><img src="https://img.shields.io/badge/Temporal-Stage%204-green" alt="Temporal" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a> <a href="https://stackblitz.com/edit/vitejs-vite-4uqmmr1i?file=src%2Fmain.ts&terminal=dev"><img src="https://img.shields.io/badge/StackBlitz-Playground-1389FD?logo=stackblitz" alt="Open in StackBlitz" style="display: inline-block; margin: 0 4px;"></a>
</p>


---

## ⚡ Quick Start
```javascript
import { Tempo } from '@magmacomputing/tempo';
import { AstroPlugin } from '@magmacomputing/tempo-plugin-astro';

// 🔌 Instantly Extensible (with deterministic defaults)
Tempo.init({ 
  extends: [AstroPlugin],
  timeZone: 'America/New_York'
});

// 🎯 Natural Language Parsing (Deterministic anchor)
const event = new Tempo('next Friday 3pm', { anchor: '2026-10-15' });

// 🔄 Fluent Mutations (Immutable)
const reminder = event.add({ hours: 2 }).set({ minute: 0 });

// ⏳ Comparative Durations
const diff = event.until('2026-12-25');
console.log(diff.iso); // P2M2D

// 📝 Beautiful Formatting
console.log(event.format('{mon} {dd:ord}, {yyyy}')); // October 23rd, 2026

// 🌌 Domain Logic (via Plugin)
console.log(event.term.astronomy.season); // 'Autumn'
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
    "@magmacomputing/tempo": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@4/dist/tempo.bundle.esm.js"
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

## ⏳ Why Tempo?

While the native Temporal API gives you perfect primitives (`ZonedDateTime`, `PlainDate`), it doesn't give you business logic. Tempo bridges that gap.

| Feature | Native `Temporal` API | The `Tempo` Ecosystem |
| :--- | :--- | :--- |
| **Primitives** | Perfect (`Instant`, `ZonedDateTime`) | Powered by Native Primitives ✨ |
| **Timezones** | IANA String Support | Advanced fallback & auto-syncing |
| **Domain Logic** | ❌ Build it yourself | ✅ Plugins (`astro`, `sync`) |
| **Natural Language**| ❌ Manual parsing | ✅ "next Friday 3pm" |

### The Missing Domain Layer

*   **🗣️ Natural Language & Smart Parsing**: Parse natural language phrases (e.g. "next Friday 3pm", "two days ago") with zero-cost lazy evaluation and functional aliases.
*   **🌍 Zero-Bundle Localization**: Multi-language date parsing and formatting powered natively by ECMAScript `Intl`—no heavy static locale dictionaries required.
*   **🧩 Extensible & AI-Ready**: Modular plugin ecosystem for astronomical cycles (`astro`), financial quarters (`finance`), schedulers (`ticker`), and LLM-powered parsing (`ai`).
*   **🏗️ Future-Proof & Ultra-Lightweight**: Built natively on the TC39 Stage 4 `Temporal` foundation with zero legacy runtime baggage and full tree-shaking support.

---

## 📚 Documentation

For a deeper dive into the API, architecture, and advanced features:

*   **[Official Documentation Website](https://magmacomputing.github.io/magma/)** — Tutorials, interactive demos, and "Getting Started" guides.
*   **[Full API Reference Guide](https://magmacomputing.github.io/magma/api/index.html)** — Detailed technical documentation for every class and method.

---

## 🧰 The Tempo Ecosystem

Tempo is the core library, but the ecosystem extends further:

| Package | Description | Resources |
| :--- | :--- | :--- |
| **[`@magmacomputing/tempo`](https://www.npmjs.com/package/@magmacomputing/tempo)** | Core library — parsing, formatting, natural-language engine | [![Docs](https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square)](https://magmacomputing.github.io/magma/) |
| **[`@magmacomputing/tempo-plugin-ai`](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ai)** | LLM-powered natural language parsing, recurrence expansion & smart scheduling | [![Docs](https://img.shields.io/badge/Docs-AI%20Plugin-blueviolet?logo=vitepress&style=flat-square)](https://magmacomputing.github.io/magma/doc/9-plugins/ai/index.html) |
| **[`@magmacomputing/tempo-plugin-*`](https://www.npmjs.com/search?q=%40magmacomputing%2Ftempo-plugin)** | Premium & community plugins — Ticker, Astro, Finance, Sync, Snap and more | [![Ecosystem](https://img.shields.io/badge/Browse-Plugin%20Ecosystem-blueviolet?logo=npm&style=flat-square)](https://magmacomputing.github.io/magma/doc/3-extending-tempo/ecosystem) |
| **[`@magmacomputing/tempo-fns`](https://www.npmjs.com/package/@magmacomputing/tempo-fns)** | Pure functional utilities built on native Temporal & Tempo — tree-shakeable helpers | [![Docs](https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square)](https://magmacomputing.github.io/magma/functions/) |


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
