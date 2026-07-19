# @magmacomputing/tempo-plugin-finance

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-finance"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-finance?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-finance/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-finance"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-finance?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/finance.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

A specialized namespace plugin for Tempo that provides fiscal year and financial date utilities.

👉 **[View the full documentation on our GitHub Pages](https://magmacomputing.github.io/magma/doc/9-plugins/finance.index.html)**

## Installation

```bash
npm install @magmacomputing/tempo-plugin-finance
```

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { FinanceNamespace } from '@magmacomputing/tempo-plugin-finance';

// Register the namespace
Tempo.extend(FinanceNamespace);

const t = new Tempo('2024-07-01');

// Evaluate static properties
console.log(t.finance.fiscalQuarter); // 3
console.log(t.finance.taxYear); // 2024

// Evaluate functional closures
console.log(t.finance.isFiscalYearStart()); // false
```

## Documentation

Full documentation available at [https://magmacomputing.github.io/magma/doc/9-plugins/finance.index.html](https://magmacomputing.github.io/magma/doc/9-plugins/finance.index.html).

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.
