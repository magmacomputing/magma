# Ordinal Offset Parsing Strategy

**Goal**: Define the scope, division of responsibilities, and architecture for Ordinal Offset parsing across Core Tempo and `tempo-plugin-ai`.

---

## 1. Scope & Responsibility Division

Tempo follows a clean separation of concerns for natural language parsing:

* **Core Tempo (`@magmacomputing/tempo`)**: Synchronous, deterministic, zero-latency fast-path parsing. Handles explicit, unambiguous expressions that every developer expects out-of-the-box (e.g. `"3rd Thursday of November 2026"`, `"last day of May"`, `"1st day of 2026"`).
* **AI Plugin (`@magmacomputing/tempo-plugin-ai`)**: Asynchronous, LLM-powered natural language processing. Handles complex, ambiguous, or conversational queries (e.g. *"the day after the second Tuesday of spring"*, *"three business days before Thanksgiving"*).
* **Scheduled in v4.6.1**: Dynamic term-plugin boundary and ordinal resolution (`"3rd day of #qtr.2"`, `"1st equinox of 2026"`, `"last equinox"`) via `enums.ORDINAL` and `[TermHook.ordinal]`. Complex multi-language ordinal dictionaries and recurrence rules remain deferred to future versions.

---

## 2. Summary Matrix

| Query Type | Handling Layer | Target Release |
| :--- | :--- | :--- |
| `"3rd Thursday of November 2026"` | Core Tempo (Sync Fast-Path) | **v4.0.0** (Delivered) |
| `"1st day of May"`, `"last day of 2026"` | Core Tempo (Sync Fast-Path) | **v4.0.0** (Delivered) |
| `"3rd day of #qtr.2"`, `"1st equinox of 2026"` | Core Tempo (`enums.ORDINAL` + `[TermHook.ordinal]`) | **v4.6.1** (Scheduled) |
| *"the Friday right before 2nd Tuesday of spring"* | `tempo-plugin-ai` | Available now |
