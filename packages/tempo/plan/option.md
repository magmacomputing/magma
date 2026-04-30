This document discusses the new structure for the Option type, and its impact on Tempo parsing.

# Background
We initially had a small number of Options (timeZone, debug, pivot, etc) which the User would provide.
They would use the various configuration paths available to Tempo (global-discovery, Tempo.init for global, or new Tempo({}) for instances).

# Problem Statement
The problem is that we have a number of 'Options' for each parsing path (Tempo.parse(value,fmt,{options})).  Instead of passing a huge number of options to each parsing function, we want to be able to provide a more curated 'Options' object to the parsing functions, and have those options be resolved from the various configuration paths available to Tempo.

we now have the setConfig method in tempo.class which disassembles an Option object, and filters these onto the 'Config' or the 'Parse' object depending on what is appropriate.

If the Option is a valid config key, it will be added to the Config object.  If the Option is a valid parse key, it will be added to the Parse object.

This is a good start, but we need to be able to provide these options in a more curated way.

# Proposal

## Option Resolvers
Perhaps a dedicated setParse method is a good start, alongside the setConfig method ?
This would help separate the concerns of the Config and Parse objects, and allow us to provide a more curated 'Options' object to the parsing functions.

{parse:
  monthDay: {},
  snippet: {},
  layout: {},
  event: {},
  period: {},
  ...    # the list goes on
}

Previously the parse {} keys were top-level in the Option type
  const t1 = new Tempo({event: {birthday: '20-May'}});

but since the recent refactor, the new syntax is
  const t2 = new Tempo({parse: {event: {birthday: '20-May'}}});

Our challenge is that #setConfig has not kept-up with the refactor... it is still looking for top-level keys.

We need a plan to address the Option type to correctly filter 'config' and 'parse' keys into their appropriate scope object.

---

# Revised Implementation Plan - Curated Option Resolution

The objective is to refine how Tempo disassembles the `Option` object into its appropriate scopes: `Internal.Config` (instance configuration) and `Internal.Parse` (parsing rules and metadata).

## Core Strategy: Key Routing

We will categorize every supported option key into one of two scopes. This manifest will drive the logic in `[$setConfig]`.

### 1. Scope Manifests

| Scope | Keys |
| :--- | :--- |
| **Config** | `store`, `discovery`, `debug`, `catch`, `silent`, `timeZone`, `calendar`, `locale`, `sphere`, `intl`, `timeStamp`, `formats`, `plugins` |
| **Parse** | `monthDay`, `layout`, `snippet`, `event`, `period`, `ignore`, `pivot`, `order`, `prefilter`, `mode` |
| **Special** | `parse` (the nested object), `value`/`anchor`/`result` (transient) |

### 2. Logic Refinement (`tempo.class.ts`)

#### `static [$setConfig]`
- Iterate through provided options.
- **Config Keys**: Apply directly to `shape.config` (using existing specialized logic for `timeZone`, `formats`, etc.).
- **Parse Keys (Top-level)**: If found at the top-level, they are considered **deprecated**. We will collect them and pass them to `[$setParse]`.
- **`parse` Key**: Pass the nested object to `[$setParse]`.
- **Unknown Keys**: Default to `shape.config` for extensibility.

#### `static [$setParse]`
- Exclusively handle `ParseOptions`.
- Update `shape.config.parse` (the metadata state) via `resolveParse`.
- Update `shape.parse` (the runtime registries like `event`, `period`, `snippet`) using robust logic (collision detection, RegExp compilation).
- Trigger `[$setEvents]` and `[$setPeriods]` if relevant registries changed.

## Implementation Steps

### 1. Define Manifests
- Use `ConfigKeys` and `ParseKeys` sets in `tempo.class.ts` to drive the switch/routing logic.

### 2. Refactor `[$setConfig]`
- Clean up the `switch` statement to use the manifest for routing.
- Consolidate the "Parse" case to simply call `[$setParse]`.

### 3. Refactor `[$setParse]`
- Ensure it handles all properties defined in `t.ParseOptions`.
- Maintain synchronization between the public-facing `config.parse` and the internal `parse` registries.

### 4. Discovery Integration
- Update `[$setDiscovery]` to use the same `[$setParse]` and `[$setConfig]` logic to ensure consistency between manual setup and discovery.

## Verification Plan

- **Unit Tests**: Update `test/options_parsing.test.ts` to verify that both nested and (deprecated) top-level keys resolve to the correct internal state.
- **Regression**: Run the full suite to ensure `timeZone` and `locale` (Config) and `monthDay` (Parse) are still resolving correctly through the new routing.

## Recommendation on Deprecation
While we will support top-level parse keys for backward compatibility, we should consider adding a `debug`-mode warning when they are detected, encouraging users to migrate to the `parse: {}` structure.