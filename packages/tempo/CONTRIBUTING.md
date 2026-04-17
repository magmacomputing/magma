# Contributing to Tempo

Thank you for your interest in contributing to Tempo! This project is a professional-grade date-time utility built on top of the native `Temporal` API. To maintain the high performance and architectural integrity of the library, please follow these guidelines.

## 🏗️ Project Architecture

Tempo uses several advanced JavaScript patterns that contributors should be familiar with:
- **[Proxy-Delegators](./doc/lazy-evaluation-pattern.md)**: For $O(1)$ lazy evaluation of instance properties.
- **[Soft Freeze](./doc/soft_freeze_strategy.md)**: For secure but extensible global registries.
- **[Logify](./doc/architecture.md)**: For decoupled, symbol-based diagnostic logging.

## 🛠️ Local Development

### Prerequisites
- **Node.js 20+** (Tempo requires native `Temporal` support or a robust environment).
- **npm v9+** (For monorepo workspace support).

### Setup
```bash
git clone https://github.com/magmacomputing/magma.git
cd magma
npm install
```

### Building
Tempo is a TypeScript project that compiles to **ES2022**. 
```bash
npm run build -w @magmacomputing/tempo
```

## 🧪 Testing

We use **Vitest** for our test suite. All new features or bug fixes must include corresponding tests.

- **Run all tests**: `npm run test`
- **Watch mode**: `npm run dev`
- **Coverage**: `npm run coverage`

> [!IMPORTANT]
> **Zero State Contamination**: Tests must be idempotent. If your test modifies a global registry (e.g., `Tempo.extend`), ensure you use the `using` keyword or manually call `Tempo[Symbol.dispose]()` to reset the engine for the next test.

## 📜 Coding Standards

1. **Private Fields**: Use native `#private` fields for internal state that should not be accessible via Proxies.
2. **Internal Symbols**: Use the symbols exported from `tempo.symbol.ts` for cross-module internal communication.
3. **Immutability**: Tempo instances are strictly immutable. Any method that changes state must return a *new* instance.
4. **Documentation**: If you change a public API, please update the corresponding `.md` file in the `doc/` directory.

## 🚀 Pull Request Process

1. Create a new branch for your feature or fix.
2. Ensure the test suite passes at 100%.
3. Update the `CHANGELOG.md` with a brief description of your changes.
4. Open a Pull Request and describe the problem you are solving and your technical approach.

---
*Tempo is maintained by Magma Computing. For commercial support or architectural consulting, please reach out via the [Contact Page](https://magmacomputing.com.au).*
