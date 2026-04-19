# Plan: Reactive Ticker Enhancements

## Overview
This document outlines the requirements and design for making `Tempo.ticker` more dynamic and reactive to environment changes.

## 1. Dynamic Updates
### Requirements
- Ability to update a running ticker's configuration without stopping and restarting.
- Support for updating the following properties:
    - **Interval**: Change the pulse frequency (e.g., from 1s to 1m).
    - **Limit**: Extend or shorten the number of remaining ticks.
    - **Until**: Adjust the stopping boundary.
    - **TimeZone**: Shift the ticker's time perspective.
    - **Seed**: Reset the "current" time of the ticker.

### Proposed API
```typescript
const clock = Tempo.ticker({ seconds: 1 });

// Later...
clock.update({ 
    seconds: 60, // slow down
    timeZone: 'Europe/Paris' // shift perspective
});
```

## 2. Environment Reactivity (The "Analog Clock" Scenario)
### Problem
An analog clock using `Tempo.ticker` on a mobile device or laptop may become "wrong" if the user travels across TimeZone boundaries. Currently, the ticker is pinned to the TimeZone detected at creation.

### Discussion
- **Detection**: How does the ticker know the TimeZone changed?
    - Option A: Periodic check (e.g., every 60 seconds) of `Intl.DateTimeFormat().resolvedOptions().timeZone`.
    - Option B: Check on every pulse (low overhead for `Intl` calls).
- **Behavior**: If a change is detected:
    - Should it automatically adopt the new TZ?
    - Should it emit an event (e.g., `ticker.on('timezonechange', ...)`?
- **"Discrepancy" Logic**:
    - The user suggested checking for a "wide-enough" discrepancy in mutations. 
    - *Antigravity's Note*: Since the `epoch` is continuous, a TZ shift only affects the "wall clock" representation. A simpler check is just comparing the current system TZ name against the ticker's internal TZ name.

### Use Case: Analog Clock
For a clock, "Self-Adjustment" is a premium feature. If `autoTimeZone: true` is set, the ticker would:
1. Verify the system timezone on each pulse.
2. If it differs from the ticker's current timezone, it performs an internal `.set({ timeZone: newTz })`.
3. The next `Tempo` instance emitted to the UI will have the correct hour hand position.

## 3. Implementation Challenges
- **Scheduling**: If the `interval` changes, the pending `setTimeout` must be cleared and recalculated.
- **Immutability**: `Tempo` instances are immutable. The `TickerInstance` (manager) must handle the swapping of its internal `#current` reference safely.
- **Performance**: Frequent `Intl` checks are generally fast, but we should ensure they don't impact 16ms (60fps) pulse loops if someone is using the ticker for animations.

---
*Date: 2026-04-19*
*Status: Discussion / Requirement Gathering*
