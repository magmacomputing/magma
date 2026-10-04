![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-dialects

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-dialects"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-dialects?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-dialects/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-dialects"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-dialects?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

The **Dialects Plugin** enables Tempo to seamlessly format and parse dates using established external formatting standards, including **Unicode LDML / UTS #35 (Luxon, date-fns)**, **Moment.js / Day.js**, and **POSIX `strftime` (C, Python, Linux)**.

It provides transparent drop-in compatibility shims, multi-candidate fallback parsing, and an automated `.explain()` translation engine to assist incremental migrations to native Tempo `{token}` syntax.

---

## 🚀 Installation & Quickstart

```bash
npm install @magmacomputing/tempo-plugin-dialects
```

<PluginRepl plugin="dialects" />

### Registration

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '@magmacomputing/tempo-plugin-dialects';

Tempo.use(DialectsPlugin);

const t = new Tempo('2026-10-24T15:30:45');

// Format using external dialect masks
console.log(t.format('yyyy-MM-dd HH:mm:ss', { dialect: DIALECT.Ldml })); // "2026-10-24 15:30:45"
console.log(t.format('%Y-%m-%d %H:%M:%S', { dialect: DIALECT.Strftime })); // "2026-10-24 15:30:45"
console.log(t.format('[Recorded on] MMMM Do YYYY', { dialect: DIALECT.Moment })); // "Recorded on October 24th 2026"
```

#### Zero-Boilerplate Auto-Installation (Side-Effect Import)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-dialects/install';

const t = new Tempo('2026-10-24T15:30:45');
console.log(t.toFormat('dd LLL yyyy')); // "24 Oct 2026"
```

---

## 🔤 Supported Dialects

| Dialect Identifier | Canonical Constant | Common Aliases | Format Example | Primary Ecosystems |
| :--- | :--- | :--- | :--- | :--- |
| `'ldml'` | `DIALECT.Ldml` | `'luxon'`, `'datefns'`, `'cldr'` | `yyyy-MM-dd HH:mm:ss.SSS` | Luxon, date-fns, CLDR, Unicode UTS #35 |
| `'strftime'` | `DIALECT.Strftime` | `'posix'`, `'c'`, `'python'` | `%Y-%m-%d %H:%M:%S` | POSIX C, Python datetime, Linux Syslog, SQL |
| `'moment'` | `DIALECT.Moment` | `'dayjs'` | `YYYY-MM-DD HH:mm:ss` | Moment.js, Day.js |

> [!TIP]
> **Native Tempo Syntax is Optimal**
> While the Dialects plugin provides seamless interoperability with legacy format masks, **native Tempo braced syntax (`{token}`) remains the most performant, lightweight, and expressive choice**. Native Tempo syntax runs in Core with zero plugin dependencies, and provides rich capabilities unavailable in external token systems—including custom Terms, dynamic dot namespaces (`{geo.city}`), localized modifiers (`{dow:locale}`, `{hh:locale:raw}`), and regional `{intl.*}` property interpolation.

---

## 📚 API Surface Catalog

The Dialects plugin mounts cohesive static tools onto `Tempo.dialects`, instance utilities onto `t.dialects`, and attaches convenience shims directly onto `Tempo`:

| API / Method | Target | Input | Returns | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`t.toFormat(mask, options?)`** | Instance | Format mask string, options | `string` | **Luxon Drop-In Formatter**. Formats the instance using LDML (or explicit dialect). |
| **`t.dialects.ldml(mask)`** | Instance | Unicode LDML mask | `string` | Fast-path formatter for Unicode LDML / Luxon / date-fns masks. |
| **`t.dialects.strftime(mask)`** | Instance | POSIX strftime mask | `string` | Fast-path formatter for POSIX strftime specifiers (`%Y`, `%m`, `%d`, etc.). |
| **`t.dialects.format(mask, dialect?)`** | Instance | Mask, dialect identifier | `string` | Generic dialect instance formatter with auto-detection for `%` specifiers. |
| **`t.dialects.explain(mask, dialect?)`** | Instance | External format mask | `ExplainResult` | Analyzes mask and returns equivalent native Tempo `{token}` pattern and metadata. |
| **`Tempo.fromFormat(input, mask, options?)`** | Static | Date string, mask, options | `Tempo` | **Luxon Drop-In Parser**. Parses an input string using an LDML mask. |
| **`Tempo.fromFormats(input, masks[], options?)`** | Static | Date string, candidate masks | `Tempo` | Multi-candidate fallback parser (first matching mask succeeds). |
| **`Tempo.dialects.parse(input, mask, dialect?)`** | Static | Date string, mask, dialect | `Tempo` | Explicit dialect parser. |
| **`Tempo.dialects.fromFormats(input, masks[], ...)`**| Static | Date string, candidate masks | `Tempo` | Explicit multi-candidate fallback parser. |
| **`Tempo.dialects.explain(mask, dialect?)`** | Static | External format mask | `ExplainResult` | AST analyzer translating legacy masks into native Tempo `{token}` syntax. |

---

## 📖 Architecture & Specialized Guides

To explore technical deep-dives, token compatibility matrices, and production patterns, consult the dedicated guides below:

- **[Migration & Legacy Compatibility](./migration-and-compatibility.md)**: Resolving the `YYYY` vs `yyyy` year trap, handling bracketed/quoted escaping, using `.explain()` for automated codemods, and performance benchmarks.
- **[Token Specification & Cross-Ecosystem Matrix](./token-specification.md)**: Exhaustive token lookup table mapping LDML, Moment, strftime, and native Tempo tokens across years, months, days, sub-seconds, and timezones.
- **[Production Use Cases & Architectural Patterns](./use-cases-and-patterns.md)**: Multi-candidate webhook ingestion pipelines, enterprise POSIX syslog formatting, and zero-downtime gradual modernization recipes.

---

## ⚡ Performance & Lazy Evaluation

1. **Pre-Compiled Formatters**: Formatting masks are tokenized and compiled into high-speed closure interpolators on first run and cached in memory. Subsequent executions bypass tokenization and compilation overhead, evaluating directly through cached closures.
2. **Lazy-Evaluated Namespace**: Accessing `t.dialects` utilizes Tempo's zero-overhead proxy pattern, consuming zero CPU cycles until explicitly invoked on an instance.
3. **Immutable Static Namespace**: `Tempo.dialects` is recursively frozen via `deepFreeze()` to protect the host class against runtime tampering.

---

## 📄 Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license. No license token is required.
