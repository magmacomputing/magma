![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-dialects

[![npm version](https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-dialects?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-dialects)
[![npm peer dependency version](https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-dialects/peer/@magmacomputing/tempo?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo)
[![License](https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-dialects?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-dialects)

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

---

## 🛠️ Usage Examples

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

// Auto-detected because mask contains '%'
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

---

## ⚡ Performance & Lazy Evaluation

1. **Pre-Compiled Formatters**: Formatting masks are tokenized and compiled into high-speed closure interpolators on the first run and cached in memory. Subsequent executions execute in $O(1)$ time with zero regex scanning overhead.
2. **Lazy-Evaluated Namespace**: Accessing `t.dialects` utilizes Tempo's zero-overhead proxy pattern, consuming zero CPU cycles until explicitly invoked on an instance.
3. **Immutable Static Namespace**: `Tempo.dialects` is recursively frozen via `deepFreeze()` to protect the host class against runtime tampering.

---

## 📄 Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.
