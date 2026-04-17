[**@magmacomputing/tempo**](../../../../README.md)

***

Defined in: [tempo.type.ts:230](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L230)

Instance configuration derived from supply, storage, and discovery.

## Extends

- `Required`\<`Omit`\<[`OptionsKeep`](../type-aliases/OptionsKeep.md), `"formats"`\>\>

## Indexable

> \[`key`: `string`\]: `any`

index-signature

## Properties

### calendar

> **calendar**: `CalendarLike`

Defined in: [tempo.type.ts:162](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L162)

Temporal calendar

#### Inherited from

[`BaseOptions`](../../Tempo/interfaces/BaseOptions.md).[`calendar`](../../Tempo/interfaces/BaseOptions.md#calendar)

***

### catch

> **catch**: `boolean` \| `undefined`

Defined in: [tempo.type.ts:159](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L159)

catch or throw Errors

#### Inherited from

[`BaseOptions`](../../Tempo/interfaces/BaseOptions.md).[`catch`](../../Tempo/interfaces/BaseOptions.md#catch)

***

### debug

> **debug**: `boolean` \| `undefined`

Defined in: [tempo.type.ts:158](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L158)

additional console.log for tracking

#### Inherited from

[`BaseOptions`](../../Tempo/interfaces/BaseOptions.md).[`debug`](../../Tempo/interfaces/BaseOptions.md#debug)

***

### discovery

> **discovery**: `string` \| `symbol`

Defined in: [tempo.type.ts:157](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L157)

globalThis Discovery Symbol

#### Inherited from

[`BaseOptions`](../../Tempo/interfaces/BaseOptions.md).[`discovery`](../../Tempo/interfaces/BaseOptions.md#discovery)

***

### formats

> **formats**: `EnumifyType`

Defined in: [tempo.type.ts:232](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L232)

pre-configured format strings

***

### locale

> **locale**: `string`

Defined in: [tempo.type.ts:163](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L163)

locale (e.g. en-AU)

#### Inherited from

[`BaseOptions`](../../Tempo/interfaces/BaseOptions.md).[`locale`](../../Tempo/interfaces/BaseOptions.md#locale)

***

### mode

> **mode**: `"auto"` \| `"strict"` \| `"defer"`

Defined in: [tempo.type.ts:169](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L169)

initialization strategy ('auto'|'strict'|'defer')

#### Inherited from

[`BaseOptions`](../../Tempo/interfaces/BaseOptions.md).[`mode`](../../Tempo/interfaces/BaseOptions.md#mode)

***

### plugins

> **plugins**: [`Plugin`](../../../../interfaces/Plugin.md) \| [`Plugin`](../../../../interfaces/Plugin.md)[]

Defined in: [tempo.type.ts:177](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L177)

plugins to be automatically extended

#### Inherited from

[`BaseOptions`](../../Tempo/interfaces/BaseOptions.md).[`plugins`](../../Tempo/interfaces/BaseOptions.md#plugins)

***

### rtfFormat

> **rtfFormat**: `RelativeTimeFormat`

Defined in: [tempo.type.ts:166](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L166)

Pre-configured relative time formatter

#### Inherited from

[`BaseOptions`](../../Tempo/interfaces/BaseOptions.md).[`rtfFormat`](../../Tempo/interfaces/BaseOptions.md#rtfformat)

***

### rtfStyle

> **rtfStyle**: `RelativeTimeFormatStyle`

Defined in: [tempo.type.ts:167](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L167)

Default style for relative time ('long' | 'short' | 'narrow')

#### Inherited from

[`BaseOptions`](../../Tempo/interfaces/BaseOptions.md).[`rtfStyle`](../../Tempo/interfaces/BaseOptions.md#rtfstyle)

***

### scope

> **scope**: `"global"` \| `"local"`

Defined in: [tempo.type.ts:231](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L231)

configuration (global | local)

***

### silent

> **silent**: `boolean` \| `undefined`

Defined in: [tempo.type.ts:160](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L160)

suppress console output during catch

#### Inherited from

[`BaseOptions`](../../Tempo/interfaces/BaseOptions.md).[`silent`](../../Tempo/interfaces/BaseOptions.md#silent)

***

### sphere

> **sphere**: `"north"` \| `"south"` \| `"east"` \| `"west"` \| `undefined`

Defined in: [tempo.type.ts:165](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L165)

hemisphere for term.qtr or term.szn

#### Inherited from

[`BaseOptions`](../../Tempo/interfaces/BaseOptions.md).[`sphere`](../../Tempo/interfaces/BaseOptions.md#sphere)

***

### store

> **store**: `string`

Defined in: [tempo.type.ts:156](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L156)

localStorage key

#### Inherited from

[`BaseOptions`](../../Tempo/interfaces/BaseOptions.md).[`store`](../../Tempo/interfaces/BaseOptions.md#store)

***

### timeStamp

> **timeStamp**: [`TimeStamp`](../type-aliases/TimeStamp.md)

Defined in: [tempo.type.ts:168](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L168)

Precision to measure timestamps (ms | us)

#### Inherited from

[`BaseOptions`](../../Tempo/interfaces/BaseOptions.md).[`timeStamp`](../../Tempo/interfaces/BaseOptions.md#timestamp)

***

### timeZone

> **timeZone**: `TimeZoneLike`

Defined in: [tempo.type.ts:161](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L161)

Temporal timeZone

#### Inherited from

[`BaseOptions`](../../Tempo/interfaces/BaseOptions.md).[`timeZone`](../../Tempo/interfaces/BaseOptions.md#timezone)
