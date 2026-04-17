[**@magmacomputing/tempo**](../README.md)

***

Defined in: [plugin/plugin.type.ts:27](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/plugin.type.ts#L27)

## Plugin
Interface for general Tempo plugins (Modules/Extensions).

## Extended by

- [`PluginContainer`](../@magmacomputing/namespaces/Internal/interfaces/PluginContainer.md)
- [`Module`](Module.md)
- [`Extension`](Extension.md)

## Properties

### install

> **install**: (`this`, `t`) => `void`

Defined in: [plugin/plugin.type.ts:29](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/plugin.type.ts#L29)

#### Parameters

##### this

[`Tempo`](../classes/Tempo.md)

##### t

*typeof* [`Tempo`](../@magmacomputing/namespaces/Tempo/README.md)

#### Returns

`void`

***

### name

> **name**: `string`

Defined in: [plugin/plugin.type.ts:28](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/plugin/plugin.type.ts#L28)
