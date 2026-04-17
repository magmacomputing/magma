[**@magmacomputing/tempo**](../../../../README.md)

***

Defined in: [tempo.class.ts:1897](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1897)

## Extends

- `Params`\<`T`\>

## Type Parameters

### T

`T`

## Call Signature

> **Params**(`tempo?`, `options?`): `T`

Defined in: [tempo.class.ts:1897](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1897)

### Parameters

#### tempo?

`DateTime`

#### options?

##### calendar?

`CalendarLike`

Temporal calendar

##### catch?

`boolean`

catch or throw Errors

##### debug?

`boolean`

additional console.log for tracking

##### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

##### event?

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => [`Tempo`](../../../../classes/Tempo.md); `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => [`Tempo`](../../../../classes/Tempo.md); \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>

custom date aliases (events).

##### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

##### layout?

`PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

##### locale?

`string`

locale (e.g. en-AU)

##### mdyLayouts?

`Pair`[]

swap parse-order of layouts

##### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

##### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

##### period?

`PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

##### pivot?

`number`

pivot year for two-digit years

##### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

##### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

##### rtfStyle?

`RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

##### silent?

`boolean`

suppress console output during catch

##### snippet?

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>

date-time snippets to help compose a Layout

##### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

##### store?

`string`

localStorage key

##### timeStamp?

`TimeStamp`

Precision to measure timestamps (ms | us)

##### timeZone?

`TimeZoneLike`

Temporal timeZone

##### value?

`DateTime`

supplied value to parse

### Returns

`T`

## Call Signature

> **Params**(`options`): `T`

Defined in: [tempo.class.ts:1897](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L1897)

### Parameters

#### options

##### calendar?

`CalendarLike`

Temporal calendar

##### catch?

`boolean`

catch or throw Errors

##### debug?

`boolean`

additional console.log for tracking

##### discovery?

`string` \| `symbol`

globalThis Discovery Symbol

##### event?

`Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => [`Tempo`](../../../../classes/Tempo.md); `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => [`Tempo`](../../../../classes/Tempo.md); \}, `string`, `string` \| `Function`\> \| `PatternOption`\<`Logic`\>

custom date aliases (events).

##### formats?

`Property`\<`any`\>

custom format strings to merge in the FORMAT enum

##### layout?

`PatternOption`\<`Pattern`\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

##### locale?

`string`

locale (e.g. en-AU)

##### mdyLayouts?

`Pair`[]

swap parse-order of layouts

##### mdyLocales?

`string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

##### mode?

`"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

##### period?

`PatternOption`\<`Logic`\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

##### pivot?

`number`

pivot year for two-digit years

##### plugins?

`Plugin` \| `Plugin`[]

plugins to be automatically extended

##### rtfFormat?

`RelativeTimeFormat`

Pre-configured relative time formatter

##### rtfStyle?

`RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

##### silent?

`boolean`

suppress console output during catch

##### snippet?

`Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| `PatternOption`\<`Pattern`\>

date-time snippets to help compose a Layout

##### sphere?

`"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

##### store?

`string`

localStorage key

##### timeStamp?

`TimeStamp`

Precision to measure timestamps (ms | us)

##### timeZone?

`TimeZoneLike`

Temporal timeZone

##### value?

`DateTime`

supplied value to parse

### Returns

`T`
