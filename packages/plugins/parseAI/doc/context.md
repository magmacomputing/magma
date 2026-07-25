# Context & Natural Language Parsing

Because natural language dates are entirely relative (e.g., "next Tuesday") and often geographically ambiguous (e.g., "11/12"), an LLM cannot reliably parse them in a vacuum. 

The `parseAI` plugin solves this by automatically wrapping your input with rich environmental context before sending it to the LLM.

## Geographic Context

The plugin automatically reads from the global `Tempo.config` to fetch the default TimeZone, Calendar, and Locale, and establishes the "current anchor time" the moment you call it.

Along with your string, the plugin passes a hidden context payload to the LLM: 
*`Current Time: [Anchor], Timezone: [TZ], Calendar: [Cal], Locale: [Locale], Hemisphere: [Sphere]`*

### Overriding Context
You can explicitly override any of these global settings on a per-request basis by passing an `options` object as the second argument, identical to how you pass options to a standard `new Tempo()` constructor:

```typescript
// Explicitly evaluate this relative query from the perspective of September 1st
const dt = await parseAI("Next Friday at 5pm", { anchor: '2026-09-01T00:00:00Z' });

// Explicitly parse assuming a Japanese locale and timezone
const tokyoDt = await parseAI("The day after tomorrow", { locale: 'ja-JP', timeZone: 'Asia/Tokyo' });
```

### Why Locale is Critical
Passing the `Locale` is absolutely critical for the LLM to know whether "11/12" means November 12th (US format) or 11th of December (UK/EU format). The plugin handles this transparently based on your standard Tempo configuration!

> [!WARNING]
> **Calendar Math Hallucinations**: LLMs are language predictors, not calculators. While they excel at parsing conversational times (like `"tomorrow at 5pm"`), smaller open-source models (like 8B parameter variants) are notoriously bad at complex, cross-year calendar math. For example, asking an 8B model for `"Thanksgiving in 2026"` will often result in a hallucinated day of the week because the model doesn't natively compute "the fourth Thursday of November 2026." If your application relies on heavy holiday logic or complex multi-year math, you *must* use a frontier model (like `gpt-4o` or `claude-3.5-sonnet`) or rely on deterministic plugins instead of AI.

## The Decoupled Output Bridge

To ensure deterministic behavior, the LLM is instructed to *only* return strict ISO 8601 strings. 

The plugin executes the network request, the LLM returns a string like `"2026-11-26T00:00:00Z"`, and the plugin immediately passes that string back into the native `new Tempo()` constructor. The developer seamlessly receives a valid, native `Tempo` instance. This completely eliminates LLM hallucination risk on AST construction, creating a perfect decoupled bridge between AI text generation and deterministic date-math.
