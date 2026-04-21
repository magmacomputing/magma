# Tempo

**The Professional Date-Time Library for the Temporal API**

<img src="./img/logo.svg" width="120" alt="Tempo logo">

**Tempo** is a premium, high-performance wrapper for the ECMAScript `Temporal` API. Designed for professionals, it combines **immutable** state-management with a **fluent**, natural-language engine. It is the modern, type-safe successor to legacy libraries like Moment.js and Luxon.

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Temporal](https://img.shields.io/badge/Temporal-Stage%204-green)](https://tc39.es/proposal-temporal/)
[![TypeScript Ready](https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Native ESM](https://img.shields.io/badge/Native-ESM-green)](https://nodejs.org/api/esm.html)
[![Documentation](https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress)](https://magmacomputing.github.io/magma/)

</div>

---

### ⚡ Quick Start
```javascript
import { Tempo } from '@magmacomputing/tempo';

// 🎯 Natural Language Parsing
const event = new Tempo('next Friday 3pm');

// 🔄 Fluent Mutations (Immutable)
const reminder = event.add({ hours: 2 }).set({ minute: 0 });

// ⏱️ High-Precision Tickers
Tempo.ticker({ seconds: 1 }, (t) => {
  console.log(t.format('{hh}:{mi}:{ss} {tz}')); 
});
```

---

### 📦 Installation

```bash
npm install @magmacomputing/tempo       # npm
yarn add @magmacomputing/tempo          # yarn
pnpm add @magmacomputing/tempo          # pnpm
bun add @magmacomputing/tempo           # bun
deno add npm:@magmacomputing/tempo      # deno
```

<details>
<summary><b>🌐 Browser & Lite Environments</b></summary>

For modern browsers using **Import Maps**:
```html
<script type="importmap">
{
  "imports": {
    "@magmacomputing/tempo": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@2/dist/tempo.bundle.esm.js"
  }
}
</script>
```

For rapid prototyping without a package manager (UMD):
```html
<script src="https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@2/dist/tempo.bundle.js"></script>
```

For granular "Lite" builds, see the [Full Installation Guide](https://magmacomputing.github.io/magma/doc/installation).
</details>

---

### ✨ Why Tempo?
*   **🏗️ Future Standard**: Built natively on the TC39 `Temporal` proposal. Inherit the reliability of the future standard.
*   **🗣️ Natural Language**: Resolve complex terms like `#friday.last` or "two days ago" with zero configuration.
*   **🔄 Cycle Persistence**: Shift by semantic terms (Quarters, Seasons) while preserving your relative day-of-period offset.
*   **⚡ Zero-Cost Parsing**: Lazy evaluation and smart matching ensure instantiation overhead is near-zero.
*   **🛡️ Monorepo Resilient**: Built for stability in complex environments with proxy-protected registries.
*   **📦 Tree-Shakable**: Keep your bundle light. Only load what you need—from Fiscal calendars to high-performance Tickers.

---

### 📚 Documentation

For a deeper dive into the API, architecture, and advanced features:

*   **[Official Documentation Website](https://magmacomputing.github.io/magma/)** — Tutorials, interactive demos, and "Getting Started" guides.
*   **[Full API Reference Guide](https://magmacomputing.github.io/magma/doc/tempo.api)** — Detailed technical documentation for every class and method.

---

### 💬 Contact & Support

1. **Bug Reports & Features**: Please open an [Issue](https://github.com/magmacomputing/magma/issues).
2. **Questions & Ideas**: Start a thread in [Discussions](https://github.com/magmacomputing/magma/discussions).
3. **Direct Contact**: You can reach me at `hello@magmacomputing.com.au`.

---

### 🗳️ Feedback & Reactions

[🚀 Premium!](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20🚀%20Premium!) &nbsp; | &nbsp; 
[⭐ Loving it!](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20⭐%20Loving%20it!) &nbsp; | &nbsp; 
[💡 Needs work](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20💡%20Needs%20work) &nbsp; | &nbsp; 
[🐞 Found a bug](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20🐞%20Found%20a%20bug)

---

### ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.
