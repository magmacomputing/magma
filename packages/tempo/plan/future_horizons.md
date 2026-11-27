
## Future Horizons / Exploratory Proposals (Post-v5.0 GA)

For features and architectural investigations targeted beyond the initial v5.0 General Availability release, refer to active exploratory RFCs:

* **Optional Formatter & Semicolon Policy (`biome.json` / `.prettierrc`)** *(deferred; decide post-v5)*:
  - Evaluate whether to add a repository-wide formatter config (`semi: true`) and clean up remaining un-semicoloned files (e.g. VitePress theme files) without blocking the v5.0.0 release.

* **`Temporal`-Native / `Tempo`-Optional Term Evaluation** *(low-priority thought experiment)*:
  - Currently, a consumer wanting to evaluate a Term plugin (e.g. `QuarterTerm`) on a `Temporal.ZonedDateTime` can import `tempo-kit/core` to provide the lightweight `Tempo` wrapper mechanism without loading optional modules (`FormatModule`, `DurationModule`, `MutateModule`, `ParseModule`).
  - **Future exploration** (if standalone `Temporal.ZonedDateTime` in → `Temporal` out is ever desired):
    1. *Accept raw `ZonedDateTime` as `this`/anchor*: Replace `fallback.constructor` in term helpers such as `toIsoTempo` (`packages/plugins/.terms/src/term.quarter.ts`) with `getHost(fallback)`.
    2. *True `Tempo`-free `getTermRange` & `defineSpan`*: `defineSpan` already falls back to `Temporal.Duration` when `DurationModule` and `Host.duration` are absent; adding a `raw` / host-optional path in `getTermRange` (`packages/tempo/src/plugin/term/term.util.ts`) to return `Temporal.ZonedDateTime` directly for `span.start` / `span.end` (when no `Host` is present) would allow range-based terms to run purely on `Temporal` primitives.
