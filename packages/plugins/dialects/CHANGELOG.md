# Changelog

All notable changes to `@magmacomputing/tempo-plugin-dialects` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-10-14

### Added
- **Direct Dialect-to-Dialect Conversion (`convertDialect`)**:
  - Added `convertDialect(mask, { from, to })`, `convertDialect(mask, from, to)`, and `convertDialect(mask, to)` with automatic source dialect detection.
  - Mounted onto instance (`t.dialects.convert`) and static namespace (`Tempo.dialects.convert`).
  - Returns structured `ConvertResult` tracking source, target, converted pattern, and any unmappable tokens.
- **Unified Options Object Signatures**:
  - Added `{ dialect }` and `{ from, to }` options overloads to `explain(mask, options)`, `exportDialect(pattern, options)`, and `convertDialect(mask, options)`.
  - Exported `ConvertOptions`, `ExplainOptions`, and `ExportOptions` interfaces.
- **Automatic Dialect Inference in Parsing**:
  - `Tempo.fromFormat()`, `Tempo.fromFormats()`, and `Tempo.dialects.fromFormats()` automatically infer the dialect using `detectDialect(mask)` when omitted.
  - Exported `detectDialect` helper from the package entry point.
- **Extended Token Transpilation & Dialect Gap Closures (Phases 2, 3 & 4)**:
  - Full explain, export, and cross-dialect conversion for Phase 4 specialized tokens:
    - Oracle `J` ↔ `{jj}` (astronomic Julian day).
    - Oracle `SSSSS` / `FMSSSSS` ↔ `{ss:day:5}` / `{ss:day:raw}` (seconds past midnight).
    - Oracle `WW` / `FMWW` ↔ `{woy:cal}` / `{woy:cal:raw}` (calendar week starting Jan 1).
    - Oracle `W` / `FMW` & Unicode LDML `W` ↔ `{wom}` (week of month).
    - PHP `t` ↔ `{dim}` (days in month).
    - PHP `z` ↔ `{dd:year:raw:0}` (0-indexed day of year).
    - POSIX `%C` ↔ `{cen}` (century).
    - POSIX `%w` ↔ `{dow:0}` (0-indexed weekday with Sunday as 0).
  - Full reverse export mappings for numeric tail slicing (`{yow:short}`, `{yow:-2}`, `{yow:-3}`, `{yyyy:-3}`, `{yyyy:-1}`) and space padding (`{dd:space}`, `{doy:space}`, `{hh:space}`, `{h12:space}`).
  - Full explain and export mappings for granular timezone offsets: `{tz:offset:hh}` (Oracle `TZH`, Go `-07`), `{tz:offset:mi}` (Oracle `TZM`), `{tz:offset:ss}` / `{tz:offsetcompact:ss}` (Go `-07:00:00`, `-070000`), and UTC `Z` indicators `{tz:offset:z}` / `{tz:offsetcompact:z}` (Go `Z07:00`, `Z0700`, `Z07`, `Z07:00:00`, `Z070000`).
- **Oracle / SQL TO_CHAR Format Dialect**:
  - Full support for Oracle, PostgreSQL, Snowflake, and AWS Redshift date/time format models (`TO_CHAR`, `TO_DATE`, `TO_TIMESTAMP`).
  - Added `DIALECT.Oracle = 'oracle'` to `DIALECT` enum.
  - Added ecosystem aliases in `DIALECT_ALIAS`: `'sql'`, `'postgres'`, `'postgresql'`, `'snowflake'`, `'redshift'`, `'to_char'`, and `'tochar'`.
  - Added dedicated instance helpers `t.dialects.oracle(mask)` and `t.dialects.sql(mask)`.
  - Added `formatOracle` and `parseOracle` compiler engines with high-performance closure compilation and `WeakCache` memoization.
  - Comprehensive token support:
    - **Year**: `YYYY`, `RRRR` (with 2-digit pivot), `YYY`, `YY`, `RR`, `Y`, `IYYY` (ISO week-numbering year), `IYY`, `IY`, `I`.
    - **Month**: `MM` (zero-padded), `MONTH` / `Month` / `month` (case-preserving full names), `MON` / `Mon` / `mon` (case-preserving abbreviations), and `RM` / `rm` (Roman numerals).
    - **Day**: `DD`, `DDD` (day of year), `DAY` / `Day` / `day`, `DY` / `Dy` / `dy`, `D` (day of week), `J` (Julian day).
    - **Time**: `HH24` (24-hour), `HH12` / `HH` (12-hour), `MI` (minutes), `SS` (seconds), `SSSSS` (seconds past midnight).
    - **Subseconds**: `FF` and `FF1`-`FF9` (nanosecond-precision fractional seconds).
    - **Meridiem**: `AM` / `PM`, `am` / `pm`, `A.M.` / `P.M.`, `a.m.` / `p.m.`.
    - **Week & Quarter**: `IW` (ISO week), `WW` (week of year), `W` (week of month), `Q` (quarter).
    - **Timezone**: `TZH:TZM`, `TZH`, `TZM`, `TZR`, `TZD`, `OF`.
    - **Modifiers & Literals**: `FM` (Fill Mode unpadded suppression), `FX` (format exact), and `"..."` double-quoted literal text preservation.
  - Enhanced `explain(mask, dialect)` with Oracle format translation to native Tempo `{token}` masks.

## [1.0.3] - 2026-10-03

### Changed
- **Tempo 4.5.0 Compatibility**:
  - Updated peer and development dependencies to require `@magmacomputing/tempo` `^4.5.0`.
  - Refactored month parsing in `ldml.compiler.ts` and `strftime.compiler.ts` to utilize the safe `enums.MONTH.get()` registry API without unsafe type assertions.

## [1.0.2] - 2026-09-29

### Changed & Performance
- **WeakCache Memoization**:
  - Upgraded `FORMAT_CACHE` and `PARSE_REGEX_CACHE` in `ldml.compiler.ts` to `WeakCache<string, FormatterFn>` and `WeakCache<string, RegExp>`.
  - Upgraded `STRFTIME_FORMAT_CACHE` and `STRFTIME_PARSE_CACHE` in `strftime.compiler.ts` to `WeakCache`.
  - Dynamically compiled format builder functions and parser regular expressions are now auto-pruned upon garbage collection, eliminating memory leaks when formatting or parsing ad-hoc and custom format strings.

## [1.0.0] - 2026-09-20

### Added
- Initial GA release of `@magmacomputing/tempo-plugin-dialects`.
- Support for **Unicode LDML / UTS #35** format masks (`yyyy-MM-dd HH:mm:ss.SSS`, `dd LLL yyyy`, etc.).
- Support for **POSIX `strftime`** format specifiers (`%Y-%m-%d %H:%M:%S`, `%B %d, %Y`, etc.).
- Support for **Moment.js / Day.js** format patterns (`YYYY-MM-DD`).
- Added `t.dialects` namespace providing `t.dialects.ldml()`, `t.dialects.strftime()`, and `t.dialects.format()`.
- Added `Tempo.dialects` static tools (`Tempo.dialects.parse()`, `Tempo.dialects.fromFormats()`).
- Added drop-in migration shims `t.toFormat()` and `Tempo.fromFormat()`.
- Zero-boilerplate auto-installation via `@magmacomputing/tempo-plugin-dialects/install`.
