![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-dialects

[![npm version](https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-dialects?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-dialects)
[![npm peer dependency version](https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-dialects/peer/@magmacomputing/tempo?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo)
[![License](https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-dialects?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-dialects)

Community plugin for Tempo providing seamless support for external date formatting standards and library dialects, including **Unicode LDML / UTS #35 (Luxon, date-fns)**, **Moment.js / Day.js**, and **POSIX `strftime` (C, Python, SQL)**.

## Installation

```bash
npm install @magmacomputing/tempo-plugin-dialects
```

## Quick Start

### 1. Explicit Registration (Recommended)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '@magmacomputing/tempo-plugin-dialects';

Tempo.use(DialectsPlugin);

const t = new Tempo('2026-10-24T15:30:45');

// 1. Unicode LDML / Luxon formatting
t.format('yyyy-MM-dd HH:mm:ss', { dialect: DIALECT.Ldml }); // "2026-10-24 15:30:45"
t.dialects.ldml('dd LLL yyyy');                             // "24 Oct 2026"
t.toFormat('yyyy-MM-dd');                                   // Luxon drop-in alias

// 2. POSIX strftime formatting
t.format('%Y-%m-%d %H:%M:%S', { dialect: DIALECT.Strftime }); // "2026-10-24 15:30:45"
t.dialects.strftime('%B %d, %Y');                              // "October 24, 2026"

// 3. Dialect-based Parsing
Tempo.fromFormat('24/10/2026', 'dd/MM/yyyy');
Tempo.dialects.parse('2026-10-24 15:30', 'yyyy-MM-dd HH:mm');
```

### 2. Zero-Boilerplate Side-Effect Registration

```typescript
import '@magmacomputing/tempo-plugin-dialects/install';
import { Tempo } from '@magmacomputing/tempo';

const t = new Tempo('2026-10-24');
console.log(t.toFormat('yyyy-MM-dd'));
```

## Documentation

📖 **[Read the Official Dialects Plugin Documentation](https://magmacomputing.github.io/magma/doc/9-plugins/dialects.index.html)**

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.
