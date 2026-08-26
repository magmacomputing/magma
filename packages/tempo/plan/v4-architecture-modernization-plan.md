# Tempo v4.0.0 Architecture Modernization & Breaking Changes Plan

This document outlines proposed API rationalizations, option parsing standardizations, and internal refactorings for **Tempo v4.0.0**. Since v4.0.0 permits breaking changes, this is the optimal window to retire legacy aliases, eliminate mixed option parsing patterns, and modernize core internal abstractions.

---

## Executive Summary

Over successive minor releases, `Tempo` has accumulated redundant method aliases, dual-type option overloads, and mixed internal dispatch methodologies. This plan proposes five targeted modernization tracks:

1. **API Surface Rationalization**: Deprecate/retire redundant method aliases (`sub`, `minus`, `plus`).
2. **Options Schema Standardization**: Standardize option naming (`timestamp` casing, `monthDay` object vs boolean overload).
3. **Error & Logging Matrix Unification**: Consolidate `catch`, `silent`, and `debug` flags into a coherent configuration contract.
4. **Context & Scope Modernization**: Promote scoped context creation (`Tempo.createContext()` / `Tempo.configure()`) over implicit global state mutation (`Tempo.init()`).
5. **Internal Private Field Migration**: Migrate legacy internal Symbol dispatchers (`$setConfig`, `$setDiscovery`) to native ES `#private` methods.

---

## Proposed Changes

### Track 1: API Surface Rationalization (Method Aliases)

#### [MODIFY] [tempo.class.ts](file:///home/michael/Project/magma/packages/tempo/src/tempo.class.ts) & [module.mutate.ts](file:///home/michael/Project/magma/packages/tempo/src/module/module.mutate.ts)
- **Primary API**: Standardize on `add()` and `subtract()`.
- **Deprecate / Prune**:
  - Mark `sub()`, `minus()`, and `plus()` as `@deprecated` (or prune them in v4.0.0) in favor of `subtract()` and `add()`.
  - Mark `toZdt()` as `@deprecated` in favor of `toDateTime()`.

---

### Track 2: Options Schema Standardization

#### [MODIFY] [tempo.type.ts](file:///home/michael/Project/magma/packages/tempo/src/tempo.type.ts) & [support.init.ts](file:///home/michael/Project/magma/packages/tempo/src/support/support.init.ts)
- **Timestamp Casing**:
  - Deprecate `timeStamp` in favor of standard camelCase `timestamp` (`'ss' | 'ms' | 'us' | 'ns'`). Provide a backward-compatible getter/normalizer during option ingestion.
- **Month-Day Order Overload**:
  - Replace dual-type `monthDay: boolean | MonthDay` with explicit properties:
    - `monthDayOrder: 'dmy' | 'mdy'` (for parsing order preference).
    - `monthDay: MonthDay` (for advanced regional/timezone layout mappings).

---

### Track 3: Error & Logging Matrix Unification

#### [MODIFY] [tempo.class.ts](file:///home/michael/Project/magma/packages/tempo/src/tempo.class.ts) & [support.init.ts](file:///home/michael/Project/magma/packages/tempo/src/support/support.init.ts)
- **Problem**: `catch: boolean`, `silent: boolean`, and `debug: DebugLevel` create conflicting state matrices (e.g. `catch: true`, `silent: false`, `debug: DebugLevel.Silent`).
- **Proposed Refactor**:
  - Consolidate error handling into a single `errorHandling` option or normalize `catch` and `silent` defaults under `debug` logging contracts.

---

### Track 4: Context & Scope Modernization

#### [MODIFY] [tempo.class.ts](file:///home/michael/Project/magma/packages/tempo/src/tempo.class.ts)
- **Problem**: `Tempo.init()` mutates shared global state, creating risk in multi-library ESM monorepos.
- **Proposed Refactor**:
  - Formally recommend `Tempo.configure()` or `Tempo.createContext()` for instance-isolated configurations.
  - Retain `Tempo.init()` for single-app bootstraps, but mark global mutation behaviors clearly in documentation.

---

### Track 5: Internal Private Field Migration (`#private`)

#### [MODIFY] [tempo.class.ts](file:///home/michael/Project/magma/packages/tempo/src/tempo.class.ts)
- **Refactor**:
  - Replace internal Symbol methods (`this[$setConfig]`, `this[$setDiscovery]`) with native TypeScript `#setConfig` and `#setDiscovery` private instance/static methods.
  - Reduces internal Symbol noise and improves debugger stack-trace readability.

---

## Verification & Testing Plan

1. **Automated Unit Tests**:
   - Run complete Vitest suite: `npm test`
   - Ensure all existing tests pass or are updated to reflect formal deprecation warnings.
2. **Type Safety**:
   - Run `npx tsc --noEmit` to verify type definition integrity.
