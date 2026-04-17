[**@magmacomputing/tempo**](../../../../README.md)

***

Defined in: [tempo.type.ts:155](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L155)

the Options object found in a config-module, or passed to a call to Tempo.init({}) or 'new Tempo({})'

## Extended by

- [`BaseOptions`](../../Tempo/interfaces/BaseOptions.md)

## Properties

### calendar

> **calendar**: `CalendarLike`

Defined in: [tempo.type.ts:162](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L162)

Temporal calendar

***

### catch

> **catch**: `boolean` \| `undefined`

Defined in: [tempo.type.ts:159](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L159)

catch or throw Errors

***

### debug

> **debug**: `boolean` \| `undefined`

Defined in: [tempo.type.ts:158](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L158)

additional console.log for tracking

***

### discovery

> **discovery**: `string` \| `symbol`

Defined in: [tempo.type.ts:157](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L157)

globalThis Discovery Symbol

***

### event

> **event**: `Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => [`Tempo`](../../../../classes/Tempo.md); `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => [`Tempo`](../../../../classes/Tempo.md); \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../type-aliases/PatternOption.md)\<[`Logic`](../../../../type-aliases/Logic.md)\>

Defined in: [tempo.type.ts:174](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L174)

custom date aliases (events).

***

### formats

> **formats**: `Property`\<`any`\>

Defined in: [tempo.type.ts:176](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L176)

custom format strings to merge in the FORMAT enum

***

### layout

> **layout**: [`PatternOption`](../type-aliases/PatternOption.md)\<[`Pattern`](../../../../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

Defined in: [tempo.type.ts:173](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L173)

patterns to help parse value

***

### locale

> **locale**: `string`

Defined in: [tempo.type.ts:163](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L163)

locale (e.g. en-AU)

***

### mdyLayouts

> **mdyLayouts**: [`Pair`](../../../../type-aliases/Pair.md)[]

Defined in: [tempo.type.ts:171](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L171)

swap parse-order of layouts

***

### mdyLocales

> **mdyLocales**: `string` \| `string`[]

Defined in: [tempo.type.ts:170](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L170)

locale-names that prefer 'mm-dd-yy' date order

***

### mode?

> `optional` **mode?**: `"auto"` \| `"strict"` \| `"defer"`

Defined in: [tempo.type.ts:169](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L169)

initialization strategy ('auto'|'strict'|'defer')

***

### period

> **period**: [`PatternOption`](../type-aliases/PatternOption.md)\<[`Logic`](../../../../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

Defined in: [tempo.type.ts:175](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L175)

custom time aliases (periods).

***

### pivot

> **pivot**: `number`

Defined in: [tempo.type.ts:164](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L164)

pivot year for two-digit years

***

### plugins

> **plugins**: [`Plugin`](../../../../interfaces/Plugin.md) \| [`Plugin`](../../../../interfaces/Plugin.md)[]

Defined in: [tempo.type.ts:177](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L177)

plugins to be automatically extended

***

### rtfFormat?

> `optional` **rtfFormat?**: `RelativeTimeFormat`

Defined in: [tempo.type.ts:166](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L166)

Pre-configured relative time formatter

***

### rtfStyle?

> `optional` **rtfStyle?**: `RelativeTimeFormatStyle`

Defined in: [tempo.type.ts:167](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L167)

Default style for relative time ('long' | 'short' | 'narrow')

***

### silent

> **silent**: `boolean` \| `undefined`

Defined in: [tempo.type.ts:160](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L160)

suppress console output during catch

***

### snippet

> **snippet**: `Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../type-aliases/PatternOption.md)\<[`Pattern`](../../../../type-aliases/Pattern.md)\>

Defined in: [tempo.type.ts:172](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L172)

date-time snippets to help compose a Layout

***

### sphere

> **sphere**: `"north"` \| `"south"` \| `"east"` \| `"west"` \| `undefined`

Defined in: [tempo.type.ts:165](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L165)

hemisphere for term.qtr or term.szn

***

### store

> **store**: `string`

Defined in: [tempo.type.ts:156](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L156)

localStorage key

***

### timeStamp?

> `optional` **timeStamp?**: [`TimeStamp`](../type-aliases/TimeStamp.md)

Defined in: [tempo.type.ts:168](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L168)

Precision to measure timestamps (ms | us)

***

### timeZone

> **timeZone**: `TimeZoneLike`

Defined in: [tempo.type.ts:161](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L161)

Temporal timeZone

***

### value

> **value**: [`DateTime`](../../../../type-aliases/DateTime.md)

Defined in: [tempo.type.ts:178](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L178)

supplied value to parse
