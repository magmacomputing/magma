# Release D: Deeper Decomposition Cleanup

## Overview
This release focuses on modularizing and refactoring the parsing and pattern-matching internals of Tempo for improved maintainability, testability, and extensibility. The goal is to extract tightly-scoped modules for pattern compilation, alias resolution, guard building, and result normalization, with clear boundaries and robust test coverage.

## Task Breakdown & Tracking


### Pattern Compiler + Cache Extraction
- [x] Extract `compileRegExp`, `setPatterns`, and helpers to new module (PatternCompiler)
- [x] Integrate memoization/caching logic as needed (PatternCompiler cache)
- [x] Refactor engine and consumers to use new PatternCompiler module
- [x] Ensure compatibility with snippet/layout definitions
- [x] Add/expand unit tests for pattern logic and cache
- [x] Update documentation and references

### Alias Resolution Engine Extraction
- [x] Extract alias resolution logic to new module
- [x] Define interfaces for registration, lookup, collision
- [x] Refactor engine and plugins to use new APIs
- [x] Add/expand unit tests for alias/collision
- [x] Update documentation and references

### Guard Builder Extraction
- [x] Identify all guard-building/token-ingestion logic
- [x] Assess complexity/reuse for extraction
- [x] Outline module boundaries if justified
- [x] Move "Scan-and-Consume" logic to `engine.guard.ts`
- [x] Refactor `tempo.class.ts` to use `createMasterGuard`

### Parse Result Normalizer Extraction
- [x] Identify all result normalization/trace logic
- [x] Assess complexity/reuse for extraction
- [x] Outline module boundaries if justified
- [x] Extract normalization logic to `engine.normalizer.ts`

## Expected Improvements and Risks

**Expected Improvements:**
- Lower cyclomatic complexity and improved maintainability in the main engine.
- Clearer separation of concerns between parsing, pattern compilation, alias resolution, guard building, and result normalization.
- Easier to test, extend, and debug individual modules.
- More robust and explicit cache management.
- Improved reliability and correctness through focused unit and regression tests.
- Smoother onboarding for new contributors due to modular structure and documentation.

**Risks:**
- Potential for subtle integration bugs during refactor, especially in recursive expansion, alias resolution, or cache invalidation.
- Temporary performance regressions if cache or pattern compilation is not optimized.
- Over-extraction of simple logic could increase codebase complexity without clear benefit.
- Increased review and testing overhead for each extraction step.

**Mitigations:**
- Incremental, well-documented releases with dedicated tests at each step.
- Benchmarking and profiling before/after major changes.
- Only extract modules where complexity or reuse justifies it.
- Maintain clear interfaces and documentation for all new modules.

## Affected Files and Modules

The following files and modules are likely to be affected by the decomposition and extractions in Release D:

- `src/tempo.class.ts` — Main engine logic, source of most extraction candidates.
- `src/support/tempo.util.ts` — Utility functions for pattern, guard, and normalization logic.
- `src/support/tempo.default.ts` — Core snippet, layout, and pattern definitions.
- `src/tempo.type.ts` — Type definitions for parse, pattern, and result structures.
- `src/support/tempo.register.ts` — May require updates for cache/registry management.
- `library/src/common/function.library.ts` — Memoization and cache utilities.
- `src/parse/parse.layout.ts` — Layout order and planner logic (if not already modularized).
- Any new modules created for: Pattern Compiler + Cache, Alias Resolution Engine, Guard Builder, Parse Result Normalizer.
- Test files covering parsing, pattern matching, event/period handling, and normalization.

## Detailed Outlines

### Pattern Compiler + Cache Extraction — Detailed Outline
**Purpose:**
Modularize all logic related to snippet/layout expansion, regex compilation, and pattern cache management for clarity, testability, and maintainability.

**Boundaries & Responsibilities:**
- Accepts layout/snippet definitions and returns compiled RegExp objects.
- Handles recursive expansion of layout placeholders (e.g., `{yy}`, `{mm}`) using snippet registries.
- Manages a cache of compiled patterns for performance.
- Exposes cache invalidation/refresh methods for dynamic config changes.
- Provides a clear interface for the rest of the Tempo engine to request compiled patterns.

**Migration Steps:**
1. Extract `compileRegExp`, `setPatterns`, and related helpers from `tempo.util.ts` into a new module (e.g., `pattern.compiler.ts`).
2. Move or wrap memoization/caching logic (from `function.library.ts`) as needed for pattern compilation.
3. Refactor `tempo.class.ts` and other consumers to use the new module’s interface.
4. Ensure all pattern/snippet/layout definitions in `tempo.default.ts` are compatible with the new module.
5. Add/expand unit tests for pattern expansion, compilation, and cache behavior.
6. Document the new module’s API and update internal references.

**Risks & Mitigations:**
- Risk: Subtle bugs in recursive expansion or cache invalidation. Mitigation: Add focused unit tests and regression tests.
- Risk: Performance regressions if cache is not used correctly. Mitigation: Benchmark before/after and optimize cache usage.

**Expected Improvements:**
- Lower cyclomatic complexity in the main engine.
- Easier to test and reason about pattern expansion and compilation.
- Clearer cache management and invalidation.

### Alias Resolution Engine Extraction — Detailed Outline
**Purpose:**
Modularize all logic related to event/period alias resolution, collision policy, and snippet rebinding into layout-aware groups for clarity, maintainability, and extensibility.

**Boundaries & Responsibilities:**
- Accepts event/period definitions and manages alias mapping and collision detection.
- Handles rebinding of snippets into layout-aware groups.
- Exposes clear APIs for resolving aliases and reporting collisions.
- Integrates with the main engine to ensure correct event/period resolution during parsing.

**Migration Steps:**
1. Identify and extract all alias resolution logic from `tempo.class.ts` and related helpers into a new module (e.g., `alias.engine.ts`).
2. Define clear interfaces for alias registration, lookup, and collision reporting.
3. Refactor the main engine and plugin system to use the new module’s APIs.
4. Add/expand unit tests for alias resolution, collision handling, and rebinding.
5. Document the new module’s API and update internal references.

**Risks & Mitigations:**
- Risk: Incorrect alias resolution or missed collisions. Mitigation: Add focused unit tests and regression tests.
- Risk: Integration issues with plugin/event/period systems. Mitigation: Incremental refactor and thorough testing.

**Expected Improvements:**
- Cleaner separation of concerns for alias logic.
- Easier to extend and maintain event/period handling.
- Improved testability and reliability of alias resolution.

### Guard Builder Extraction (`engine.guard.ts`)
**Purpose:**
Provides a high-performance scanner for fast-fail validation of layout strings before full regex parsing, ensuring that only plausible input enters the expensive parsing loop.

**Boundaries & Responsibilities:**
- **Token Ingestion**: Owns the logic for ingesting registered aliases and symbols to build a master word list.
- **Scanning Logic**: Implements a greedy "consume and continue" scanner that handles whitespace, bracketed content (literals), and longest-token matching.
- **Lifecycle Integration**: Synchronizes with `Tempo.init()` and registry reset events to rebuild the guard state dynamically.

**Public API:**
- `createMasterGuard(words: (string | symbol)[]): MasterGuard`: Factory for creating a scanner instance from a list of allowed words.
- `MasterGuard.test(input: string): boolean`: Predicate that returns `true` if the input is a valid combination of allowed tokens/characters.

**Implementation Notes:**
- Replaces the legacy inline regex-based guard with a dedicated scanner that correctly handles greedy longest-match priorities (e.g., matching "january" as a single token rather than "jan" + "uary").
- Hardened to reject whitespace-only or empty strings via internal `matchedAny` tracking.

### Parse Result Normalizer Extraction (`engine.normalizer.ts`)
**Purpose:**
Centralizes the logic for accumulating raw regex matches and normalizing them into structured `MatchResult` objects, decoupling match-shaping from the core parsing loop.

**Boundaries & Responsibilities:**
- **Match Normalization**: Maps raw `RegExpExecArray` capture groups back to their original alias keys and values.
- **Result Accumulation**: Manages the persistent list of results, ensuring that duplicate or overlapping segments are handled consistently.
- **Contextual Resolution**: Provides a hardened "shadow" context for resolving function-based aliases (e.g. `today`) without triggering infinite recursion.

**Public API:**
- `normalizeMatch(match: RegExpExecArray, anchor: ZonedDateTime, context: NormalizerContext): MatchResult`: Transforms a raw regex match into a shaped result object.
- `accumulateResult(result: MatchResult, registry: MatchResult[]): void`: Utility for merging new results into the existing parsing state.

**Implementation Notes:**
- Includes a spec-resilient `toNow()` implementation that handles V8 harmony property drift.
- Decouples alias resolution from the main `Tempo` class state, allowing the normalizer to work safely during the bootstrap and parsing phases.
