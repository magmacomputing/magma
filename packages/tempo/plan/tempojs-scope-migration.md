# Plan: `@tempojs` npm Scope Acquisition & v5.0.0 Migration Strategy

## 1. Executive Summary & Value Proposition

Currently, the Tempo ecosystem is published under the corporate organization scope:
- `@magmacomputing/tempo`
- `@magmacomputing/tempo-fns`
- `@magmacomputing/tempo-plugin-*` (13+ plugins)

### Why Transition to `@tempojs` in v5.0.0?
1. **Developer Experience (DX) & Brand Recognition**: `@tempojs/tempo` and `@tempojs/plugin-ai` are significantly more memorable, concise, and standard within modern open-source ecosystems (following patterns like `@vuejs/*`, `@sveltejs/*`, `@fastify/*`, `@trpc/*`).
2. **Community Adoption & GitHub Appeal**: Developer trust increases when a library is packaged under a dedicated product namespace rather than an enterprise umbrella scope.
3. **Clean Version Boundary (v5.0.0)**: Package name changes represent breaking changes for consumer imports, making the upcoming major release (`v5.0.0`) the ideal milestone.

---

## 2. Step-by-Step Guide: Acquiring the `@tempojs` Scope on npm

### Step 1: Status of `@tempojs` & Alternatives
- **Current Status**: `@tempojs` is currently registered by an existing product/account created ~3 years ago.

#### Alternative Scope Candidates:
If `@tempojs` cannot be acquired, here are the strongest modern npm scope alternatives:

1. **`@tempo-ts`** *(Preferred over `@tempots` to avoid phonetic misreading as "tem-pots")*
   - Pattern: `@tempo-ts/tempo` (or `@tempo-ts/core`), `@tempo-ts/plugin-ai`, `@tempo-ts/fns`
   - Precedent: Clean hyphenated TypeScript ecosystem branding (`@tempo-ts/*`).
2. **`@tempo-js`**
   - Pattern: `@tempo-js/tempo`, `@tempo-js/plugin-ai`, `@tempo-js/fns`
   - Direct equivalent to `@tempojs`.
3. **`@tempodev`**
   - Pattern: `@tempodev/tempo`, `@tempodev/plugin-ai`, `@tempodev/fns`
   - Aligns with modern developer tooling and domain name `tempodev.io` / `tempodev.com`.
4. **`@magma-tempo`**
   - Pattern: `@magma-tempo/tempo`, `@magma-tempo/plugin-ai`, `@magma-tempo/fns`
   - Cleaner product sub-brand under Magma Computing.

### Step 2: Acquisition / Dispute Process (Accepted npm Practice)

npm's official [Dispute Resolution Policy](https://docs.npmjs.com/policies/disputes) requires a **two-phase outreach process**:

1. **Phase 1: Direct Outreach to the Current Owner (Required)**
   - **Locate Owner Contact**: Check `npm info @tempojs/server` for publisher email, or visit the GitHub repository / profile linked to the package.
   - **Friendly Outreach Email**: Send a polite email inquiring if they are still maintaining the `@tempojs` namespace or would be willing to transfer/add you as an owner or organization admin.
   - **Document Outreach**: Keep a timestamped copy of the sent email (and any GitHub issue/discussion links).

#### Sample Outreach Email:
```text
Subject: Inquiring about the @tempojs npm scope / organization

Hi Andrew,

Hope you're doing well!

I came across your work on Bebop and the @tempojs packages on npm. I’m the maintainer of Tempo (https://github.com/magmacomputing/magma), a TypeScript date/time and Temporal API ecosystem currently published under @magmacomputing/tempo.

As we plan our upcoming v5.0.0 release, we are looking to publish our ecosystem under a dedicated open-source scope. I noticed the @tempojs scope on npm has been dormant for a few years, and I wanted to reach out to see if you have any ongoing or future plans for that namespace?

If you are no longer using the @tempojs scope, would you be open to transferring it (or adding my npm user as an admin/owner)? My npm username is: [YOUR_NPM_USERNAME]

If you still have plans for it or prefer to keep it, no worries at all! Just wanted to check with you first.

Thanks so much for your time and all your contributions to the open-source community!

Best regards,
Michael
[Your Contact / GitHub Link]
```

2. **Phase 2: Wait 4 Weeks for Response**
   - npm requires giving the current owner a **4-week (28-day) window** to reply.
   - *Best Case*: The developer agrees and transfers the package/org directly via the npm dashboard or `npm owner add <username> <package>`.

3. **Phase 3: File npm Support Dispute Ticket (If Unresponsive or Bounced)**
   - If 4 weeks pass with no response, or if the maintainer's email bounces:
     - Submit a ticket via [npm Support](https://www.npmjs.com/support) choosing **"Dispute / Name Claim"**.
     - Provide:
       - Target scope: `@tempojs`.
       - Package evidence: `v0.0.12` abandoned for ~3 years, zero active development.
       - Proof of outreach: Attach copy of the email sent 4 weeks ago showing no reply.
       - Link to active project: `https://github.com/magmacomputing/magma`.
   - npm support will attempt to contact the owner directly; if still unresponsive within their grace period, npm will reassign the abandoned scope.

### Step 3: Align GitHub & Domain Assets (Recommended)
- **GitHub Organization**: Check availability of `github.com/tempots` or `github.com/tempojs`.
- **Domain Name**: Consider claiming `tempots.dev`, `tempodev.io`, or `tempojs.dev`.

---

## 3. Ecosystem Naming Architecture for v5.0.0

| Current Scope (`@magmacomputing/*`) | Target v5.0.0 Scope (`@tempojs/*`) | Description |
| :--- | :--- | :--- |
| `@magmacomputing/tempo` | `@tempojs/tempo` (or `@tempojs/core`) | Core Tempo date-time engine |
| `@magmacomputing/tempo-fns` | `@tempojs/fns` | Zero-dependency functional date math & celestial utilities |
| `@magmacomputing/tempo-plugin-ai` | `@tempojs/plugin-ai` | AI calendar reasoning & smart parsing |
| `@magmacomputing/tempo-plugin-holidays` | `@tempojs/plugin-holidays` | Regional public holidays & business days |
| `@magmacomputing/tempo-plugin-spatial` | `@tempojs/plugin-spatial` | Geofencing, bearing, & velocity |
| `@magmacomputing/tempo-plugin-celestial` | `@tempojs/plugin-celestial` | Sun/Moon ephemeris & tide calculations |
| `@magmacomputing/tempo-plugin-dialects` | `@tempojs/plugin-dialects` | Moment/Dayjs/Python format compatibility |
| `@magmacomputing/tempo-plugin-*` | `@tempojs/plugin-*` | Remaining official plugins |

---

## 4. Consumer Impact & Migration Workflow

### How Consumers Will Import in v5.0.0:
```typescript
// Core Engine
import { Tempo } from '@tempojs/tempo';

// Official Plugins
import { AIPlugin } from '@tempojs/plugin-ai';
import { HolidaysPlugin } from '@tempojs/plugin-holidays';

// Functional Utilities
import { isWeekend, daysInMonth, getLunarPhase } from '@tempojs/fns';
```

### Seamless Backward-Compatibility Strategy (Zero-Disruption Transition)
To avoid immediately breaking existing v4.x projects upon release of v5.0.0:

1. **Publish Bridge Stubs under `@magmacomputing/*`**:
   - For v5.0.0, continue publishing lightweight wrapper packages under `@magmacomputing/tempo` and `@magmacomputing/tempo-plugin-*`.
   - The wrapper simply re-exports everything from `@tempojs/*`:
     ```typescript
     // @magmacomputing/tempo index.ts
     export * from '@tempojs/tempo';
     export { Tempo as default } from '@tempojs/tempo';
     ```
2. **Issue Deprecation Notices**:
   - Mark `@magmacomputing/tempo` on npm:
     ```bash
     npm deprecate @magmacomputing/tempo "Package moved to @tempojs/tempo. Please update your dependencies."
     ```
   - This allows consumers to upgrade to v5.0.0 without changing package names immediately, then migrate their `import` statements at their convenience.

---

## 5. Monorepo Execution Checklist (For v5.0.0 Release)

- [ ] Claim npm organization `@tempojs`.
- [ ] Configure npm access token with publishing rights to `@tempojs`.
- [ ] Update `package.json` in `packages/tempo` and `packages/plugins/*` to `@tempojs/*`.
- [ ] Update workspace cross-dependencies (`packages/*/package.json`).
- [ ] Update documentation examples across `packages/tempo/doc/` and `README.md`.
- [ ] Update VitePress theme headers and installation snippets (`npm install @tempojs/tempo`).
- [ ] Create stub bridge packages for `@magmacomputing/*` v5.0.0 re-exports.
- [ ] Tag `v5.0.0` and publish with `npm publish --access public`.
