[**@magmacomputing/tempo**](../../../README.md)

***

## Interfaces

- [BaseOptions](interfaces/BaseOptions.md)
- [Params](interfaces/Params.md)

## Type Aliases

- [Add](type-aliases/Add.md)
- [COMPASS](type-aliases/COMPASS.md)
- [DateTime](type-aliases/DateTime.md)
- [Duration](type-aliases/Duration.md)
- [DURATION](type-aliases/DURATION-1.md)
- [DURATIONS](type-aliases/DURATIONS.md)
- [Element](type-aliases/Element.md)
- [ELEMENT](type-aliases/ELEMENT-1.md)
- [Extension](type-aliases/Extension.md)
- [Format](type-aliases/Format.md)
- [FormatRegistry](type-aliases/FormatRegistry.md)
- [Formats](type-aliases/Formats.md)
- [FormatType](type-aliases/FormatType.md)
- [Groups](type-aliases/Groups.md)
- [hh](type-aliases/hh.md)
- [Logic](type-aliases/Logic.md)
- [mi](type-aliases/mi.md)
- [mm](type-aliases/mm.md)
- [Modifier](type-aliases/Modifier.md)
- [Module](type-aliases/Module.md)
- [Month](type-aliases/Month.md)
- [MONTH](type-aliases/MONTH-1.md)
- [MONTHS](type-aliases/MONTHS.md)
- [ms](type-aliases/ms.md)
- [Mutate](type-aliases/Mutate.md)
- [ns](type-aliases/ns.md)
- [Options](type-aliases/Options.md)
- [OwnFormat](type-aliases/OwnFormat.md)
- [Pair](type-aliases/Pair.md)
- [Pattern](type-aliases/Pattern.md)
- [PatternOption](type-aliases/PatternOption.md)
- [PatternOptionArray](type-aliases/PatternOptionArray.md)
- [Plugin](type-aliases/Plugin.md)
- [Relative](type-aliases/Relative.md)
- [SEASON](type-aliases/SEASON.md)
- [Set](type-aliases/Set.md)
- [ss](type-aliases/ss.md)
- [TermPlugin](type-aliases/TermPlugin.md)
- [Terms](type-aliases/Terms.md)
- [Unit](type-aliases/Unit.md)
- [Until](type-aliases/Until.md)
- [us](type-aliases/us.md)
- [Weekday](type-aliases/Weekday.md)
- [WEEKDAY](type-aliases/WEEKDAY-1.md)
- [WEEKDAYS](type-aliases/WEEKDAYS.md)
- [ww](type-aliases/ww.md)

## Variables

- [tickers](variables/tickers.md)

## Functions

- [ticker](functions/ticker.md)

## Accessors

### COMPASS

#### Get Signature

> **get** **COMPASS**(): `EnumifyType`\<\{ `East`: `"east"`; `North`: `"north"`; `South`: `"south"`; `West`: `"west"`; \}\>

Defined in: [tempo.class.ts:84](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L84)

Compass cardinal points

##### Returns

`EnumifyType`\<\{ `East`: `"east"`; `North`: `"north"`; `South`: `"south"`; `West`: `"west"`; \}\>

***

### DURATION

#### Get Signature

> **get** **DURATION**(): `EnumifyType`\<\{ `day`: `86400`; `hour`: `3600`; `microsecond`: `0.000001`; `millisecond`: `0.001`; `minute`: `60`; `month`: `2628000`; `nanosecond`: `1e-9`; `second`: `1`; `week`: `604800`; `year`: `31536000`; \}\>

Defined in: [tempo.class.ts:80](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L80)

Time durations as seconds (singular)

##### Returns

`EnumifyType`\<\{ `day`: `86400`; `hour`: `3600`; `microsecond`: `0.000001`; `millisecond`: `0.001`; `minute`: `60`; `month`: `2628000`; `nanosecond`: `1e-9`; `second`: `1`; `week`: `604800`; `year`: `31536000`; \}\>

***

### DURATIONS

#### Get Signature

> **get** **DURATIONS**(): `EnumifyType`\<\{ `days`: `86400000`; `hours`: `3600000`; `microseconds`: `0.001`; `milliseconds`: `1`; `minutes`: `60000`; `months`: `2628000000`; `nanoseconds`: `0.000001`; `seconds`: `1000`; `weeks`: `604800000`; `years`: `31536000000`; \}\>

Defined in: [tempo.class.ts:81](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L81)

Time durations as milliseconds (plural)

##### Returns

`EnumifyType`\<\{ `days`: `86400000`; `hours`: `3600000`; `microseconds`: `0.001`; `milliseconds`: `1`; `minutes`: `60000`; `months`: `2628000000`; `nanoseconds`: `0.000001`; `seconds`: `1000`; `weeks`: `604800000`; `years`: `31536000000`; \}\>

***

### ELEMENT

#### Get Signature

> **get** **ELEMENT**(): `EnumifyType`\<\{ `dd`: `"day"`; `hh`: `"hour"`; `mi`: `"minute"`; `mm`: `"month"`; `ms`: `"millisecond"`; `ns`: `"nanosecond"`; `ss`: `"second"`; `us`: `"microsecond"`; `ww`: `"week"`; `yy`: `"year"`; \}\>

Defined in: [tempo.class.ts:86](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L86)

Tempo to Temporal DateTime Units map

##### Returns

`EnumifyType`\<\{ `dd`: `"day"`; `hh`: `"hour"`; `mi`: `"minute"`; `mm`: `"month"`; `ms`: `"millisecond"`; `ns`: `"nanosecond"`; `ss`: `"second"`; `us`: `"microsecond"`; `ww`: `"week"`; `yy`: `"year"`; \}\>

***

### MONTH

#### Get Signature

> **get** **MONTH**(): `EnumifyType`\<`Index`\<readonly \[`"All"`, `"Jan"`, `"Feb"`, `"Mar"`, `"Apr"`, `"May"`, `"Jun"`, `"Jul"`, `"Aug"`, `"Sep"`, `"Oct"`, `"Nov"`, `"Dec"`\]\>\>

Defined in: [tempo.class.ts:78](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L78)

Month names (short-form)

##### Returns

`EnumifyType`\<`Index`\<readonly \[`"All"`, `"Jan"`, `"Feb"`, `"Mar"`, `"Apr"`, `"May"`, `"Jun"`, `"Jul"`, `"Aug"`, `"Sep"`, `"Oct"`, `"Nov"`, `"Dec"`\]\>\>

***

### MONTHS

#### Get Signature

> **get** **MONTHS**(): `EnumifyType`\<`Index`\<readonly \[`"Every"`, `"January"`, `"February"`, `"March"`, `"April"`, `"May"`, `"June"`, `"July"`, `"August"`, `"September"`, `"October"`, `"November"`, `"December"`\]\>\>

Defined in: [tempo.class.ts:79](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L79)

Month names (long-form)

##### Returns

`EnumifyType`\<`Index`\<readonly \[`"Every"`, `"January"`, `"February"`, `"March"`, `"April"`, `"May"`, `"June"`, `"July"`, `"August"`, `"September"`, `"October"`, `"November"`, `"December"`\]\>\>

***

### SEASON

#### Get Signature

> **get** **SEASON**(): `EnumifyType`\<\{ `Autumn`: `"autumn"`; `Spring`: `"spring"`; `Summer`: `"summer"`; `Winter`: `"winter"`; \}\>

Defined in: [tempo.class.ts:83](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L83)

Quarterly Seasons

##### Returns

`EnumifyType`\<\{ `Autumn`: `"autumn"`; `Spring`: `"spring"`; `Summer`: `"summer"`; `Winter`: `"winter"`; \}\>

***

### WEEKDAY

#### Get Signature

> **get** **WEEKDAY**(): `EnumifyType`\<`Index`\<readonly \[`"All"`, `"Mon"`, `"Tue"`, `"Wed"`, `"Thu"`, `"Fri"`, `"Sat"`, `"Sun"`\]\>\>

Defined in: [tempo.class.ts:76](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L76)

Weekday names (short-form)

##### Returns

`EnumifyType`\<`Index`\<readonly \[`"All"`, `"Mon"`, `"Tue"`, `"Wed"`, `"Thu"`, `"Fri"`, `"Sat"`, `"Sun"`\]\>\>

***

### WEEKDAYS

#### Get Signature

> **get** **WEEKDAYS**(): `EnumifyType`\<`Index`\<readonly \[`"Everyday"`, `"Monday"`, `"Tuesday"`, `"Wednesday"`, `"Thursday"`, `"Friday"`, `"Saturday"`, `"Sunday"`\]\>\>

Defined in: [tempo.class.ts:77](https://github.com/magmacomputing/magma/blob/89627f63804c7d98ed8e67803bd9b66732dc4555/packages/tempo/src/tempo.class.ts#L77)

Weekday names (long-form)

##### Returns

`EnumifyType`\<`Index`\<readonly \[`"Everyday"`, `"Monday"`, `"Tuesday"`, `"Wednesday"`, `"Thursday"`, `"Friday"`, `"Saturday"`, `"Sunday"`\]\>\>
