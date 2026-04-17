[**@magmacomputing/tempo**](../README.md)

***

Defined in: [plugin/plugin.type.ts:10](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/plugin.type.ts#L10)

## TermPlugin
Interface for term-driven parsing and resolution.

## Properties

### define

> **define**: (`this`, `keyOnly?`, `anchor?`) => `string` \| [`Range`](../type-aliases/Range.md) \| [`Range`](../type-aliases/Range.md)[] \| `undefined`

Defined in: [plugin/plugin.type.ts:17](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/plugin.type.ts#L17)

#### Parameters

##### this

[`Tempo`](../classes/Tempo.md)

##### keyOnly?

`boolean`

##### anchor?

`any`

#### Returns

`string` \| [`Range`](../type-aliases/Range.md) \| [`Range`](../type-aliases/Range.md)[] \| `undefined`

***

### description?

> `optional` **description?**: `string`

Defined in: [plugin/plugin.type.ts:13](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/plugin.type.ts#L13)

***

### groups?

> `optional` **groups?**: `any`

Defined in: [plugin/plugin.type.ts:14](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/plugin.type.ts#L14)

***

### key

> **key**: `string`

Defined in: [plugin/plugin.type.ts:11](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/plugin.type.ts#L11)

***

### ranges?

> `optional` **ranges?**: `any`[]

Defined in: [plugin/plugin.type.ts:15](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/plugin.type.ts#L15)

***

### resolve?

> `optional` **resolve?**: (`this`, `anchor?`) => [`Range`](../type-aliases/Range.md)[]

Defined in: [plugin/plugin.type.ts:16](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/plugin.type.ts#L16)

#### Parameters

##### this

[`Tempo`](../classes/Tempo.md)

##### anchor?

`any`

#### Returns

[`Range`](../type-aliases/Range.md)[]

***

### scope?

> `optional` **scope?**: `string`

Defined in: [plugin/plugin.type.ts:12](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/plugin.type.ts#L12)
