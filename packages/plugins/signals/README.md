![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @tempo-kit/plugin-signals

<p align="center">
  <a href="https://www.npmjs.com/package/@tempo-kit/plugin-signals"><img src="https://img.shields.io/npm/v/@tempo-kit/plugin-signals?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/tempo-kit"><img src="https://img.shields.io/npm/dependency-version/@tempo-kit/plugin-signals/peer/tempo-kit?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@tempo-kit/plugin-signals"><img src="https://img.shields.io/npm/l/@tempo-kit/plugin-signals?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/signals.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

> **Tempo community plugin for reactive TC39 Signals, adaptive relative-time updates, interval state tracking, and global configuration reactivity.**

This plugin brings fine-grained, event-driven reactivity to [Tempo](https://github.com/magmacomputing/magma/tree/main/packages/tempo) without adding timer overhead or reactivity weight to the core package.

---

## ⚡ Quick Start

### 📦 Installation

```bash
npm install @tempo-kit/plugin-signals
```

### 🎯 Usage

```typescript
import '@tempo-kit/plugin-signals/install';
import { Tempo } from 'tempo-kit';

const target = new Tempo().add({ minutes: 5 });
const relative = target.toRelativeSignal();

console.log(relative.get()); // e.g. "in 4m"
relative.dispose();
```

> ⚡ **[Try this live in the interactive Tempo Sandbox ↗](https://magmacomputing.github.io/magma/repl/index.html?plugin=signals)**

---

## ✨ Features & Architecture

* ⚡ **Tree-Shakeable Functions & Explicit Registration**: Standalone helpers (`toRelativeSignal`, `intervalSignal`, `localeSignal`, `timeZoneSignal`) and `SignalsPlugin` are exported from the root entry with zero side effects; registration occurs only via `Tempo.use(SignalsPlugin)` or `@tempo-kit/plugin-signals/install` (which mounts `Tempo.signals` and prototype methods).
* ⏱️ **Adaptive Relative Time**: Schedules updates only when the formatted relative unit boundary changes rather than polling every second.
* 📅 **Event-Driven Interval Tracking**: Status transitions (`isCurrent`, `isPast`, `isFuture`) use boundary timeouts, while active `progress` runs a periodic timer every 1,000 ms by default (pass `progressInterval: false` for boundary-only updates).
* 🌐 **Global Config Reactivity**: Exposes reactive `locale` and `timeZone` signals synchronized with `Tempo.init()` via `onConfigChange`.
* 🧹 **Clean Resource Disposal**: Supports explicit `dispose()` and `Symbol.dispose` (`using`) to release timers and subscriptions deterministically.

---

## 📚 Complete Guides

For complete API references, architecture guides, and advanced examples:
📖 **[Read the Official Signals Plugin Documentation](https://magmacomputing.github.io/magma/doc/9-plugins/signals.index.html)**

---

## ⚖️ Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
