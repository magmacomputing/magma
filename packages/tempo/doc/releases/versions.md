# 📜 Version History

Tempo v2.1.2 is a major milestone, delivering a more reactive architecture and rock-solid stability.

## [v2.1.2] - 2026-04-16

### 🏗️ Modular Architecture
Tempo is now split into `core` and optional plugin/modules, allowing you to include only what you need. This reduces bundle size for users who only need the basic engine.

### 📝 Improved Logging
Internal logging now uses context-aware Symbols. This decouples the logging logic from the core engine, allowing for cleaner diagnostics without performance overhead.

### ⏱️ Static API
- Added `Tempo.duration()` static method for convenient duration creation without instantiating a full Tempo date object first.

### 🔌 Side Effect Registration
Plugins now support automatic registration. 
- The full `@magmacomputing/tempo` package includes all modules by default.
- Core users (`@magmacomputing/tempo/core`) can activate features simply by importing the corresponding module (e.g., `import '@magmacomputing/tempo/ticker'`).

### 🛡️ 100% Reliability
The engine passes all regression tests, ensuring complete stability across:
- Parsing complex date strings.
- Calculation and relative math.
- Formatting routines.

### 🗓️ Unified Term Logic
Terms (like Quarters and Seasons) are now fully integrated:
- Use `#` in `set()` to jump to boundaries (e.g., `t.set({ start: '#quarter' })`).
- Use `{#term}` in `format()` to embed semantic labels (e.g. "Second Quarter") directly into strings (e.g., `t.format('Today is {yyyy}-{mm}-{dd} in the {#quarter}')`.

### ➗ Relational Term Math
A category-first feature. Shift dates by semantic "steps" with `.add({ '#quarter': 1 })`. Tempo preserves your relative duration within the term, jumping across gaps and handling overflows with mathematical precision.

### 🔗 Fluent Immutable Boundaries
Term ranges now return fully functional, frozen `Tempo` instances for `start` and `end`. This allows for seamless chaining:
```javascript
t.term.qtr.start.format('{dd} {mmm}')
```

### ⚡ Ticker Reliability
Fully stabilized the Ticker subsystem:
- Resolved async generator hangs.
- Synchronized pulse counts ($N$ pulses for `limit: N`), guaranteeing 100% predictable reactive streams.

### 🚀 Parsing Engine Optimization
- Re-engineered pattern generation for $O(1)$ instance creation.
- Improved support for custom layout literals in local/one-off parsers.
- Significant refinements to the natural language engine for even more intuitive relative-date handling ("next Friday", "two days ago", etc.).
