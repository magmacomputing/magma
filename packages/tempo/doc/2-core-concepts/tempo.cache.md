# Cache Management Guide

**Tempo** includes a centralized, high-performance **`BoundedCache`** singleton accessible via `Tempo.cache`. It provides dual-layer resolution for dynamic relative dates (with LRU eviction and TTL expiration) and static business glossaries (immortal keys).

---

## 🏛️ Centralized Cache Architecture

All date resolution caching—whether triggered by core `Tempo` parsing or plugins like `parseAI`—is managed centrally by `Tempo.cache`. 

::: info Cache Behavior: Core Tempo vs. parseAI
* **Core Tempo**: Caching is **opt-in**. Core date parsing executes at sub-microsecond speeds using standard regex matching. `Tempo.cache` is consulted when you seed a static glossary or enable caching.
* **`parseAI` Plugin**: Caching is **automatic**. To eliminate network latency (~500ms+) and avoid redundant LLM API billing, `parseAI` automatically checks `Tempo.cache` before sending requests and caches every successful LLM resolution.
:::

### Cache Topology & Configuration

You can configure global cache parameters using `Tempo.init()`:

```typescript
import { Tempo } from '@magmacomputing/tempo';

Tempo.init({
  cache: {
    maxSize: 1000,             // Maximum number of entries before LRU eviction (default: 1000)
    ttl: 24 * 60 * 60 * 1000   // Time-to-live in milliseconds (default: 24 hours)
  }
});
```

* **Capacity Management (LRU):** When the cache reaches `maxSize`, the Least Recently Used dynamic entry is automatically evicted.
* **TTL Expiration:** Dynamic entries older than `ttl` are automatically purged upon lookup.
* **Static Glossary Isolation:** Static entries added to the glossary are **exempt** from both LRU eviction and TTL expiration.

---

## 📖 Seeding & Appending Glossaries

You can seed static business terms into `Tempo.cache` using a native JavaScript `Map` or via `Tempo.init({ cache: map })`:

```typescript
const businessGlossary = new Map([
  ['fiscal year start 2026', '2026-07-01T00:00:00Z'],
  ['q3 board review', '2026-09-15T09:00:00Z']
]);

// Appends entries to Tempo.cache as static, immortal terms
Tempo.init({ cache: businessGlossary });
```

::: tip Non-Destructive Appending
Passing a `Map` or custom key-value pairs to `Tempo.init({ cache })` or `initAI({ cache })` **appends** to the existing cache without clearing previously cached terms or resetting cache capacity settings.
:::

---

## 💡 When to Use What: Glossary vs. Alias vs. Snippet/Layout

Tempo provides multiple mechanisms for augmenting parsing intelligence. Choosing the right pattern depends on whether your logic is static, dynamic, structural, or string replacement:

| Mechanism | Tier / Location | Evaluation Model | Best Used For... |
| :--- | :--- | :--- | :--- |
| **Glossary** (`Tempo.cache`) | Core Engine | Zero-cost `O(1)` Map lookup | Pre-calculated static ISO date/time strings or exact business dates. |
| **Aliases / Events / Periods** (`registry.events` / `periods`) | Registry Engine | Dynamic function or target string | Computing dynamic business dates (e.g. `'deadline' => () => this.add({ days: 30 })`). |
| **Snippet / Layouts** (`registry.snippets` / `layouts`) | Parser Planner | Regex pattern matcher | Structural natural language formats (e.g. `yyyy/mm/dd` or custom date tokens). |

### Decision Tree

1. **Use a Glossary (`Tempo.cache`)** when you have fixed, pre-resolved ISO dates for specific terms (e.g., `'eoy 2026'` -> `'2026-12-31T23:59:59Z'`). It offers instant `O(1)` resolution without invoking the regex parser.
2. **Use an Alias (`registry.events` / `periods`)** when you need dynamic rules calculated relative to the current date/time (e.g., `'market-close'` -> `'16:00'` or `'deadline'` -> `30 days from now`).
3. **Use a Snippet or Layout (`registry.snippets` / `layouts`)** when parsing custom input structures with variable numbers or tokens (e.g. `"2026-W05"` or `"Quarter 3, 2026"`).

---

## 🤖 `parseAI` Plugin Cache Integration

The `@magmacomputing/tempo-plugin-ai` plugin works hand-in-hand with `Tempo.cache` to reduce LLM API calls and costs:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { parseAI, initAI } from '@magmacomputing/tempo-plugin-ai';

initAI({ providers: [...] });

// First lookup: Triggers LLM call -> Stores ISO result in Tempo.cache
const t1 = await parseAI("1st Tuesday in March 2026 at 3pm");

// Second lookup: Instantly resolves from Tempo.cache (O(1) local hit, $0 cost)
const t2 = new Tempo("1st Tuesday in March 2026 at 3pm");
```

### Two-Tier Resolution Architecture
1. **Date-Salted Relative Cache**: Relative queries (e.g. `"next Tuesday"`) are salted with the anchor date so cached entries remain valid for the given day.
2. **Static Glossary Fallback**: Business glossary terms seeded via `initAI({ cache })` or `Tempo.init({ cache })` are checked first, providing zero-latency resolution without ever contacting the LLM.
