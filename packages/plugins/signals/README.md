![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-signals

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-signals"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-signals?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-signals/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-signals"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-signals?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/signals.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

> **Tempo community plugin for reactive TC39 Signals, adaptive relative-time updates, interval state tracking, and global configuration reactivity.**

This plugin brings fine-grained, event-driven reactivity to [Tempo](https://github.com/magmacomputing/magma/tree/main/packages/tempo) without adding timer overhead or reactivity weight to the core package.

---

## ⚡ Quick Start

### 📦 Installation

```bash
npm install @magmacomputing/tempo-plugin-signals
```

### 🎯 Usage

```typescript
import '@magmacomputing/tempo-plugin-signals/install';
import { Tempo } from '@magmacomputing/tempo';

const target = new Tempo().add({ minute: 5 });
const relative = target.toRelativeSignal();

console.log(relative.get()); // e.g. "in 5 minutes"
relative.dispose();
```

> ⚡ **[Try this live in the interactive Tempo Sandbox ↗](https://magmacomputing.github.io/magma/repl/index.html?plugin=signals)**

---

## ✨ Features & Architecture

* ⚡ **Tree-Shakeable Functions & Explicit Registration**: Standalone helpers (`toRelativeSignal`, `intervalSignal`, `localeSignal`, `timeZoneSignal`) are tree-shakeable, while importing the package registers `SignalsPlugin` in the plugin registry (`Tempo.use(SignalsPlugin)` or `/install` mounts `Tempo.signals` and prototype methods).
* ⏱️ **Adaptive Relative Time**: Schedules updates only when the formatted relative unit boundary changes rather than polling every second.
* 📅 **Event-Driven Interval Tracking**: Tracks active, past, and future interval states (`isCurrent`, `isPast`, `isFuture`, `progress`) with boundary timeouts.
* 🌐 **Global Config Reactivity**: Exposes reactive `locale` and `timeZone` signals synchronized with `Tempo.init()` via `onConfigChange`.
* 🧹 **Clean Resource Disposal**: Supports explicit `dispose()` and `Symbol.dispose` (`using`) to release timers and subscriptions deterministically.

---

## 📚 Complete Guides

For complete API references, architecture guides, and advanced examples:
📖 **[Read the Official Signals Plugin Documentation](https://magmacomputing.github.io/magma/doc/9-plugins/signals.index.html)**

---

## ⚖️ Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
