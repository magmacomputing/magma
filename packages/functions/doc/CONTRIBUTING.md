# Contributing to `functions`

Welcome to `@magmacomputing/functions`! We are thrilled that you want to contribute to the ecosystem. 

This library acts as a granular, tree-shakeable collection of utility functions designed to make working with dates easier for the modern web. Our goal is to provide a seamless bridge for users migrating from legacy tools (like Moment.js or `date-fns`), introducing them to the raw power of the Temporal API and the `@magmacomputing/tempo` ecosystem.

To maintain our high standards, please adhere to the following guidance when submitting a Pull Request.

---

## 1. The Dual Architecture Strategy

We categorize utility functions into two distinct buckets. You must determine which bucket your function falls into before writing it.

### A. Temporal-Only Functions
These functions rely strictly on standard date calculations and duck-typing native properties (like `.day`, `.month`, `.year`). 
- **Requirement**: They MUST accept raw `Temporal` primitives (or a polymorphic duck-typed interface) alongside `Tempo` instances.
- **Why?**: This allows standard `Temporal` API users to download and use `functions` *without* being forced to adopt `Tempo`.
- **Example**: `isFirstDayOfMonth(input: TemporalLike | Tempo)` simply checks `input.day === 1`, which natively works for both objects!

### B. Tempo-Enhanced Functions
These functions perform complex business intelligence calculations (like fiscal quarters, astrological seasons) and **require** the internal `Tempo` Terms engine.
- **Requirement**: They MUST type their arguments strictly as `Tempo` objects.
- **Why?**: This showcases the true power of `Tempo`. Users who need advanced business logic will quickly realize they need `Tempo` to drive it.
- **Example**: `isSameFiscalQuarter(date1: Tempo, date2: Tempo)` which relies on the `quarter` Term and comparing exact nanosecond `epoch.ns` bounds.

---

## 2. No Polyfills Provided

**CRITICAL RULE**: `functions` is a pure utility library. **We do not bundle or provide a Temporal polyfill.**

- It is the **consumer's responsibility** to ensure their environment supports Temporal natively (Node 26+, modern browsers) or to provide their own polyfill (like `@js-temporal/polyfill`).
- Do not add any polyfills to `dependencies` in `package.json`. 
- (We only use the polyfill in `devDependencies` strictly for running our internal `vitest` suite).

---

## 3. Pull Request Process & Structure

When submitting a PR for a new function, you must include three things: the Source, the Test, and the Doc update.

1. **Source** (`src/[functionName].ts`):
   - Export your single function.
   - Do not use default exports.
   - Keep it 100% pure and tree-shakeable.
   - Update `src/index.ts` to export your new function.

2. **Test** (`test/[functionName].test.ts`):
   - Every function MUST have 100% test coverage.
   - Test against raw `Temporal` objects (if applicable) AND `Tempo` objects.
   - Handle edge cases (leap years, DST shifts, hemisphere differences if using Terms).

3. **Documentation** (`doc/README.md`):
   - Provide a quick code snippet in the package README showcasing how to import and use your new function.

Once your files are structured correctly, submit a PR to the `magma` monorepo! Please ensure you run the tests and linter locally before submitting, as our automated CI pipeline is not yet available for this initial release.
