![Tempo Plugin](https://magmacomputing.github.io/tempo-plugin-docs/plugin-logo.svg)

# @magmacomputing/tempo-plugin-snap

[![npm version](https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-snap?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-snap)
[![npm peer dependency version](https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-snap/peer/@magmacomputing/tempo?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo)
[![License](https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-snap?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-snap)

A Community plugin for the [Tempo](https://github.com/magmacomputing/magma) library that provides robust time rounding and snapping functionality (e.g. snapping to the nearest 15 minutes or 1 hour block) for calendar and scheduling applications.

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

For full API reference, advanced configuration, and detailed explanations of the rounding features, please visit the official **[Snap Plugin Documentation ↗](https://magmacomputing.github.io/tempo-plugin-docs/snap)**.

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.
