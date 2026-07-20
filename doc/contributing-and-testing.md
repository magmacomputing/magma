# 🤝 Contributing & Testing

Welcome to the team! This guide covers the essential workflows for developing, testing, and debugging within the Magma monorepo.

## 🛠️ Environment Setup

1. **Node Version**: Ensure you are running Node.js **v20.0.0** or higher.
2. **Install Dependencies**: Run `npm install` from the monorepo root. We rely on npm workspaces to automatically hoist and link cross-package dependencies.
3. **Initial Build**: Before running tests or starting the REPL, execute a full build to establish the `dist/` folders:
   ```bash
   npm run build:tempo
   npm run build:plugins
   ```

## 🧪 Testing Infrastructure (Vitest)

We use [Vitest](https://vitest.dev/) for our unit testing framework. 

### Running Tests
- To run tests for a specific workspace: `cd packages/plugins/astro && npm test`
- To run all tests across the monorepo: `npm test` from the root directory.

### The `vitest.shared.ts` Configuration
Because plugins depend on the core engine (and vice-versa), resolving module aliases during test hydration is critical.
- **The Setup**: Inside `packages/plugins/vitest.shared.ts`, we explicitly map public API paths (e.g., `@magmacomputing/tempo/parse`) back to their raw TypeScript source files (`../tempo/src/module/module.parse.ts`).
- **Why?** This ensures that Vitest runs against your live `.ts` source code, rather than forcing you to rebuild the `dist/` folders every time you make a change.

> [!WARNING]
> If you introduce a new public sub-path export in `packages/tempo/package.json`, you **must** also add a corresponding alias in `packages/plugins/vitest.shared.ts`, or the plugin CI tests will fail with an `ERR_MODULE_NOT_FOUND` error.

## 💻 Interactive Debugging (REPL)

For rapid iteration, we provide a custom, persistent Node.js REPL pre-loaded with the `Tempo` class and the native `Temporal` polyfill.

To launch the interactive environment:
```bash
npm run repl
```
*(This maps to the `packages/tempo/bin/parse.ts` script via `tsx`).*

This is the fastest way to test parsing behavior, benchmark logic, or validate Master Guard rejection patterns without writing a full test suite.
