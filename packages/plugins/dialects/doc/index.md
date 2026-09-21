![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-dialects

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-dialects"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-dialects?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-dialects/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-dialects"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-dialects?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

The **Dialects Plugin** enables Tempo to format and parse dates using established external format standards such as **Unicode LDML / UTS #35 (Luxon, date-fns)**, **Moment.js / Day.js**, and **POSIX `strftime`**.

---

## 🚀 Installation

```bash
npm install @magmacomputing/tempo-plugin-dialects
```

### Registration

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '@magmacomputing/tempo-plugin-dialects';

Tempo.use(DialectsPlugin);
```

Or via side-effect import in scripts / REPLs:

```typescript
import '@magmacomputing/tempo-plugin-dialects/install';
```

---

## 🔤 Supported Dialects

| Dialect Identifier | Canonical Constant | Common Aliases | Format Example | Description |
| :--- | :--- | :--- | :--- | :--- |
| `'ldml'` | `DIALECT.Ldml` | `'luxon'`, `'datefns'`, `'cldr'` | `yyyy-MM-dd HH:mm:ss.SSS` | Standard Unicode LDML / UTS #35 tokens. |
| `'strftime'` | `DIALECT.Strftime` | `'posix'`, `'c'`, `'python'` | `%Y-%m-%d %H:%M:%S` | POSIX C / Python / SQL specifiers. |
| `'moment'` | `DIALECT.Moment` | `'dayjs'` | `YYYY-MM-DD` | Legacy Moment.js tokens. |

> [!TIP]
> **Native Tempo Syntax is Optimal**
> While the Dialects plugin provides seamless interoperability with legacy format masks, **native Tempo braced syntax (`{token}`) remains the most performant, lightweight, and expressive choice**. Native Tempo syntax runs in Core with zero plugin dependencies, and provides rich capabilities unavailable in external token systems—including custom Terms, dynamic dot namespaces (`{geo.city}`), localized modifiers (`{dow:locale}`, `{hh:locale:raw}`), and regional `{intl.*}` property interpolation.

---

## 🛠️ Usage Examples

<PluginRepl plugin="dialects" />

### 1. Unicode LDML & Luxon Style Formatting

```typescript
const t = new Tempo('2026-10-24T15:30:45');

// Via Core .format() with dialect option
t.format('yyyy-MM-dd HH:mm:ss', { dialect: 'ldml' }); // "2026-10-24 15:30:45"

// Via .dialects namespace
t.dialects.ldml('dd LLL yyyy');                       // "24 Oct 2026"
t.dialects.ldml("'Today is' EEEE, MMMM d");           // "Today is Saturday, October 24"

// Via Luxon drop-in alias
t.toFormat('yyyy-MM-dd');                             // "2026-10-24"
```

### 2. POSIX `strftime` Formatting

```typescript
const t = new Tempo('2026-10-24T15:30:45');

// Via Core .format() with explicit 'strftime' dialect
t.format('%Y-%m-%d %H:%M:%S', { dialect: 'strftime' }); // "2026-10-24 15:30:45"
t.dialects.strftime('%B %d, %Y (%A)');                  // "October 24, 2026 (Saturday)"
```

### 3. Parsing with Dialect Masks

```typescript
// Explicit static parser
const t1 = Tempo.dialects.parse('24/10/2026', 'dd/MM/yyyy');

// Fallback across multiple candidate masks (first matching wins)
const t2 = Tempo.dialects.fromFormats('24/10/2026', [
  'yyyy-MM-dd',
  'dd/MM/yyyy',
  'MM/dd/yyyy'
]);

// Luxon migration alias
const t3 = Tempo.fromFormat('2026-10-24 15:30', 'yyyy-MM-dd HH:mm');
```

### 4. Migration Helper (`explain`)

Use `Tempo.dialects.explain()` (or instance `t.dialects.explain()`) to translate legacy masks into native Tempo `{token}` patterns with a breakdown of each mapped token to guide incremental migration:

```typescript
const result = Tempo.dialects.explain('YYYY-MM-DD HH:mm:ss', 'moment');

console.log(result.pattern); 
// => "{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}"

console.log(result.tokens);
// [
//   { source: 'YYYY', tempo: '{yyyy}', desc: '4-digit year' },
//   { source: 'MM', tempo: '{mm}', desc: 'Zero-padded month (01-12)' },
//   { source: 'DD', tempo: '{dd}', desc: 'Zero-padded day of month (01-31)' },
//   { source: 'HH', tempo: '{hh}', desc: '24-hour clock (00-23)' },
//   { source: 'mm', tempo: '{mi}', desc: 'Zero-padded minute (00-59)' },
//   { source: 'ss', tempo: '{ss}', desc: 'Zero-padded second (00-59)' }
// ]
```

---

## ⚡ Performance & Lazy Evaluation

1. **Pre-Compiled Formatters**: Formatting masks are tokenized and compiled into high-speed closure interpolators on first run and cached in memory. Subsequent executions bypass tokenization and compilation overhead, evaluating directly through cached closures.
2. **Lazy-Evaluated Namespace**: Accessing `t.dialects` utilizes Tempo's zero-overhead proxy pattern, consuming zero CPU cycles until explicitly invoked on an instance.
3. **Immutable Static Namespace**: `Tempo.dialects` is recursively frozen via `deepFreeze()` to protect the host class against runtime tampering.

---

## 📄 Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.
