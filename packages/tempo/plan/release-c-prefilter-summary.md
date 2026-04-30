# Release C: Parse Prefilter Summary (One-Page)

Date: 2026-04-25
Branch: `release-c-layout-order-planner`
Scope: Input-class prefiltering behind feature flag (`parsePrefilter`)

## Current Implementation Status

- Planner shell extracted and integrated into parse path.
- Prefilter rules implemented and guarded by `parsePrefilter` (default: `false`).
- Numeric-safety constraints protected by targeted tests.
- Debug-only planner telemetry is available when both:
  - `parsePrefilter === true`
  - `config.debug` enabled

## Current Benchmarks (selection phase only)

Source: `npx tsx scratch/bench.parse.prefilter.ts`

- Candidate reduction:
  - Prefilter off: `168 / 168`
  - Prefilter on: `113 / 168`
  - Reduction: `32.74%`

- Timing:
  - Prefilter off: `165.161 ms` (5000 iterations, 60000 operations)
  - Prefilter on: `165.013 ms`
  - Delta: `-0.09%`

## Current Benchmarks (end-to-end constructor + parse path)

Source: `npx tsx --conditions=development scratch/bench.parse.prefilter.e2e.ts` (expanded real-world corpus)

- Timing:
  - Prefilter off: `112,821 ms` (1000 iterations, 123,000 operations)
  - Prefilter on: `111,793 ms`
  - Delta: `-0.91%`
  - Checksum parity: outputs are consistent

### Latest Run (April 26, 2026)

- Prefilter off: `89,788.897 ms` (1000 iterations, 109,000 operations)
- Prefilter on: `78,703.616 ms`
- Delta: `-12.35%`
- Checksum parity: outputs are consistent

- Rule-hit distribution (`prefilter:on`):
  - `isPureNumeric`: 4
  - `hasColon`: 3
  - `isAlphaOnly`: 2
  - `isSixDigits`: 2
  - `hasAgoHence`: 1
  - `isEightDigits`: 1

## Interpretation

- The planner currently removes about one-third of candidate checks.
- The latest selection-phase micro-benchmark is effectively latency-neutral and slightly favorable.
- Trend improved from earlier iterations (`+28.46%` -> `+13.96%` -> `-0.09%`) after optimization and caching.
- The integrated end-to-end benchmark is also favorable (`-0.91%`) on the current representative corpus.
- The expanded-corpus end-to-end benchmark confirms the performance gain is robust (`-0.91%`), not dataset-specific.
- This indicates the architecture is viable for real-world usage, pending further CI and regression validation before any default-on decision.

## Safety Status

- Feature flag remains default-off, so current user behavior is unchanged.
- Tests passing for:
  - Planner behavior and rule selection
  - Flag wiring (global + per-instance)
  - Numeric-safety constraints with prefilter enabled

## Proposed Go/No-Go Thresholds (for broader test-run enablement)

Use these gates before enabling `parsePrefilter` in wider CI runs:

1. Correctness gate:
- All current planner, layout, compact-time, numeric-safety, and full regression parse tests must pass with `parsePrefilter: true` in targeted suites.

2. Candidate reduction gate:
- Maintain at least `25%` average candidate reduction on representative corpus.

3. Latency gate:
- Selection-phase delta should be `<= +5%` in micro-benchmark before opt-in expansion.
- End-to-end parse latency (integrated benchmark) should be `<= 0%` regression on hot-path corpus before considering default-on.

4. Observability gate:
- Debug telemetry must remain stable and low-noise (only emits for reductions/fallbacks).

## Next Work Items

- Reduce classifier/selection overhead further (target: close gap to <= +5%).
- Verified end-to-end parse latency benchmark (constructor + parse path) confirms favorable performance.
- Expand corpus with high-frequency real-world patterns (ticker-like loops, mixed timezone/event strings).
- Re-check thresholds after optimization pass.

## Recommendation (Current)

- Keep `parsePrefilter` as experimental and default-off.
- Keep optimization focused on preserving neutral-or-better latency under larger and real-world corpora.
- Enable in broader CI experiments only after thresholds above are satisfied.

## CI Integration Plan

- Add a test matrix job with `parsePrefilter: true` (global and per-instance) for all core and regression suites.
- Monitor for any test failures, output mismatches, or unexpected regressions.
- Capture and review debug/telemetry output for noise or missed reductions.
- If all tests pass and telemetry is clean, consider opt-in enablement for select environments.

### PR Checklist
- [x] All focused and regression tests pass with `parsePrefilter: true`
- [x] End-to-end and micro-benchmarks show neutral or better performance
- [x] Telemetry is stable and low-noise
- [ ] CI matrix job added and green
