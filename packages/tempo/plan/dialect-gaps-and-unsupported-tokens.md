# Dialect Gaps & Unsupported Tokens Resolution Plan

This document tracks all formatting, parsing, and migration gaps across `@magmacomputing/tempo-plugin-dialects` and the core `@magmacomputing/tempo` library, providing a roadmap and actionable checklist to incrementally eliminate "unsupported in Tempo" outcomes.

---

## 📋 Progress Summary

- [x] **Phase 1: Dialect Plugin Tightening (Immediate, Zero Core Changes)**
- [x] **Phase 2: Tempo Core Width Slicing & Numeric Modifiers**
- [ ] **Phase 3: Extended Timezone Offset Modifiers in Core**
- [ ] **Phase 4: Specialized Tokens, Calendrical Counters & Term Plugins**

---

## Phase 1: Dialect Plugin Tightening (Immediate, Zero Core Changes)

These improvements leverage features that Tempo *already* supports natively or require pattern-level macro/compound handling inside `tempo-plugin-dialects`.

- [x] **LDML `DDD` Day of Year**:
  - Add `DDD` to `LDML_EXPLAIN_MAP` mapping to `{doy}` ('Day of year (001-366)').
  - Update `LDML_TOKEN_REGEX` and `LDML_REGEX` to ensure `DDD` is matched ahead of `d`/`dd`.
- [x] **LDML `G` / `GGGG` Era**:
  - Add `G` ('AD/BC') → `{era}` and `GGGG` ('Anno Domini') → `{era:long}` in `LDML_EXPLAIN_MAP`.
  - Add `G` / `GGGG` to `LDML_REGEX` and `ldml.compiler.ts`.
- [x] **LDML `Do` Day with Ordinal**:
  - Add `Do` → `{dd:ord}` in `LDML_EXPLAIN_MAP` (already compiled in `ldml.compiler.ts`).
- [x] **PHP Compound Ordinal `jS` / `dS`**:
  - In `explain.ts` PHP parser, recognize `jS` and `dS` pairs as a single unit mapping to `{dd:ord}`.
  - When `S` appears without preceding day token, keep explanation noting standalone suffix.
- [x] **PHP `t` (Days in Month)**:
  - Add `t` to `PHP_EXPLAIN_MAP` (already implemented in `php.compiler.ts` returning `zdt.daysInMonth`).
- [x] **Export Alignment for ISO Week**:
  - In `TEMPO_TO_DIALECT_MAP` in `export.ts`, add `ldml: 'ww'` for `woy` (currently missing).
- [x] **Unit Tests & Token Documentation**:
  - Add test suites in `test/explain.test.ts` and `test/convert.test.ts` covering `DDD`, `G`/`GGGG`, `Do`, `jS`, and `t`.
  - Update `token-specification.md` and `migration-and-compatibility.md`.

---

## Phase 2: Tempo Core Width Slicing & Numeric Modifiers

Extending Tempo Core's numeric formatting capabilities in `packages/tempo/src/module/module.format.ts`.

- [x] **Negative-Number Tail Slicing (`{token:-N}`)**:
  - Distinguish positive and negative numeric modifiers with mathematical symmetry:
    - **Positive (`+N`)**: Minimum zero-padding width (`padStart(N, '0')`). Fully backward compatible (e.g. `{yyyy:6}` → `"002026"`, `{dd:3}` → `"024"`).
    - **Negative (`-N`)**: Slice the last $N$ characters from the right (`slice(-N)`):
      - `{yyyy:-3}` → Last 3 digits of calendar year (resolves Oracle `YYY`).
      - `{yyyy:-1}` → Last digit of calendar year (resolves Oracle `Y`).
      - `{yow:-3}` → Last 3 digits of ISO week year (resolves Oracle `IYY`).
      - `{yow:-2}` → 2-digit ISO week year (resolves Oracle `IY`, Strftime `%g`, LDML `YY`, Moment `gg`/`GG`). Also support `{yow:short}` as a semantic alias.
      - `{yow:-1}` → Last digit of ISO week year (resolves Oracle `I`).
    - **Fractional Seconds (`{ff:N}`)**: Retains its standard left-to-right precision slicing (`slice(0, width)`). Completely non-breaking for existing `{ff:3}`, `{ff:6}`, etc.
  - Wire corresponding mappings in `explain.ts` and `export.ts`.
- [x] **Numeric Space-Padding Modifier (`:space`)**:
  - Extend numeric formatting in `module.format.ts` to support space padding when combined with width (e.g. `padStart(width, ' ')`):
    - `{dd:2:space}` → Space-padded day of month ` 1`–`31` (resolves Go `_2`, Strftime `%e`).
    - `{doy:3:space}` → Space-padded day of year `  1`–`366` (resolves Go `__2`).
    - `{hh:2:space}` → Space-padded 24-hour ` 0`–`23` (resolves Strftime `%k`).
    - `{h12:2:space}` → Space-padded 12-hour ` 1`–`12` (resolves Strftime `%l`).

---

## Phase 3: Extended Timezone Offset Modifiers in Core

Expanding `{tz:...}` modifiers in `packages/tempo/src/module/module.format.ts` to represent granular offset components.

- [x] **Timezone Offset Hours & Minutes**:
  - `{tz:offset:hh}` / `{tz:offset:hour}` → Hour component with sign (e.g. `+08`, `-05`) (resolves Oracle `TZH`, Go `-07`).
  - `{tz:offset:mi}` (and alias `:min`) → Minutes component without sign (e.g. `00`, `30`) (resolves Oracle `TZM`).
- [x] **Timezone Offset with Seconds**:
  - `{tz:offset:ss}` (and alias `:sec`) → `+08:00:00` or `{tz:offsetcompact:ss}` → `+080000` (resolves Go `-070000`, `Z070000`).
- [x] **UTC `Z` Offset Indicator**:
  - `{tz:offset:z}` → Emits `Z` if UTC (`+00:00`), else ISO offset `+08:00`.
  - `{tz:offsetcompact:z}` → Emits `Z` if UTC, else compact offset `+0800` (resolves Go `Z07:00`, `Z0700`, `Z07`).

---

## Phase 4: Specialized Tokens, Calendrical Counters & Term Plugins

Addressing niche domain, astronomical, and non-ISO calendar counters.

- [x] **Astronomical Julian Day (`J`) vs Day of Year (`dd:year`)**:
  - **Astronomical Julian Day (Oracle `J`)**: Implement `{jj}` (canonical 2-letter, alias `{julian}`) returning continuous 7-digit day count since 4713 BC (`2461331` for 2026-10-17).
  - **Scoped Day of Year (`{dd:year}`)**: Support `{dd:year}` as a scoped alias for `{doy}` (`1`–`366`), resolving the colloquial mainframe "Julian date" (e.g. `YYYYDDD`) and unlocking scope symmetry alongside `{mm:year}` (`1`–`12`).
- [x] **Cumulative Seconds Past Midnight (`SSSSS`) & Unit Scopes**:
  - Implement `{ss:day}` (canonical, resolves Oracle `SSSSS`, range `0`–`86399`). (Omit `{sod}`).
  - Unlocks dimensional time-scope modifiers: `{mi:day}` (minute of day `0`–`1439`), `{ms:day}`, `{ns:day}`, and `{hh:week}` (hour of week `0`–`167`).
- [x] **Calendar Week Starting Jan 1 (Oracle `WW`) & Week of Month (`W`)**:
  - Implement `{woy:cal}` (`Math.ceil(doy / 7)`, range `01`–`53`, resolves Oracle `WW`).
  - Proactively mark `{woy:cal}` in v4 docs/TSdoc as `@deprecated Will be superseded by {ww} in v5.0.0 (where {ww} transitions from ISO week to Jan 1 calendar week)`.
  - Implement `{wom}` (Week of Month `1`–`5`, `Math.ceil(day / 7)`, resolves Oracle `W`, LDML `W`).
- [x] **Generalized Zero-Indexed Modifier (`:zero` canonical, `:0` alias)**:
  - Promote `:zero` as canonical semantic modifier with `:0` as compact shorthand.
  - Applicable across 1-based numeric counters without colliding with width padding:
    - `{doy:zero}` / `{doy:0}` (and `{dd:year:zero}`) → `000`–`365` (or `{doy:raw:0}` → `0`–`365`, resolves PHP `z`).
    - `{dow:zero}` / `{dow:0}` → `0`–`6` with Sunday = 0 (`zdt.dayOfWeek % 7`, resolves POSIX `%w`, JavaScript `Date.getDay()` parity).
    - `{mm:zero}` / `{mm:0}` → `00`–`11` (or `{mm:raw:0}` → `0`–`11`, resolves JavaScript `Date.getMonth()` parity).
    - `{qtr:zero}` / `{qtr:0}` → `0`–`3` (zero-indexed quarters).
    - `{woy:zero}` / `{woy:0}` → `00`–`52` (zero-indexed ISO week of year).
- [x] **Days in Month (`{dim}`, PHP `t`)**:
  - Implement `{dim}` in `module.format.ts` (evaluating `zdt.daysInMonth` → `28`–`31`, resolves PHP `t`).
  - Keep `t.zdt.daysInMonth` as the recommended TypeScript getter (with optional `t.dim` convenience alias).
- [x] **Century (`%C`) vs Age**:
  - Evaluate `{cen}` / `{century}` (`Math.floor(year / 100)` → `20` for `2026`, resolves POSIX `%C`).
  - (Reserve `{age}` for elapsed duration from anchor/birthdate).
