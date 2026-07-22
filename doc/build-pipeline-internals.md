# ⚙️ Build Pipeline Internals

The Magma monorepo utilizes a powerful **Dual-Build Pipeline** that perfectly balances strict TypeScript validation with hyper-optimized bundle distribution.

## The Dual-Build Strategy

When you run `npm run build` in the monorepo root (or `npm run build:tempo`), the pipeline executes two distinct phases:

### Phase 1: TypeScript Compilation (`tsc -b`)
We utilize TypeScript Project References (`tsconfig.json`) to compile the `.ts` files into raw `.js` modules and `.d.ts` declaration files inside the `dist/` folder.
- **Preserve Module Structure**: We do not bundle during this phase. Every file in `src/` maps 1:1 to a file in `dist/`.
- **Why?** This ensures that `package.json` sub-path exports (like `@magmacomputing/tempo/parse`) can point directly to individual compiled files, enabling aggressive tree-shaking for modern downstream bundlers.

### Phase 2: Rollup Bundling (`rollup -c`)
After `tsc` finishes, Rollup sweeps through the `dist/` folder to generate the `tempo.bundle.js` and `tempo.bundle.min.js` files.
- **Target Audience**: These bundles are specifically for users operating via `<script>` tags on CDNs (e.g., unpkg, jsdelivr) who require the entire engine in a single network request.
- **Alias Resolution**: Rollup resolves all internal `#library` and `#tempo/std` aliases, stitching them directly into the final IIFE/ESM bundle.

## Managing Circular Dependencies: The "Type Stub" Pattern

One of the most complex architectural challenges in this monorepo is how `tempo` bundles the "Standard Terms" (quarters, seasons) from `.std`.

1. **The Problem**: `.std` imports `TermPlugin` types from `tempo`. If `tempo` directly imports `.std` source code, TypeScript throws a massive circular dependency error at compile-time.
2. **The Type Stub (`std.d.ts`)**: In `packages/tempo/src/tsconfig.json`, we intentionally alias `#tempo/std` to `packages/tempo/src/plugin/term/std.d.ts`. 
3. **The Result**: When `tsc` builds the core engine, it hits the `#tempo/std` import, reads the handwritten `.d.ts` stub, and safely resolves the types without tracing back into `.std/src`. 
4. **The Rollup Override**: Later, when `Rollup` bundles the final JavaScript, it completely ignores `tsconfig.json`. Instead, it uses `package.json`'s export map, which points `#tempo/std` to the *actual* compiled JavaScript living in `.std/dist/index.js`.

> [!CAUTION]
> If you add a new built-in plugin to `.std`, you **must** update the `std.d.ts` type stub if the type signature changes. Otherwise, TypeScript will blindly trust the stub, leading to runtime failures during Rollup bundling.
