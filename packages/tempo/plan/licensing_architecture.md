# Tempo Licensing Architecture & Plugin Strategy

## Objective
Implement a secure, user-friendly licensing system for Tempo plugins that enables monetization and IP protection without creating high friction for developers.

## The "No-PAT" Distribution Model
To eliminate developer friction (configuring registries/PATs), all plugins are distributed via the public npmjs registry.

- **Storage**: Private source code resides in Magma Computing's GitHub organization.
- **Distribution**: Plugins are built, minified, and obfuscated before being published as public packages under the `@magmacomputing` scope (e.g., `@magmacomputing/plugin-term`).
- **Access**: Anyone can `npm install`, but functionality is gated by the "Tempo Activation Key" (JWT).
- **Free Tier**: The "Astrological Sign" plugin serves as a free reference implementation for users to test the activation and support model.

## Activation & Validation

### 1. The Tempo Activation Key (JWT)
The key is a JSON Web Token issued to the customer. It supports three tiers of usage:

| Claim | Standard/Trial | Enterprise/Distribution |
| :--- | :--- | :--- |
| `aud` (Audience) | Array of domains (e.g. `["localhost", "site.com"]`) | `"*"` (Wildcard - works on any domain) |
| `exp` (Expiry) | Unix timestamp (e.g. 1 year from issue) | `0` (Perpetual - never expires) |
| `jti` | Unique ID for revocation | Unique ID for revocation |

### 2. Cascade of License Discovery
Plugins will look for the activation key in the following order:
1. **Explicit**: `Tempo.init({ license: '...' })`
2. **Discovery**: `globalThis.__TEMPO_DISCOVERY__.license`
3. **Environment**: `process.env.TEMPO_LICENSE` (Server-side)
4. **Configuration**: `.temporc` or `tempo.config.json` (CWD)
5. **Storage**: `localStorage.getItem('tempo_license')` (Client-side)

### 3. Verification Logic
- **Domain Locking**: The plugin verifies `window.location.hostname` against the `aud` claim (unless `aud` is `*`).
- **Grace Period**: If a key is expired, the plugin enters a 7-day "Grace Period," allowing full functionality while emitting a `console.warn`.
- **Revocation**:
    - Plugins fetch a **Signed Revocation List** (JWS) from Magma's servers every **7 days**.
    - The fetch is shared across all Tempo plugins to minimize overhead.
    - If offline, the plugin "Fails Open" and relies on the JWT's internal expiry.
    - The list is self-cleaning; keys are removed once they naturally expire.

### 4. The License "Wallet" (Discovery & Persistence)
To prevent "Token Fatigue" and the need to re-supply keys, Tempo and its plugins treat the environment as a persistent wallet.

- **One Key, Many Scopes**: A single JWT can contain multiple plugin identifiers in its `scope` claim (e.g., `scope: ["term", "ticker"]`).
- **Global Discovery (Browser)**: Developers can define `window.__TEMPO_DISCOVERY__ = { license: '...' }` at the very top of their HTML. Any Tempo instance or plugin will automatically "hydrate" from this global wallet.
- **Internal Stashing**: Once a license is discovered or provided via `init()`, Tempo core caches it in its internal static state. This ensures that a plugin imported in a different module (or a secondary Tempo instance) can still find the active license without being explicitly passed a key.
- **Cross-Session Persistence (Opt-in & Unsafe)**: By default, Tempo avoids `localStorage` due to XSS token-theft risks. Persistence is **opt-in** via the `enableCrossSessionPersistence` flag.
    - **Recommended**: Use memory or `sessionStorage` for sensitive keys.
    - **Mitigation Checklist**:
        - Implement strict Content Security Policy (CSP).
        - Use HttpOnly cookies for token delivery where possible.
        - Ensure rigorous input sanitization.
        - Use short TTLs and rotate/revoke tokens frequently.

### 5. Revocation Infrastructure (The Control Tower)
To maintain security without manual intervention on the customer side:

- **Host**: `api.magmacomputing.com.au`
- **Endpoint**: `/tempo/v1/revoked.jws` (Versioned for future-proofing).
- **Format**: The list is a Signed JWS. Plugins verify it using an embedded Public Key.
- **Management**: 
    - A local `registry/` folder in the private `tempo-plugin` repo tracks the revocation state.
    - CLI tools (`npm run license:revoke`) handle the signing and deployment of the updated JWS to the production host.
- **Security**: The **Private Key** for signing is stored as a GH Secret and never committed. The **Public Key** is baked into the obfuscated plugin source.
- **Fail-Safe**: If the endpoint is unreachable, plugins "Fail Open" and rely on the internal JWT expiry to ensure no service disruption for legitimate users.

## Implementation Roadmap

### Phase 1: Support Infrastructure
- [ ] Add `license` to `Internal.State` and `BaseOptions` in Tempo Core.
- [ ] Implement the Discovery Cascade and Shared Revocation Service.
- [ ] Ensure `Logify` and internal state dumps redact the `state.license` branch.

### Phase 2: Reference Plugin (Astro)
- [ ] Create the `@magmacomputing/plugin-astro` workspace.
- [ ] Implement JWS signature verification and JWT decoding.
- [ ] Set up the obfuscated build pipeline for public npmjs distribution.

### Phase 3: Commercial Plugins
- [ ] Roll out `term`, `ticker`, and other premium extensions using the proven Astro model.
