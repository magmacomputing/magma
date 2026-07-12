# Introduction

Welcome to the `tempo-fns` documentation! This library provides a comprehensive suite of **pure, tree-shakable** functional utilities designed explicitly for the modern ECMAScript ecosystem.

## Built for Temporal

`tempo-fns` was engineered from the ground up to consume and return native `Temporal` instances. [Temporal](https://tc39.es/proposal-temporal/docs/) is the new global object coming to JavaScript that brings a modern, robust date and time API to the language, resolving decades of frustration with the legacy `Date` object.

Because `tempo-fns` expects standard `Temporal` objects (like `Temporal.ZonedDateTime` or `Temporal.PlainDate`), you can use these functions natively in any modern JavaScript environment without requiring bulky adapters, parsers, or conversion layers.

## Better Together with Tempo

While `tempo-fns` is a standalone library of pure functions, it was designed in parallel with the [Tempo](https://magmacomputing.github.io/magma/) core library. 

Tempo provides a powerful, immutable, and fully extensible wrapper over the Temporal API, offering features like semantic period parsing (e.g., `"tomorrow at noon"`), advanced recurring chronologies, and a premium asynchronous `Ticker` engine. 

When you use `tempo-fns` *with* Tempo, you get the best of both worlds: the zero-cost instantiation and fluent chainable API of Tempo, seamlessly augmented by the hyper-specific, tree-shakable utility logic of `tempo-fns` (like SLA scheduling, fiscal calculations, or timezone hemisphere detection).

[**Learn more about the Tempo Core Library →**](https://magmacomputing.github.io/magma/)
