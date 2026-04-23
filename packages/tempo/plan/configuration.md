We ran into a problem with one of our test-cases yesterday.

The test-case was: 'dynamic period alias with `this` binding (e.g. half-hour)'
Tempo.init({
        period: {
          'half-hour': function (this: Tempo) {
            return `${this.hh}:30`
          }
        }
      })
      const t = new Tempo('half-hour')
      expect(t.format('{mi}:{ss}')).toBe('30:00')
      expect(t.hh).toBe(new Tempo().hh)

The Error: Actual did not match Expected.

//
The issue turned out to be a clash in alias naming...
1) There is an Period alias registered already in tempo.default
{'half[ -]?hour': function (this: Tempo) {
		return this.add({ minutes: 30 });
	}}

2) This clashed with the instance-specific definition in the test-case.

3) The fix was to allow instance-specific definitions to override global definitions.

//
But this raises a bigger issue:  what to do with name-clashes.
This discussion document explores that topic, focussing mainly on Event and Period aliases:
"Should Tempo allow name-clashes?"
"What to do when it detects one?"

Our choices are "last one wins", or "first one wins", or "error out".

At first blush, it seems to me that "error out" is the best choice, as it will prevent unexpected behavior.
But the whole design of Tempo is based around "config-merging" and a desire to provide a nice API for 
applications upon which to build.

One option is to have Tempo.init() be a function that returns a new Tempo class, which has the
instance-specific definitions baked in.  This would allow for name-clashing at the global level,
but prevent it at the instance level.

Example:
Tempo = Tempo.init({ Tempo.default })

Or, we could design things such that if name-clash is detected, it uses the new definition and issues a warning (as well as recording the #parse.result array to assist debugging).  The challenge with this is the load that is introduced to check every Event/Period for a possible clash not only in 'name' but in the 'pattern' as well.  What if a user defines a Event/Period, and then later defines another one with the same name, but a different pattern?  Would the second one override the first one, or would it be ignored?  Would the user be notified of the override?  Which would be more likely?

The risk is that this introduces complexity and non-determinism.  
That would make debugging more difficult than it needs to be.

// AI response

I've reviewed the issues regarding alias naming clashes. Here are my thoughts on how we should handle this to maintain Tempo's flexibility while ensuring predictability:

### 1. Conflict Philosophy: "Explicit Shadowing"
Tempo's strength is its "config-merging" capability. We should embrace a **"Last One Wins" (Shadowing)** strategy. 
- **Reasoning**: This mirrors how CSS or JS modules work. If a user explicitly provides a configuration in `Tempo.init()`, they are stating their intent to use *that* definition for their application context.
- **Hierarchical Priority**: `Local (Instance) > Factory (init) > Plugin > Global Default`.

### 2. Conflict Detection & Feedback
While "Last One Wins" should be the resolution, the user should be informed if they are accidentally clobbering a built-in alias.
- **Warning Level**: If an alias key (or pattern) matches an existing one, issue a `console.warn` (when `debug: true`).
- **Heuristic Improvement**: Our current `#isAliasCollision` is a good start. We could improve it by checking for "Pattern Saturation"—if a new regex pattern is a subset of an existing one, or vice versa.

### 3. The "Sandbox" Factory Pattern
I strongly support the idea of `Tempo.init()` returning a **New Tempo Class**. 
- **The Pattern**: 
  ```typescript
  const AppTempo = Tempo.init({ period: { 'half-hour': ... } });
  const t = new AppTempo('half-hour'); // Uses AppTempo's registry
  ```
- **Benefits**: This prevents "Global Pollution". Multiple micro-services or components within the same process could have different Tempo configurations without stepping on each other's toes.
- **Implementation**: We could use a `class factory` that extends the base `Tempo` and overrides the static `#global` state for that specific lineage.

### 4. Traceability & Debugging
The suggestion to record collisions in a `#parse.result` array is excellent.
- **Discovery Trace**: We should include a `meta` property in the result that indicates which registry entry was used (e.g., `source: "local"`, `source: "plugin:astro"`, `source: "default"`).
- **Collision List**: If a clash occurred but was resolved by shadowing, we should keep a list of the "shadowed" candidates in the instance state to assist developers when they wonder why "noon" isn't behaving as expected.

### 5. Recommendation
- **Default to Overrides**: Don't throw errors for clashes; it breaks the "nice API" goal.
- **Formalize the Factory**: Move towards the `Tempo.init() -> Class` pattern as the primary way to configure Tempo for an application.
- **Enhance Warnings**: Make the collision warnings more descriptive, showing exactly what was overridden and by whom.

## 2026-04-24: Sandbox Factory Pattern (Consolidated)

The Sandbox Factory pattern has been finalized to ensure fully isolated, reproducible Tempo configurations without global state pollution.

### Key Decisions:
1.  **API Naming**: We introduced `Tempo.create(options)` as the primary entry point for creating isolated sandboxes. This separates the concern of "forking the library" from `Tempo.init()`, which remains the tool for managing the global singleton or resetting context.
2.  **Inheritance vs. Cloning**: Sandboxes now perform a shallow clone of the parent registries (`event`, `period`, etc.) upon initialization. This prevents the "Registry Leak" issue where adding an alias to a sandbox would inadvertently update the parent.
3.  **Local Scope Enforcement**: To simplify alias resolution and ensure traceability, sandboxed class states are tagged with `scope: 'local'`. This causes sandboxed aliases to be recorded with a `source: 'local'` tag in parse results, distinguishing them from the base library's global defaults.
4.  **Prototype Chain Resolution**: The `ParseEngine` has been hardened to support recursive `ownEntries` lookups. This allows instances to inherit from their sandbox class, which in turn can inherit (selectively) from the base `Tempo` class, providing a robust polymorphic configuration chain.
5.  **Secure Discovery**: Each sandbox is registered in `globalThis` via a unique discovery symbol (or string), allowing the `ParseEngine` to correctly resolve custom periods and events even when called from within complex, nested class contexts.

### Status:
Fully implemented and verified in `sandbox-factory.test.ts`. 100% pass rate achieved.
