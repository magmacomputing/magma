# Documentation Glossary Architecture & Prototype Plan

## 1. Overview & Objectives

As Tempo evolves in v5 with expanded plugin architectures, TC39 Temporal alignments, and reactive signals, user documentation requires unambiguous domain definitions.

A centralized, machine-readable glossary solves three key challenges:
1. **Domain Disambiguation**: Differentiates overlapping standards (ISO 8601, RFC 9557, TC39 Temporal, LDML, IANA time zones) and library concepts (*Instant* vs. *PlainDateTime*, *Epoch*, *Offset* vs. *Timezone*).
2. **Tempo-Specific Terminology**: Clearly defines library idioms (*Term*, *Modifier*, *Cadence*, *Soft Freeze*, *Dynamic Functional Context (DFC)*, *Signal Binding*).
3. **Search & AI RAG Quality**: Enhances VitePress local search and provides structured ground truth for [`llms.txt`](file:///home/michael/Project/magma/packages/tempo/public/v4/llms.txt) and automated LLM context generators.

---

## 2. Architecture & Design Decisions

### A. Data-Driven Single Source of Truth
Instead of maintaining a manual Markdown list with hand-crafted headers and anchor tags, definitions reside in a typed data catalog:
- **Location**: `packages/tempo/doc/glossary.data.ts` (or `packages/tempo/doc/glossary.json`).
- **Mechanism**: VitePress [Build-Time Data Loading](https://vitepress.dev/guide/data-loading). Data is parsed and sorted once during static site generation with zero runtime parsing overhead.

### B. Type Definition & Schema

```typescript
export type GlossaryCategory =
  | 'temporal-math'   // Epoch, Instant, PlainDate, Duration, Interval
  | 'formatting'      // Terms, Modifiers, Tokens, LDML, Suffixes
  | 'reactivity'      // Cadence, Ticker, Signals, Streams, Observers
  | 'architecture'    // Soft Freeze, DFC, Sandboxing, Evaluation
  | 'plugins'         // Dialects, NTP, Roman, Celestial, Snap
  | 'standards';      // RFC 9557, ISO 8601, IANA, TC39

export interface GlossaryEntry {
  /** Canonical display name */
  term: string;

  /** URL anchor slug (auto-generated if omitted) */
  slug?: string;

  /** Conceptual categorization */
  category: GlossaryCategory;

  /** Concise 1-sentence definition for tooltips, search results, and llms.txt */
  summary: string;

  /** Optional extended technical explanation and rationale */
  details?: string;

  /** Associated formal standards or specifications */
  standards?: Array<{
    name: string;
    url?: string;
  }>;

  /** Related documentation guides or cross-referenced terms */
  seeAlso?: Array<{
    label: string;
    link: string;
  }>;

  /** Common aliases or legacy terms redirected to this entry */
  aliases?: string[];
}
```

---

## 3. VitePress Integration Blueprint

### A. Dedicated Glossary Route (`doc/4-advanced-reference/glossary.md`)
Renders an interactive, client-side filtered directory:
- **Alphabetical A–Z Index**: Automated jump bar (`A B C ... Z`) with section headers.
- **Category Chips**: Fast filtering by category (*Core Architecture*, *Reactivity & Signals*, *Formatting Tokens*, *Standards*).
- **Deep Linking / Permanent Anchors**: Stable URI anchors (e.g. `/doc/4-advanced-reference/glossary#soft-freeze`) allowing all documentation pages to reference terms unambiguously.

### B. Inline Prose Tooltips (Optional Extension)
A lightweight Vue component (`<Term name="cadence">cadence</Term>`) or markdown-it abbreviation plugin can render inline hover tooltips across user guides that display the concise `summary` and link directly to `#cadence`.

### C. AI / RAG Context Export
During the documentation build, a script parses `glossary.data.ts` and prepends clean term-definition pairs directly into `packages/tempo/public/llms.txt`, ensuring AI assistants answer user questions using canonical Tempo definitions.

---

## 4. Initial Seed Vocabulary

| Term | Category | Summary |
| :--- | :--- | :--- |
| **Cadence** | `reactivity` | The rhythmic scheduling interval or pattern governing ticker executions and reactive signal updates. |
| **Clock Drift** | `plugins` | The gradual offset between local system time and true reference network time, compensated by the NTP plugin. |
| **Dynamic Functional Context (DFC)** | `architecture` | Tempo's pattern where configuration options (`timeZone`, `locale`) accept lazy evaluator functions (`() => T`) resolved per-request. |
| **Instant** | `temporal-math` | A precise, absolute point on the universal temporal timeline, independent of time zones or calendars. |
| **Modifier** | `formatting` | An orthogonal token extension (e.g., `:compact`, `:hh`, `:ordinal`) refining how a format term serializes or parses values. |
| **PlainDate** | `temporal-math` | A calendar date (year, month, day) without reference to a specific time of day, time zone, or geographical location. |
| **ReadonlySignal** | `reactivity` | A reactive accessor function adhering to the TC39 Signals proposal that notifies subscribers of value and epoch changes. |
| **Soft Freeze** | `architecture` | Tempo’s immutability strategy that provides non-destructive mutations without incurring the heavy V8 runtime cost of deep recursive `Object.freeze()`. |
| **Term** | `formatting` | A modular unit of temporal formatting or parsing registered in the engine registry (e.g. `{yow}`, `{woy}`, `{tz}`). |

---

## 5. Execution Roadmap

- **Target Phase**: Scheduled for **Phase 5** (Multi-Version Docs & AI Context) of the [v5 Master Plan](file:///home/michael/Project/magma/packages/tempo/plan/v5-master-plan.md).
- **Scope**:
  1. Add `packages/tempo/doc/glossary.data.ts` containing the initial seed catalog (~30 terms).
  2. Implement `packages/tempo/.vitepress/theme/components/Glossary.vue`.
  3. Create `packages/tempo/doc/4-advanced-reference/glossary.md` and add to VitePress sidebar navigation.
  4. Integrate glossary terms into `bin/generate-llms.ts`.
