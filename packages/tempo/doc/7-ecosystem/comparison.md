# 🥊 Tempo vs. The Competition

If you are choosing a date library today, you are likely looking at **Day.js**, **Luxon**, or **date-fns**. While these are excellent tools, they were all built for the legacy `Date` era. 

**Tempo** is the first premium wrapper built specifically for the **Temporal API** (Stage 4), giving it unique advantages that legacy libraries simply cannot match.

---

## At a Glance

| Feature | Tempo 💎 | Raw Temporal API | Day.js / Moment | Luxon | date-fns |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Foundation** | **Native Temporal** | Native Temporal | Legacy `Date` | Legacy `Intl` + `Date` | Legacy `Date` |
| **Precision** | **Nanoseconds** | Nanoseconds | Milliseconds | Milliseconds | Milliseconds |
| **Parsing** | **Human-Centric** | Strict ISO Only | Strict / Plugin | Strict | Modular / Strict |
| **Formatting** | **Smart Tokens & Getters** | Verbose `Intl` Only | Token-Based (Moment style) | Token-Based (Unicode) | Token-Based (Unicode helper) |
| **Business Logic** | **Terms System** | Manual Math | Manual Math | Manual Math | Manual Math |
| **Time Zones** | **First-Class** | First-Class | Plugin-based | Built-in | Separate Lib |
| **Future-Proof** | **100% (Native)** | 100% (Native) | Maintenance Mode | Planned Sunset | Transitioning |

---

## 💎 Why Tempo Wins

### 1. The "Terms" Engine (Business Intelligence)
Most libraries stop at "adding 2 days." Tempo introduces the **Terms** system, allowing you to encode domain-specific logic (Fiscal Quarters, Meteorological Seasons, Academic terms, Zodiac Signs) directly into the Tempo `term` object. 
> *Competition:* You have to write custom utility functions and import them everywhere.

### 2. Human-Centric Parsing
Day.js and Luxon are quite strict. If your string isn't in exactly the right format, they fail. Tempo’s **Snippet & Layout** engine is designed to be forgiving, extensible, and human-centric, handling relative dates like `"next Friday"` or `"Christmas"` out of the box.
> *Competition:* Often requires an external library like `Chrono` or complex regex boilerplate.

### 3. Nanosecond Precision
Native `Date` (and thus Day.js/Luxon/date-fns) is limited to milliseconds. For high-frequency trading, scientific data, or distributed systems, this isn't enough. Tempo inherits **nanosecond precision** from the Temporal API.
> *Competition:* Capped at 1/1000th of a second.

### 4. Zero "Leaky Abstractions"
When you use a legacy library, you are often fighting the weirdness of the 1995 `Date` object (like months being 0-indexed). Tempo is built on `Temporal`, which was designed from the ground up to be mathematically sound and developer-friendly.

### 5. Intelligent Formatting & Shorthands
While native Temporal is highly precise, formatting dates for a UI in native Temporal is extremely verbose. It relies entirely on the native `Intl` API, requiring you to construct complex option objects or use long `.toLocaleString()` boilerplate just to output simple strings.

Tempo solves this by offering a **Smart Token Engine** (using `{yyyy}-{mm}-{dd}` placeholders) alongside built-in, highly optimized format getters like `.fmt.date`, `.fmt.time`, or `.fmt.dateTime`. In addition, Tempo automatically memoizes internal formatters under the hood, delivering top-tier performance without developer boilerplate.
> *Competition:* Raw Temporal requires verbose `Intl` configurations; legacy libraries require large plugins or separate helper imports.

---

## The Temporal Transition Strategy

As JavaScript transitions natively to the Temporal API, the existing ecosystem is taking different paths. This presents a unique opportunity for new, Temporal-first architectures like Tempo:

- **Luxon:** The creators have explicitly stated they [plan to sunset Luxon](https://github.com/moment/luxon/discussions/970) as Temporal adoption grows, eventually becoming "a distant memory."
- **Day.js:** Architecturally bound to the legacy `Date` object to [maintain its <2kB size](https://github.com/iamkun/dayjs) and Moment.js compatibility. It cannot evolve to support native Temporal objects and will remain a tool for legacy codebases.
- **date-fns:** Transforming into a companion utility kit tailored around native Temporal objects (evidenced by their bridging project, [`date-fns/interim`](https://github.com/date-fns/interim)), while maintaining dual support for legacy `Date`.

Because Luxon is bowing out and Day.js cannot evolve architecturally without losing its identity, **Tempo** steps in as the premier, dedicated premium wrapper built *specifically* for the Temporal era from day one.

---

## Which should you choose?

- **Choose Day.js if:** You have a legacy codebase and need a tiny <2KB patch for simple tasks, and are comfortable using a library in maintenance mode.
- **Choose Luxon if:** You need a stable bridge for environments that don't yet support Temporal, but keep in mind it is actively planning for sunset.
- **Choose date-fns if:** You prefer using functional utilities to manipulate native Temporal objects, rather than a comprehensive class-based wrapper.
- **Choose Tempo if:** You want a premium, Temporal-first architecture that provides **high precision**, **human-centric parsing**, and the ability to model **complex business-date logic** directly into your application.

[**Ready to start? See the Quick Start Guide →**](../../README.md#quick-start)
