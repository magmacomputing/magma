# Ordinal Offset Parsing Strategy

**Goal**: Define the scope, division of responsibilities, and architecture for Ordinal Offset parsing across Core Tempo and `tempo-plugin-ai`.

---

## 1. Scope & Responsibility Division

Tempo follows a clean separation of concerns for natural language parsing:

* **Core Tempo (`@magmacomputing/tempo`)**: Synchronous, deterministic, zero-latency fast-path parsing. Handles explicit, unambiguous expressions that every developer expects out-of-the-box (e.g. `"3rd Thursday of November 2026"`, `"last day of May"`, `"1st day of 2026"`).
* **AI Plugin (`@magmacomputing/tempo-plugin-ai`)**: Asynchronous, LLM-powered natural language processing. Handles complex, ambiguous, or conversational queries (e.g. *"the day after the second Tuesday of spring"*, *"three business days before Thanksgiving"*).
* **Delivered in Term Lifecycle Hooks**: Dynamic term-plugin boundary and ordinal resolution (`"1st day of #equinox"`, `"2nd day of #solstice"`, `"last day of #equinox"`) via `Tempo.enums.ORDINAL` and `[TermHook.ordinal]` on anchored instances.
* **AI Plugin (`@magmacomputing/tempo-plugin-ai`)**: Asynchronous, LLM-powered natural language processing. Handles complex, ambiguous, unanchored, or conversational queries without the `#` sigil (e.g. *"1st equinox of 2026"*, *"the day after the second Tuesday of spring"*, *"three business days before Thanksgiving"*).

---

## 2. Summary Matrix

| Query Type | Handling Layer | Target Release |
| :--- | :--- | :--- |
| `"3rd Thursday of November 2026"` | Core Tempo (Sync Fast-Path) | **v4.0.0** (Delivered) |
| `"1st day of May"`, `"last day of 2026"` | Core Tempo (Sync Fast-Path) | **v4.0.0** (Delivered) |
| `"1st day of #equinox"`, `"2nd day of #solstice"` | Core Tempo (`enums.ORDINAL` + `[TermHook.ordinal]`) | **v4.6.0** (Delivered) |
| `"3rd day of #qtr.2"` | Standard Plugin Hook (`QuarterTerm[TermHook.ordinal]`) | **Future / Optional** |
| *"1st equinox of 2026"*, *"the Friday right before 2nd Tuesday of spring"* | `tempo-plugin-ai` | Available now |
