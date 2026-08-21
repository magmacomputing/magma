![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-ticker

<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; margin-bottom: 2rem;">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ticker"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-ticker?style=flat-square" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-ticker/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version"></a>
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ticker"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-ticker?style=flat-square" alt="License"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready"></a>
  <a href="https://magmacomputing.github.io/magma/doc/9-plugins/ticker.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation"></a>
</div>

This is a Community plugin for the [Tempo](https://github.com/magmacomputing/magma) library that provides a high-performance continuous execution loop (Ticker) based on temporal mathematics.

👉 **[View the full documentation on our GitHub Pages](https://magmacomputing.github.io/magma/doc/9-plugins/ticker.index.html)**

## Installation

```bash
npm install @magmacomputing/tempo-plugin-ticker
```

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { TickerPlugin } from '@magmacomputing/tempo-plugin-ticker';

Tempo.init({ 
  plugins: [TickerPlugin] 
});

// You can now access Ticker-based execution loops through the Tempo API:
const ticker = Tempo.ticker(1000, (t, stop) => {
  console.log('Tick:', t.format('isoTime'));
});
```

## Documentation

For full API reference, advanced options, and detailed usage patterns, please visit the official **[Ticker Plugin Documentation ↗](https://magmacomputing.github.io/magma/doc/9-plugins/ticker.index.html)**.

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.

