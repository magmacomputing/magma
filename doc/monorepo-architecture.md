# 🏗️ Monorepo Architecture

Welcome to the Magma Computing monorepo! This document provides a high-level overview of how the repository is structured, how the different workspaces interact, and the critical architectural decisions that govern our dependencies.

## Workspace Structure

The project is organized as an `npm` workspace monorepo. It is broken down into several heavily decoupled packages:

### 1. `packages/tempo` (Core Engine)
This is the primary `@magmacomputing/tempo` package. It contains the core Object-Oriented engine, the Master Guard, and the primary date-time parsing/formatting logic.
- **Role**: The consumer-facing library.
- **Dependencies**: Relies entirely on the internal `#library` and plugins.

### 2. `packages/library` (The Magma Utility Stack)
The `@magmacomputing/library` package is a strictly private, internal utility library.
- **Role**: Provides standalone, highly optimized utilities (type-checking, serialization, proxy delegation, caching, internationalization) used uniformly across all Magma packages.
- **Encapsulation**: This package is **never** exposed to the end-user. It is consumed via TypeScript path aliases (`#library/*`) and statically bundled into the final distribution.

### 3. `packages/plugins/*` (The Plugin Ecosystem)
The `@magmacomputing/tempo-plugin-*` packages are standalone, publishable modules that extend the core Tempo engine (e.g., `astro`, `finance`, `sync`).
- **Role**: Provide opt-in functionality for users without bloating the core engine bundle.
- **Dependencies**: They depend on `@magmacomputing/tempo/plugin-api` for strict type-checking and structural validation.

### 4. `packages/plugins/.std` (Standard Built-Ins)
The `@magmacomputing/tempo-std` workspace is a highly specialized, private workspace containing the "standard" built-in plugins (e.g., quarters, seasons).
- **The Circular Dependency Problem**: `tempo` needs these standard plugins to bundle them as batteries-included defaults. But these standard plugins need to import `TermPlugin` types from `tempo` to compile.
- **The Solution**: `.std` is isolated into its own workspace. `tempo` imports it via a type stub (`std.d.ts`) during TypeScript compilation to break the circular dependency, and Rollup directly bundles the compiled output during the distribution phase.

### 5. `packages/functions`
A standalone workspace providing pure, tree-shakeable functions for specific business logic.

## Aliasing Strategy (The `#` Prefix)

To ensure strict module boundaries and simplify refactoring, we heavily utilize Node's subpath imports feature.

- **`#library/*`**: Resolves to `packages/library/src/*`. Used across all workspaces to fetch common utilities.
- **`#tempo/*`**: Resolves to specific internal domains within the `tempo` core (e.g., `#tempo/support`, `#tempo/parse`).

> [!IMPORTANT]
> **Never use relative paths (e.g., `../../../library/src`) to cross workspace boundaries.** Always use the `#` alias. This guarantees that your code will compile identically in both the TypeScript project graph and the Vite/Rollup build pipeline.
