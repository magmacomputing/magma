<table width="100%">
  <tbody>
    <tr>
      <td align="left" width="120">
        <img src="./img/logo.svg" width="120" alt="Tempo logo">
      </td>
      <td align="left" valign="middle">
        <h1><font color="#3498db">Tempo</font></h1>
        <p><strong>The Professional Date-Time Library for the Temporal API</strong></p>
      </td>
    </tr>
  </tbody>
</table>

<br>

**Tempo** is a premium, high-performance wrapper around the JavaScript `Temporal` API. It provides a modern, **immutable**, and **fluent** interface for date-time manipulation, and flexible parsing. It's designed as a better-performing, type-safe alternative to legacy libraries like **Moment.js**, **Day.js**, and **Luxon**.

<div align="center">
<table>
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
</div>

## 🚀 Overview
Working with `Date` in JavaScript has historically been painful. The new `Temporal` standard (Stage 4) fixes this, but it can be verbose and strict when parsing strings. 

**Tempo** bridges that gap by providing:
- **Flexible Parsing**: Interprets almost any date string, including relative ones like "next Friday".
- **Natural Language**: Supports word-based numbers (0-10) in relative parsing (e.g., "two days ago").
- **Fluent API**: Chainable methods for adding, subtracting, and setting date-times (similar to Moment.js).
- **Formatting**: Use custom tokens to format date-times in a way that is both intuitive and flexible.
- **Plugin**: Extend core functionality safely; built-ins (like the Ticker) are ready-to-use in the full package, or can be opted-into via side-effect imports when using the lean Core engine.
- **Terms**: Access complex date ranges (Quarters, Seasons, Zodiacs) easily.
- **Immutable**: Operations (like `set` and `add`) return a new `Tempo` instance, ensuring thread safety and predictability.
## 🤔 Why Tempo?
If you're looking for a **modern date library** that leverages the native power of the browser's `Temporal` API, Tempo is for you.

- **Type Safety**: Built from the ground up with TypeScript.
- **Performance**: High-performance wrapper with minimal overhead.
- **Familiarity**: If you like the fluent syntax of **Moment** or **Day.js**, you'll feel right at home.
- **Future-Proof**: Built on the TC39 `Temporal` standard.
## 🎯 Target Audience

Tempo is built for **modern JavaScript developers** who require a premium, type-safe, and developer-friendly interface over the native Temporal API. It is ideal for those migrating from legacy libraries like **Moment.js**, **Day.js**, or **Luxon**, as well as teams building complex, time-sensitive applications that demand reliability, immutability, and high-performance parsing.
Tempo is designed for a broad spectrum of developers and teams who interact with date and time data in JavaScript:

### 1. Modern JavaScript Developers
For those who want to leverage the power of the native `Temporal` API today but find its raw implementation too verbose or strict for rapid development.

### 2. Teams Migrating from Legacy Libraries
Ideal for organizations looking to move away from **Moment.js**, **Day.js**, or **Luxon** without sacrificing the fluent, chainable API and flexible parsing on which they've come to rely.

### 3. Enterprise Application Architects
For those building complex, time-sensitive systems (such as financial platforms, scheduling engines, or global logistics trackers) that demand the precision of Temporal combined with a premium, type-safe developer experience.
## 📦 Installation

### 💻 on the Server (or Bundler)
For Node.js, Bun, Deno, or projects using a bundler (Vite, Webpack, etc.), install via npm:

```bash
npm install @magmacomputing/tempo
```

Tempo is a native ESM package. In Node.js (20+), simply import the class.
Node.js, Bun, and Deno support native ESM out of the box.

```javascript
import { Tempo } from '@magmacomputing/tempo';

const t = new Tempo('next Friday');
console.log(t.format('{dd} {mon} {yyyy}'));
```

### 🌐 in the Browser (Import Maps)
Since Tempo is a native ESM package, you can use it directly in modern browsers using `importmap`. The **bundle** entrypoint includes all standard modules pre-registered, but requires a separate `Temporal` polyfill for current browser environments.

```html
<script type="importmap">
{
  "imports": {
    "@magmacomputing/tempo": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@2/dist/tempo.bundle.esm.js"
  }
}
</script>
<script type="module">
  import Tempo from '@magmacomputing/tempo';
  const t = new Tempo('next friday');
  console.log(t.format('{mon} {day}'));
</script>
```

### 📦 in the Browser (Script Tag)
For environments without `importmap` support or simple prototypes, use the global bundle. This automatically attaches the `Tempo` class to the `window` object.

```html
<script src="https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@2/dist/tempo.bundle.js"></script>
<script>
  const t = new Tempo('tomorrow');
  console.log(t.toString());
</script>
```

### 🧪 Advanced: Granular ESM (Lite Build)
For maximum performance, you can use the lean **Core** engine and opt-in to specific modules. This prevents loading unused logic and keeps your production bundle minimal.

```html
<script type="importmap">
{
  "imports": {
    "@magmacomputing/tempo/core": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@2/dist/core.index.js",
    "@magmacomputing/tempo/mutate": "https://cdn.jsdelivr.net/npm/@magmacomputing/tempo@2/dist/plugin/module/module.mutate.js",
    "@magmacomputing/library": "https://cdn.jsdelivr.net/npm/@magmacomputing/library@2/dist/common.index.js",
    "@js-temporal/polyfill": "https://cdn.jsdelivr.net/npm/@js-temporal/polyfill@0.5/dist/index.esm.js"
  }
}
</script>
<script type="module">
  import { Tempo } from '@magmacomputing/tempo/core';
  import { MutateModule } from '@magmacomputing/tempo/mutate';

  // Opt-in to mutation logic
  Tempo.extend(MutateModule);

  const t = new Tempo().add({ days: 1 });
  console.log(t.toString());
</script>
```

> [!TIP]
> **CDN Versioning**: The examples above use pinned versions (`@magmacomputing/tempo@2`, `@magmacomputing/library@2`, `@js-temporal/polyfill@0.5`) for production stability. To use the latest releases, you can omit the version string from every URL (e.g., remove `@2` from all Magma entries and `@0.5` from the polyfill). Ensure all `@magmacomputing/...` entries resolve to the same release to avoid mixed-version loading.

---

## 📚 Documentation

For a deeper dive into the API, architecture, and advanced features:

*   **[Official Documentation Website](https://magmacomputing.github.io/magma/)** — Tutorials, interactive demos, and "Getting Started" guides.
*   **[Full API Reference Guide](https://magmacomputing.github.io/magma/doc/tempo.api)** — Detailed technical documentation for every class and method.

---
## 🛠️ Quick Start

```javascript
import { Tempo } from '@magmacomputing/tempo';

// Instantiate 
const now = new Tempo(); 
const birthday = new Tempo('20-May-1990');
const nextWeek = new Tempo('next Monday');

// Manipulate
const later = now.add({ days: 3, hours: 2 });
const startOfMonth = now.set({ start: 'month' });

// Format
console.log(now.format('{dd} {mmm} {yyyy}')); // using custom format with tokens: "24 Jan 2026"
console.log(now.fmt.date);                    // using pre-built formats: "2026-01-24"
```


## 💬 Contact & Support

If you have a question, find a bug, or want to suggest a new feature:

1. **Bug Reports & Features**: Please open an [Issue](https://github.com/magmacomputing/magma/issues).
2. **Questions & Ideas**: Start a thread in [Discussions](https://github.com/magmacomputing/magma/discussions).
3. **Direct Contact**: You can reach me at `hello@magmacomputing.com.au`.

## 🛡️ Privacy & Transparency

We value your privacy. **Tempo** does not include any runtime telemetry or "phone-home" features. 
Tempo will never make network requests from your application.

## 🗳️ Feedback & Reactions

How are we doing? Let us know with a simple reaction!  
*(This will open a pre-filled GitHub Issue)*

[🚀 Premium!](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20🚀%20Premium!) &nbsp; | &nbsp; 
[⭐ Loving it!](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20⭐%20Loving%20it!) &nbsp; | &nbsp; 
[💡 Needs work](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20💡%20Needs%20work) &nbsp; | &nbsp; 
[🐞 Found a bug](https://github.com/magmacomputing/magma/issues/new?title=Feedback:%20🐞%20Found%20a%20bug)

### ⚡ Quick Reactions
*(Native reactions available in [Discussions](https://github.com/magmacomputing/magma/discussions/categories/feedback))*

[👍 Like](https://github.com/magmacomputing/magma/discussions/categories/feedback) &nbsp; | &nbsp;
[❤️ Love](https://github.com/magmacomputing/magma/discussions/categories/feedback) &nbsp; | &nbsp;
[😄 Haha](https://github.com/magmacomputing/magma/discussions/categories/feedback) &nbsp; | &nbsp;
[😮 Wow](https://github.com/magmacomputing/magma/discussions/categories/feedback) &nbsp; | &nbsp;
[😢 Sad](https://github.com/magmacomputing/magma/discussions/categories/feedback) &nbsp; | &nbsp;
[😡 Angry](https://github.com/magmacomputing/magma/discussions/categories/feedback) &nbsp; | &nbsp;
[💩 Poop](https://github.com/magmacomputing/magma/discussions/categories/feedback)

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.
