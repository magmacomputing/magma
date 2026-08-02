# Context & Natural Language Parsing

Because natural language dates are entirely relative (e.g., "next Tuesday") and often geographically ambiguous (e.g., "11/12"), an LLM cannot reliably parse them in a vacuum. 

The Tempo AI plugin solves this by automatically wrapping your input with rich environmental context before sending it to the LLM.

## Geographic Context

The plugin automatically reads from the global `Tempo.config` to fetch the default TimeZone, Calendar, and Locale, and establishes the "current anchor time" the moment you call it.

Along with your string, the plugin passes a hidden context payload to the LLM: 
*`Current Time: [Anchor], Timezone: [TZ], Calendar: [Cal], Locale: [Locale], Hemisphere: [Sphere]`*

### Overriding Context
You can explicitly override any of these global settings on a per-request basis by passing an `options` object as the second argument, identical to how you pass options to a standard `new Tempo()` constructor:

```typescript
// Explicitly evaluate this complex query from the perspective of September 1st
const dt = await parseAI("The penultimate Tuesday before Thanksgiving", { anchor: '2026-09-01T00:00:00Z' });

// Explicitly parse assuming a Japanese locale and timezone
const tokyoDt = await parseAI("The second Sunday of May", { locale: 'ja-JP', timeZone: 'Asia/Tokyo' });
```

### Why Locale is Critical
Passing the `Locale` is absolutely critical for the LLM to know whether "11/12" means November 12th (US format) or 11th of December (UK/EU format). The plugin handles this transparently based on your standard Tempo configuration!

> [!WARNING]
> **Calendar Math Hallucinations**: LLMs are language predictors, not calculators. While they excel at parsing conversational times (like `"tomorrow at 5pm"`), smaller open-source models (like 8B parameter variants) are notoriously bad at complex, cross-year calendar math. For example, asking an 8B model for `"Thanksgiving in 2026"` will often result in a hallucinated day of the week because the model doesn't natively compute "the fourth Thursday of November 2026." If your application relies on heavy holiday logic or complex multi-year math, you *must* use a frontier model (like `gpt-4o` or `claude-3.5-sonnet`) or rely on deterministic plugins instead of AI.

## The Decoupled Output Bridge

To ensure deterministic behavior, the LLM is instructed to *only* return strict ISO 8601 strings. 

The plugin executes the network request, the LLM returns a local ISO string without a timezone offset or 'Z' suffix (like `"2026-11-26T00:00:00"`), and the plugin immediately passes that string back into the native `new Tempo()` constructor. The provider response must omit timezone suffixes to match the local ISO contract enforced by Tempo AI functions. The developer seamlessly receives a valid, native `Tempo` instance. This eliminates AST-construction ambiguity, creating a decoupled bridge between AI text generation and native Tempo conversion.

### Relative Date Ambiguity Tie-Breakers

To eliminate model variance on idioms like "Next Friday" or "Last Tuesday", the plugin enforces static system prompt ambiguity rules:
* `"next [weekday/unit]"`: Evaluated as the immediate next chronological occurrence after `Current Time`.
* `"last [weekday/unit]"` / `"previous [weekday/unit]"`: Evaluated as the most recent past occurrence prior to `Current Time`.
* `"this [weekday]"`: Evaluated as the occurrence within the current calendar week containing `Current Time`.

### Confidence Thresholds & Metadata (`.ai`)

When `minConfidence` is supplied in options (e.g. `parseAI("...", { minConfidence: 0.8 })`), any LLM response returning a confidence score below that threshold produces a `Tempo` instance with `isValid === false`. 

Every resolved `Tempo` instance returned by `parseAI` (and other AI functions) has a non-writable, frozen `.ai` metadata descriptor containing execution audit data:
```typescript
const dt = await parseAI("Christmas 2026", { debug: true });
console.log(dt.ai);
// {
//   provider: 'openai',
//   cached: false,
//   confidence: 0.95,
//   ambiguous: false,
//   granularity: 'day',
//   rawIso: '2026-12-25T00:00:00',
//   rawPrompt: 'Christmas 2026',        // Present when debug is enabled
//   normalizedPrompt: 'christmas 2026' // Present when debug is enabled
// }
```

