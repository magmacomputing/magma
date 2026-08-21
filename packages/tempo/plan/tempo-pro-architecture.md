# TempoPro Architecture & Commercial Ecosystem Strategy

## Overview

This document outlines the architectural blueprint for `@magmacomputing/tempo-pro`, the commercial extension wrapper and enterprise license management package for the Tempo ecosystem.

---

## Key Principles & Integration

### 1. Ultra-Lean Core Parity (`@magmacomputing/tempo-pro/core`)
- `tempo-pro` provides 1:1 sub-path export symmetry with community core via `./core`.
- Developers using ultra-lean setups can swap between community core and commercial core by simply changing sub-paths:

```typescript
// Community Core (Ultra-lean, un-extended)
import { Tempo } from '@magmacomputing/tempo/core';

// Commercial Core (Ultra-lean with license validation hooks)
import { Tempo } from '@magmacomputing/tempo-pro/core';
```

Behind the scenes in `packages/tempo-pro/src/core.ts`:
```typescript
import { Tempo as BaseTempoCore } from '@magmacomputing/tempo/core';

export class TempoCore extends BaseTempoCore {
  static override init(options?: Record<string, any>) {
    if (options?.licenseKey) {
      setLicense(ensureLicenseState(TempoCore), options.licenseKey);
    }
    return super.init(options);
  }
}

export { TempoCore as Tempo };
export default TempoCore;
```

### 2. Sub-Classing + Sandbox Composition (Option 1 + Option 2)
`TempoPro` extends `Tempo` directly, preserving 100% API parity while supporting isolated sandbox creation:

```typescript
import { TempoPro } from '@magmacomputing/tempo-pro';

// 1. Standard Instance (Sub-classing DX)
const t = TempoPro.init({ licenseKey: '...' });

// 2. Multi-tenant Enterprise Sandbox (Option 2 via Parent Sandbox Engine)
const tenantSandbox = TempoPro.create({
  licenseKey: 'tenant-enterprise-key',
  timeZone: 'America/New_York',
});
```

### 3. Stashed Enterprise Infrastructure
- **`license.manager.ts`**: JWT state decoding, pledge tracking, expiry warning loops, and scope updating (`updateScopeStatus`).
- **`license.validator.ts`**: Cryptographic JWS verification engine and commercial plugin tags (`defineCommercialPlugin`, `defineCommercialTerm`).
- **`license.enum.ts`**: Unified `LICENSE` status enumeration (`None`, `Pending`, `Active`, `Expired`, `Revoked`, `Invalid`).

---

## Package Versioning Strategy

### Monorepo Version Synchronization vs. Independent SemVer

- **Synchronized Release Line (`tempo-pro@4.0.0`)**:
  - In modern monorepos (similar to Angular `@angular/core@17` or Babel `@babel/core@7`), companion core wrappers synchronize version numbers (`v4.0.0`) with the primary core engine.
  - **Advantage**: Completely eliminates consumer matrix confusion ("Is `tempo-pro@1.0.0` compatible with `tempo@4.0.0`? Yes, because both share `v4.0.0`!").
- **Independent SemVer (`tempo-pro@1.0.0`)**:
  - Useful if `tempo-pro` matures on an independent lifecycle with broad `peerDependencies: { "@magmacomputing/tempo": "^4.0.0" }`.

**Conclusion**: Synchronizing `tempo-pro` to `4.0.0` alongside `@magmacomputing/tempo@4.0.0` is standard industry practice for core monorepo companions.
