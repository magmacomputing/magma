[**@magmacomputing/tempo**](../../../../README.md)

***

Defined in: [tempo.class.ts:1836](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.class.ts#L1836)

the Options object found in a config-module, or passed to a call to Tempo.init({}) or 'new Tempo({})'

## Extends

- [`BaseOptions`](../../Internal/interfaces/BaseOptions.md)

## Properties

### calendar

> **calendar**: `CalendarLike`

Defined in: [tempo.type.ts:162](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L162)

Temporal calendar

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`calendar`](../../Internal/interfaces/BaseOptions.md#calendar)

***

### catch

> **catch**: `boolean` \| `undefined`

Defined in: [tempo.type.ts:159](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L159)

catch or throw Errors

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`catch`](../../Internal/interfaces/BaseOptions.md#catch)

***

### debug

> **debug**: `boolean` \| `undefined`

Defined in: [tempo.type.ts:158](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L158)

additional console.log for tracking

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`debug`](../../Internal/interfaces/BaseOptions.md#debug)

***

### discovery

> **discovery**: `string` \| `symbol`

Defined in: [tempo.type.ts:157](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L157)

globalThis Discovery Symbol

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`discovery`](../../Internal/interfaces/BaseOptions.md#discovery)

***

### event

> **event**: `Extend`\<\{ `christmas`: `"25 Dec"`; `christmas ?eve`: `"24 Dec"`; `new.?years? ?eve`: `"31 Dec"`; `new.?years?( ?day)?`: `"01 Jan"`; `now`: (`this`) => `ZonedDateTime`; `ny`: `"01 Jan"`; `nye`: `"31 Dec"`; `today`: (`this`) => `ZonedDateTime`; `tomorrow`: (`this`) => [`Tempo`](../../../../classes/Tempo.md); `xmas`: `"25 Dec"`; `xmas ?eve`: `"24 Dec"`; `yesterday`: (`this`) => [`Tempo`](../../../../classes/Tempo.md); \}, `string`, `string` \| `Function`\> \| [`PatternOption`](../../Internal/type-aliases/PatternOption.md)\<[`Logic`](../../../../type-aliases/Logic.md)\>

Defined in: [tempo.type.ts:174](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L174)

custom date aliases (events).

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`event`](../../Internal/interfaces/BaseOptions.md#event)

***

### formats

> **formats**: `Property`\<`any`\>

Defined in: [tempo.type.ts:176](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L176)

custom format strings to merge in the FORMAT enum

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`formats`](../../Internal/interfaces/BaseOptions.md#formats)

***

### layout

> **layout**: [`PatternOption`](../../Internal/type-aliases/PatternOption.md)\<[`Pattern`](../../../../type-aliases/Pattern.md)\> \| `Extend`\<\{\[`key`: `symbol`\]: "(\{dd\}\{sep\}?\{mm\}(\{sep\}?\{yy\})?\|\{mod\}?(\{evt\})\|(?\<slk\>\{slk\}))" \| "(\{hh\}\{mi\}?\{ss\}?\{ff\}?\{mer\}?\|\{per\})" \| "(\{dt\})(?:(?:\{sep\}+\|T)(\{tm\}))?\{tzd\}?\{brk\}?" \| `"({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?"` \| `"({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?"` \| `"{mod}?{wkd}{afx}?{sfx}?"` \| `"{mod}?{dd}{afx}?"` \| `"{nbr}{sep}?{unt}{sep}?{afx}"`; \}, `symbol`, `string`\>

Defined in: [tempo.type.ts:173](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L173)

patterns to help parse value

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`layout`](../../Internal/interfaces/BaseOptions.md#layout)

***

### locale

> **locale**: `string`

Defined in: [tempo.type.ts:163](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L163)

locale (e.g. en-AU)

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`locale`](../../Internal/interfaces/BaseOptions.md#locale)

***

### mdyLayouts

> **mdyLayouts**: [`Pair`](../../../../type-aliases/Pair.md)[]

Defined in: [tempo.type.ts:171](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L171)

swap parse-order of layouts

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`mdyLayouts`](../../Internal/interfaces/BaseOptions.md#mdylayouts)

***

### mdyLocales

> **mdyLocales**: `string` \| `string`[]

Defined in: [tempo.type.ts:170](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L170)

locale-names that prefer 'mm-dd-yy' date order

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`mdyLocales`](../../Internal/interfaces/BaseOptions.md#mdylocales)

***

### mode?

> `optional` **mode?**: `"auto"` \| `"strict"` \| `"defer"`

Defined in: [tempo.type.ts:169](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L169)

initialization strategy ('auto'|'strict'|'defer')

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`mode`](../../Internal/interfaces/BaseOptions.md#mode)

***

### period

> **period**: [`PatternOption`](../../Internal/type-aliases/PatternOption.md)\<[`Logic`](../../../../type-aliases/Logic.md)\> \| `Extend`\<\{ `after[ -]?noon`: `"3:00pm"`; `evening`: `"18:00"`; `mid[ -]?day`: `"12:00"`; `mid[ -]?morning`: `"10:00"`; `mid[ -]?night`: `"24:00"`; `morning`: `"8:00"`; `night`: `"20:00"`; `noon`: `"12:00"`; \}, `string`, `string` \| `Function`\>

Defined in: [tempo.type.ts:175](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L175)

custom time aliases (periods).

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`period`](../../Internal/interfaces/BaseOptions.md#period)

***

### pivot

> **pivot**: `number`

Defined in: [tempo.type.ts:164](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L164)

pivot year for two-digit years

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`pivot`](../../Internal/interfaces/BaseOptions.md#pivot)

***

### plugins

> **plugins**: [`Plugin`](../../../../interfaces/Plugin.md) \| [`Plugin`](../../../../interfaces/Plugin.md)[]

Defined in: [tempo.type.ts:177](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L177)

plugins to be automatically extended

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`plugins`](../../Internal/interfaces/BaseOptions.md#plugins)

***

### rtfFormat?

> `optional` **rtfFormat?**: `RelativeTimeFormat`

Defined in: [tempo.type.ts:166](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L166)

Pre-configured relative time formatter

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`rtfFormat`](../../Internal/interfaces/BaseOptions.md#rtfformat)

***

### rtfStyle?

> `optional` **rtfStyle?**: `RelativeTimeFormatStyle`

Defined in: [tempo.type.ts:167](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L167)

Default style for relative time ('long' | 'short' | 'narrow')

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`rtfStyle`](../../Internal/interfaces/BaseOptions.md#rtfstyle)

***

### silent

> **silent**: `boolean` \| `undefined`

Defined in: [tempo.type.ts:160](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L160)

suppress console output during catch

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`silent`](../../Internal/interfaces/BaseOptions.md#silent)

***

### snippet

> **snippet**: `Extend`\<\{\[`key`: `symbol`\]: `RegExp`; \}, `symbol`, `RegExp`\> \| [`PatternOption`](../../Internal/type-aliases/PatternOption.md)\<[`Pattern`](../../../../type-aliases/Pattern.md)\>

Defined in: [tempo.type.ts:172](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L172)

date-time snippets to help compose a Layout

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`snippet`](../../Internal/interfaces/BaseOptions.md#snippet)

***

### sphere

> **sphere**: `"north"` \| `"south"` \| `"east"` \| `"west"` \| `undefined`

Defined in: [tempo.type.ts:165](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L165)

hemisphere for term.qtr or term.szn

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`sphere`](../../Internal/interfaces/BaseOptions.md#sphere)

***

### store

> **store**: `string`

Defined in: [tempo.type.ts:156](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L156)

localStorage key

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`store`](../../Internal/interfaces/BaseOptions.md#store)

***

### timeStamp?

> `optional` **timeStamp?**: [`TimeStamp`](../../Internal/type-aliases/TimeStamp.md)

Defined in: [tempo.type.ts:168](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L168)

Precision to measure timestamps (ms | us)

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`timeStamp`](../../Internal/interfaces/BaseOptions.md#timestamp)

***

### timeZone

> **timeZone**: `TimeZoneLike`

Defined in: [tempo.type.ts:161](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L161)

Temporal timeZone

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`timeZone`](../../Internal/interfaces/BaseOptions.md#timezone)

***

### value

> **value**: [`DateTime`](../../../../type-aliases/DateTime.md)

Defined in: [tempo.type.ts:178](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L178)

supplied value to parse

#### Inherited from

[`BaseOptions`](../../Internal/interfaces/BaseOptions.md).[`value`](../../Internal/interfaces/BaseOptions.md#value)
