# The Immutable Proxy-Delegator Lazy Evaluation Pattern

When building complex JavaScript libraries (like date-time utilities), exposing numerous computed properties as getters on an object is common. However, computing them all upfront is expensive, and re-computing them on every access is wasteful. The standard solution is "Lazy Evaluation": evaluate the getter on first access, and then overwrite the getter with the literal value.

But what if the base object is strictly **immutable** (via `Object.freeze`)? 

This article details a highly optimized $O(1)$ pattern for securely lazy-evaluating properties on immutable objects using a Proxy-based delegator and private fields.

## The Problem: Mutating Frozen State

A traditional lazy evaluation approach destroys and recreates the properties on the parent object. If the parent object is `Object.freeze()`'d for security (preventing API consumers from tampering with state), you cannot simply `Object.defineProperty` to overwrite the getter with a literal value.

To get around freezing, you might try taking all property descriptors, wiping the object, mapping the other getters to a new object, adding the evaluated value, and calling `Object.freeze()` on the new object. This operation runs in $O(N)$ time every single time *any* getter is accessed.

## The Solution: Proxy-Delegator with Memoization

Tempo achieves lazy evaluation in $O(1)$ time using a **Delegator Proxy** that memoizes results back onto the target object.

```javascript
// The O(1) approach - Extremely fast, zero overhead

#setLazy(target, name, defineFunction) {
    const get = () => {
        const value = defineFunction.call(this); // Evaluate the value
        
        // Memoize the value by defining it as a static property on the target
        Object.defineProperty(target, name, {
            value,
            enumerable: true,
            configurable: true,
            writable: false
        });
        
        return value;
    };

    // Define the initial getter
    Object.defineProperty(target, name, { get, enumerable: true, configurable: true });
}
```

### How it Works

1. **Proxy Entry Point:** 
   Tempo uses a single Proxy (the `delegate` helper) to catch the very first access to a property. This Proxy doesn't store state; it just routes the request to the lazy evaluator.
   
2. **Private Fields Bypass the Freeze:**
   The internal containers (`#term`, `#fmt`) are private fields. Native JS Private Fields don't exist as properties on the object; they are internal engine slots. Thus, even if the `Tempo` instance is frozen, we can still update the *internal* state of the container objects.

3. **Innate JS Engine Optimizations:**
   Once a property (e.g., `.quarter`) is evaluated, it is "baked" into the target object as a standard value property. Subsequent lookups bypass the Proxy and the getter entirely. The JS engine treats it as a raw property access, which is the fastest possible operation in JavaScript.

4. **Zero Over-allocation:**
   Unused getters remain as simple function pointers. They cost absolutely nothing in execution time or memory until they are needed.

### Summary

By combining **Private Fields**, **Proxies**, and **Property Memoization**, Tempo builds securely immutable APIs that lazy-load computed getters with zero overhead after the initial call.

## 🌈 The Best of All Worlds

As of **v2.1.2**, Tempo uses a **Proxy-Delegator** that combines the security of immutability with the speed of raw property access:

1. **Lazy by Default**: Properties are only evaluated when accessed, keeping the constructor near-instant.
2. **Memoized Evaluation**: Once accessed (e.g., `t.term.quarter`), the result is "baked" into the instance using `Object.defineProperty`.
3. **$O(1)$ Performance**: Every access *after* the first is a direct property lookup—no Proxy traps, no prototype traversal.
4. **Transparent Discovery**: Because properties are enumerable, `console.log(t.term)` or `JSON.stringify` will trigger the evaluation of all registered terms at once, providing a perfect "snapshot" of the instance state.

To prevent diagnostic noise during these full-evaluation events, initialize Tempo with **`silent: true`**.
