[**@magmacomputing/tempo**](../../../../README.md)

***

Defined in: [tempo.type.ts:237](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L237)

structured configuration for Global Discovery via Symbol.for('$Tempo')

## Properties

### formats?

> `optional` **formats?**: `Property`\<`any`\>

Defined in: [tempo.type.ts:241](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L241)

custom format strings to merge in the FORMAT dictionary

***

### numbers?

> `optional` **numbers?**: `Record`\<`string`, `number`\>

Defined in: [tempo.type.ts:240](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L240)

aliases to merge in the Number-Word dictionary

***

### options?

> `optional` **options?**: \{\[`key`: `string`\]: `any`; `calendar?`: `CalendarLike`; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: `Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => [`Tempo`](../../../../classes/Tempo.md); `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => [`Tempo`](../../../../classes/Tempo.md); \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../type-aliases/PatternOption.md)\<[`Logic`](../../../../type-aliases/Logic.md)\>; `formats?`: `Property`\<`any`\>; `layout?`: [`PatternOption`](../type-aliases/PatternOption.md)\<[`Pattern`](../../../../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../../../../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: [`PatternOption`](../type-aliases/PatternOption.md)\<[`Logic`](../../../../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>; `pivot?`: `number`; `plugins?`: [`Plugin`](../../../../interfaces/Plugin.md) \| [`Plugin`](../../../../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: `RelativeTimeFormatStyle`; `silent?`: `boolean`; `snippet?`: `Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../type-aliases/PatternOption.md)\<[`Pattern`](../../../../type-aliases/Pattern.md)\>; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: [`TimeStamp`](../type-aliases/TimeStamp.md); `timeZone?`: `TimeZoneLike`; `value?`: [`DateTime`](../../../../type-aliases/DateTime.md); \} \| (() => `object`)

Defined in: [tempo.type.ts:238](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L238)

pre-defined config options for Tempo.#global

#### Union Members

##### Type Literal

\{\[`key`: `string`\]: `any`; `calendar?`: `CalendarLike`; `catch?`: `boolean`; `debug?`: `boolean`; `discovery?`: `string` \| `symbol`; `event?`: `Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => [`Tempo`](../../../../classes/Tempo.md); `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => [`Tempo`](../../../../classes/Tempo.md); \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../type-aliases/PatternOption.md)\<[`Logic`](../../../../type-aliases/Logic.md)\>; `formats?`: `Property`\<`any`\>; `layout?`: [`PatternOption`](../type-aliases/PatternOption.md)\<[`Pattern`](../../../../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>; `locale?`: `string`; `mdyLayouts?`: [`Pair`](../../../../type-aliases/Pair.md)[]; `mdyLocales?`: `string` \| `string`[]; `mode?`: `"auto"` \| `"strict"` \| `"defer"`; `period?`: [`PatternOption`](../type-aliases/PatternOption.md)\<[`Logic`](../../../../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>; `pivot?`: `number`; `plugins?`: [`Plugin`](../../../../interfaces/Plugin.md) \| [`Plugin`](../../../../interfaces/Plugin.md)[]; `rtfFormat?`: `RelativeTimeFormat`; `rtfStyle?`: `RelativeTimeFormatStyle`; `silent?`: `boolean`; `snippet?`: `Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../type-aliases/PatternOption.md)\<[`Pattern`](../../../../type-aliases/Pattern.md)\>; `sphere?`: `"north"` \| `"south"` \| `"east"` \| `"west"`; `store?`: `string`; `timeStamp?`: [`TimeStamp`](../type-aliases/TimeStamp.md); `timeZone?`: `TimeZoneLike`; `value?`: [`DateTime`](../../../../type-aliases/DateTime.md); \}

##### Index Signature

\[`key`: `string`\]: `any`

##### calendar?

> `optional` **calendar?**: `CalendarLike`

Temporal calendar

##### catch?

> `optional` **catch?**: `boolean`

catch or throw Errors

##### debug?

> `optional` **debug?**: `boolean`

additional console.log for tracking

##### discovery?

> `optional` **discovery?**: `string` \| `symbol`

globalThis Discovery Symbol

##### event?

> `optional` **event?**: `Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => [`Tempo`](../../../../classes/Tempo.md); `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => [`Tempo`](../../../../classes/Tempo.md); \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../type-aliases/PatternOption.md)\<[`Logic`](../../../../type-aliases/Logic.md)\>

custom date aliases (events).

##### formats?

> `optional` **formats?**: `Property`\<`any`\>

custom format strings to merge in the FORMAT enum

##### layout?

> `optional` **layout?**: [`PatternOption`](../type-aliases/PatternOption.md)\<[`Pattern`](../../../../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

patterns to help parse value

##### locale?

> `optional` **locale?**: `string`

locale (e.g. en-AU)

##### mdyLayouts?

> `optional` **mdyLayouts?**: [`Pair`](../../../../type-aliases/Pair.md)[]

swap parse-order of layouts

##### mdyLocales?

> `optional` **mdyLocales?**: `string` \| `string`[]

locale-names that prefer 'mm-dd-yy' date order

##### mode?

> `optional` **mode?**: `"auto"` \| `"strict"` \| `"defer"`

initialization strategy ('auto'|'strict'|'defer')

##### period?

> `optional` **period?**: [`PatternOption`](../type-aliases/PatternOption.md)\<[`Logic`](../../../../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

custom time aliases (periods).

##### pivot?

> `optional` **pivot?**: `number`

pivot year for two-digit years

##### plugins?

> `optional` **plugins?**: [`Plugin`](../../../../interfaces/Plugin.md) \| [`Plugin`](../../../../interfaces/Plugin.md)[]

plugins to be automatically extended

##### rtfFormat?

> `optional` **rtfFormat?**: `RelativeTimeFormat`

Pre-configured relative time formatter

##### rtfStyle?

> `optional` **rtfStyle?**: `RelativeTimeFormatStyle`

Default style for relative time ('long' | 'short' | 'narrow')

##### silent?

> `optional` **silent?**: `boolean`

suppress console output during catch

##### snippet?

> `optional` **snippet?**: `Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../type-aliases/PatternOption.md)\<[`Pattern`](../../../../type-aliases/Pattern.md)\>

date-time snippets to help compose a Layout

##### sphere?

> `optional` **sphere?**: `"north"` \| `"south"` \| `"east"` \| `"west"`

hemisphere for term.qtr or term.szn

##### store?

> `optional` **store?**: `string`

localStorage key

##### timeStamp?

> `optional` **timeStamp?**: [`TimeStamp`](../type-aliases/TimeStamp.md)

Precision to measure timestamps (ms | us)

##### timeZone?

> `optional` **timeZone?**: `TimeZoneLike`

Temporal timeZone

##### value?

> `optional` **value?**: [`DateTime`](../../../../type-aliases/DateTime.md)

supplied value to parse

***

##### Function

() => `object`

***

### plugins?

> `optional` **plugins?**: [`Plugin`](../../../../interfaces/Plugin.md) \| [`Plugin`](../../../../interfaces/Plugin.md)[]

Defined in: [tempo.type.ts:243](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L243)

plugins to be automatically extended via Tempo.extend()

***

### term?

> `optional` **term?**: [`TermPlugin`](../../../../interfaces/TermPlugin.md) \| [`TermPlugin`](../../../../interfaces/TermPlugin.md)[]

Defined in: [tempo.type.ts:242](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L242)

term plugins to be registered via Tempo.addTerm()

***

### ~~terms?~~

> `optional` **terms?**: [`TermPlugin`](../../../../interfaces/TermPlugin.md) \| [`TermPlugin`](../../../../interfaces/TermPlugin.md)[]

Defined in: [tempo.type.ts:244](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L244)

#### Deprecated

use term instead

***

### timeZones?

> `optional` **timeZones?**: `Record`\<`string`, `string`\>

Defined in: [tempo.type.ts:239](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L239)

aliases to merge in the TimeZone dictionary
