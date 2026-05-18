# Tempo v3.0.0: Architecture & Discoverability Plan

## Objective
Transition Tempo from a "Self-Contained" bundle to a "Modular Monorepo" participant. This involves decoupling `@magmacomputing/library` into a standalone, reachable package to support a growing ecosystem of private monorepos.

## Current State (v2.x)
- **Bundled Library**: The `#library` workspace is compiled directly into `tempo/dist/lib`.
- **Consumption**: Tempo is published as a zero-dependency package.
- **Limitation**: `library` is not easily reachable by other monorepos (e.g., the `white` repo).
- **Inefficiency**: Multiple packages using `library` results in duplicate code in the final user bundle.

## The v3.0.0 Vision

### 1. Library Publication
- **Registry**: Move `@magmacomputing/library` to npmjs as a public package.
- **Versioning**: Ensure independent versioning for the library to support multiple consumers at different lifecycles.

### 2. Dependency Management
- **ESM Builds**: Tempo will list `@magmacomputing/library` as a formal `dependency`. This allows modern bundlers (Vite, Webpack) to deduplicate the library code across multiple internal packages.
- **Hybrid Bundling**:
    - **Granular ESM**: No longer carries `lib/`. Imports from `@magmacomputing/library`.
    - **Global Bundle (IIFE)**: Remains self-contained for easy `<script>` tag use, including the necessary library parts.

### 3. Cross-Monorepo Strategy
The following upcoming monorepos and workspaces will depend on the shared `@magmacomputing/library` and `tempo`:

| Package | Environment | Requirements |
| :--- | :--- | :--- |
| **white-web** | Web (Vite/Browser) | Aggressive tree-shaking; shared utilities with Tempo. |
| **coin-spot** | Node.js | Standard ESM/CommonJS dependency resolution. |
| **white-fire** | Firestore Functions | Minimal deployment size; fast cold starts. |
| **white-sheet** | Google Apps Script | Special bundling to support `clasp` push; potentially single-file output. |

## Implementation Roadmap

1. **Phase 1: Library Infrastructure**
    - Set up NPM_TOKEN secrets for GitHub Actions (public npmjs).
    - Finalize `@magmacomputing/library` build pipeline.

2. **Phase 2: Tempo Refactor**
    - Remove Rollup logic that copies `#library` to `dist/lib`.
    - Update `tempo` to import from the scoped package.
    - Verify tree-shaking performance in `white-web`.

3. **Phase 3: Ecosystem Integration**
    - Seed `coin-spot` and `white-fire` with the shared library.
    - Implement the Apps Script bundling logic for `white-sheet`.

## Notes
- **Registry Reachability**: Since these repos are internal, we must ensure CI/CD pipelines (GitHub Actions) have the correct `NPM_TOKEN` to pull from/publish to npmjs.
- **Local Development**: Use `npm link`, `yalc`, or NPM workspaces to maintain a "fast feedback loop" without publishing every change during development.
