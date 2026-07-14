# @magmacomputing/tempo-plugin-finance

[![npm version](https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-finance?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-finance)
[![npm peer dependency version](https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-finance/peer/@magmacomputing/tempo?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo)
[![License](https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-finance?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-finance)

A specialized namespace plugin for Tempo that provides fiscal year and financial date utilities.

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
