[**@magmacomputing/tempo**](../README.md)

***

> **enums**: `object`

Defined in: [tempo.enum.ts:237](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.enum.ts#L237)

public-reachable enums

## Type Declaration

### COMPASS

> **COMPASS**: `EnumifyType`\<\{ `East`: `"east"`; `North`: `"north"`; `South`: `"south"`; `West`: `"west"`; \}\>

cardinal directions

### DURATION

> **DURATION**: `EnumifyType`\<\{ `day`: `86400`; `hour`: `3600`; `microsecond`: `0.000001`; `millisecond`: `0.001`; `minute`: `60`; `month`: `2628000`; `nanosecond`: `1e-9`; `second`: `1`; `week`: `604800`; `year`: `31536000`; \}\>

number of seconds in a time unit

### DURATIONS

> **DURATIONS**: `EnumifyType`\<\{ `days`: `86400000`; `hours`: `3600000`; `microseconds`: `0.001`; `milliseconds`: `1`; `minutes`: `60000`; `months`: `2628000000`; `nanoseconds`: `0.000001`; `seconds`: `1000`; `weeks`: `604800000`; `years`: `31536000000`; \}\>

number of milliseconds in a time unit

### ELEMENT

> **ELEMENT**: `EnumifyType`\<\{ `dd`: `"day"`; `hh`: `"hour"`; `mi`: `"minute"`; `mm`: `"month"`; `ms`: `"millisecond"`; `ns`: `"nanosecond"`; `ss`: `"second"`; `us`: `"microsecond"`; `ww`: `"week"`; `yy`: `"year"`; \}\>

### FORMAT

> **FORMAT**: `EnumifyType`\<\{ `date`: `"{yyyy}-{mm}-{dd}"`; `dayDate`: `"{dd}-{mmm}-{yyyy}"`; `dayMonth`: `"{dd}-{mmm}"`; `dayTime`: `"{dd}-{mmm}-{yyyy} {hh}:{mi}:{ss}"`; `display`: `"{www}, {dd} {mmm} {yyyy}"`; `logStamp`: `"{yyyy}{mm}{dd}T{hhmiss}.{ff}"`; `sortTime`: `"{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}"`; `time`: `"{hh}:{mi}:{ss}"`; `weekDate`: `"{www}, {yyyy}-{mmm}-{dd}"`; `weekStamp`: `"{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}.{ff}"`; `weekTime`: `"{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}"`; `yearMonth`: `"{yyyy}{mm}"`; `yearMonthDay`: `"{yyyy}{mm}{dd}"`; `yearWeek`: `"{yw}{ww}"`; \}\>

common format aliases

### LIMIT

> **LIMIT**: `object`

#### LIMIT.maxTempo

##### Get Signature

> **get** **maxTempo**(): `bigint`

Defined in: [tempo.enum.ts:97](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.enum.ts#L97)

Tempo(31-Dec-9999.23:59:59).ns

###### Returns

`bigint`

#### LIMIT.minTempo

##### Get Signature

> **get** **minTempo**(): `bigint`

Defined in: [tempo.enum.ts:98](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.enum.ts#L98)

Tempo(01-Jan-1000.00:00:00).ns

###### Returns

`bigint`

### MODE

> **MODE**: `EnumifyType`\<\{ `Auto`: `"auto"`; `Defer`: `"defer"`; `Strict`: `"strict"`; \}\>

initialization strategies

### MONTH

> **MONTH**: `EnumifyType`\<`Index`\<readonly \[`"All"`, `"Jan"`, `"Feb"`, `"Mar"`, `"Apr"`, `"May"`, `"Jun"`, `"Jul"`, `"Aug"`, `"Sep"`, `"Oct"`, `"Nov"`, `"Dec"`\]\>\>

Gregorian calendar months (short-form)

### MONTHS

> **MONTHS**: `EnumifyType`\<`Index`\<readonly \[`"Every"`, `"January"`, `"February"`, `"March"`, `"April"`, `"May"`, `"June"`, `"July"`, `"August"`, `"September"`, `"October"`, `"November"`, `"December"`\]\>\>

Gregorian calendar months (long-form)

### MUTATION

> **MUTATION**: `EnumifyType`\<`Index`\<readonly \[`"yy"`, `"mm"`, `"ww"`, `"dd"`, `"hh"`, `"mi"`, `"ss"`, `"ms"`, `"us"`, `"ns"`, `"event"`, `"period"`, `"clock"`, `"time"`, `"date"`, `"start"`, `"mid"`, `"end"`\]\>\>

### NUMBER

> **NUMBER**: `EnumifyType`\<\{ `eight`: `8`; `five`: `5`; `four`: `4`; `nine`: `9`; `one`: `1`; `seven`: `7`; `six`: `6`; `ten`: `10`; `three`: `3`; `two`: `2`; `zero`: `0`; \}\>

number names (0-10)

### OPTION

> **OPTION**: `EnumifyType`\<`Index`\<readonly \[`"value"`, `"mode"`, `"mdyLocales"`, `"mdyLayouts"`, `"store"`, `"discovery"`, `"debug"`, `"catch"`, `"timeZone"`, `"calendar"`, `"locale"`, `"pivot"`, `"sphere"`, `"timeStamp"`, `"snippet"`, `"layout"`, `"event"`, `"period"`, `"formats"`, `"plugins"`\]\>\>

### PARSE

> **PARSE**: `EnumifyType`\<`Index`\<readonly \[`"mdyLocales"`, `"mdyLayouts"`, `"formats"`, `"pivot"`, `"snippet"`, `"layout"`, `"event"`, `"period"`, `"anchor"`, `"value"`, `"discovery"`, `"plugins"`, `"mode"`\]\>\>

### SEASON

> **SEASON**: `EnumifyType`\<\{ `Autumn`: `"autumn"`; `Spring`: `"spring"`; `Summer`: `"summer"`; `Winter`: `"winter"`; \}\>

calendar seasons

### TIMEZONE

> **TIMEZONE**: `object`

common time-zone aliases

#### TIMEZONE.acst

> `readonly` **acst**: `"Australia/Adelaide"` = `'Australia/Adelaide'`

#### TIMEZONE.aest

> `readonly` **aest**: `"Australia/Sydney"` = `'Australia/Sydney'`

#### TIMEZONE.awst

> `readonly` **awst**: `"Australia/Perth"` = `'Australia/Perth'`

#### TIMEZONE.cet

> `readonly` **cet**: `"Europe/Paris"` = `'Europe/Paris'`

#### TIMEZONE.cst

> `readonly` **cst**: `"America/Chicago"` = `'America/Chicago'`

#### TIMEZONE.eet

> `readonly` **eet**: `"Europe/Helsinki"` = `'Europe/Helsinki'`

#### TIMEZONE.est

> `readonly` **est**: `"America/New_York"` = `'America/New_York'`

#### TIMEZONE.gmt

> `readonly` **gmt**: `"Europe/London"` = `'Europe/London'`

#### TIMEZONE.ist

> `readonly` **ist**: `"Asia/Kolkata"` = `'Asia/Kolkata'`

#### TIMEZONE.jst

> `readonly` **jst**: `"Asia/Tokyo"` = `'Asia/Tokyo'`

#### TIMEZONE.mst

> `readonly` **mst**: `"America/Denver"` = `'America/Denver'`

#### TIMEZONE.npt

> `readonly` **npt**: `"Asia/Kathmandu"` = `'Asia/Kathmandu'`

#### TIMEZONE.nzt

> `readonly` **nzt**: `"Pacific/Auckland"` = `'Pacific/Auckland'`

#### TIMEZONE.pst

> `readonly` **pst**: `"America/Los_Angeles"` = `'America/Los_Angeles'`

#### TIMEZONE.utc

> `readonly` **utc**: `"UTC"` = `'UTC'`

### WEEKDAY

> **WEEKDAY**: `EnumifyType`\<`Index`\<readonly \[`"All"`, `"Mon"`, `"Tue"`, `"Wed"`, `"Thu"`, `"Fri"`, `"Sat"`, `"Sun"`\]\>\>

Gregorian calendar week-days (short-form)

### WEEKDAYS

> **WEEKDAYS**: `EnumifyType`\<`Index`\<readonly \[`"Everyday"`, `"Monday"`, `"Tuesday"`, `"Wednesday"`, `"Thursday"`, `"Friday"`, `"Saturday"`, `"Sunday"`\]\>\>

Gregorian calendar week-days (long-form)

### ZONED\_DATE\_TIME

> **ZONED\_DATE\_TIME**: `EnumifyType`\<`Index`\<readonly \[`"value"`, `"timeZoneId"`, `"calendarId"`, `"monthCode"`, `"offset"`, `"timeZone"`, `"yy"`, `"mm"`, `"ww"`, `"dd"`, `"hh"`, `"mi"`, `"ss"`, `"ms"`, `"us"`, `"ns"`\]\>\>
