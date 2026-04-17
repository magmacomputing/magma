[**@magmacomputing/tempo**](../../../../README.md)

***

Defined in: [tempo.type.ts:198](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L198)

Debugging results of a parse operation. See `doc/tempo.api.md`.

## Properties

### event

> **event**: `Extend`

Defined in: [tempo.type.ts:206](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L206)

configured Events

***

### isAnchored?

> `optional` **isAnchored?**: `boolean`

Defined in: [tempo.type.ts:210](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L210)

was this a nested/anchored parse?

***

### isMonthDay?

> `optional` **isMonthDay?**: `boolean`

Defined in: [tempo.type.ts:201](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L201)

is a timeZone that prefers 'mmddyyyy' date order

***

### layout

> **layout**: `Extend`

Defined in: [tempo.type.ts:204](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L204)

Tempo layout strings

***

### mdyLayouts

> **mdyLayouts**: [`Pair`](../../../../type-aliases/Pair.md)[]

Defined in: [tempo.type.ts:200](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L200)

Layout names that are switched to mdy

***

### mdyLocales

> **mdyLocales**: `object`[]

Defined in: [tempo.type.ts:199](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L199)

Locales which prefer 'mm-dd-yyyy' date-order

#### locale

> **locale**: `string`

#### timeZones

> **timeZones**: `string`[]

***

### mode

> **mode**: `"auto"` \| `"strict"` \| `"defer"`

Defined in: [tempo.type.ts:211](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L211)

initialization strategy ('auto'|'strict'|'defer')

***

### pattern

> **pattern**: [`Registry`](../type-aliases/Registry.md)

Defined in: [tempo.type.ts:205](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L205)

Map of regex-patterns to match input-string

***

### period

> **period**: `Extend`

Defined in: [tempo.type.ts:207](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L207)

configured Periods

***

### pivot

> **pivot**: `number`

Defined in: [tempo.type.ts:208](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L208)

pivot year for two-digit years

***

### result

> **result**: [`Match`](../type-aliases/Match.md)[]

Defined in: [tempo.type.ts:209](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L209)

parsing match result

***

### snippet

> **snippet**: `Extend`

Defined in: [tempo.type.ts:203](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L203)

Tempo snippets to aid in parsing

***

### token

> **token**: `Extend`

Defined in: [tempo.type.ts:202](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L202)

Symbol registry
