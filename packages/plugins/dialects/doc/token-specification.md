<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-dialects</a>
</div>

<br>

# Token Specification & Cross-Ecosystem Matrix

This document provides a comprehensive cross-reference matrix comparing date formatting and parsing tokens across **Native Tempo Core**, **Unicode LDML / UTS #35 (date-fns, CLDR)**, **Luxon**, **Moment.js / Day.js**, **POSIX `strftime` (C, Python)**, **Oracle / SQL `TO_CHAR`**, **PHP `date()`**, and **Go (`time.Format`)**.

---

## 1. Comprehensive Token Cross-Reference Matrix

| Category | Description | LDML | Luxon | Moment | POSIX | Oracle | PHP | Go | Native Tempo |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Year** | 4-digit year (`2026`) | `yyyy` | `yyyy` | `YYYY` | `%Y` | `YYYY` | `Y` | `2006` | `{yyyy}` |
| | 2-digit year (`26`) | `yy` | `yy` | `YY` | `%y` | `YY` | `y` | `06` | `{yy}` |
| | 4-digit ISO week year | `YYYY` | `kkkk` | `GGGG` | `%G` | `IYYY` | `o` | N/A | `{yow}` |
| **Month** | Zero-padded (`01`-`12`) | `MM` | `MM` | `MM` | `%m` | `MM` | `m` | `01` | `{mm}` |
| | Unpadded (`1`-`12`) | `M` | `M` | `M` | `%-m` | `FMMM` | `n` | `1` | `{mm:raw}` |
| | Short name (`Oct`) | `MMM` | `LLL` | `MMM` | `%b` | `Mon` | `M` | `Jan` | `{mmm}` |
| | Full name (`October`) | `MMMM` | `LLLL` | `MMMM` | `%B` | `Month` | `F` | `January` | `{mon}` |
| **Day** | Zero-padded day (`01`-`31`) | `dd` | `dd` | `DD` | `%d` | `DD` | `d` | `02` | `{dd}` |
| | Unpadded day (`1`-`31`) | `d` | `d` | `D` | `%-d` | `FMDD` | `j` | `2` | `{dd:raw}` |
| | Ordinal day (`24th`) | N/A | N/A | `Do` | N/A | N/A | `jS` | N/A | `{dd:ord}` |
| **Day of Year** | Day of year (`001`-`366`) | `DDD` | `ooo` | `DDDD` | `%j` | `DDD` | N/A | `002` | `{doy}` |
| **Week of Year**| ISO week (`01`-`53`) | `ww` | `WW` | `WW` | `%V` | `IW` | `W` | N/A | `{woy}` |
| **Weekday** | Full name (`Saturday`) | `EEEE` | `EEEE` | `dddd` | `%A` | `Day` | `l` | `Monday` | `{wkd}` |
| | Short name (`Sat`) | `EEE` | `EEE` | `ddd` | `%a` | `Dy` | `D` | `Mon` | `{www}` |
| | ISO day of week (`1`-`7`) | `e`* | `E` | `E` | `%u` | `D`* | `N` | N/A | `{dow}` |
| **Hour (24h)** | Zero-padded (`00`-`23`) | `HH` | `HH` | `HH` | `%H` | `HH24` | `H` | `15` | `{hh}` |
| | Unpadded (`0`-`23`) | `H` | `H` | `H` | `%-H` | `FMHH24`| `G` | N/A | `{hh:raw}` |
| **Hour (12h)** | Zero-padded (`01`-`12`) | `hh` | `hh` | `hh` | `%I` | `HH12` | `h` | `03` | `{h12}` |
| | Unpadded (`1`-`12`) | `h` | `h` | `h` | `%-I` | `FMHH12`| `g` | `3` | `{h12:raw}` |
| **Meridiem** | Uppercase (`AM` / `PM`) | `aa` | `a` | `A` | `%p` | `AM` | `A` | `PM` | `{mer:upper}` |
| | Lowercase (`am` / `pm`) | `a` | `a` | `a` | `%P` | `am` | `a` | `pm` | `{mer}` |
| **Minute** | Zero-padded (`00`-`59`) | `mm` | `mm` | `mm` | `%M` | `MI` | `i` | `04` | `{mi}` |
| | Unpadded (`0`-`59`) | `m` | `m` | `m` | `%-M` | `FMMI` | N/A | `4` | `{mi:raw}` |
| **Second** | Zero-padded (`00`-`59`) | `ss` | `ss` | `ss` | `%S` | `SS` | `s` | `05` | `{ss}` |
| | Unpadded (`0`-`59`) | `s` | `s` | `s` | `%-S` | `FMSS` | N/A | `5` | `{ss:raw}` |
| **Fractional** | Milliseconds (`000`-`999`) | `SSS`| `SSS` | `SSS` | `%3f*` | `FF3` | `v` | `.000` | `{ms}` |
| | Microseconds (`6` digits) | `SSSSSS`| N/A | `SSSSSS`| `%f*` | `FF6` | `u` | `.000000`| `{ff:6}` |
| | Nanoseconds (`9` digits) | `SSSSSSSSS`| N/A | `SSSSSSSSS`| `%9f*` | `FF9` | N/A | `.000000000`| `{ff:9}` |
| **Timezone** | Short abbreviation / IANA | `z` | `z` | `zz` | `%Z` | `TZD` | `T` | `MST` | `{tz:short}` |
| | Standard offset (`+08:00`) | `ZZZZZ`| `ZZ` | `Z` | N/A | `TZH:TZM`| `P` | `-07:00` | `{tz:offset}` |
| | Compact offset (`+0800`) | `ZZ` | `ZZZ` | `ZZ` | `%z` | `OF` | `O` | `-0700` | `{tz:offsetcompact}` |
| **Timestamp** | Unix epoch (seconds) | N/A | N/A | `X` | `%s` | N/A | `U` | N/A | `{ts}` |
| | Quarter with ordinal (`3rd`) | N/A | N/A | `Qo` | N/A | N/A | N/A | N/A | `{#quarter:ord}` |
| | Full quarter name (`3rd quarter`) | `QQQQ` | `qqqq` | N/A | N/A | N/A | N/A | N/A | `{#quarter}` |

> [!NOTE]
> `*` In LDML (`e`) and Oracle (`D`), day-of-week numeric indexing is territory/locale-dependent; Moment uses `E` for standard ISO weekdays (1–7). Go’s `15` layout always zero-pads 24-hour hours (no unpadded equivalent). `%3f`, `%6f`, and `%9f` are Tempo-specific extensions to `strftime` to specify explicit subsecond precision widths; standard POSIX `strftime` does not define subsecond specifiers (Python uses `%f` for 6-digit microseconds). Tempo preserves the documented widths and parsing/formatting behavior. Go layout `2006` is a calendar year layout; ISO week-numbering year is unsupported in standard Go layout strings (requires explicit conversion using `time.Time.ISOWeek()`). PHP `date()` zero-pads `i` (minute) and `s` (second); unpadded values are unsupported in PHP date formatting. LDML `d` produces a numeric day of month, not an ordinal suffix.

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
