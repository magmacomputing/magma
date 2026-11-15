# ⚖️ Getter & Format Token Alignment Audit

A core ergonomic principle of Tempo is that extracting data programmatically via instance getters (`t.mm`, `t.dow`, `t.dim`) and interpolating data via `FormatModule` tokens (`t.format('{mm}')`, `t.format('{dow}')`, `t.format('{dim}')`) should align as closely as possible in both naming and semantics.

This document audits the current alignment between [`Tempo` instance getters](../../src/tempo.class.ts), [`FormatModule` tokens](../../src/module/module.format.ts), [`TempoFormatTokens`](../../src/tempo.type.ts#L257-L281), and [`Snippet` / `Token` parser building blocks](../../src/support/support.default.ts), cataloging:
1. **1:1 Aligned Getters & Tokens**
2. **Semantic & Behavioral Discrepancies** (where the same name exists in both places, but behaves differently)
3. **Getters Without a Corresponding Format Token**
4. **Format Tokens Without a Corresponding Getter**
5. **Format-Specific Features** (modifiers, scopes, and `#term` tokens that intentionally do not map to scalar getters)
6. **Parser Snippets & Layout Composition Alignment** (`Token` / `Snippet` / `Layout` vs. Getters & Format Tokens)
7. **Type Registry Alignment (`TempoFormatTokens`)**
8. **Recommendations for v5 Alignment**

---

## 1. 1:1 Aligned Getters & Format Tokens

The following properties exist on both `Tempo` (`t.<name>`) and `FormatModule` (`t.format('{<name>}')`). Numeric getters return a JavaScript `number` (or `bigint`), while their format token counterparts return strings (zero-padded by default for fixed-width calendar/clock units, or unpadded via `:raw`).

| Token / Getter | `t.<prop>` Return Type & Example | `t.format('{<prop>}')` Output | Alignment Status |
| :--- | :--- | :--- | :--- |
| **`yow`** | `number` (`2026`) | `'2026'` (4-digit padded) | ✅ Aligned |
| **`woy`** | `number` (`43`) | `'43'` (2-digit padded; `'43'` with `:raw`) | ✅ Aligned |
| **`mm`** | `number` (`1`–`12`, e.g. `10`) | `'10'` (2-digit padded; `'10'` with `:raw`) | ✅ Aligned |
| **`mon`** | `string` (`'October'`) | `'October'` | ✅ Aligned |
| **`mmm`** | `string` (`'Oct'`) | `'Oct'` | ✅ Aligned |
| **`dd`** | `number` (`1`–`31`, e.g. `24`) | `'24'` (2-digit padded; `'24'` with `:raw`) | ✅ Aligned |
| **`dow`** | `number` (`1`–`7` Mon–Sun, e.g. `6`) | `'6'` | ✅ Aligned |
| **`doy`** | `number` (`1`–`366`, e.g. `297`) | `'297'` (3-digit padded; `'297'` with `:raw`) | ✅ Aligned |
| **`wkd`** | `string` (`'Saturday'`) | `'Saturday'` | ✅ Aligned |
| **`www`** | `string` (`'Sat'`) | `'Sat'` | ✅ Aligned |
| **`dim`** | `number` (`28`–`31`, e.g. `31`) | `'31'` | ✅ Aligned |
| **`diy`** | `number` (`365`–`366`, e.g. `365`) | `'365'` | ✅ Aligned |
| **`jj`** | `number` (`2461338`) | `'2461338'` | ✅ Aligned |
| **`hh`** | `number` (`0`–`23`, e.g. `15`) | `'15'` (2-digit padded) | ✅ Aligned |
| **`mi`** | `number` (`0`–`59`, e.g. `30`) | `'30'` (2-digit padded) | ✅ Aligned |
| **`ss`** | `number` (`0`–`59`, e.g. `45`) | `'45'` (2-digit padded) | ✅ Aligned |
| **`ms`** | `number` (`0`–`999`, e.g. `123`) | `'123'` (3-digit padded) | ✅ Aligned |
| **`us`** | `number` (`0`–`999`, e.g. `456`) | `'456'` (3-digit padded) | ✅ Aligned |
| **`ns`** | `number` (`0`–`999`, e.g. `789`) | `'789'` (3-digit padded) | ✅ Aligned |
| **`tz`** | `string` (`'Australia/Sydney'`) | `'Australia/Sydney'` | ✅ Aligned |
| **`cal`** | `string` (`'iso8601'`) | `'iso8601'` | ✅ Aligned |

---

## 2. Semantic & Behavioral Discrepancies (Same Name, Different Behavior)

These properties share the exact same identifier on `t.<prop>` and `{<prop>}`, but return different representations or diverge under specific configurations:

### 2.1 `t.yy` (4-Digit Year) vs. `{yy}` (2-Digit Year) & `{yyyy}` (4-Digit Year)
* **Getter (`t.yy`)**: Returns the full **4-digit signed integer year** (`zdt.year`, e.g. `2026`). There is **no** `t.yyyy` getter on `Tempo`.
* **Token (`{yy}` vs. `{yyyy}`)**: `t.format('{yy}')` returns the **2-digit truncated year** (`pad(zdt.year % 100)`, e.g. `'26'`), whereas `t.format('{yyyy}')` and `t.format('{yy:long}')` return the 4-digit year (`'2026'`).
* **Impact**: A user who writes `t.yy` (`2026`) and then writes `t.format('{yy}')` expecting `'2026'` gets `'26'` instead; conversely, a user accustomed to `{yyyy}` who accesses `t.yyyy` gets `undefined`.
* **Resolution**: **Accepted & Documented.** Too much cross-ecosystem precedent expects `{yy}` to format 2-digit years (`'26'`), while `t.yy` must preserve the full year (`2026`) to avoid losing century data on numeric getters. Added `:long` support to `{yy}` (`{yy:long}` → `'2026'`, keeping `{yy:4}` as generic zero-fill padding `'0026'`) and documented the rationale in [`tempo.format.md`](../doc/2-core-concepts/tempo.format.md).

### 2.2 `t.ff` (Float `0.xxx`) vs. `{ff}` (9-Digit Sub-Second String)
* **Getter (`t.ff`)**: Returns a **floating-point number** between `0` and `1` (`0.123456789`), stripping trailing zeroes and prefixed with `0.`.
* **Token (`{ff}`)**: Returns the **9-character zero-padded fractional digits string** without a leading `0.` (`'123456789'`, designed to follow a literal decimal point as in `'{hh}:{mi}:{ss}.{ff}'`).
* **Resolution**: **Accepted & Documented.** `t.ff` intentionally returns a `[0, 1)` float for numeric/second math (e.g. `t.ss + t.ff`) without colliding with `t.ns` (`0–999`), while `{ff}` emits the 9-digit zero-padded string for literal decimal formatting (`{hh}:{mi}:{ss}.{ff}`). Documented in [`tempo.format.md`](../doc/2-core-concepts/tempo.format.md).

### 2.3 `t.era` / `t.eon` vs. `{era}` / `{eon}` on the Default `iso8601` Calendar
* **Getters (`t.era`, `t.eon`)**: Previously delegated directly to `zdt.era` and `zdt.eraYear`, which Temporal leaves as `undefined` on `iso8601`.
* **Tokens (`{era}`, `{eon}`)**:
  * `{era}` uses `Intl.DateTimeFormat` with `era: 'short'`, which coerces `iso8601` to Gregorian era labels (`'AD'` / `'BC'` in `en-US`, localized per locale).
  * `{eon}` falls back to `Math.abs(zdt.year <= 0 ? zdt.year - 1 : zdt.year)` when `zdt.eraYear` is `undefined`, returning `'2026'` even on `iso8601`.
* **Resolution**: **Resolved.** Aligned with *"Tempo humanizes Temporal"*: `t.era` now falls back to `'ce'` / `'bce'` on `iso8601` (`zdt.era ?? (zdt.year <= 0 ? 'bce' : 'ce')`), and `t.eon` uses the same positive-year fallback as `{eon}` (`zdt.eraYear ?? Math.abs(zdt.year <= 0 ? zdt.year - 1 : zdt.year)`). Callers needing raw Temporal `undefined` on `iso8601` can inspect `t.zdt.era` and `t.zdt.eraYear`. Meanwhile, `t.era` intentionally remains a canonical programmatic ID (`'ce'`/`'bce'`) while `{era}` renders locale-aware display labels via `Intl.DateTimeFormat`.

### 2.4 `t.ts` vs. `{ts}` When `timeStamp` Config Is `'us'` or `'ns'`
* **Getter (`t.ts`)**: Evaluates `this.epoch[(this.#local.config.timeStamp ?? 'ms')]`, supporting all four `TimeStamp` units (`'ss'`, `'ms'`, `'us'`, `'ns'`).
* **Token (`{ts}`)**: In [`module.format.ts`](../../src/module/module.format.ts#L503-L505), `{ts}` only checks `((config?.timeStamp ?? 'ms') === 'ss')` and otherwise always emits `zdt.epochMilliseconds.toString()`, ignoring `'us'` and `'ns'`.
* **Resolution**: **Resolved.** Updated `case 'ts':` in `module.format.ts` to support all four `TimeStamp` units (`'ss'`, `'ms'`, `'us'`, `'ns'`), matching `t.ts` and `t.epoch`.

### 2.5 `{iso}` and `{sphere}` in Standalone `format(zdt, ...)` vs. `t.format(...)`
* Both `iso` and `sphere` are listed in [`TempoFormatTokens`](../../src/tempo.type.ts#L266), and `t.iso` / `t.sphere` are first-class getters on `Tempo`.
* However, neither `case 'iso':` nor `case 'sphere':` is implemented in the `switch (token)` block of [`module.format.ts`](../../src/module/module.format.ts#L301-L509). Instead, they rely on the fallback property lookup `else if (isTempo(obj) && isSafeKey(token) && token in obj)` (line 543).
* **Impact**: `t.format('{iso}')` works on a `Tempo` instance, but calling the standalone `format(zdt, '{iso}')` with a native `Temporal.ZonedDateTime` or ISO string fails and returns the literal string `'{iso}'`.
* **Resolution**: **Resolved.** Added explicit `case 'iso':` and `case 'sphere':` branches in `module.format.ts` so standalone `format(zdt, ...)` and zero-argument format proxies resolve `{iso}` and `{sphere}` identically to `t.format(...)`.

---

## 3. `Tempo` Getters With No Corresponding Format Token

### 3.1 Scalar Getters Missing from `TempoFormatTokens`

| Getter | Return Type | Runtime `t.format('{...}')` Behavior | Compile-Time `ValidateFormat` Status |
| :--- | :--- | :--- | :--- |
| **`t.locale`** | `string` (`'en-US'`) | Resolves `'en-US'` on `Tempo` instances via the line 543 `token in obj` fallback (or via `{intl.locale}`), but fails on standalone `format(zdt, '{locale}')`. | ❌ Rejected by `TempoFormatTokens` (`❌ '{locale}' is not a valid Tempo format token`). |
| **`t.isValid`** | `boolean` | Invalid `Tempo` instances short-circuit `t.format(...)` to `''` before token replacement. | ❌ Not in `TempoFormatTokens` (intentionally a state check rather than a format token). |

### 3.2 Structured Namespace Getters (`t.epoch`, `t.intl`, `t.geo`, `t.fmt`)
`FormatModule` supports dot-delimited namespace resolution (`resolveNamespaceToken` in [`module.format.ts`](../../src/module/module.format.ts#L60-L80)) and `ValidateFormat` accepts any `${string}.${string}` token:

| Namespace Getter | Sub-Properties | Corresponding Format Token Syntax | Notes |
| :--- | :--- | :--- | :--- |
| **`t.epoch`** | `.ss`, `.ms`, `.us`, `.ns` | `{epoch.ss}`, `{epoch.ms}`, `{epoch.us}`, `{epoch.ns}` | Works on `Tempo` instances (`isTempo(obj)`), but fails on standalone `format(zdt, '{epoch.ms}')` because `zdt` has no `.epoch` namespace. |
| **`t.intl`** | `.info.firstDay`, `.info.weekend`, `.info.calendar`, `.locale`, etc. | `{intl.firstDay}`, `{intl.region}`, `{intl.hourCycle}`, `{intl.direction}`, `{intl.locale}` | Explicitly bridged in `module.format.ts` line 537 (`{intl.<prop>}` flattens `li` onto `intl`, so `{intl.firstDay}` and `{intl.info.firstDay}` both work). |
| **`t.geo`** | `.latitude`, `.longitude`, `.elevation`, `.sphere` | `{geo.latitude}`, `{geo.longitude}`, `{geo.elevation}`, `{geo.sphere}` | Works on `Tempo` instances; returns `''` if unconfigured. |
| **`t.fmt`** | Named presets from `Tempo.enums.FORMAT` (`display`, `weekDate`, `weekTime`, `weekStamp`, `dayMonth`, `dayDate`, `dayTime`, `logStamp`, `sortTime`, `yearWeek`, `yearMonth`, `yearMonthDay`, `date`, `time`) | Passed directly as format names: `t.format('weekDate')` (or `{fmt.weekDate}`) | **Documentation Note**: [`tempo.getters.md`](./tempo.getters.md#L97) currently states `t.fmt.yyyy → '2026'` and `t.fmt.wkd → 'Saturday'`, but `t.fmt` only resolves keys in `enums.FORMAT` and `config.registry.formats`—`t.fmt.yyyy` and `t.fmt.wkd` actually return `undefined`! |

### 3.3 Inspection, Lifecycle & Gateway Getters (Intentionally Non-Format)
The following getters expose internal state, parser ASTs, or native objects and intentionally do not correspond to format tokens:
* **`t.zdt`**: Underlying `Temporal.ZonedDateTime` gateway (though `{zdt.daysInYear}`, `{zdt.inLeapYear}`, `{zdt.monthCode}` work dynamically on `Tempo` instances via dot-namespace resolution!).
* **`t.config`**: Active configuration proxy.
* **`t.parse`**: Parser state and match AST (`.result`).
* **`t.terms`** / **`t.ranges`** / **`t.term`**: Term registry inspection and term delegator (bridged in `FormatModule` via `{#term}` syntax rather than `{terms}`).

---

## 4. `FormatModule` Tokens With No Corresponding `Tempo` Getter

The following tokens are defined in `FormatModule` and `TempoFormatTokens`, but have **no** `t.<token>` getter on `Tempo`:

### 4.1 Legacy v4 Getters Removed from `Tempo`, Retained as Tokens
| Format Token | Format Output | Getter Status in v5 | Alignment Question |
| :--- | :--- | :--- | :--- |
| **`{day}`** | Unpadded day of month (`'1'`–`'31'`, identical to `{dd:raw}`) | `t.day` was **removed** in v5 (replaced by `t.dd`). | Should `{day}` be deprecated/removed in favor of `{dd}` / `{dd:raw}`, or kept only as an internal parser token? |
| **`{nano}`** | Epoch nanoseconds (`'1792843200000000000'`) | `t.nano` was **removed** in v5 (replaced by `t.epoch.ns`). | `{nano}` is retained in `FormatModule` while `t.nano` was removed. |
| **`{ww}`** | Zero-padded Calendar Week of Year (`'01'`–`'53'`, Jan 1 basis) | `t.ww` was **removed** in v5 (where it previously meant ISO week, now `t.woy`). | `FormatModule` has `{ww}` for Jan-1 calendar week, but `Tempo` has no getter for calendar week (only `t.woy` for ISO week). |

### 4.2 Calendar & Clock Tokens Without Getters
| Format Token | Format Output | Closest `Tempo` Getter | Notes |
| :--- | :--- | :--- | :--- |
| **`{yyyy}`** | 4-digit zero-padded year (`'2026'`) | `t.yy` (`2026`) | See [Section 2.1](#21-tyy-4-digit-year-vs-yy-2-digit-year--yyyy-4-digit-year). |
| **`{cen}`**, **`{century}`** | 2-digit century (`'20'` for `2026`) | None (`Math.floor(t.yy / 100)`) | No `t.cen` getter on `Tempo`. |
| **`{wom}`** | 1-based week of month (`'1'`–`'5'`) | None (`Math.ceil(t.dd / 7)`) | No `t.wom` getter on `Tempo`. |
| **`{julian}`** | Astronomical Julian Day (`'2461338'`) | `t.jj` (`2461338`) | Long-form alias for `{jj}`; no `t.julian` getter. |
| **`{h24}`** | 2-digit 24h hour (`'00'`–`'23'`) | `t.hh` (`0`–`23`) | Synonym for `{hh}`; no `t.h24` getter. |
| **`{h12}`** | 2-digit 12h hour + auto-meridiem (`'03pm'`, or `'3'` with `{h12:raw}`) | None | Presentation-specific 12-hour clock token. |
| **`{mer}`** | Meridiem indicator (`'am'` / `'pm'`) | None | Presentation-specific meridiem token. |

### 4.3 Composite Shorthand Tokens Without Direct Getters
| Format Token | Format Output | Closest `Tempo` Equivalent |
| :--- | :--- | :--- |
| **`{ymd}`** | Compact `yyyymmdd` (`'20261024'`, or `'261024'` with `:short`) | `t.fmt.yearMonthDay` |
| **`{dmy}`** | Compact `ddmmyyyy` (`'24102026'`, or `'241026'` with `:short`) | None |
| **`{mdy}`** | Compact `mmddyyyy` (`'10242026'`, or `'102426'` with `:short`) | None |
| **`{hms}`** | Compact `hhmiss` (`'153045'`) | None |
| **`{time}`** | Colon-separated `hh:mi:ss` (`'15:30:45'`, or localized via `:locale`) | `t.fmt.time` |

---

## 5. `FormatModule` Features Independent of Scalar Getters

For completeness, `FormatModule` includes several formatting capabilities that are transformations or namespace bridges rather than 1:1 scalar getters:

1. **Term Tokens (`{#<term>}`)**:
   * `{#quarter}`, `{#season}`, `{#timeOfDay}` (and opt-in/plugin terms such as `{#zodiac}`, `{#eastern}`, `{#lunar}`) resolve against `t.term.<name>`, invoking any custom `TermHook.format` hook or extracting `.label ?? .key`.
2. **Dimensional Unit-Scope Modifiers (`:day`, `:week`, `:month`, `:year`, `:cal`)**:
   * Cumulative or scoped counters computed on the fly during formatting:
     * `{ss:day}` (`0`–`86399`), `{mi:day}` (`0`–`1439`), `{ms:day}`, `{ns:day}`
     * `{dd:week}` (`1`–`7`), `{hh:week}` (`0`–`167`), `{mi:week}`, `{ss:week}`
     * `{dd:year}` (`001`–`366`, alias for `{doy}`), `{ww:month}` / `{woy:month}` (alias for `{wom}`)
3. **Presentation & Localization Modifiers**:
   * `:raw`, `:ord` / `:nth`, `:roman`, `:lower`, `:upper`, `:title`, `:dots`, `:space`, `:zero` / `:0`, `:<width>` (padding and negative tail-slicing), `:locale`, `:short`, `:long`, `:compact`, `:offset` (`:hh`, `:mi`, `:ss`, `:utc`).

---

## 6. Parser Snippets & Layout Composition Alignment

Advanced developers compose custom `Layout` patterns using [`Snippet`](../../src/support/support.default.ts#L58-L83) keys defined in [`Token`](../../src/support/support.symbol.ts#L104-L154) (e.g. `'{yy}{sep}{mm}{sep}{dd}'`). Because snippets are regex building blocks used for **input parsing** rather than output formatting, most align with `FormatModule` tokens, though several show naming or structural drift across all three layers (Getter → Format Token → Snippet):

### 6.1 Three-Way Concept Comparison (Getter vs. Format Token vs. Snippet)

| Concept | Getter (`t.<prop>`) | Format Token (`{<token>}`) | Parser Snippet (`Token` / `Snippet`) | Alignment Status |
| :--- | :--- | :--- | :--- | :--- |
| **Year** | `t.yy` (4-digit int) | `{yyyy}` (4-digit) / `{yy}` (2-digit) | `{yy}` (`(?<yy>[0-9]{1,4})`) | ⚠️ Snippet `{yy}` matches 1–4 digits (like `t.yy`), while `{yy}` format is 2-digit only |
| **ISO Week-Year** | `t.yow` | `{yow}` | `Token.yw` (`Symbol('yw')`, unused in `Snippet`) | ❌ **3-way drift**: `Token.yw` vs. `yow` in getter & format |
| **Week of Year** | `t.woy` (ISO week; `t.ww` removed) | `{woy}` (ISO) / `{ww}` (Jan-1 calendar) | `{ww}` (`(?<ww>0?[1-9]\|[1-4][0-9]\|5[0-3])`) | ⚠️ Snippet uses `{ww}` (no `{woy}` snippet) |
| **Month** | `t.mm`, `t.mon`, `t.mmm` | `{mm}`, `{mon}`, `{mmm}` | `{mm}` (digits + English/localized names) | ✅ Aligned (`{mm}` covers names & numbers; `{mon}`/`{mmm}` not separate snippets) |
| **Day of Month** | `t.dd` | `{dd}` (`{day}` legacy alias) | `{dd}` (`3[01]\|...{ord}?`) | ✅ Aligned |
| **Weekday Name** | `t.wkd` (full), `t.www` (short) | `{wkd}` (full), `{www}` (short) | `{wkd}` (`Snippet[Token.wkd]`); `Token.www` exists in `Token` without a `Snippet` entry | ⚠️ `Token.www` is declared under Snippet Symbols while `Snippet` actually keys on `Token.wkd` (which lives under Layout Symbols) |
| **Day of Week / Year** | `t.dow`, `t.doy` | `{dow}`, `{doy}` | None (`{nth}` + `{unt}` in `Layout[Token.ordUnt]`) | ℹ️ No scalar snippet (parsed via ordinal-unit layout) |
| **Julian Day** | `t.jj` | `{jj}`, `{julian}` | None | ℹ️ **Not a parse snippet** (getter + dual format tokens only) |
| **Clock (`hh:mi:ss`)** | `t.hh`, `t.mi`, `t.ss` | `{hh}` / `{h24}`, `{mi}`, `{ss}` | `{hh}`, `{mi}`, `{ss}` (note `{mi}` & `{ss}` include leading `:`) | ✅ Aligned |
| **Sub-seconds** | `t.ff` (float `0.xxx`) | `{ff}` (9-digit string) | `{ff}` (`(\.(?<ff>[0-9]{1,9}))`) | ⚠️ Snippet `{ff}` aligns with format `{ff}` digits (plus `.`), not float `t.ff` |
| **Meridiem / Era** | None (`t.era` ISO-undefined) | `{mer}`, `{era}` | `{mer}`, `{era}` | ✅ Aligned between Format & Snippet |
| **Time Zone** | `t.tz` | `{tz}` | `{tz}` (offsets/abbrevs) + `{brk}` (`[Zone][Cal]`) | ✅ Aligned (`{brk}` handles bracketed IANA/calendar IDs) |
| **Roman Month / Year** | None | `{mm:roman}`, `{yyyy:roman}` | `{Rm}`, `{Ry}` | ⚠️ Distinct camel-abbrev snippet tokens vs. `:roman` format modifier |
| **Composite `dmy`/`mdy`/`ymd`** | `t.fmt.yearMonthDay` | `{dmy}`, `{mdy}`, `{ymd}` (always 8-digit compact) | `Layout`: `{dmy}`, `{mdy}`, `{ymd}` (delimited); `{dmy6}`, `{mdy6}`, `{ymd6}` (6-digit compact) | ⚠️ Same names mean 8-digit compact in Format vs. flexible delimited layouts in `Layout` |

### 6.2 Parser-Only Structural Snippets (No Getter / Format Counterpart)
The following [`Token`](../../src/support/support.symbol.ts#L115-L131) keys exist solely to compose regex `Layout`s and intentionally have no `Tempo` getter or `FormatModule` token:
* **`{sep}`** (input separators), **`{ord}`** (ordinal suffixes like `st`/`nd`/`ème`), **`{nth}`** (ordinal index like `1st`, `last`), **`{mod}`** (modifiers like `next`/`last`), **`{afx}`** (relative affixes like `ago`/`hence`), **`{nbr}`** (counts / number words), **`{unt}`** (unit names), **`{sfx}`** (time-pattern suffix `{tm}{tz}`), **`{slk}`** (slick shorthand), **`{evt}`** (events like `today`), and **`{per}`** (periods like `noon`).

---

## 7. Type Registry Alignment (`TempoFormatTokens`)

Compile-time format string validation (`ValidateFormat`) derives its core token set from [`TempoFormatTokens`](../../src/tempo.type.ts#L257-L281) (`44` scalar/composite keys, plus `:<modifier>`, `#<term>`, and `<namespace>.<prop>`). Comparing `TempoFormatTokens` against `FormatModule` and `Tempo` getters reveals three type-registry gaps:

| Token | In `Tempo` Getters? | In `FormatModule` `switch`? | In `TempoFormatTokens`? | Alignment Note |
| :--- | :--- | :--- | :--- | :--- |
| **`iso`** | ✅ `t.iso` | ❌ Fallback only (`isTempo`) | ✅ `iso: true` | Type-checked as valid everywhere, but fails in standalone `format(zdt, '{iso}')`. |
| **`sphere`** | ✅ `t.sphere` | ❌ Fallback only (`isTempo`) | ✅ `sphere: true` | Type-checked as valid everywhere, but fails in standalone `format(zdt, '{sphere}')`. |
| **`locale`** | ✅ `t.locale` | ❌ Fallback only (`isTempo`) | ❌ Missing | Works on `t.format('{locale}')` at runtime, but rejected by `ValidateFormat` (must use `{intl.locale}`). |

---

## 8. Summary of Actionable Alignment Candidates

If we want to tighten alignment between `t.<prop>` and `t.format('{<prop>}')` in upcoming v5 branches, the highest-value candidates are:

1. **Fix `{ts}` in `module.format.ts` to respect `'us'` and `'ns'` `timeStamp` configurations** so `t.ts` and `t.format('{ts}')` always return the exact same value.
2. **Add explicit `case 'iso':` and `case 'locale':` (and `case 'sphere':`) handlers in `module.format.ts`**, and add `locale: true` to `TempoFormatTokens`, so `{iso}`, `{sphere}`, and `{locale}` work both on `Tempo` instances and in standalone `format(zdt, ...)` calls with full TypeScript validation.
3. **Correct the `t.fmt` example in `tempo.getters.md`** (line 97) from `t.fmt.yyyy` / `t.fmt.wkd` to actual `Tempo.enums.FORMAT` keys (`t.fmt.date`, `t.fmt.display`, `t.fmt.logStamp`).
4. **~~Decide on `t.eon` / `t.era` fallback behavior on `iso8601`~~** *(Resolved in Section 2.3: `t.era` falls back to `'ce'`/`'bce'` and `t.eon` matches `{eon}`, while `t.zdt.era` / `t.zdt.eraYear` expose raw Temporal values.)*
5. **Evaluate whether `wom` / `cen` / `ww` warrant getters or should remain format-only.**
6. **Clean up `Token` snippet symbol drift in [`support.symbol.ts`](../../src/support/support.symbol.ts#L104-L154)**:
   * Rename or alias unused `Token.yw` → `Token.yow` (matching `t.yow` and `{yow}`), and reconcile `Token.www` (declared under Snippet Symbols, unused in `Snippet`) vs. `Token.wkd` (used in `Snippet`, declared under Layout Symbols).
