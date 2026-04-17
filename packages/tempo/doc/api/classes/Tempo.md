[**@magmacomputing/tempo**](../README.md)

***

Defined in: [tempo.class.ts:75](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L75)

# Tempo
A powerful wrapper around `Temporal.ZonedDateTime` for flexible parsing and intuitive manipulation of date-time objects.
Bridges the gap between raw string/number inputs and the strict requirements of the ECMAScript Temporal API.

## Indexable

> \[`key`: `symbol`\]: `string` \| `boolean` \| ((`hint?`) => `string` \| `number` \| `bigint`) \| (() => `ArrayIterator`\<`EntryOf`\<`any`\>\>) \| \{ \}

## Constructors

### Constructor

> **new Tempo**(`options?`): `Tempo`

Defined in: [tempo.class.ts:1045](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1045)

Instantiates a new `Tempo` object with configuration only.

#### Parameters

##### options?

Configuration options for this specific instance.

###### calendar?

`CalendarLike`

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

`PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

`PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

`RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

`TimeStamp`

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

#### Returns

`Tempo`

### Constructor

> **new Tempo**(`tempo`, `options?`): `Tempo`

Defined in: [tempo.class.ts:1052](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1052)

Instantiates a new `Tempo` object with a value.

#### Parameters

##### tempo

`DateTime`

The date-time value to parse.

##### options?

Configuration options for this specific instance.

###### calendar?

`CalendarLike`

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

`PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

`PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

`RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

`TimeStamp`

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

#### Returns

`Tempo`

## Accessors

### \[toStringTag\]

#### Get Signature

> **get** **\[toStringTag\]**(): `string`

Defined in: [tempo.class.ts:1034](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1034)

##### Returns

`string`

***

### cal

#### Get Signature

> **get** **cal**(): `string`

Defined in: [tempo.class.ts:1227](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1227)

Temporal Calendar ID (e.g., 'iso8601' | 'gregory')

##### Returns

`string`

***

### config

#### Get Signature

> **get** **config**(): `Config`

Defined in: [tempo.class.ts:1268](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1268)

current Tempo configuration

##### Returns

`Config`

***

### day

#### Get Signature

> **get** **day**(): `number`

Defined in: [tempo.class.ts:1218](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1218)

Day of the month (alias for `dd`)

##### Returns

`number`

***

### dd

#### Get Signature

> **get** **dd**(): `number`

Defined in: [tempo.class.ts:1217](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1217)

Day of the month (1-31)

##### Returns

`number`

***

### dow

#### Get Signature

> **get** **dow**(): `0` \| `1` \| `2` \| `3` \| `4` \| `5` \| `6` \| `7`

Defined in: [tempo.class.ts:1233](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1233)

ISO weekday number: Mon=1, Sun=7

##### Returns

`0` \| `1` \| `2` \| `3` \| `4` \| `5` \| `6` \| `7`

***

### epoch

#### Get Signature

> **get** **epoch**(): `SecureObject`\<\{ `ms`: `number`; `ns`: `bigint`; `ss`: `number`; `us`: `number`; \}\>

Defined in: [tempo.class.ts:1298](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1298)

units since epoch

##### Returns

`SecureObject`\<\{ `ms`: `number`; `ns`: `bigint`; `ss`: `number`; `us`: `number`; \}\>

***

### ff

#### Get Signature

> **get** **ff**(): `number`

Defined in: [tempo.class.ts:1225](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1225)

Fractional seconds (e.g., 0.123456789)

##### Returns

`number`

***

### fmt

#### Get Signature

> **get** **fmt**(): `any`

Defined in: [tempo.class.ts:1297](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1297)

Formatted results for all pre-defined format codes

##### Returns

`any`

***

### hh

#### Get Signature

> **get** **hh**(): `hh`

Defined in: [tempo.class.ts:1219](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1219)

Hour of the day (0-23)

##### Returns

`hh`

***

### isValid

#### Get Signature

> **get** **isValid**(): `boolean`

Defined in: [tempo.class.ts:1236](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1236)

`true` if the underlying date-time is valid.

##### Returns

`boolean`

***

### mi

#### Get Signature

> **get** **mi**(): `mi`

Defined in: [tempo.class.ts:1220](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1220)

Minutes of the hour (0-59)

##### Returns

`mi`

***

### mm

#### Get Signature

> **get** **mm**(): `mm`

Defined in: [tempo.class.ts:1215](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1215)

Month number: Jan=1, Dec=12

##### Returns

`mm`

***

### mmm

#### Get Signature

> **get** **mmm**(): `"All"` \| `"Jan"` \| `"Feb"` \| `"Mar"` \| `"Apr"` \| `"May"` \| `"Jun"` \| `"Jul"` \| `"Aug"` \| `"Sep"` \| `"Oct"` \| `"Nov"` \| `"Dec"`

Defined in: [tempo.class.ts:1229](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1229)

Short month name (e.g., 'Jan')

##### Returns

`"All"` \| `"Jan"` \| `"Feb"` \| `"Mar"` \| `"Apr"` \| `"May"` \| `"Jun"` \| `"Jul"` \| `"Aug"` \| `"Sep"` \| `"Oct"` \| `"Nov"` \| `"Dec"`

***

### mon

#### Get Signature

> **get** **mon**(): `"May"` \| `"Every"` \| `"January"` \| `"February"` \| `"March"` \| `"April"` \| `"June"` \| `"July"` \| `"August"` \| `"September"` \| `"October"` \| `"November"` \| `"December"`

Defined in: [tempo.class.ts:1230](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1230)

Full month name (e.g., 'January')

##### Returns

`"May"` \| `"Every"` \| `"January"` \| `"February"` \| `"March"` \| `"April"` \| `"June"` \| `"July"` \| `"August"` \| `"September"` \| `"October"` \| `"November"` \| `"December"`

***

### ms

#### Get Signature

> **get** **ms**(): `ms`

Defined in: [tempo.class.ts:1222](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1222)

Milliseconds of the second (0-999)

##### Returns

`ms`

***

### nano

#### Get Signature

> **get** **nano**(): `bigint`

Defined in: [tempo.class.ts:1234](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1234)

Nanoseconds since Unix epoch (BigInt)

##### Returns

`bigint`

***

### ns

#### Get Signature

> **get** **ns**(): `ns`

Defined in: [tempo.class.ts:1224](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1224)

Nanoseconds of the microsecond (0-999)

##### Returns

`ns`

***

### parse

#### Get Signature

> **get** **parse**(): `Parse`

Defined in: [tempo.class.ts:1291](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1291)

Instance-specific parse rules (merged with global)

##### Returns

`Parse`

***

### ranges

#### Get Signature

> **get** **ranges**(): `Record`\<`string`, `string`\>

Defined in: [tempo.class.ts:1255](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1255)

current range key for every registered term

##### Returns

`Record`\<`string`, `string`\>

***

### ss

#### Get Signature

> **get** **ss**(): `ss`

Defined in: [tempo.class.ts:1221](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1221)

Seconds of the minute (0-59)

##### Returns

`ss`

***

### term

#### Get Signature

> **get** **term**(): `any`

Defined in: [tempo.class.ts:1296](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1296)

Object containing results from all term plugins

##### Returns

`any`

***

### terms

#### Get Signature

> **get** **terms**(): `Record`\<`string`, `string`[]\>

Defined in: [tempo.class.ts:1242](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1242)

list of registered terms and their available range keys

##### Returns

`Record`\<`string`, `string`[]\>

***

### ts

#### Get Signature

> **get** **ts**(): `number` \| `bigint`

Defined in: [tempo.class.ts:1228](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1228)

Unix timestamp (defaults to milliseconds)

##### Returns

`number` \| `bigint`

***

### tz

#### Get Signature

> **get** **tz**(): `string`

Defined in: [tempo.class.ts:1226](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1226)

IANA Time Zone ID (e.g., 'Australia/Sydney')

##### Returns

`string`

***

### us

#### Get Signature

> **get** **us**(): `us`

Defined in: [tempo.class.ts:1223](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1223)

Microseconds of the millisecond (0-999)

##### Returns

`us`

***

### wkd

#### Get Signature

> **get** **wkd**(): `"Everyday"` \| `"Monday"` \| `"Tuesday"` \| `"Wednesday"` \| `"Thursday"` \| `"Friday"` \| `"Saturday"` \| `"Sunday"`

Defined in: [tempo.class.ts:1232](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1232)

Full weekday name (e.g., 'Monday')

##### Returns

`"Everyday"` \| `"Monday"` \| `"Tuesday"` \| `"Wednesday"` \| `"Thursday"` \| `"Friday"` \| `"Saturday"` \| `"Sunday"`

***

### ww

#### Get Signature

> **get** **ww**(): `ww`

Defined in: [tempo.class.ts:1216](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1216)

ISO week number of the year

##### Returns

`ww`

***

### www

#### Get Signature

> **get** **www**(): `"All"` \| `"Mon"` \| `"Tue"` \| `"Wed"` \| `"Thu"` \| `"Fri"` \| `"Sat"` \| `"Sun"`

Defined in: [tempo.class.ts:1231](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1231)

Short weekday name (e.g., 'Mon')

##### Returns

`"All"` \| `"Mon"` \| `"Tue"` \| `"Wed"` \| `"Thu"` \| `"Fri"` \| `"Sat"` \| `"Sun"`

***

### yw

#### Get Signature

> **get** **yw**(): `number` \| `undefined`

Defined in: [tempo.class.ts:1214](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1214)

4-digit ISO week-numbering year

##### Returns

`number` \| `undefined`

***

### yy

#### Get Signature

> **get** **yy**(): `number`

Defined in: [tempo.class.ts:1213](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1213)

4-digit year (e.g., 2024)

##### Returns

`number`

***

### config

#### Get Signature

> **get** `static` **config**(): `any`

Defined in: [tempo.class.ts:868](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L868)

global Tempo configuration

##### Returns

`any`

***

### default

#### Get Signature

> **get** `static` **default**(): `Readonly`\<\{ `calendar?`: `string` \| `SecureObject`\<`ZonedDateTime`\> \| `SecureObject`\<`PlainDate`\> \| `SecureObject`\<`PlainDateTime`\> \| `SecureObject`\<`PlainMonthDay`\> \| `SecureObject`\<`PlainYearMonth`\>; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: `Logic` \| `SecureObject`\<`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\>\> \| `SecureObject`\<`Record`\<`string` \| `symbol`, `Logic`\>\> \| `SecureArray`\<`PatternOption`\<`Logic`\>\>; `formats?`: `SecureObject`\<`Property`\<`any`\>\>; `layout?`: `Pattern` \| `SecureObject`\<`Record`\<`string` \| `symbol`, `Pattern`\>\> \| `SecureArray`\<`PatternOption`\<`Pattern`\>\> \| `SecureObject`\<`Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>\>; `locale?`: `string`; `mdyLayouts?`: `SecureArray`\<`Pair`\>; `mdyLocales?`: `string` \| `SecureArray`\<`string`\>; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: `Logic` \| `SecureObject`\<`Record`\<`string` \| `symbol`, `Logic`\>\> \| `SecureArray`\<`PatternOption`\<`Logic`\>\> \| `SecureObject`\<`Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>\>; `pivot?`: `number`; `plugins?`: `SecureObject`\<`Plugin`\> \| `SecureArray`\<`Plugin`\>; `rtfFormat?`: `SecureObject`\<`RelativeTimeFormat`\>; `rtfStyle?`: `RelativeTimeFormatStyle`; `scope`: `"default"`; `silent?`: `boolean`; `snippet?`: `Pattern` \| `SecureObject`\<`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\>\> \| `SecureObject`\<`Record`\<`string` \| `symbol`, `Pattern`\>\> \| `SecureArray`\<`PatternOption`\<`Pattern`\>\>; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: `TimeStamp`; `timeZone`: `string` \| `SecureObject`\<`ZonedDateTime`\>; `value?`: `string` \| `number` \| `bigint` \| `Date` \| `SecureObject`\<`ZonedDateTime`\> \| `SecureObject`\<`PlainDate`\> \| `SecureObject`\<`PlainDateTime`\> \| `SecureObject`\<`Tempo`\> \| `SecureObject`\<`Instant`\> \| `SecureObject`\<`PlainTime`\> \| `SecureObject`\<`Duration`\> \| `SecureObject`\<`ZonedDateTimeLikeObject`\> \| `null`; \}\>

Defined in: [tempo.class.ts:931](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L931)

Tempo initial default settings

##### Returns

`Readonly`\<\{ `calendar?`: `string` \| `SecureObject`\<`ZonedDateTime`\> \| `SecureObject`\<`PlainDate`\> \| `SecureObject`\<`PlainDateTime`\> \| `SecureObject`\<`PlainMonthDay`\> \| `SecureObject`\<`PlainYearMonth`\>; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: `Logic` \| `SecureObject`\<`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\>\> \| `SecureObject`\<`Record`\<`string` \| `symbol`, `Logic`\>\> \| `SecureArray`\<`PatternOption`\<`Logic`\>\>; `formats?`: `SecureObject`\<`Property`\<`any`\>\>; `layout?`: `Pattern` \| `SecureObject`\<`Record`\<`string` \| `symbol`, `Pattern`\>\> \| `SecureArray`\<`PatternOption`\<`Pattern`\>\> \| `SecureObject`\<`Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>\>; `locale?`: `string`; `mdyLayouts?`: `SecureArray`\<`Pair`\>; `mdyLocales?`: `string` \| `SecureArray`\<`string`\>; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: `Logic` \| `SecureObject`\<`Record`\<`string` \| `symbol`, `Logic`\>\> \| `SecureArray`\<`PatternOption`\<`Logic`\>\> \| `SecureObject`\<`Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>\>; `pivot?`: `number`; `plugins?`: `SecureObject`\<`Plugin`\> \| `SecureArray`\<`Plugin`\>; `rtfFormat?`: `SecureObject`\<`RelativeTimeFormat`\>; `rtfStyle?`: `RelativeTimeFormatStyle`; `scope`: `"default"`; `silent?`: `boolean`; `snippet?`: `Pattern` \| `SecureObject`\<`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\>\> \| `SecureObject`\<`Record`\<`string` \| `symbol`, `Pattern`\>\> \| `SecureArray`\<`PatternOption`\<`Pattern`\>\>; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: `TimeStamp`; `timeZone`: `string` \| `SecureObject`\<`ZonedDateTime`\>; `value?`: `string` \| `number` \| `bigint` \| `Date` \| `SecureObject`\<`ZonedDateTime`\> \| `SecureObject`\<`PlainDate`\> \| `SecureObject`\<`PlainDateTime`\> \| `SecureObject`\<`Tempo`\> \| `SecureObject`\<`Instant`\> \| `SecureObject`\<`PlainTime`\> \| `SecureObject`\<`Duration`\> \| `SecureObject`\<`ZonedDateTimeLikeObject`\> \| `null`; \}\>

***

### discovery

#### Get Signature

> **get** `static` **discovery**(): `any`

Defined in: [tempo.class.ts:884](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L884)

global discovery configuration

##### Returns

`any`

***

### FORMAT

#### Get Signature

> **get** `static` **FORMAT**(): `EnumifyType`\<\{ `date`: `"{yyyy}-{mm}-{dd}"`; `dayDate`: `"{dd}-{mmm}-{yyyy}"`; `dayMonth`: `"{dd}-{mmm}"`; `dayTime`: `"{dd}-{mmm}-{yyyy} {hh}:{mi}:{ss}"`; `display`: `"{www}, {dd} {mmm} {yyyy}"`; `logStamp`: `"{yyyy}{mm}{dd}T{hhmiss}.{ff}"`; `sortTime`: `"{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}"`; `time`: `"{hh}:{mi}:{ss}"`; `weekDate`: `"{www}, {yyyy}-{mmm}-{dd}"`; `weekStamp`: `"{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}.{ff}"`; `weekTime`: `"{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}"`; `yearMonth`: `"{yyyy}{mm}"`; `yearMonthDay`: `"{yyyy}{mm}{dd}"`; `yearWeek`: `"{yw}{ww}"`; \}\>

Defined in: [tempo.class.ts:87](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L87)

Pre-configured format {name -> string} pairs

##### Returns

`EnumifyType`\<\{ `date`: `"{yyyy}-{mm}-{dd}"`; `dayDate`: `"{dd}-{mmm}-{yyyy}"`; `dayMonth`: `"{dd}-{mmm}"`; `dayTime`: `"{dd}-{mmm}-{yyyy} {hh}:{mi}:{ss}"`; `display`: `"{www}, {dd} {mmm} {yyyy}"`; `logStamp`: `"{yyyy}{mm}{dd}T{hhmiss}.{ff}"`; `sortTime`: `"{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}"`; `time`: `"{hh}:{mi}:{ss}"`; `weekDate`: `"{www}, {yyyy}-{mmm}-{dd}"`; `weekStamp`: `"{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}.{ff}"`; `weekTime`: `"{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}"`; `yearMonth`: `"{yyyy}{mm}"`; `yearMonthDay`: `"{yyyy}{mm}{dd}"`; `yearWeek`: `"{yw}{ww}"`; \}\>

***

### formats

#### Get Signature

> **get** `static` **formats**(): `any`

Defined in: [tempo.class.ts:920](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L920)

static Tempo.formats (registry)

##### Returns

`any`

***

### instant

#### Get Signature

> **get** `static` **instant**(): `Instant`

Defined in: [tempo.class.ts:903](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L903)

get the current system Instant

##### Returns

`Instant`

***

### LIMIT

#### Get Signature

> **get** `static` **LIMIT**(): `object`

Defined in: [tempo.class.ts:91](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L91)

some useful Dates

##### Returns

###### maxTempo

###### Get Signature

> **get** **maxTempo**(): `bigint`

Tempo(31-Dec-9999.23:59:59).ns

###### Returns

`bigint`

###### minTempo

###### Get Signature

> **get** **minTempo**(): `bigint`

Tempo(01-Jan-1000.00:00:00).ns

###### Returns

`bigint`

***

### MODE

#### Get Signature

> **get** `static` **MODE**(): `EnumifyType`\<\{ `Auto`: `"auto"`; `Defer`: `"defer"`; `Strict`: `"strict"`; \}\>

Defined in: [tempo.class.ts:90](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L90)

initialization strategies

##### Returns

`EnumifyType`\<\{ `Auto`: `"auto"`; `Defer`: `"defer"`; `Strict`: `"strict"`; \}\>

***

### NUMBER

#### Get Signature

> **get** `static` **NUMBER**(): `EnumifyType`\<\{ `eight`: `8`; `five`: `5`; `four`: `4`; `nine`: `9`; `one`: `1`; `seven`: `7`; `six`: `6`; `ten`: `10`; `three`: `3`; `two`: `2`; `zero`: `0`; \}\>

Defined in: [tempo.class.ts:88](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L88)

Number names (0-10)

##### Returns

`EnumifyType`\<\{ `eight`: `8`; `five`: `5`; `four`: `4`; `nine`: `9`; `one`: `1`; `seven`: `7`; `six`: `6`; `ten`: `10`; `three`: `3`; `two`: `2`; `zero`: `0`; \}\>

***

### options

#### Get Signature

> **get** `static` **options**(): `any`

Defined in: [tempo.class.ts:890](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L890)

##### Returns

`any`

***

### parse

#### Get Signature

> **get** `static` **parse**(): `Parse`

Defined in: [tempo.class.ts:938](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L938)

configuration governing the static 'rules' used when parsing t.DateTime argument

##### Returns

`Parse`

***

### properties

#### Get Signature

> **get** `static` **properties**(): `SecureArray`\<`string`\>

Defined in: [tempo.class.ts:925](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L925)

static Tempo properties getter

##### Returns

`SecureArray`\<`string`\>

***

### terms

#### Get Signature

> **get** `static` **terms**(): `SecureArray`\<`Omit`\<`TermPlugin`, `"define"` \| `"resolve"`\>\> & `Record`\<`string`, `Omit`\<`TermPlugin`, `"define"` \| `"resolve"`\>\>

Defined in: [tempo.class.ts:906](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L906)

static Tempo.terms (registry)

##### Returns

`SecureArray`\<`Omit`\<`TermPlugin`, `"define"` \| `"resolve"`\>\> & `Record`\<`string`, `Omit`\<`TermPlugin`, `"define"` \| `"resolve"`\>\>

***

### TIMEZONE

#### Get Signature

> **get** `static` **TIMEZONE**(): `object`

Defined in: [tempo.class.ts:89](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L89)

TimeZone aliases

##### Returns

`object`

###### acst

> `readonly` **acst**: `"Australia/Adelaide"` = `'Australia/Adelaide'`

###### aest

> `readonly` **aest**: `"Australia/Sydney"` = `'Australia/Sydney'`

###### awst

> `readonly` **awst**: `"Australia/Perth"` = `'Australia/Perth'`

###### cet

> `readonly` **cet**: `"Europe/Paris"` = `'Europe/Paris'`

###### cst

> `readonly` **cst**: `"America/Chicago"` = `'America/Chicago'`

###### eet

> `readonly` **eet**: `"Europe/Helsinki"` = `'Europe/Helsinki'`

###### est

> `readonly` **est**: `"America/New_York"` = `'America/New_York'`

###### gmt

> `readonly` **gmt**: `"Europe/London"` = `'Europe/London'`

###### ist

> `readonly` **ist**: `"Asia/Kolkata"` = `'Asia/Kolkata'`

###### jst

> `readonly` **jst**: `"Asia/Tokyo"` = `'Asia/Tokyo'`

###### mst

> `readonly` **mst**: `"America/Denver"` = `'America/Denver'`

###### npt

> `readonly` **npt**: `"Asia/Kathmandu"` = `'Asia/Kathmandu'`

###### nzt

> `readonly` **nzt**: `"Pacific/Auckland"` = `'Pacific/Auckland'`

###### pst

> `readonly` **pst**: `"America/Los_Angeles"` = `'America/Los_Angeles'`

###### utc

> `readonly` **utc**: `"UTC"` = `'UTC'`

## Methods

### \[iterator\]()

> **\[iterator\]**(): `ArrayIterator`\<`EntryOf`\<`any`\>\>

Defined in: [tempo.class.ts:1030](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1030)

iterate over instance formats

#### Returns

`ArrayIterator`\<`EntryOf`\<`any`\>\>

***

### \[toPrimitive\]()

> **\[toPrimitive\]**(`hint?`): `string` \| `number` \| `bigint`

Defined in: [tempo.class.ts:1021](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1021)

allow for auto-convert of Tempo to BigInt, Number or String

#### Parameters

##### hint?

`"string"` \| `"number"` \| `"default"`

#### Returns

`string` \| `number` \| `bigint`

***

### add()

> **add**(`tempo?`, `options?`): `Tempo`

Defined in: [tempo.class.ts:1331](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1331)

returns a new `Tempo` with specific duration added.

#### Parameters

##### tempo?

`Add`

##### options?

###### calendar?

`CalendarLike`

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

`PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

`PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

`RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

`TimeStamp`

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

#### Returns

`Tempo`

***

### clone()

> **clone**(): `Tempo`

Defined in: [tempo.class.ts:1333](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1333)

returns a clone of the current `Tempo` instance.

#### Returns

`Tempo`

***

### format()

#### Call Signature

> **format**\<`K`\>(`fmt`): `any`

Defined in: [tempo.class.ts:1315](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1315)

##### Type Parameters

###### K

`K` *extends* `Format`

##### Parameters

###### fmt

`K`

##### Returns

`any`

#### Call Signature

> **format**(`fmt`): `any`

Defined in: [plugin/module/module.format.ts:12](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/plugin/module/module.format.ts#L12)

applies a format to the instance.

##### Parameters

###### fmt

`any`

##### Returns

`any`

***

### set()

> **set**(`tempo?`, `options?`): `Tempo`

Defined in: [tempo.class.ts:1332](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1332)

returns a new `Tempo` with specific offsets.

#### Parameters

##### tempo?

`Set`

##### options?

###### calendar?

`CalendarLike`

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

`PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

`PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

`RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

`TimeStamp`

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

#### Returns

`Tempo`

***

### since()

#### Call Signature

> **since**(...`args`): `any`

Defined in: [tempo.class.ts:1326](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1326)

time elapsed since another date-time

##### Parameters

###### args

...`any`[]

##### Returns

`any`

#### Call Signature

> **since**(`until`, `opts?`): `string`

Defined in: [plugin/module/module.duration.ts:18](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/plugin/module/module.duration.ts#L18)

time elapsed since (with unit)

##### Parameters

###### until

`Until`

###### opts?

###### calendar?

`CalendarLike`

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

`PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

`PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

`RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

`TimeStamp`

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

##### Returns

`string`

#### Call Signature

> **since**(`dateTimeOrOpts`, `until`): `string`

Defined in: [plugin/module/module.duration.ts:19](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/plugin/module/module.duration.ts#L19)

time elapsed since another date-time (with unit)

##### Parameters

###### dateTimeOrOpts

`DateTime` \| \{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: `Pair`[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: `Plugin` \| `Plugin`[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: `DateTime`; \}

`DateTime`

***

###### Type Literal

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: `Pair`[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: `Plugin` \| `Plugin`[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: `DateTime`; \}

###### calendar?

CalendarLike \| undefined

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

RelativeTimeFormatStyle \| undefined

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

TimeStamp \| undefined

Precision to measure timestamps (ms | us)

###### timeZone?

TimeZoneLike \| undefined

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

###### until

`Until`

##### Returns

`string`

#### Call Signature

> **since**(`dateTimeOrOpts?`, `opts?`): `string`

Defined in: [plugin/module/module.duration.ts:20](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/plugin/module/module.duration.ts#L20)

time elapsed since another date-time (w'out unit)

##### Parameters

###### dateTimeOrOpts?

`DateTime` \| \{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: `Pair`[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: `Plugin` \| `Plugin`[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: `DateTime`; \}

`DateTime`

***

###### Type Literal

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: `Pair`[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: `Plugin` \| `Plugin`[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: `DateTime`; \}

###### calendar?

CalendarLike \| undefined

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

RelativeTimeFormatStyle \| undefined

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

TimeStamp \| undefined

Precision to measure timestamps (ms | us)

###### timeZone?

TimeZoneLike \| undefined

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

###### opts?

###### calendar?

`CalendarLike`

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

`PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

`PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

`RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

`TimeStamp`

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

##### Returns

`string`

#### Call Signature

> **since**(`optsOrDate?`, `optsOrUntil?`): `string`

Defined in: [plugin/module/module.duration.ts:21](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/plugin/module/module.duration.ts#L21)

time elapsed since another date-time

##### Parameters

###### optsOrDate?

`any`

###### optsOrUntil?

`any`

##### Returns

`string`

***

### toDate()

> **toDate**(): `Date`

Defined in: [tempo.class.ts:1351](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1351)

the date-time as a standard `Date` object.

#### Returns

`Date`

***

### toDateTime()

> **toDateTime**(): `ZonedDateTime`

Defined in: [tempo.class.ts:1336](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1336)

returns the underlying Temporal.ZonedDateTime

#### Returns

`ZonedDateTime`

***

### toInstant()

> **toInstant**(): `Instant`

Defined in: [tempo.class.ts:1348](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1348)

returns the underlying Temporal.Instant

#### Returns

`Instant`

***

### toJSON()

> **toJSON**(): `object`

Defined in: [tempo.class.ts:1360](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1360)

Custom JSON serialization for `JSON.stringify`.

#### Returns

##### calendar

> **calendar**: `CalendarLike`

Temporal calendar

##### catch

> **catch**: `boolean` \| `undefined`

catch or throw Errors

##### debug

> **debug**: `boolean` \| `undefined`

additional console.log for tracking

##### discovery

> **discovery**: `string` \| `symbol`

globalThis Discovery Symbol

##### formats

> **formats**: `EnumifyType`

pre-configured format strings

##### locale

> **locale**: `string`

locale (e.g. en-AU)

##### mode

> **mode**: `"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

##### plugins

> **plugins**: `Plugin` \| `Plugin`[]

plugins to be automatically extended

##### rtfFormat

> **rtfFormat**: `RelativeTimeFormat`

Pre-configured relative time formatter

##### rtfStyle

> **rtfStyle**: `RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

##### scope

> **scope**: `"global"` \| `"local"`

configuration (global | local)

##### silent

> **silent**: `boolean` \| `undefined`

suppress console output during catch

##### sphere

> **sphere**: `"north"` \| `"south"` \| `"east"` \| `"west"` \| `undefined`

hemisphere for term.qtr or term.szn

##### store

> **store**: `string`

localStorage key

##### timeStamp

> **timeStamp**: `TimeStamp`

Precision to measure timestamps (ms | us)

##### timeZone

> **timeZone**: `TimeZoneLike`

Temporal timeZone

##### value

> **value**: `string`

***

### toNow()

> **toNow**(): `ZonedDateTime`

Defined in: [tempo.class.ts:1350](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1350)

the current system time localized to this instance.

#### Returns

`ZonedDateTime`

***

### toPlainDate()

> **toPlainDate**(): `PlainDate`

Defined in: [tempo.class.ts:1345](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1345)

returns a Temporal.PlainDate representation

#### Returns

`PlainDate`

***

### toPlainDateTime()

> **toPlainDateTime**(): `PlainDateTime`

Defined in: [tempo.class.ts:1347](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1347)

returns a Temporal.PlainDateTime representation

#### Returns

`PlainDateTime`

***

### toPlainTime()

> **toPlainTime**(): `PlainTime`

Defined in: [tempo.class.ts:1346](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1346)

returns a Temporal.PlainTime representation

#### Returns

`PlainTime`

***

### toString()

> **toString**(): `string`

Defined in: [tempo.class.ts:1353](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1353)

ISO8601 string representation of the date-time.

#### Returns

`string`

***

### until()

#### Call Signature

> **until**(...`args`): `any`

Defined in: [tempo.class.ts:1321](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1321)

time duration until another date-time

##### Parameters

###### args

...`any`[]

##### Returns

`any`

#### Call Signature

> **until**(`dateTimeOrOpts?`, `opts?`): `Duration`

Defined in: [plugin/module/module.duration.ts:13](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/plugin/module/module.duration.ts#L13)

time duration until (returns Duration)

##### Parameters

###### dateTimeOrOpts?

`DateTime` \| \{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: `Pair`[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: `Plugin` \| `Plugin`[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: `DateTime`; \}

`DateTime`

***

###### Type Literal

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: `Pair`[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: `Plugin` \| `Plugin`[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: `DateTime`; \}

###### calendar?

CalendarLike \| undefined

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

RelativeTimeFormatStyle \| undefined

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

TimeStamp \| undefined

Precision to measure timestamps (ms | us)

###### timeZone?

TimeZoneLike \| undefined

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

###### opts?

###### calendar?

`CalendarLike`

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

`PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

`PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

`RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

`TimeStamp`

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

##### Returns

`Duration`

#### Call Signature

> **until**(`unit`, `opts?`): `number`

Defined in: [plugin/module/module.duration.ts:14](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/plugin/module/module.duration.ts#L14)

time duration until (with unit, returns number)

##### Parameters

###### unit

`Unit`

###### opts?

###### calendar?

`CalendarLike`

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

`PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

`PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

`RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

`TimeStamp`

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

##### Returns

`number`

#### Call Signature

> **until**(`dateTimeOrOpts`, `unit`): `number`

Defined in: [plugin/module/module.duration.ts:15](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/plugin/module/module.duration.ts#L15)

time duration until another date-time (with unit )

##### Parameters

###### dateTimeOrOpts

`DateTime` \| \{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: `Pair`[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: `Plugin` \| `Plugin`[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: `DateTime`; \}

`DateTime`

***

###### Type Literal

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: `Pair`[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: `Plugin` \| `Plugin`[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: `DateTime`; \}

###### calendar?

CalendarLike \| undefined

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

RelativeTimeFormatStyle \| undefined

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

TimeStamp \| undefined

Precision to measure timestamps (ms | us)

###### timeZone?

TimeZoneLike \| undefined

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

###### unit

`Unit`

##### Returns

`number`

#### Call Signature

> **until**(`optsOrDate?`, `optsOrUntil?`): `number` \| `Duration`

Defined in: [plugin/module/module.duration.ts:16](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/plugin/module/module.duration.ts#L16)

fallback: union of possible returns

##### Parameters

###### optsOrDate?

`string` \| `number` \| `bigint` \| `Tempo` \| `Instant` \| `ZonedDateTime` \| `Date` \| `PlainDate` \| `PlainTime` \| `PlainDateTime` \| `Duration` \| `ZonedDateTimeLikeObject` \| \{\[`key`: `string`\]: `any`; `calendar?`: `CalendarLike`; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: `Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>; `formats?`: `Property`\<`any`\>; `layout?`: `PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>; `locale?`: `string`; `mdyLayouts?`: `Pair`[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: `PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>; `pivot?`: `number`; `plugins?`: `Plugin` \| `Plugin`[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: `RelativeTimeFormatStyle`; `silent?`: `boolean`; `snippet?`: `Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: `TimeStamp`; `timeZone?`: `TimeZoneLike`; `value?`: `DateTime`; \} \| `object` & `object` \| `null`

`string`

***

`number`

***

`bigint`

***

`Tempo`

***

`Instant`

***

`ZonedDateTime`

***

`Date`

***

`PlainDate`

***

`PlainTime`

***

`PlainDateTime`

***

`Duration`

***

`ZonedDateTimeLikeObject`

***

###### Type Literal

\{\[`key`: `string`\]: `any`; `calendar?`: `CalendarLike`; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: `Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>; `formats?`: `Property`\<`any`\>; `layout?`: `PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>; `locale?`: `string`; `mdyLayouts?`: `Pair`[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: `PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>; `pivot?`: `number`; `plugins?`: `Plugin` \| `Plugin`[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: `RelativeTimeFormatStyle`; `silent?`: `boolean`; `snippet?`: `Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: `TimeStamp`; `timeZone?`: `TimeZoneLike`; `value?`: `DateTime`; \}

###### calendar?

`CalendarLike`

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

`PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

`PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

`RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

`TimeStamp`

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

***

`object` & `object`

***

`null`

###### optsOrUntil?

`Until` \| \{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: `Pair`[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: `Plugin` \| `Plugin`[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: `DateTime`; \}

`Until`

***

###### Type Literal

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: `Pair`[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: `Plugin` \| `Plugin`[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: `DateTime`; \}

###### calendar?

CalendarLike \| undefined

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

RelativeTimeFormatStyle \| undefined

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

TimeStamp \| undefined

Precision to measure timestamps (ms | us)

###### timeZone?

TimeZoneLike \| undefined

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

##### Returns

`number` \| `Duration`

***

### \[dispose\]()

> `static` **\[dispose\]**(): `void`

Defined in: [tempo.class.ts:957](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L957)

release global config and reset library to defaults

#### Returns

`void`

***

### \[hasInstance\]()

> `static` **\[hasInstance\]**(`instance`): `boolean`

Defined in: [tempo.class.ts:961](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L961)

#### Parameters

##### instance

`any`

#### Returns

`boolean`

***

### \[iterator\]()

> `static` **\[iterator\]**(): `ArrayIterator`\<`string`\>

Defined in: [tempo.class.ts:952](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L952)

iterate over Tempo properties

#### Returns

`ArrayIterator`\<`string`\>

***

### compare()

> `static` **compare**(`tempo1?`, `tempo2?`): `number`

Defined in: [tempo.class.ts:861](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L861)

Compares two `Tempo` instances or date-time values.

#### Parameters

##### tempo1?

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: `Pair`[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: `Plugin` \| `Plugin`[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: `DateTime`; \} \| `DateTime`

###### Type Literal

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: `Pair`[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: `Plugin` \| `Plugin`[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: `DateTime`; \}

###### calendar?

CalendarLike \| undefined

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

RelativeTimeFormatStyle \| undefined

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

TimeStamp \| undefined

Precision to measure timestamps (ms | us)

###### timeZone?

TimeZoneLike \| undefined

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

***

`DateTime`

##### tempo2?

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: `Pair`[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: `Plugin` \| `Plugin`[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: `DateTime`; \} \| `DateTime`

###### Type Literal

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: `Pair`[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: `Plugin` \| `Plugin`[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: `DateTime`; \}

###### calendar?

CalendarLike \| undefined

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

RelativeTimeFormatStyle \| undefined

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

TimeStamp \| undefined

Precision to measure timestamps (ms | us)

###### timeZone?

TimeZoneLike \| undefined

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

***

`DateTime`

#### Returns

`number`

***

### duration()

> `static` **duration**(`input`): `Duration`

Defined in: [tempo.class.ts:783](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L783)

returns a full Tempo Duration object (EDO) for the given input

#### Parameters

##### input

`any`

#### Returns

`Duration`

***

### extend()

#### Call Signature

> `static` **extend**(`plugin`, `options?`): *typeof* [`Tempo`](../@magmacomputing/namespaces/Tempo/README.md)

Defined in: [tempo.class.ts:592](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L592)

Register a plugin or term extension.

##### Parameters

###### plugin

`Plugin`

A plugin or term extension to register.

###### options?

Optional configuration for the plugin.

###### calendar?

`CalendarLike`

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

`PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

`PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

`RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

`TimeStamp`

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

##### Returns

*typeof* [`Tempo`](../@magmacomputing/namespaces/Tempo/README.md)

#### Call Signature

> `static` **extend**(`plugins`, `options?`): *typeof* [`Tempo`](../@magmacomputing/namespaces/Tempo/README.md)

Defined in: [tempo.class.ts:599](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L599)

Register an array of plugins or term extensions.

##### Parameters

###### plugins

`any`[]

An array of plugins, terms, or extensions to register.

###### options?

Optional configuration for the plugins.

###### calendar?

`CalendarLike`

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

`PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

`PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

`RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

`TimeStamp`

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

##### Returns

*typeof* [`Tempo`](../@magmacomputing/namespaces/Tempo/README.md)

#### Call Signature

> `static` **extend**(...`args`): *typeof* [`Tempo`](../@magmacomputing/namespaces/Tempo/README.md)

Defined in: [tempo.class.ts:605](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L605)

Register multiple plugins or term extensions.

##### Parameters

###### args

...`any`[]

A plugin, term, or list of extensions to register.

##### Returns

*typeof* [`Tempo`](../@magmacomputing/namespaces/Tempo/README.md)

***

### from()

#### Call Signature

> `static` **from**(`options?`): `Tempo`

Defined in: [tempo.class.ts:897](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L897)

Creates a new `Tempo` instance.

##### Parameters

###### options?

###### calendar?

`CalendarLike`

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

`PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

`PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

`RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

`TimeStamp`

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

##### Returns

`Tempo`

#### Call Signature

> `static` **from**(`tempo`, `options?`): `Tempo`

Defined in: [tempo.class.ts:898](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L898)

Creates a new `Tempo` instance.

##### Parameters

###### tempo

`DateTime`

###### options?

###### calendar?

`CalendarLike`

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

`PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

`PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

`RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

`TimeStamp`

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

##### Returns

`Tempo`

***

### init()

> `static` **init**(`options?`): *typeof* [`Tempo`](../@magmacomputing/namespaces/Tempo/README.md)

Defined in: [tempo.class.ts:712](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L712)

Reset Tempo to its default, built-in registration state

#### Parameters

##### options?

###### calendar?

`CalendarLike`

Temporal calendar

###### catch?

`boolean`

catch or throw Errors

###### debug?

`boolean`

additional console.log for tracking

###### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

###### event?

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

`PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

`Pair`[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

`PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

###### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

###### rtfStyle?

`RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

###### silent?

`boolean`

suppress console output during catch

###### snippet?

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

`TimeStamp`

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

`DateTime`

supplied value to parse

#### Returns

*typeof* [`Tempo`](../@magmacomputing/namespaces/Tempo/README.md)

***

### isTempo()

> `static` **isTempo**(`instance?`): `instance is Tempo`

Defined in: [tempo.class.ts:966](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L966)

check if a supplied variable is a valid Tempo instance

#### Parameters

##### instance?

`any`

#### Returns

`instance is Tempo`

***

### now()

> `static` **now**(): `bigint`

Defined in: [tempo.class.ts:901](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L901)

#### Returns

`bigint`
