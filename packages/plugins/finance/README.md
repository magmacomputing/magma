# @magmacomputing/tempo-plugin-finance

<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; margin-bottom: 2rem;">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-finance"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-finance?style=flat-square" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-finance/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version"></a>
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-finance"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-finance?style=flat-square" alt="License"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready"></a>
  <a href="https://magmacomputing.github.io/magma/9-plugins/finance.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation"></a>
</div>

A specialized namespace plugin for Tempo that provides fiscal year and financial date utilities.

👉 **[View the full documentation on our GitHub Pages](https://magmacomputing.github.io/magma/9-plugins/finance.html)**

## Installation

```bash
npm install @magmacomputing/tempo-plugin-finance
```

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { FinancePlugin } from '@magmacomputing/tempo-plugin-finance';

// Register the namespace
Tempo.extend(FinancePlugin);

const t = new Tempo('2024-07-01');

// Evaluate static properties
console.log(t.finance.fiscalQuarter); // 3
console.log(t.finance.taxYear); // 2024

// Evaluate functional closures
console.log(t.finance.isFiscalYearStart()); // false
```

## Documentation

Full documentation available at [https://magmacomputing.github.io/tempo-plugin-docs/finance](https://magmacomputing.github.io/tempo-plugin-docs/finance).

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.
