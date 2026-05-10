# Tempo Licensing Architecture (v2.9.4 Proposal)

## Objective
Enable a robust, secure, and flexible licensing mechanism for premium Tempo plugins without bloating the core engine or compromising user security.

## Architectural Decisions

### 1. Separation of Concerns
- **Core Tempo**: Acts only as a "Parking Spot" for the license string. It does NOT contain logic for decoding JWTs or verifying signatures.
- **Plugins**: House all enforcement logic. The plugin's `install()` method is responsible for fetching the license from the state and validating it.

### 2. Internal State Branching
To prevent sensitive license keys from appearing in diagnostic logs:
- **Location**: The license will reside in a separate branch of the internal state (e.g., `state.auth` or directly on `state.license`).
- **Isolation**: It must NOT be part of the `config` or `parse` objects, which are frequently passed to `Logify` for debugging.

### 3. Cascade of License Discovery
The engine will look for a license key in the following order:
1. **Explicit**: `Tempo.init({ license: '...' })`
2. **Discovery**: `globalThis[TEMPO_DISCOVERY].license`
3. **Environment**: `process.env.TEMPO_LICENSE` (Server-side)
4. **Storage**: `localStorage.getItem('tempo_license')` (Client-side)

## Security & Risks
- **XSS**: Keys in `localStorage` are vulnerable; documentation must warn users to prefer secure server-side injection where possible.
- **Leakage**: Even with separate branching, we must ensure internal state dumps (for support) redact this branch by default.

## Remote Invalidation & Revocation

Since Tempo is designed for offline-first stability, we avoid a "mandatory phone-home" on every instance. Instead, we propose the following strategies for invalidating compromised licenses:

### 1. Short-lived JWTs (Rotation)
- Issue licenses with 30- or 90-day expiry.
- Use a lightweight refresh mechanism to update the license during application build or bootstrap.
- **Benefit**: Naturally limits the window of exposure for any single leaked key.

### 2. Revocation Lists (Blacklisting)
- Plugins can periodically fetch a `revoked.json` list of blacklisted JWT IDs (`jti`).
- If a breach is detected, the `jti` is added to the list, and the plugin disables itself upon the next update/fetch.

### 3. Graceful Fallback
- If a license is invalid or expired, the plugin should not crash the application.
- **Behavior**: Downgrade to "Limited" mode, log a warning, but ensure the core Tempo engine continues to function.

## Next Steps (v2.9.4)
- Add `license` to `Internal.State` and `BaseOptions`.
- Update `support.init.ts` to implement the Discovery Cascade.
- Provide a reference implementation in the `tempo-plugin` mono-repo showing how to decode a JWT using Tempo's native date utilities.
