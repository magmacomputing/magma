![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-snap

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-snap"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-snap?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-snap/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-snap"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-snap?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/snap.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

A Community plugin for the [Tempo](https://github.com/magmacomputing/magma) library that provides robust time rounding and snapping functionality (e.g. snapping to the nearest 15-minute or 1-hour block) for calendar and scheduling applications.

👉 **[View the full documentation on our GitHub Pages](https://magmacomputing.github.io/magma/doc/9-plugins/snap.index.html)**

## Installation

```bash
npm install @magmacomputing/tempo-plugin-snap
```

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SnapPlugin } from '@magmacomputing/tempo-plugin-snap';

// Pass the plugin to `Tempo.init` to register it into the runtime.
Tempo.init({ 
  plugins: [SnapPlugin] 
});

const t = new Tempo('2026-06-01T14:08:00Z');

// Snaps to the nearest 15 minutes by default
const snapped = t.snap();
console.log(snapped.format('{hh}:{mi}')); // "14:15"

// Or explicitly provide units and intervals
const snapHour = t.snap('hh', 1);
const snapSecond = t.snap('ss', 30);
```

## Documentation

For full API reference, advanced configuration, and detailed explanations of the rounding features, please visit the official **[Snap Plugin Documentation ↗](https://magmacomputing.github.io/magma/doc/9-plugins/snap.index.html)**.

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.
