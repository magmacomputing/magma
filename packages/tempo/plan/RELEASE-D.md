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

### Guard Builder Extraction — Assessment Outline
**Purpose:**
Evaluate the value and feasibility of extracting all logic related to token ingestion and fast-fail guard rebuild lifecycle into a dedicated module.

**Boundaries & Responsibilities:**
- Would own the process of ingesting tokens and rebuilding fast-fail guards for parsing.
- Would expose APIs for guard construction, update, and validation.
- Should integrate with the main engine’s parse pipeline and pattern system.

**Assessment Steps:**
1. Identify all guard-building and token-ingestion logic in `tempo.class.ts` and helpers.
2. Determine if the logic is sufficiently complex or reused to justify extraction.
3. If justified, outline module boundaries and migration steps similar to previous extractions.
4. If not, document reasons for keeping logic inline.

**Risks & Mitigations:**
- Risk: Over-extraction of simple logic. Mitigation: Only extract if complexity or reuse warrants.
- Risk: Integration issues with parse pipeline. Mitigation: Careful interface design and incremental refactor.

**Expected Improvements (if extracted):**
- Cleaner separation of guard logic.
- Easier to test and update guard-building behavior.

### Parse Result Normalizer Extraction — Assessment Outline
**Purpose:**
Evaluate the value and feasibility of extracting all logic related to match accumulation and parse-result shaping/trace output into a dedicated module.

**Boundaries & Responsibilities:**
- Would own the process of normalizing parse results and shaping trace/debug output.
- Would expose APIs for result normalization and trace formatting.
- Should integrate with the main engine’s parse and debug systems.

**Assessment Steps:**
1. Identify all result normalization and trace output logic in `tempo.class.ts` and helpers.
2. Determine if the logic is sufficiently complex or reused to justify extraction.
3. If justified, outline module boundaries and migration steps similar to previous extractions.
4. If not, document reasons for keeping logic inline.

**Risks & Mitigations:**
- Risk: Over-extraction of simple logic. Mitigation: Only extract if complexity or reuse warrants.
- Risk: Integration issues with parse/trace systems. Mitigation: Careful interface design and incremental refactor.

**Expected Improvements (if extracted):**
- Cleaner separation of result normalization logic.
- Easier to test and update parse-result shaping and trace output.
