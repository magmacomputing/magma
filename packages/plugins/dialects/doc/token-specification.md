<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-dialects</a>
</div>

<br>

# Token Specification & Cross-Ecosystem Matrix

This document provides a comprehensive cross-reference matrix comparing date formatting and parsing tokens across **Native Tempo Core**, **Unicode LDML / UTS #35 (Luxon, date-fns)**, **Moment.js / Day.js**, and **POSIX `strftime` (C, Python, SQL)**.

---

## 1. Comprehensive Token Cross-Reference Matrix

| Category | Description | Unicode LDML / Luxon | Moment.js / Day.js | POSIX `strftime` | Native Tempo `{token}` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Year** | 4-digit calendar year (`2026`) | `yyyy` or `y` | `YYYY` | `%Y` | `{yyyy}` |
| | 2-digit calendar year (`26`) | `yy` | `YY` | `%y` | `{yy}` |
| | 4-digit ISO week-numbering year | `YYYY` | `GGGG` or `gggg` | `%G` | `{yw}` |
| | 2-digit ISO week-numbering year | `YY` | `GG` or `gg` | `%g` | `{yy}` (with week context) |
| **Month** | Zero-padded month (`01`-`12`) | `MM` or `LL` | `MM` | `%m` | `{mm}` |
| | Unpadded month (`1`-`12`) | `M` or `L` | `M` | `%-m` | `{mm:raw}` |
| | Month with ordinal suffix (`10th`) | N/A | `Mo` | N/A | `{mm:ord}` |
| | Short month name (`Oct`) | `MMM` or `LLL` | `MMM` | `%b` or `%h` | `{mmm}` |
| | Full month name (`October`) | `MMMM` or `LLLL` | `MMMM` | `%B` | `{mon}` |
| **Day of Month** | Zero-padded day (`01`-`31`) | `dd` | `DD` | `%d` | `{dd}` |
| | Unpadded day (`1`-`31`) | `d` | `D` | `%e` or `%-d` | `{dd:raw}` |
| | Day with ordinal suffix (`24th`) | N/A | `Do` | N/A | `{dd:ord}` |
| **Day of Year** | Day of year (`001`-`366`) | `DDD` | `DDDD` | `%j` | `{doy}` |
| | Unpadded day of year (`1`-`366`) | `D` | `DDD` | `%-j` | `{doy:raw}` |
| **Week of Year** | Zero-padded ISO week (`01`-`53`) | `ww` | `WW` | `%V` | `{wy}` |
| | Unpadded ISO week (`1`-`53`) | `w` | `W` | `%-V` | `{wy:raw}` |
| **Weekday** | Full weekday name (`Saturday`) | `EEEE` or `cccc` | `dddd` | `%A` | `{wkd}` |
| | Short weekday name (`Sat`) | `EEE` or `ccc` | `ddd` | `%a` | `{www}` |
| | 2-character weekday name (`Sa`) | N/A | `dd` | N/A | `{www}` (or slice) |
| | ISO Day of week (`1` = Mon ... `7` = Sun) | `c` or `e` | N/A | `%u` | `{dow}` |
| | POSIX Day of week (`0` = Sun ... `6` = Sat) | N/A | `d` | `%w` | `{dow}` (ISO adjusted) |
| **Hour (24h)** | Zero-padded 24-hour (`00`-`23`) | `HH` | `HH` | `%H` | `{hh}` |
| | Unpadded 24-hour (`0`-`23`) | `H` | `H` | `%k` or `%-H` | `{hh:raw}` |
| | Zero-padded 24-hour (`01`-`24`) | `kk` | `kk` | N/A | `{hh}` (normalized) |
| **Hour (12h)** | Zero-padded 12-hour (`01`-`12`) | `hh` | `hh` | `%I` | `{h12}` |
| | Unpadded 12-hour (`1`-`12`) | `h` | `h` | `%l` or `%-I` | `{h12:raw}` |
| **Meridiem** | Uppercase AM/PM (`AM` / `PM`) | `aa` or `a` | `A` | `%p` | `{mer:upper}` |
| | Lowercase am/pm (`am` / `pm`) | `a` | `a` | `%P` | `{mer}` |
| **Minute** | Zero-padded minute (`00`-`59`) | `mm` | `mm` | `%M` | `{mi}` |
| | Unpadded minute (`0`-`59`) | `m` | `m` | `%-M` | `{mi:raw}` |
| **Second** | Zero-padded second (`00`-`59`) | `ss` | `ss` | `%S` | `{ss}` |
| | Unpadded second (`0`-`59`) | `s` | `s` | `%-S` | `{ss:raw}` |
| **Fractional** | Milliseconds (`000`-`999`) | `SSS` | `SSS` | N/A | `{ms}` |
| | Hundredths (`00`-`99`) | `SS` | `SS` | N/A | `{ff:2}` |
| | Tenths (`0`-`9`) | `S` | `S` | N/A | `{ff:1}` |
| | Microseconds (`000000`-`999999`) | N/A | N/A | `%f` | `{ff:6}` |
| **Timestamp** | Unix timestamp (seconds) | N/A | `X` | `%s` | `{ts}` |
| | Unix timestamp (milliseconds) | N/A | `x` | N/A | `{ts:ms}` |
| **Timezone** | Short abbreviation (`PST`, `UTC`) | `zzz` or `z` | `zz` or `z` | `%Z` | `{tz:short}` |
| | Full localized name (`Pacific Standard Time`) | `zzzz` | N/A | N/A | `{tz:long}` |
| | Compact offset (`-0800`, `+0530`) | `ZZ` or `Z` | `ZZ` | `%z` | `{tz:offsetcompact}` |
| | Extended ISO offset (`-08:00`, `+05:30`) | `ZZZZZ` | `Z` | `%:z` | `{tz:offset}` |
| | Localized GMT offset (`GMT-08:00`) | `ZZZZ` | N/A | N/A | `{tz:longoffset}` |
| **Quarter** | Quarter number (`1`-`4`) | `Q` or `q` | `Q` | N/A | `{#quarter}` (with Term) |
| | Quarter with ordinal (`3rd`) | N/A | `Qo` | N/A | `{#quarter:ord}` |
| | Full quarter name (`3rd quarter`) | `QQQQ` | N/A | N/A | `{#quarter}` |

---

## 2. Literal Text Escaping Rules

When embedding arbitrary plain text inside format strings, each dialect implements distinct syntax:

### A. Unicode LDML & Luxon
* Wrap arbitrary characters in **single quotes**: `'Date: ' yyyy-MM-dd`.
* To emit a literal single quote, use **two consecutive single quotes**: `''yyyy''` $\rightarrow$ `'2026'`.

```typescript
// LDML Escaping Example
const str1 = t.format("'Report generated on' yyyy-MM-dd 'at' HH:mm", { dialect: 'ldml' });
// Output: "Report generated on 2026-10-24 at 15:30"
```

### B. Moment.js & Day.js
* Wrap arbitrary characters in **square brackets**: `[Report generated on] YYYY-MM-DD`.
* Single characters outside brackets that do not match known tokens are emitted as literals.

```typescript
// Moment Escaping Example
const str2 = t.format('[Invoice #] YYYY-MM-DD [due by] HH:mm', { dialect: 'moment' });
// Output: "Invoice # 2026-10-24 due by 15:30"
```

### C. POSIX `strftime`
* Any character not prefixed by `%` is treated as literal text.
* To emit a literal percent sign, use `%%`: `%% %Y-%m-%d` $\rightarrow$ `% 2026-10-24`.

```typescript
// strftime Escaping Example
const str3 = t.format('%% System status at %Y-%m-%d %H:%M:%S %%', { dialect: 'strftime' });
// Output: "% System status at 2026-10-24 15:30:45 %"
```

### D. Native Tempo Core
* In Native Tempo syntax, tokens are enclosed in curly braces `{token}`. Everything outside braces is literal text by default.
* To emit a literal <code>&#123;</code> or <code>&#125;</code>, use <span v-pre><code>&#123;&#123;</code></span> or <span v-pre><code>&#125;&#125;</code></span>:

```typescript
// Native Tempo Escaping Example
const str4 = t.format('Total balance: ${0} as of {yyyy}-{mm}-{dd}', { dialect: null });
// Output: "Total balance: $0 as of 2026-10-24"
```

---

## 3. Hour Parsing & Normalization Details

When parsing 24-hour clocks, differing standards support both `00-23` (`HH`, `H`) and `01-24` (`kk`, `k`):

* In Unicode LDML, `kk` indicates hours from `01` to `24`. Hour `24:00` represents midnight at the end of the day, which standard Temporal engines normalize to `00:00`.
* The Dialects parser safely normalizes `24:00` to hour `0`, while strictly rejecting out-of-range hours like `25:00` or `00:00` for `kk` tokens:

```typescript
const validMidnight = Tempo.fromFormat('2026-10-24 24:00', 'yyyy-MM-dd kk:mm');
console.log(validMidnight.hh); // 0 (normalized)

const invalidHour = Tempo.fromFormat('2026-10-24 25:00', 'yyyy-MM-dd kk:mm', { error: 'catch' });
console.log(invalidHour.isValid); // false
```
