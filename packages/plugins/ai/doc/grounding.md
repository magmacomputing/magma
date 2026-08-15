# Grounding & Natural Language Parsing

Because natural language dates are entirely relative (e.g., *"next Tuesday"*) and culturally ambiguous (e.g., *"11/12"*), an LLM cannot reliably parse them in a vacuum. 

The Tempo AI plugin solves this by automatically injecting **deterministic temporal and regional grounding coordinates** before dispatching queries to the LLM.

## Temporal & Regional Grounding

The plugin automatically resolves the active `Tempo.config` to establish the exact reference time and regional coordinates:
- **Anchor Reference Clock**: The exact ISO timestamp at the moment of invocation.
- **Regional Coordinates**: TimeZone (e.g., `America/New_York`), Calendar system (`iso8601`), Locale (`en-US`), and Hemisphere (`northern`).

Along with your text query, the plugin passes these grounding coordinates directly to the model's system prompt:
> *`Grounding Anchor: [Anchor], Timezone: [TZ], Calendar: [Cal], Locale: [Loc], Hemisphere: [Sphere]`*

### Custom Grounding Anchors & Options
You can explicitly override any grounding coordinate on a per-request basis by passing an options object as the second argument, identical to how you pass configuration options to a standard `new Tempo()` constructor:

```typescript
// Explicitly evaluate this complex relative query from the perspective of September 1st
const dt = await parseAI("The penultimate Tuesday before Thanksgiving", { 
  anchor: '2026-09-01T00:00:00Z' 
});

// Explicitly parse assuming a Japanese locale and timezone
const tokyoDt = await parseAI("The second Sunday of May", { 
  locale: 'ja-JP', 
  timeZone: 'Asia/Tokyo' 
});
```

### Why Cultural & Regional Grounding is Critical
Passing the `Locale` and `TimeZone` is critical for the LLM to know whether `"11/12"` represents November 12th (US format) or 11th of December (UK/EU format). The plugin grounds these ambiguous tokens transparently based on your standard Tempo configuration!

> [!WARNING]
> **Calendar Math Hallucinations**: LLMs are language predictors, not calculators. While they excel at parsing conversational times (like `"tomorrow at 5pm"`), smaller models are notoriously prone to hallucinations on complex, cross-year calendar math. For example, asking a lightweight model for `"Thanksgiving in 2026"` may result in a hallucinated day of the week because the model doesn't natively compute "the fourth Thursday of November 2026." If your application relies on heavy holiday logic or complex multi-year math, you *must* use a capable frontier model or rely on deterministic plugins instead of AI.

## The Decoupled Output Bridge

To ensure deterministic, type-safe behavior, the plugin enforces a strict decoupled bridge between AI text generation and JavaScript object hydration:

* **For Point-in-Time Parsing (`parseAI`)**: The LLM is instructed to return a strict local ISO 8601 string without a timezone offset or 'Z' suffix (e.g. `"2026-11-26T00:00:00"`). The plugin immediately constructs a native `new Tempo()` instance with caller-defined timezone and calendar context.
* **For Structured Functions (`formatAI`, `extractAI`, `diffAI`, `contextAI`)**: The LLM completes rigid JSON schemas validated against strict boundary rules, instantiating typed result objects (`TempoAiFormatResult`, `TempoAiExtractResult`, `TempoAiDiffResult`, `TempoContext`).
* **For Intervals & Generators (`scheduleAI`, `recurrenceAI`)**: The plugin hydrates interval boundaries into a proxied `Interval<Tempo>` or exposes an iterable generator yielding sequential `Tempo` instances.

This eliminates AST-construction ambiguity and provides clean runtime contracts for every operation.

### Relative Date Ambiguity Tie-Breakers

To eliminate model variance on idioms like "Next Friday" or "Last Tuesday", the plugin enforces static system prompt ambiguity rules:
* `"next [weekday/unit]"`: Evaluated as the immediate next chronological occurrence after the grounding anchor.
* `"last [weekday/unit]"` / `"previous [weekday/unit]"`: Evaluated as the most recent past occurrence prior to the grounding anchor.
* `"this [weekday]"`: Evaluated as the occurrence within the current calendar week containing the grounding anchor.

### Confidence Thresholds & Metadata Handling

When `minConfidence` is supplied in options (e.g. `{ minConfidence: 0.85 }`):
* **`parseAI`**: Any LLM response returning a confidence score below the threshold produces a `Tempo` instance with `isValid === false` (when using `softErrors: true`) or throws a `TempoAiError(422)`.
* **Structured Functions (`formatAI`, `extractAI`, `diffAI`, `contextAI`, `scheduleAI`, `recurrenceAI`)**: Low-confidence completions immediately throw a `TempoAiError(422)` (or return a `TempoAiError` in batch arrays when `softErrors: true` is enabled).

Every resolved `Tempo` instance returned by `parseAI` has a non-writable, frozen `.ai` metadata descriptor containing execution audit data:
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

*(For other AI functions like `extractAI` or `diffAI`, diagnostic metadata including `confidence`, `reasoning`, and `provider` is attached directly to the returned result object.)*
