[**@magmacomputing/tempo**](../README.md)

***

> **FlexibleDuration** = `{ [K in Units]: Pick<BaseDuration, K> & { [P in keyof Omit<BaseDuration, K>]?: number } }`\[[`Units`](Units.md)\]

Defined in: [tempo.type.ts:75](https://github.com/magmacomputing/magma/blob/5faff5120d794572ccb66101602099151541b1b6/packages/tempo/src/tempo.type.ts#L75)

# FlexibleDuration
A distributive mapped type over [Units](Units.md) which requires at least one duration key 
from [BaseDuration](BaseDuration.md) (the mapped key K) while making all other BaseDuration 
properties optional.

## Example

```ts
// Valid: at least one key is present
const a: FlexibleDuration = { hours: 1 };
const b: FlexibleDuration = { hours: 1, minutes: 30 };

// Invalid: empty object (no mandatory key)
const c: FlexibleDuration = {};
```
