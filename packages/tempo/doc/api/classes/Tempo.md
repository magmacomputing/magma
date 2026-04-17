[**@magmacomputing/tempo**](../README.md)

***

Defined in: [tempo.class.ts:71](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L71)

# Tempo
A powerful wrapper around `Temporal.ZonedDateTime` for flexible parsing and intuitive manipulation of date-time objects.
Bridges the gap between raw string/number inputs and the strict requirements of the ECMAScript Temporal API.

## Indexable

> \[`key`: `symbol`\]: `string` \| `boolean` \| ((`hint?`) => `string` \| `number` \| `bigint`) \| (() => `ArrayIterator`\<`EntryOf`\<`any`\>\>) \| (() => `object`)

## Constructors

### Constructor

> **new Tempo**(`options?`): `Tempo`

Defined in: [tempo.class.ts:1035](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1035)

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

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

[`Pair`](../type-aliases/Pair.md)[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

[`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md)

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

#### Returns

`Tempo`

### Constructor

> **new Tempo**(`tempo`, `options?`): `Tempo`

Defined in: [tempo.class.ts:1042](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1042)

Instantiates a new `Tempo` object with a value.

#### Parameters

##### tempo

[`DateTime`](../type-aliases/DateTime.md)

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

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

[`Pair`](../type-aliases/Pair.md)[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

[`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md)

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

#### Returns

`Tempo`

## Accessors

### \[toStringTag\]

#### Get Signature

> **get** **\[toStringTag\]**(): `string`

Defined in: [tempo.class.ts:1024](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1024)

##### Returns

`string`

***

### cal

#### Get Signature

> **get** **cal**(): `string`

Defined in: [tempo.class.ts:1217](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1217)

Temporal Calendar ID (e.g., 'iso8601' | 'gregory')

##### Returns

`string`

***

### config

#### Get Signature

> **get** **config**(): [`Config`](../@magmacomputing/namespaces/Internal/interfaces/Config.md)

Defined in: [tempo.class.ts:1258](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1258)

current Tempo configuration

##### Returns

[`Config`](../@magmacomputing/namespaces/Internal/interfaces/Config.md)

***

### day

#### Get Signature

> **get** **day**(): `number`

Defined in: [tempo.class.ts:1208](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1208)

Day of the month (alias for `dd`)

##### Returns

`number`

***

### dd

#### Get Signature

> **get** **dd**(): `number`

Defined in: [tempo.class.ts:1207](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1207)

Day of the month (1-31)

##### Returns

`number`

***

### dow

#### Get Signature

> **get** **dow**(): `0` \| `1` \| `2` \| `3` \| `4` \| `5` \| `6` \| `7`

Defined in: [tempo.class.ts:1223](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1223)

ISO weekday number: Mon=1, Sun=7

##### Returns

`0` \| `1` \| `2` \| `3` \| `4` \| `5` \| `6` \| `7`

***

### epoch

#### Get Signature

> **get** **epoch**(): `SecureObject`\<\{ `ms`: `number`; `ns`: `bigint`; `ss`: `number`; `us`: `number`; \}\>

Defined in: [tempo.class.ts:1288](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1288)

units since epoch

##### Returns

`SecureObject`\<\{ `ms`: `number`; `ns`: `bigint`; `ss`: `number`; `us`: `number`; \}\>

***

### ff

#### Get Signature

> **get** **ff**(): `number`

Defined in: [tempo.class.ts:1215](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1215)

Fractional seconds (e.g., 0.123456789)

##### Returns

`number`

***

### fmt

#### Get Signature

> **get** **fmt**(): `any`

Defined in: [tempo.class.ts:1287](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1287)

Formatted results for all pre-defined format codes

##### Returns

`any`

***

### hh

#### Get Signature

> **get** **hh**(): [`hh`](../type-aliases/hh.md)

Defined in: [tempo.class.ts:1209](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1209)

Hour of the day (0-23)

##### Returns

[`hh`](../type-aliases/hh.md)

***

### isValid

#### Get Signature

> **get** **isValid**(): `boolean`

Defined in: [tempo.class.ts:1226](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1226)

`true` if the underlying date-time is valid.

##### Returns

`boolean`

***

### mi

#### Get Signature

> **get** **mi**(): [`mi`](../type-aliases/mi.md)

Defined in: [tempo.class.ts:1210](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1210)

Minutes of the hour (0-59)

##### Returns

[`mi`](../type-aliases/mi.md)

***

### mm

#### Get Signature

> **get** **mm**(): [`mm`](../type-aliases/mm.md)

Defined in: [tempo.class.ts:1205](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1205)

Month number: Jan=1, Dec=12

##### Returns

[`mm`](../type-aliases/mm.md)

***

### mmm

#### Get Signature

> **get** **mmm**(): `"All"` \| `"Jan"` \| `"Feb"` \| `"Mar"` \| `"Apr"` \| `"May"` \| `"Jun"` \| `"Jul"` \| `"Aug"` \| `"Sep"` \| `"Oct"` \| `"Nov"` \| `"Dec"`

Defined in: [tempo.class.ts:1219](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1219)

Short month name (e.g., 'Jan')

##### Returns

`"All"` \| `"Jan"` \| `"Feb"` \| `"Mar"` \| `"Apr"` \| `"May"` \| `"Jun"` \| `"Jul"` \| `"Aug"` \| `"Sep"` \| `"Oct"` \| `"Nov"` \| `"Dec"`

***

### mon

#### Get Signature

> **get** **mon**(): `"May"` \| `"Every"` \| `"January"` \| `"February"` \| `"March"` \| `"April"` \| `"June"` \| `"July"` \| `"August"` \| `"September"` \| `"October"` \| `"November"` \| `"December"`

Defined in: [tempo.class.ts:1220](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1220)

Full month name (e.g., 'January')

##### Returns

`"May"` \| `"Every"` \| `"January"` \| `"February"` \| `"March"` \| `"April"` \| `"June"` \| `"July"` \| `"August"` \| `"September"` \| `"October"` \| `"November"` \| `"December"`

***

### ms

#### Get Signature

> **get** **ms**(): [`ms`](../type-aliases/ms.md)

Defined in: [tempo.class.ts:1212](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1212)

Milliseconds of the second (0-999)

##### Returns

[`ms`](../type-aliases/ms.md)

***

### nano

#### Get Signature

> **get** **nano**(): `bigint`

Defined in: [tempo.class.ts:1224](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1224)

Nanoseconds since Unix epoch (BigInt)

##### Returns

`bigint`

***

### ns

#### Get Signature

> **get** **ns**(): [`ns`](../type-aliases/ns.md)

Defined in: [tempo.class.ts:1214](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1214)

Nanoseconds of the microsecond (0-999)

##### Returns

[`ns`](../type-aliases/ns.md)

***

### parse

#### Get Signature

> **get** **parse**(): [`Parse`](../@magmacomputing/namespaces/Internal/interfaces/Parse.md)

Defined in: [tempo.class.ts:1281](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1281)

Instance-specific parse rules (merged with global)

##### Returns

[`Parse`](../@magmacomputing/namespaces/Internal/interfaces/Parse.md)

***

### ranges

#### Get Signature

> **get** **ranges**(): `Record`\<`string`, `string`\>

Defined in: [tempo.class.ts:1245](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1245)

current range key for every registered term

##### Returns

`Record`\<`string`, `string`\>

***

### ss

#### Get Signature

> **get** **ss**(): [`ss`](../type-aliases/ss.md)

Defined in: [tempo.class.ts:1211](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1211)

Seconds of the minute (0-59)

##### Returns

[`ss`](../type-aliases/ss.md)

***

### term

#### Get Signature

> **get** **term**(): `any`

Defined in: [tempo.class.ts:1286](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1286)

Object containing results from all term plugins

##### Returns

`any`

***

### terms

#### Get Signature

> **get** **terms**(): `Record`\<`string`, `string`[]\>

Defined in: [tempo.class.ts:1232](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1232)

list of registered terms and their available range keys

##### Returns

`Record`\<`string`, `string`[]\>

***

### ts

#### Get Signature

> **get** **ts**(): `number` \| `bigint`

Defined in: [tempo.class.ts:1218](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1218)

Unix timestamp (defaults to milliseconds)

##### Returns

`number` \| `bigint`

***

### tz

#### Get Signature

> **get** **tz**(): `string`

Defined in: [tempo.class.ts:1216](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1216)

IANA Time Zone ID (e.g., 'Australia/Sydney')

##### Returns

`string`

***

### us

#### Get Signature

> **get** **us**(): [`us`](../type-aliases/us.md)

Defined in: [tempo.class.ts:1213](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1213)

Microseconds of the millisecond (0-999)

##### Returns

[`us`](../type-aliases/us.md)

***

### wkd

#### Get Signature

> **get** **wkd**(): `"Everyday"` \| `"Monday"` \| `"Tuesday"` \| `"Wednesday"` \| `"Thursday"` \| `"Friday"` \| `"Saturday"` \| `"Sunday"`

Defined in: [tempo.class.ts:1222](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1222)

Full weekday name (e.g., 'Monday')

##### Returns

`"Everyday"` \| `"Monday"` \| `"Tuesday"` \| `"Wednesday"` \| `"Thursday"` \| `"Friday"` \| `"Saturday"` \| `"Sunday"`

***

### ww

#### Get Signature

> **get** **ww**(): [`ww`](../type-aliases/ww.md)

Defined in: [tempo.class.ts:1206](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1206)

ISO week number of the year

##### Returns

[`ww`](../type-aliases/ww.md)

***

### www

#### Get Signature

> **get** **www**(): `"All"` \| `"Mon"` \| `"Tue"` \| `"Wed"` \| `"Thu"` \| `"Fri"` \| `"Sat"` \| `"Sun"`

Defined in: [tempo.class.ts:1221](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1221)

Short weekday name (e.g., 'Mon')

##### Returns

`"All"` \| `"Mon"` \| `"Tue"` \| `"Wed"` \| `"Thu"` \| `"Fri"` \| `"Sat"` \| `"Sun"`

***

### yw

#### Get Signature

> **get** **yw**(): `number` \| `undefined`

Defined in: [tempo.class.ts:1204](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1204)

4-digit ISO week-numbering year

##### Returns

`number` \| `undefined`

***

### yy

#### Get Signature

> **get** **yy**(): `number`

Defined in: [tempo.class.ts:1203](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1203)

4-digit year (e.g., 2024)

##### Returns

`number`

***

### config

#### Get Signature

> **get** `static` **config**(): `any`

Defined in: [tempo.class.ts:860](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L860)

global Tempo configuration

##### Returns

`any`

***

### default

#### Get Signature

> **get** `static` **default**(): `Readonly`\<\{ `calendar?`: `string` \| `SecureObject`\<`ZonedDateTime`\> \| `SecureObject`\<`PlainDate`\> \| `SecureObject`\<`PlainDateTime`\> \| `SecureObject`\<`PlainMonthDay`\> \| `SecureObject`\<`PlainYearMonth`\>; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: [`Logic`](../type-aliases/Logic.md) \| `SecureObject`\<`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\>\> \| `SecureObject`\<`Record`\<`string` \| `symbol`, [`Logic`](../type-aliases/Logic.md)\>\> \| `SecureArray`\<[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>\>; `formats?`: `SecureObject`\<`Property`\<`any`\>\>; `layout?`: [`Pattern`](../type-aliases/Pattern.md) \| `SecureObject`\<`Record`\<`string` \| `symbol`, [`Pattern`](../type-aliases/Pattern.md)\>\> \| `SecureArray`\<[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>\> \| `SecureObject`\<`Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>\>; `locale?`: `string`; `mdyLayouts?`: `SecureArray`\<[`Pair`](../type-aliases/Pair.md)\>; `mdyLocales?`: `string` \| `SecureArray`\<`string`\>; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: [`Logic`](../type-aliases/Logic.md) \| `SecureObject`\<`Record`\<`string` \| `symbol`, [`Logic`](../type-aliases/Logic.md)\>\> \| `SecureArray`\<[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>\> \| `SecureObject`\<`Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>\>; `pivot?`: `number`; `plugins?`: `SecureObject`\<[`Plugin`](../interfaces/Plugin.md)\> \| `SecureArray`\<[`Plugin`](../interfaces/Plugin.md)\>; `rtfFormat?`: `SecureObject`\<`RelativeTimeFormat`\>; `rtfStyle?`: `RelativeTimeFormatStyle`; `scope`: `"default"`; `silent?`: `boolean`; `snippet?`: [`Pattern`](../type-aliases/Pattern.md) \| `SecureObject`\<`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\>\> \| `SecureObject`\<`Record`\<`string` \| `symbol`, [`Pattern`](../type-aliases/Pattern.md)\>\> \| `SecureArray`\<[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>\>; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: [`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md); `timeZone`: `string` \| `SecureObject`\<`ZonedDateTime`\>; `value?`: `string` \| `number` \| `bigint` \| `Date` \| `SecureObject`\<`ZonedDateTime`\> \| `SecureObject`\<`PlainDate`\> \| `SecureObject`\<`PlainDateTime`\> \| `SecureObject`\<`Tempo`\> \| `SecureObject`\<`Instant`\> \| `SecureObject`\<`PlainTime`\> \| `SecureObject`\<`Duration`\> \| `SecureObject`\<`ZonedDateTimeLikeObject`\> \| `null`; \}\>

Defined in: [tempo.class.ts:923](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L923)

Tempo initial default settings

##### Returns

`Readonly`\<\{ `calendar?`: `string` \| `SecureObject`\<`ZonedDateTime`\> \| `SecureObject`\<`PlainDate`\> \| `SecureObject`\<`PlainDateTime`\> \| `SecureObject`\<`PlainMonthDay`\> \| `SecureObject`\<`PlainYearMonth`\>; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: [`Logic`](../type-aliases/Logic.md) \| `SecureObject`\<`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\>\> \| `SecureObject`\<`Record`\<`string` \| `symbol`, [`Logic`](../type-aliases/Logic.md)\>\> \| `SecureArray`\<[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>\>; `formats?`: `SecureObject`\<`Property`\<`any`\>\>; `layout?`: [`Pattern`](../type-aliases/Pattern.md) \| `SecureObject`\<`Record`\<`string` \| `symbol`, [`Pattern`](../type-aliases/Pattern.md)\>\> \| `SecureArray`\<[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>\> \| `SecureObject`\<`Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>\>; `locale?`: `string`; `mdyLayouts?`: `SecureArray`\<[`Pair`](../type-aliases/Pair.md)\>; `mdyLocales?`: `string` \| `SecureArray`\<`string`\>; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: [`Logic`](../type-aliases/Logic.md) \| `SecureObject`\<`Record`\<`string` \| `symbol`, [`Logic`](../type-aliases/Logic.md)\>\> \| `SecureArray`\<[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>\> \| `SecureObject`\<`Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>\>; `pivot?`: `number`; `plugins?`: `SecureObject`\<[`Plugin`](../interfaces/Plugin.md)\> \| `SecureArray`\<[`Plugin`](../interfaces/Plugin.md)\>; `rtfFormat?`: `SecureObject`\<`RelativeTimeFormat`\>; `rtfStyle?`: `RelativeTimeFormatStyle`; `scope`: `"default"`; `silent?`: `boolean`; `snippet?`: [`Pattern`](../type-aliases/Pattern.md) \| `SecureObject`\<`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\>\> \| `SecureObject`\<`Record`\<`string` \| `symbol`, [`Pattern`](../type-aliases/Pattern.md)\>\> \| `SecureArray`\<[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>\>; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: [`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md); `timeZone`: `string` \| `SecureObject`\<`ZonedDateTime`\>; `value?`: `string` \| `number` \| `bigint` \| `Date` \| `SecureObject`\<`ZonedDateTime`\> \| `SecureObject`\<`PlainDate`\> \| `SecureObject`\<`PlainDateTime`\> \| `SecureObject`\<`Tempo`\> \| `SecureObject`\<`Instant`\> \| `SecureObject`\<`PlainTime`\> \| `SecureObject`\<`Duration`\> \| `SecureObject`\<`ZonedDateTimeLikeObject`\> \| `null`; \}\>

***

### discovery

#### Get Signature

> **get** `static` **discovery**(): `any`

Defined in: [tempo.class.ts:876](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L876)

global discovery configuration

##### Returns

`any`

***

### FORMAT

#### Get Signature

> **get** `static` **FORMAT**(): `EnumifyType`\<\{ `date`: `"{yyyy}-{mm}-{dd}"`; `dayDate`: `"{dd}-{mmm}-{yyyy}"`; `dayMonth`: `"{dd}-{mmm}"`; `dayTime`: `"{dd}-{mmm}-{yyyy} {hh}:{mi}:{ss}"`; `display`: `"{www}, {dd} {mmm} {yyyy}"`; `logStamp`: `"{yyyy}{mm}{dd}T{hhmiss}.{ff}"`; `sortTime`: `"{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}"`; `time`: `"{hh}:{mi}:{ss}"`; `weekDate`: `"{www}, {yyyy}-{mmm}-{dd}"`; `weekStamp`: `"{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}.{ff}"`; `weekTime`: `"{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}"`; `yearMonth`: `"{yyyy}{mm}"`; `yearMonthDay`: `"{yyyy}{mm}{dd}"`; `yearWeek`: `"{yw}{ww}"`; \}\>

Defined in: [tempo.class.ts:83](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L83)

Pre-configured format {name -> string} pairs

##### Returns

`EnumifyType`\<\{ `date`: `"{yyyy}-{mm}-{dd}"`; `dayDate`: `"{dd}-{mmm}-{yyyy}"`; `dayMonth`: `"{dd}-{mmm}"`; `dayTime`: `"{dd}-{mmm}-{yyyy} {hh}:{mi}:{ss}"`; `display`: `"{www}, {dd} {mmm} {yyyy}"`; `logStamp`: `"{yyyy}{mm}{dd}T{hhmiss}.{ff}"`; `sortTime`: `"{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}"`; `time`: `"{hh}:{mi}:{ss}"`; `weekDate`: `"{www}, {yyyy}-{mmm}-{dd}"`; `weekStamp`: `"{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}.{ff}"`; `weekTime`: `"{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}"`; `yearMonth`: `"{yyyy}{mm}"`; `yearMonthDay`: `"{yyyy}{mm}{dd}"`; `yearWeek`: `"{yw}{ww}"`; \}\>

***

### formats

#### Get Signature

> **get** `static` **formats**(): `any`

Defined in: [tempo.class.ts:912](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L912)

static Tempo.formats (registry)

##### Returns

`any`

***

### instant

#### Get Signature

> **get** `static` **instant**(): `Instant`

Defined in: [tempo.class.ts:895](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L895)

get the current system Instant

##### Returns

`Instant`

***

### LIMIT

#### Get Signature

> **get** `static` **LIMIT**(): `object`

Defined in: [tempo.class.ts:87](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L87)

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

Defined in: [tempo.class.ts:86](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L86)

initialization strategies

##### Returns

`EnumifyType`\<\{ `Auto`: `"auto"`; `Defer`: `"defer"`; `Strict`: `"strict"`; \}\>

***

### NUMBER

#### Get Signature

> **get** `static` **NUMBER**(): `EnumifyType`\<\{ `eight`: `8`; `five`: `5`; `four`: `4`; `nine`: `9`; `one`: `1`; `seven`: `7`; `six`: `6`; `ten`: `10`; `three`: `3`; `two`: `2`; `zero`: `0`; \}\>

Defined in: [tempo.class.ts:84](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L84)

Number names (0-10)

##### Returns

`EnumifyType`\<\{ `eight`: `8`; `five`: `5`; `four`: `4`; `nine`: `9`; `one`: `1`; `seven`: `7`; `six`: `6`; `ten`: `10`; `three`: `3`; `two`: `2`; `zero`: `0`; \}\>

***

### options

#### Get Signature

> **get** `static` **options**(): `any`

Defined in: [tempo.class.ts:882](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L882)

##### Returns

`any`

***

### parse

#### Get Signature

> **get** `static` **parse**(): [`Parse`](../@magmacomputing/namespaces/Internal/interfaces/Parse.md)

Defined in: [tempo.class.ts:930](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L930)

configuration governing the static 'rules' used when parsing t.DateTime argument

##### Returns

[`Parse`](../@magmacomputing/namespaces/Internal/interfaces/Parse.md)

***

### properties

#### Get Signature

> **get** `static` **properties**(): `SecureArray`\<`string`\>

Defined in: [tempo.class.ts:917](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L917)

static Tempo properties getter

##### Returns

`SecureArray`\<`string`\>

***

### terms

#### Get Signature

> **get** `static` **terms**(): `SecureArray`\<`Omit`\<[`TermPlugin`](../interfaces/TermPlugin.md), `"define"` \| `"resolve"`\>\> & `Record`\<`string`, `Omit`\<[`TermPlugin`](../interfaces/TermPlugin.md), `"define"` \| `"resolve"`\>\>

Defined in: [tempo.class.ts:898](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L898)

static Tempo.terms (registry)

##### Returns

`SecureArray`\<`Omit`\<[`TermPlugin`](../interfaces/TermPlugin.md), `"define"` \| `"resolve"`\>\> & `Record`\<`string`, `Omit`\<[`TermPlugin`](../interfaces/TermPlugin.md), `"define"` \| `"resolve"`\>\>

***

### TIMEZONE

#### Get Signature

> **get** `static` **TIMEZONE**(): `object`

Defined in: [tempo.class.ts:85](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L85)

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

Defined in: [tempo.class.ts:1020](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1020)

iterate over instance formats

#### Returns

`ArrayIterator`\<`EntryOf`\<`any`\>\>

***

### \[toPrimitive\]()

> **\[toPrimitive\]**(`hint?`): `string` \| `number` \| `bigint`

Defined in: [tempo.class.ts:1011](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1011)

allow for auto-convert of Tempo to BigInt, Number or String

#### Parameters

##### hint?

`"string"` \| `"number"` \| `"default"`

#### Returns

`string` \| `number` \| `bigint`

***

### add()

> **add**(`tempo?`, `options?`): `Tempo`

Defined in: [tempo.class.ts:1321](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1321)

returns a new `Tempo` with specific duration added.

#### Parameters

##### tempo?

[`Add`](../type-aliases/Add.md)

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

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

[`Pair`](../type-aliases/Pair.md)[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

[`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md)

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

#### Returns

`Tempo`

***

### clone()

> **clone**(): `Tempo`

Defined in: [tempo.class.ts:1323](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1323)

returns a clone of the current `Tempo` instance.

#### Returns

`Tempo`

***

### format()

#### Call Signature

> **format**\<`K`\>(`fmt`): `any`

Defined in: [tempo.class.ts:1305](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1305)

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

Defined in: [plugin/module/module.format.ts:12](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/module/module.format.ts#L12)

applies a format to the instance.

##### Parameters

###### fmt

`any`

##### Returns

`any`

***

### set()

> **set**(`tempo?`, `options?`): `Tempo`

Defined in: [tempo.class.ts:1322](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1322)

returns a new `Tempo` with specific offsets.

#### Parameters

##### tempo?

[`Set`](../type-aliases/Set.md)

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

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

[`Pair`](../type-aliases/Pair.md)[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

[`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md)

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

#### Returns

`Tempo`

***

### since()

#### Call Signature

> **since**(...`args`): `any`

Defined in: [tempo.class.ts:1316](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1316)

time elapsed since another date-time

##### Parameters

###### args

...`any`[]

##### Returns

`any`

#### Call Signature

> **since**(`until`, `opts?`): `string`

Defined in: [plugin/module/module.duration.ts:18](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/module/module.duration.ts#L18)

time elapsed since (with unit)

##### Parameters

###### until

[`Until`](../type-aliases/Until.md)

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

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

[`Pair`](../type-aliases/Pair.md)[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

[`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md)

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

##### Returns

`string`

#### Call Signature

> **since**(`dateTimeOrOpts`, `until`): `string`

Defined in: [plugin/module/module.duration.ts:19](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/module/module.duration.ts#L19)

time elapsed since another date-time (with unit)

##### Parameters

###### dateTimeOrOpts

[`DateTime`](../type-aliases/DateTime.md) \| \{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: [`DateTime`](../type-aliases/DateTime.md); \}

[`DateTime`](../type-aliases/DateTime.md)

***

###### Type Literal

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: [`DateTime`](../type-aliases/DateTime.md); \}

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

[`Pair`](../type-aliases/Pair.md)[]

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

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

###### until

[`Until`](../type-aliases/Until.md)

##### Returns

`string`

#### Call Signature

> **since**(`dateTimeOrOpts?`, `opts?`): `string`

Defined in: [plugin/module/module.duration.ts:20](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/module/module.duration.ts#L20)

time elapsed since another date-time (w'out unit)

##### Parameters

###### dateTimeOrOpts?

[`DateTime`](../type-aliases/DateTime.md) \| \{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: [`DateTime`](../type-aliases/DateTime.md); \}

[`DateTime`](../type-aliases/DateTime.md)

***

###### Type Literal

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: [`DateTime`](../type-aliases/DateTime.md); \}

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

[`Pair`](../type-aliases/Pair.md)[]

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

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

[`DateTime`](../type-aliases/DateTime.md)

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

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

[`Pair`](../type-aliases/Pair.md)[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

[`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md)

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

##### Returns

`string`

#### Call Signature

> **since**(`optsOrDate?`, `optsOrUntil?`): `string`

Defined in: [plugin/module/module.duration.ts:21](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/module/module.duration.ts#L21)

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

Defined in: [tempo.class.ts:1341](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1341)

the date-time as a standard `Date` object.

#### Returns

`Date`

***

### toDateTime()

> **toDateTime**(): `ZonedDateTime`

Defined in: [tempo.class.ts:1326](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1326)

returns the underlying Temporal.ZonedDateTime

#### Returns

`ZonedDateTime`

***

### toInstant()

> **toInstant**(): `Instant`

Defined in: [tempo.class.ts:1338](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1338)

returns the underlying Temporal.Instant

#### Returns

`Instant`

***

### toJSON()

> **toJSON**(): `object`

Defined in: [tempo.class.ts:1350](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1350)

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

> **plugins**: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

> **timeStamp**: [`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md)

Precision to measure timestamps (ms | us)

##### timeZone

> **timeZone**: `TimeZoneLike`

Temporal timeZone

##### value

> **value**: `string`

***

### toNow()

> **toNow**(): `ZonedDateTime`

Defined in: [tempo.class.ts:1340](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1340)

the current system time localized to this instance.

#### Returns

`ZonedDateTime`

***

### toPlainDate()

> **toPlainDate**(): `PlainDate`

Defined in: [tempo.class.ts:1335](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1335)

returns a Temporal.PlainDate representation

#### Returns

`PlainDate`

***

### toPlainDateTime()

> **toPlainDateTime**(): `PlainDateTime`

Defined in: [tempo.class.ts:1337](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1337)

returns a Temporal.PlainDateTime representation

#### Returns

`PlainDateTime`

***

### toPlainTime()

> **toPlainTime**(): `PlainTime`

Defined in: [tempo.class.ts:1336](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1336)

returns a Temporal.PlainTime representation

#### Returns

`PlainTime`

***

### toString()

> **toString**(): `string`

Defined in: [tempo.class.ts:1343](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1343)

ISO8601 string representation of the date-time.

#### Returns

`string`

***

### until()

#### Call Signature

> **until**(...`args`): `any`

Defined in: [tempo.class.ts:1311](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1311)

time duration until another date-time

##### Parameters

###### args

...`any`[]

##### Returns

`any`

#### Call Signature

> **until**(`dateTimeOrOpts?`, `opts?`): [`Duration`](../type-aliases/Duration.md)

Defined in: [plugin/module/module.duration.ts:13](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/module/module.duration.ts#L13)

time duration until (returns Duration)

##### Parameters

###### dateTimeOrOpts?

[`DateTime`](../type-aliases/DateTime.md) \| \{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: [`DateTime`](../type-aliases/DateTime.md); \}

[`DateTime`](../type-aliases/DateTime.md)

***

###### Type Literal

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: [`DateTime`](../type-aliases/DateTime.md); \}

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

[`Pair`](../type-aliases/Pair.md)[]

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

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

[`DateTime`](../type-aliases/DateTime.md)

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

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

[`Pair`](../type-aliases/Pair.md)[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

[`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md)

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

##### Returns

[`Duration`](../type-aliases/Duration.md)

#### Call Signature

> **until**(`unit`, `opts?`): `number`

Defined in: [plugin/module/module.duration.ts:14](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/module/module.duration.ts#L14)

time duration until (with unit, returns number)

##### Parameters

###### unit

[`Unit`](../type-aliases/Unit.md)

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

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

[`Pair`](../type-aliases/Pair.md)[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

[`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md)

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

##### Returns

`number`

#### Call Signature

> **until**(`dateTimeOrOpts`, `unit`): `number`

Defined in: [plugin/module/module.duration.ts:15](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/module/module.duration.ts#L15)

time duration until another date-time (with unit )

##### Parameters

###### dateTimeOrOpts

[`DateTime`](../type-aliases/DateTime.md) \| \{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: [`DateTime`](../type-aliases/DateTime.md); \}

[`DateTime`](../type-aliases/DateTime.md)

***

###### Type Literal

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: [`DateTime`](../type-aliases/DateTime.md); \}

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

[`Pair`](../type-aliases/Pair.md)[]

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

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

###### unit

[`Unit`](../type-aliases/Unit.md)

##### Returns

`number`

#### Call Signature

> **until**(`optsOrDate?`, `optsOrUntil?`): `number` \| [`Duration`](../type-aliases/Duration.md)

Defined in: [plugin/module/module.duration.ts:16](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/module/module.duration.ts#L16)

fallback: union of possible returns

##### Parameters

###### optsOrDate?

`string` \| `number` \| `bigint` \| `Tempo` \| `Instant` \| `ZonedDateTime` \| `Date` \| `PlainDate` \| `PlainTime` \| `PlainDateTime` \| `Duration` \| `ZonedDateTimeLikeObject` \| \{\[`key`: `string`\]: `any`; `calendar?`: `CalendarLike`; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: `Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>; `formats?`: `Property`\<`any`\>; `layout?`: [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>; `pivot?`: `number`; `plugins?`: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: `RelativeTimeFormatStyle`; `silent?`: `boolean`; `snippet?`: `Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: [`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md); `timeZone?`: `TimeZoneLike`; `value?`: [`DateTime`](../type-aliases/DateTime.md); \} \| `object` & `object` \| `null`

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

\{\[`key`: `string`\]: `any`; `calendar?`: `CalendarLike`; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: `Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>; `formats?`: `Property`\<`any`\>; `layout?`: [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>; `pivot?`: `number`; `plugins?`: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: `RelativeTimeFormatStyle`; `silent?`: `boolean`; `snippet?`: `Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: [`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md); `timeZone?`: `TimeZoneLike`; `value?`: [`DateTime`](../type-aliases/DateTime.md); \}

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

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

[`Pair`](../type-aliases/Pair.md)[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

[`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md)

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

***

`object` & `object`

***

`null`

###### optsOrUntil?

[`Until`](../type-aliases/Until.md) \| \{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: [`DateTime`](../type-aliases/DateTime.md); \}

[`Until`](../type-aliases/Until.md)

***

###### Type Literal

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: [`DateTime`](../type-aliases/DateTime.md); \}

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

[`Pair`](../type-aliases/Pair.md)[]

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

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

##### Returns

`number` \| [`Duration`](../type-aliases/Duration.md)

***

### \[dispose\]()

> `static` **\[dispose\]**(): `void`

Defined in: [tempo.class.ts:949](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L949)

release global config and reset library to defaults

#### Returns

`void`

***

### \[hasInstance\]()

> `static` **\[hasInstance\]**(`instance`): `boolean`

Defined in: [tempo.class.ts:953](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L953)

#### Parameters

##### instance

`any`

#### Returns

`boolean`

***

### \[iterator\]()

> `static` **\[iterator\]**(): `ArrayIterator`\<`string`\>

Defined in: [tempo.class.ts:944](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L944)

iterate over Tempo properties

#### Returns

`ArrayIterator`\<`string`\>

***

### compare()

> `static` **compare**(`tempo1?`, `tempo2?`): `number`

Defined in: [tempo.class.ts:853](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L853)

Compares two `Tempo` instances or date-time values.

#### Parameters

##### tempo1?

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: [`DateTime`](../type-aliases/DateTime.md); \} \| [`DateTime`](../type-aliases/DateTime.md)

###### Type Literal

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: [`DateTime`](../type-aliases/DateTime.md); \}

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

[`Pair`](../type-aliases/Pair.md)[]

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

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

***

[`DateTime`](../type-aliases/DateTime.md)

##### tempo2?

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: [`DateTime`](../type-aliases/DateTime.md); \} \| [`DateTime`](../type-aliases/DateTime.md)

###### Type Literal

\{\[`key`: `string`\]: `any`; `calendar?`: CalendarLike \| undefined; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: Extend\<\{ readonly 'new.?years? ?eve': "31 Dec"; readonly nye: "31 Dec"; readonly 'new.?years?( ?day)?': "01 Jan"; readonly ny: "01 Jan"; readonly 'christmas ?eve': "24 Dec"; readonly christmas: "25 Dec"; ... 5 more ...; readonly yesterday: (this: Tempo) =\> Tempo; \}, string, string \| Function\> \| PatternOption\<...\> \| ...; `formats?`: `Property`\<`any`\>; `layout?`: PatternOption\<Pattern\> \| Extend\<\{ readonly \[x: symbol\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| ... 5 more ... \| "\{nbr\}\{sep\}?\{unt\}\{sep\}?\{afx\}"; \}, symbol, string\> \| undefined; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: PatternOption\<Logic\> \| Extend\<\{ readonly 'mid\[ -\]?night': "24:00"; readonly morning: "8:00"; readonly 'mid\[ -\]?morning': "10:00"; readonly 'mid\[ -\]?day': "12:00"; readonly noon: "12:00"; readonly 'after\[ -\]?noon': "3:00pm"; readonly evening: "18:00"; readonly night: "20:00"; \}, string, string \| Function\> \| undefined; `pivot?`: `number`; `plugins?`: [`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: RelativeTimeFormatStyle \| undefined; `silent?`: `boolean`; `snippet?`: Extend\<\{ readonly \[x: symbol\]: RegExp; \}, symbol, RegExp\> \| PatternOption\<Pattern\> \| undefined; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: TimeStamp \| undefined; `timeZone?`: TimeZoneLike \| undefined; `value?`: [`DateTime`](../type-aliases/DateTime.md); \}

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

[`Pair`](../type-aliases/Pair.md)[]

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

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

***

[`DateTime`](../type-aliases/DateTime.md)

#### Returns

`number`

***

### duration()

> `static` **duration**(`input`): [`Duration`](../type-aliases/Duration.md)

Defined in: [tempo.class.ts:775](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L775)

returns a full Tempo Duration object (EDO) for the given input

#### Parameters

##### input

`any`

#### Returns

[`Duration`](../type-aliases/Duration.md)

***

### extend()

#### Call Signature

> `static` **extend**(`plugin`, `options?`): *typeof* [`Tempo`](../@magmacomputing/namespaces/Tempo/README.md)

Defined in: [tempo.class.ts:588](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L588)

Register a plugin or term extension.

##### Parameters

###### plugin

[`Plugin`](../interfaces/Plugin.md)

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

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

[`Pair`](../type-aliases/Pair.md)[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

[`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md)

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

##### Returns

*typeof* [`Tempo`](../@magmacomputing/namespaces/Tempo/README.md)

#### Call Signature

> `static` **extend**(`plugins`, `options?`): *typeof* [`Tempo`](../@magmacomputing/namespaces/Tempo/README.md)

Defined in: [tempo.class.ts:595](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L595)

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

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

[`Pair`](../type-aliases/Pair.md)[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

[`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md)

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

##### Returns

*typeof* [`Tempo`](../@magmacomputing/namespaces/Tempo/README.md)

#### Call Signature

> `static` **extend**(...`args`): *typeof* [`Tempo`](../@magmacomputing/namespaces/Tempo/README.md)

Defined in: [tempo.class.ts:601](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L601)

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

Defined in: [tempo.class.ts:889](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L889)

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

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

[`Pair`](../type-aliases/Pair.md)[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

[`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md)

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

##### Returns

`Tempo`

#### Call Signature

> `static` **from**(`tempo`, `options?`): `Tempo`

Defined in: [tempo.class.ts:890](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L890)

Creates a new `Tempo` instance.

##### Parameters

###### tempo

[`DateTime`](../type-aliases/DateTime.md)

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

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

[`Pair`](../type-aliases/Pair.md)[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

[`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md)

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

##### Returns

`Tempo`

***

### init()

> `static` **init**(`options?`): *typeof* [`Tempo`](../@magmacomputing/namespaces/Tempo/README.md)

Defined in: [tempo.class.ts:704](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L704)

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

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => `Tempo`; `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => `Tempo`; \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\>

custom date aliases (events).

###### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

###### layout?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

###### locale?

`string`

locale (e.g. en-AU)

###### mdyLayouts?

[`Pair`](../type-aliases/Pair.md)[]

swap parse-order of layouts

###### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

###### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

###### period?

[`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Logic`](../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

###### pivot?

`number`

pivot year for two-digit years

###### plugins?

[`Plugin`](../interfaces/Plugin.md) \| [`Plugin`](../interfaces/Plugin.md)[]

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

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../@magmacomputing/namespaces/Internal/type-aliases/PatternOption.md)\<[`Pattern`](../type-aliases/Pattern.md)\>

date-time snippets to help compose a Layout

###### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

###### store?

`string`

localStorage key

###### timeStamp?

[`TimeStamp`](../@magmacomputing/namespaces/Internal/type-aliases/TimeStamp.md)

Precision to measure timestamps (ms | us)

###### timeZone?

`TimeZoneLike`

Temporal timeZone

###### value?

[`DateTime`](../type-aliases/DateTime.md)

supplied value to parse

#### Returns

*typeof* [`Tempo`](../@magmacomputing/namespaces/Tempo/README.md)

***

### isTempo()

> `static` **isTempo**(`instance?`): `instance is Tempo`

Defined in: [tempo.class.ts:958](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L958)

check if a supplied variable is a valid Tempo instance

#### Parameters

##### instance?

`any`

#### Returns

`instance is Tempo`

***

### now()

> `static` **now**(): `bigint`

Defined in: [tempo.class.ts:893](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L893)

#### Returns

`bigint`
