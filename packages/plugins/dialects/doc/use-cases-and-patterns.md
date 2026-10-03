<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-dialects</a>
</div>

<br>

# Production Use Cases & Architectural Patterns

This guide showcases concrete, real-world architectural patterns where `@magmacomputing/tempo-plugin-dialects` solves non-trivial integration and migration challenges in production environments.

---

## 1. Heterogeneous Third-Party Webhook Ingestion

### Problem Statement
In multi-tenant SaaS platforms or marketplace integrations (e.g. Shopify, Stripe, FedEx, Salesforce), inbound webhooks and partner API payloads arrive with wildly inconsistent date formats. Some send standard ISO 8601 strings, others omit seconds, some use European `dd/MM/yyyy`, and others emit legacy 12-hour AM/PM formats (`MM/dd/yyyy hh:mm a`). Hand-coding nested try/catch blocks for each vendor is fragile and expensive.

### Architectural Solution
Use `Tempo.dialects.fromFormats()` with an ordered list of candidate masks. The parser executes a high-speed layout matcher across candidate formats, returning a validated `Tempo` instance on the first matching signature.

```
Incoming Webhook Payload
         │
         ▼
┌────────────────────────────────────────────────────────┐
│ Candidate Mask Fallback Array                          │
│ 1. "yyyy-MM-dd HH:mm:ss"                               │
│ 2. "yyyy-MM-ddTHH:mm:ssZ"                              │
│ 3. "dd/MM/yyyy HH:mm"                                  │
│ 4. "MM/dd/yyyy hh:mm a"                                │
│ 5. "yyyy-MM-dd"                                        │
└────────────────────────────────────────────────────────┘
         │
         ▼
Validated Immutable Tempo Instance (Normalized to UTC)
```

### Production Implementation

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '@magmacomputing/tempo-plugin-dialects';

Tempo.use(DialectsPlugin);

// Define candidate formats ordered by descending specificity
const WEBHOOK_CANDIDATE_MASKS = [
  'yyyy-MM-dd HH:mm:ss',
  'yyyy-MM-ddTHH:mm:ssZ',
  'dd/MM/yyyy HH:mm',
  'MM/dd/yyyy hh:mm a',
  'yyyy-MM-dd'
];

/**
 * Ingests external webhook timestamps into normalized UTC Tempo instances.
 */
export function normalizeExternalTimestamp(rawTimestamp: string): Tempo {
  const parsed = Tempo.dialects.fromFormats(rawTimestamp, WEBHOOK_CANDIDATE_MASKS, {
    dialect: DIALECT.Ldml,
    timeZone: 'UTC'
  });

  if (!parsed.isValid) {
    throw new Error(`[Webhook Ingestion] Unrecognized timestamp signature: "${rawTimestamp}"`);
  }

  return parsed;
}

// 1. Standard ISO with space
const t1 = normalizeExternalTimestamp('2026-10-24 15:30:45');
console.log(t1.iso); // "2026-10-24T15:30:45Z"

// 2. European format without seconds
const t2 = normalizeExternalTimestamp('24/10/2026 15:30');
console.log(t2.iso); // "2026-10-24T15:30:00Z"

// 3. US 12-hour format with AM/PM
const t3 = normalizeExternalTimestamp('10/24/2026 03:30 pm');
console.log(t3.iso); // "2026-10-24T15:30:00Z"
```

---

## 2. Enterprise Syslog & Audit Trail Compliance (POSIX `strftime`)

### Problem Statement
Enterprise security architectures and cloud logging daemons (Fluentd, Logstash, AWS CloudWatch, Datadog) require timestamps that strictly adhere to legacy POSIX standards—such as **RFC 3164 BSD Syslog** (`Oct 24 15:30:45`) or **RFC 5424 High-Precision Structured Syslog** (`2026-10-24T15:30:45.123456Z`). Writing manual string concatenation for padding, localized month abbreviations, and microsecond extraction is error-prone and hard to maintain.

### Architectural Solution
Use `t.format(mask, { dialect: DIALECT.Strftime })` to emit exact POSIX-compliant specifiers (`%b`, `%e`, `%H`, `%M`, `%S`, `%f`). The pre-compiled format cache evaluates these specs directly against the underlying high-resolution timestamp.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '@magmacomputing/tempo-plugin-dialects';

Tempo.use(DialectsPlugin);

export class SecurityAuditLogger {
  /**
   * Formats a legacy RFC 3164 BSD Syslog header: "Mmm dd hh:mm:ss"
   * e.g. "Oct 24 15:30:45"
   */
  static formatRFC3164(tempo: Tempo): string {
    return tempo.format('%b %e %H:%M:%S', { dialect: DIALECT.Strftime });
  }

  /**
   * Formats an RFC 5424 High-Precision Audit Timestamp with microsecond precision:
   * e.g. "2026-10-24T15:30:45.123456Z"
   */
  static formatRFC5424(tempo: Tempo): string {
    return tempo.format('%Y-%m-%dT%H:%M:%S.%fZ', { dialect: DIALECT.Strftime });
  }
}

// Example Execution
const eventTime = new Tempo('2026-10-24T15:30:45.123456Z', { timeZone: 'UTC' });

console.log(SecurityAuditLogger.formatRFC3164(eventTime));
// Output: "Oct 24 15:30:45"

console.log(SecurityAuditLogger.formatRFC5424(eventTime));
// Output: "2026-10-24T15:30:45.123456Z"
```

---

## 3. Zero-Downtime Gradual Modernization Pipeline

### Problem Statement
A large enterprise frontend and backend codebase has thousands of legacy call sites using Moment.js (`moment(d).format('YYYY-MM-DD')`) or Luxon (`DateTime.fromISO(d).toFormat('dd LLL yyyy')`). Migrating every call site at once is too risky and creates massive merge conflicts across engineering teams.

### Architectural Solution
Deploy a three-stage migration pipeline:
1. **Stage 1 (Shim Layer)**: Replace Moment / Luxon imports with Tempo. The plugin's attached shims (`t.toFormat()`, `Tempo.fromFormat()`) fulfill all existing method calls transparently without requiring changes to format masks.
2. **Stage 2 (Automated Code-Mod via `explain`)**: Use `Tempo.dialects.explain()` in an automated CI lint rule or codemod script to inspect each format string and automatically rewrite it to native Tempo `{token}` syntax.
3. **Stage 3 (Native Runtime)**: Once all masks are converted to native syntax, remove the dialect layer for zero-dependency peak throughput.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '@magmacomputing/tempo-plugin-dialects';

Tempo.use(DialectsPlugin);

// Stage 1: Legacy call sites continue working unchanged via shims
const now = new Tempo('2026-10-24T15:30:45');
console.log(now.toFormat('dd LLL yyyy')); // "24 Oct 2026"

// Stage 2: Automated inspection and translation tool
export function auditAndMigrateFormatMask(legacyMask: string, dialect: string) {
  const explained = Tempo.dialects.explain(legacyMask, dialect);
  
  return {
    sourceMask: legacyMask,
    nativeTempoPattern: explained.pattern,
    tokenCount: explained.tokens.length,
    readyForCore: true
  };
}

const migrationResult = auditAndMigrateFormatMask('YYYY-MM-DD [at] hh:mm:ss A', DIALECT.Moment);
console.log(migrationResult.nativeTempoPattern);
// Output: "{yyyy}-{mm}-{dd} at {h12}:{mi}:{ss} {mer:upper}"

// Stage 3: Direct native format execution (Core only, zero plugin overhead)
console.log(now.format(migrationResult.nativeTempoPattern, { dialect: null }));
// Output: "2026-10-24 at 03:30:45 PM"
```
