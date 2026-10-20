<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-dialects</a>
</div>

<br>

# Token Specification & Cross-Ecosystem Matrix

This document provides a comprehensive cross-reference matrix comparing date formatting and parsing tokens across **Native Tempo Core** and nine major ecosystem dialects:
* **Unicode LDML / UTS #35** (`ldml` – date-fns, Luxon, CLDR)
* **Moment.js / Day.js** (`moment` – Day.js, Moment)
* **POSIX `strftime`** (`strftime` – C, Python `datetime`, Ruby, Linux)
* **.NET / C#** (`dotnet` – C#, PowerShell, ASP.NET)
* **Excel / Google Sheets** (`sheet` – Spreadsheets, Calc)
* **MySQL / MariaDB** (`mysql` – `DATE_FORMAT`, `STR_TO_DATE`)
* **Oracle / PostgreSQL** (`oracle` – `TO_CHAR`, `TO_DATE`, Snowflake)
* **PHP `date()`** (`php` – Laravel, WordPress, Symfony)
* **Go `time.Format`** (`go` – Golang reference layouts)

---

## 1. Interactive Dialect Token Navigator

Select a dialect tab below to view all supported specifiers, their Native Tempo equivalents, copyable tags, and live code examples. Use the filter bar to quickly locate tokens by keyword (e.g., `year`, `hour`, `ord`, `fractional`, `timezone`).

<DialectTabs />

---

## 2. Core Standards Comparison Matrix

For a high-level overview across the most common date-formatting paradigms, the table below highlights primary date and time components compared to Native Tempo:

| Component | Description | LDML / date-fns | Moment / Day.js | POSIX `strftime` | .NET / C# | Native Tempo |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Year (4-digit)** | 4-digit calendar year (`2026`) | `yyyy` | `YYYY` | `%Y` | `yyyy` | `{yyyy}` |
| **Year (2-digit)** | 2-digit calendar year (`26`) | `yy` | `YY` | `%y` | `yy` | `{yy}` |
| **Week-Numbering Year** | Week-numbering year (ISO via `%G` / `GGGG`; locale-dependent in LDML `YYYY`) | `YYYY`* | `GGGG` | `%G` | N/A | `{yow}` |
| **Month (padded)** | Zero-padded month (`01`–`12`) | `MM` | `MM` | `%m` | `MM` | `{mm}` |
| **Month (raw)** | Unpadded month (`1`–`12`) | `M` | `M` | `%-m`* | `M` | `{mm:raw}` |
| **Month Name (short)** | Abbreviated month (`Oct`) | `MMM` / `LLL` | `MMM` | `%b` | `MMM` | `{mmm}` |
| **Month Name (full)** | Full month name (`October`) | `MMMM` / `LLLL` | `MMMM` | `%B` | `MMMM` | `{mon}` |
| **Day (padded)** | Zero-padded day (`01`–`31`) | `dd` | `DD` | `%d` | `dd` | `{dd}` |
| **Day (raw)** | Unpadded day (`1`–`31`) | `d` | `D` | `%-d`* | `d` | `{dd:raw}` |
| **Day (ordinal)** | Ordinal suffix (`24th`) | N/A | `Do` | N/A | N/A | `{dd:ord}` |
| **Day of Year** | Day of year (`001`–`366`) | `DDD` | `DDDD` | `%j` | N/A | `{doy}` |
| **Week of Year** | Week number (`01`–`53`; ISO via `%V` / `WW`; locale-dependent in LDML `ww`) | `ww`* | `WW` | `%V` | N/A | `{woy}` |
| **Weekday (full)** | Full weekday (`Saturday`) | `EEEE` | `dddd` | `%A` | `dddd` | `{wkd}` |
| **Weekday (short)** | Abbreviated weekday (`Sat`) | `EEE` | `ddd` | `%a` | `ddd` | `{www}` |
| **Weekday (numeric)** | Numeric weekday (ISO 1=Mon..7=Sun via `%u`/`E`; locale-dependent 1-7 in LDML `e`/`c`) | `e` / `c`* | `E` | `%u` | N/A | `{dow}` |
| **Hour (24h padded)** | 24-hour clock (`00`–`23`) | `HH` | `HH` | `%H` | `HH` | `{hh}` |
| **Hour (24h raw)** | 24-hour clock unpadded (`0`–`23`) | `H` | `H` | `%-H`* | `H` | `{hh:raw}` |
| **Hour (12h padded)** | 12-hour clock (`01`–`12`) | `hh` | `hh` | `%I` | `hh` | `{h12}` |
| **Hour (12h raw)** | 12-hour clock unpadded (`1`–`12`) | `h` | `h` | `%-I`* | `h` | `{h12:raw}` |
| **Meridiem (upper)** | Uppercase indicator (`AM` / `PM`) | `aa` | `A` | `%p` | `tt` | `{mer:upper}` |
| **Minute (padded)** | Zero-padded minute (`00`–`59`) | `mm` | `mm` | `%M` | `mm` | `{mi}` |
| **Second (padded)** | Zero-padded second (`00`–`59`) | `ss` | `ss` | `%S` | `ss` | `{ss}` |
| **Milliseconds** | 3-digit fractional seconds (`123`) | `SSS` | `SSS` | `%3f`* | `fff` | `{ms}` |
| **Microseconds** | 6-digit fractional seconds (`123456`) | `SSSSSS` | `SSSSSS` | `%f`* | `ffffff` | `{ff:6}` |
| **Timezone Offset** | Fixed offset with colon (`+08:00`) | `ZZZZZ` / `XXX` | `Z` | N/A | `zzz` | `{tz:offset}` |
| **Timezone (Kind-based)** | Dynamic offset or Z based on `DateTime.Kind` | N/A | N/A | N/A | `K`* | `{tz:offset:utc}` |
| **Compact Offset** | Portable offset without colon (`+0800`) | `ZZ` | `ZZ` | `%z` | N/A | `{tz:offsetcompact}` |
| **Timezone Abbreviation** | Localized abbreviation (`CET`) | `z` | `z` | `%Z` | N/A | `{tz:short}` |
| **Unix Epoch** | Seconds since Unix epoch | N/A | `X` | `%s` | N/A | `{ts}` |

> [!NOTE]
> `*` **Standard Variations & Extensions**:
> - **LDML (`YYYY`, `ww`, `e`, `c`)**: In Unicode UTS #35, week-numbering year, week of year, and numeric day of week reflect territory/locale calendar conventions; deterministic ISO 8601 behavior requires explicit ISO settings.
> - **POSIX `strftime` (`%-m`, `%-H`, `%-I`, `%f`)**: Modifiers omitting padding (`%-`) are GNU/Linux extensions; `%z` is the POSIX portable standard for compact offsets. POSIX does not specify subseconds; `%f` is Python's 6-digit microsecond specifier, while `%3f`, `%6f`, and `%9f` are Tempo extensions.
> - **.NET `K`**: Unlike fixed-offset `zzz` (`+08:00`), `K` produces an offset for `DateTimeKind.Local`, `Z` for `DateTimeKind.Utc`, and an empty string for `DateTimeKind.Unspecified`.

---

## 3. Literal Text Escaping Rules

When embedding plain text inside masks, each dialect implements distinct escaping conventions:

### A. Unicode LDML & Luxon (`ldml`)
* Enclose text in **single quotes**: `'Date: ' yyyy-MM-dd`.
* To emit a literal single quote, use **two consecutive single quotes**: `''yyyy''` $\rightarrow$ `'2026'`.

```typescript
const str = t.format("'Report generated on' yyyy-MM-dd 'at' HH:mm", { dialect: 'ldml' });
// => "Report generated on 2026-10-24 at 15:30"
```

### B. Moment.js & Day.js (`moment`)
* Enclose text in **square brackets**: `[Report generated on] YYYY-MM-DD`.
* Bare characters outside tokens remain literal text.

```typescript
const str = t.format('[Invoice #] YYYY-MM-DD [due by] HH:mm', { dialect: 'moment' });
// => "Invoice # 2026-10-24 due by 15:30"
```

### C. POSIX `strftime` & MySQL (`strftime`, `mysql`)
* Characters not prefixed by `%` are treated as literal text.
* To emit a literal percent symbol, use `%%`: `%% %Y-%m-%d` $\rightarrow$ `% 2026-10-24`.

```typescript
const str = t.format('%% Processed at %Y-%m-%d %H:%M:%S %%', { dialect: 'strftime' });
// => "% Processed at 2026-10-24 15:30:45 %"
```

### D. .NET / C# (`dotnet`)
* Enclose text in single quotes `'text'` or double quotes `"text"`.
* Escape individual characters using a backslash `\`.

```typescript
const str = t.format("yyyy'-'MM'-'dd'T'HH':'mm':'ss'.'fff", { dialect: 'dotnet' });
// => "2026-10-24T15:30:45.123"
```

### E. Excel / Google Sheets (`sheet`)
* Enclose arbitrary strings in double quotes: `"Order Date: " yyyy-mm-dd`.
* Escape individual characters using backslash `\`.
* Formatting decorators like <code>_ </code> (space reservation) and <code>* </code> (fill character) are ignored in standard parsing/formatting.

```typescript
const str = t.format('"Total: $0.00 as of " mmmm d, yyyy', { dialect: 'sheet' });
// => "Total: $0.00 as of October 24, 2026"
```

### F. Native Tempo Core
* In Native Tempo syntax, tokens are enclosed in curly braces `{token}`. Everything outside braces is literal text by default.
* To emit a literal <code>&#123;</code> or <code>&#125;</code>, use <span v-pre><code>&#123;&#123;</code></span> or <span v-pre><code>&#125;&#125;</code></span>:

```typescript
const str = t.format('Total balance: ${0} as of {yyyy}-{mm}-{dd}', { dialect: null });
// => "Total balance: $0 as of 2026-10-24"
```

---

## 4. Ecosystem-Specific Nuances

### A. Context-Sensitive `mm` in Spreadsheets
In spreadsheet software (Excel, Google Sheets, Calc), the mask `m` or `mm` represents:
* **Minutes** when immediately preceded by an hour (`h` or `hh`) or immediately followed by a second (`s` or `ss`), such as `hh:mm:ss`.
* **Months** everywhere else, such as `yyyy-mm-dd` or `mm/dd/yyyy`.

Tempo's `sheet` dialect automatically inspects token neighbors during tokenization to guarantee accurate resolution without manual intervention.

### B. Standard .NET Single-Character Specifiers
In .NET, single-letter format strings expand into standard system patterns:
* `O` or `o`: Round-trip ISO-8601 (`yyyy-MM-ddTHH:mm:ss.fffffffK`)
* `s`: Sortable date/time (`yyyy-MM-ddTHH:mm:ss`)
* `u`: Universal sortable (`yyyy-MM-dd HH:mm:ssZ`)
* `r` or `R`: RFC 1123 (`ddd, dd MMM yyyy HH:mm:ss GMT`)
* `d` / `D`: Short / Long date
* `t` / `T`: Short / Long time

Tempo compiles these specifiers directly into optimal matching pipelines.

### C. Hour Normalization (`24:00` Midnight)
When parsing 24-hour clocks, differing standards support `00-23` (`HH`, `H`) and `01-24` (`kk`, `k`):
* In Unicode LDML and Moment, `kk` indicates hours from `01` to `24`. Hour `24:00` represents midnight at the close of day, which Temporal engines normalize to `00:00`.
* The Dialects parser safely normalizes `24:00` to hour `0`, while strictly rejecting out-of-range hours like `25:00` or `00:00` for `kk` tokens:

```typescript
const validMidnight = Tempo.fromFormat('2026-10-24 24:00', 'yyyy-MM-dd kk:mm');
console.log(validMidnight.hh); // 0 (normalized)

const invalidHour = Tempo.fromFormat('2026-10-24 25:00', 'yyyy-MM-dd kk:mm', { error: 'catch' });
console.log(invalidHour.isValid); // false
```
