# 🔑 License Keys

To support the ongoing development of the open-source core, Magma Computing provides specialized, proprietary plugins known as **Premium Extensions**.

Unlike typical commercial software that requires complex authentication with private registries, we publish all our packages (including Premium Extensions) directly to the standard public NPM registry (`npmjs.com`). However, access to the advanced capabilities within these premium packages is protected by a cryptographically secure **License Key**.

## 🌟 Free Showcase: Astronomical Seasons Plugin

To demonstrate the power of the Terms engine and the seamless License Key integration, we offer our **Astronomical Seasons** premium plugin completely free of charge.

This extension calculates the exact astronomical season (Equinoxes and Solstices) for any date using the **Jean Meeus polynomial algorithm**. Because it is a true astronomical calculation rather than a fixed calendar date, it precisely determines the exact minute the sun crosses the celestial equator. It is also **hemisphere-aware**: by configuring your Tempo instance with a `sphere` (e.g., `sphere: 'south'`), the plugin accurately flips the Vernal Equinox from Spring to Autumn.

::: info Meteorological vs Astronomical
Unlike Tempo's built-in **Meteorological** `season` Term — which rigidly snaps to the 1st day of calendar months — this **Astronomical** plugin calculates the dynamic, true solar boundaries that shift slightly year-over-year.
:::

It introduces the `astro` Term, giving you access to both a short identifier (`t.term.astro`) and a rich metadata object (`t.term.astronomy`):

::: tip Prerequisites
The following preview assumes that `Tempo` has been initialized with a valid license and the Astro plugin has been successfully registered. See **Applying Your License Key** below for full setup instructions.
:::

```typescript
const t = new Tempo('2026-04-10', { sphere: 'north' });
console.log(t.term.astronomy);
```

```json
{
  "key": "Vernal",
  "group": "astronomy",
  "year": 2026,
  "month": 3,
  "day": 20,
  "hour": 14,
  "minute": 45,
  "second": 0
  // ... including sub-second precision fields
}
```

**How to get it:**
1. Run `npm install @magmacomputing/tempo-plugin-astro` in your project.
2. Visit [magmacomputing.com.au/tempo/license.html](https://magmacomputing.com.au/tempo/license.html) to request your **one-year expiry key**, which will be instantly issued to your inbox.

## ⚙️ Applying Your License Key

Once you receive your License Key, you must provide it to your Tempo-enabled codebase so the engine can verify and unlock the premium features.

There are three supported ways to provide your key:

### 1. Environment Variable (Recommended for Node/SSR)
The easiest method for backend or server-side rendered environments is to expose the key via an environment variable. Tempo will automatically detect it during initialization.

```bash
# Set this in your deployment environment or .env file
export TEMPO_LICENSE_KEY="ey..."
```

Then in your application, simply import Tempo and the plugin via side-effect. Because the license key is automatically discovered from the environment variable, no manual initialization is required:

```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import '@magmacomputing/tempo-plugin-astro'; // Automatically registers AstroTerm

const t = new Tempo('21-Mar-2026');
console.log(t.term.astro);
// → 'Vernal'
```

### 2. Programmatic Initialization (Recommended for Browsers)
If you are running Tempo in a client-side browser environment or prefer explicit configuration, you can pass the license key and any premium plugins directly into the `Tempo.init()` method.

```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { AstroTerm } from '@magmacomputing/tempo-plugin-astro';

// Initialize the core engine and register the plugin in one step
Tempo.init({
  license: 'ey...',
  plugins: [AstroTerm]
});

// The premium Term is unlocked and ready to use!
const t = new Tempo('21-Mar-2026');

console.log(t.term.astro);
// → 'Vernal'

console.log(t.term.astronomy);
// → { key: 'Vernal', season: 'Spring', year: 2026, month: 3, day: 20, hour: 14, minute: 45, ... }
```

::: tip ESM Hoisting & Registration Order
In standard JavaScript (ESM) environments, `import` statements are hoisted and executed before any regular code.

Because of this, any automatic self-registration from a plugin runs *before* your synchronous `Tempo.init()` call. Since `Tempo.init()` resets the active registry, the self-registration will be wiped out.

Passing plugins directly into the `plugins` configuration array in `Tempo.init()` (as shown above) is the cleanest way to guarantee proper registration order. Alternatively, you can call `Tempo.extend(AstroTerm)` explicitly after calling `Tempo.init()`.
:::

### 3. Global Context (Fallback for specific browser environments)

This is a browser-native variation of Method 1. While Method 1 targets the process-level environment (`process.env`) available in Node/SSR, this method sets the key on the JavaScript `globalThis` object (which maps to `window` in browsers), enabling the same auto-discovery behaviour without any build-time configuration.

**Use this method in the following scenarios:**

#### Direct `<script>` Tag Loading (No Bundler)
Set the key in an inline script *before* loading the Tempo bundle from a CDN or local file:

```html
<script>
  window.TEMPO_LICENSE_KEY = "ey...";
</script>
<script type="module" src="/js/tempo.bundle.js"></script>
<script type="module" src="/js/tempo-plugin-astro.js"></script>
```

#### Frontend Bundlers without `process.env` Polyfills
Modern browser bundlers (e.g., Vite) do not inject Node's `process` object by default. Assign the key to `globalThis` in your entry file *before* importing Tempo:

```typescript
// entry.ts — must run before any Tempo import
globalThis.TEMPO_LICENSE_KEY = import.meta.env.VITE_TEMPO_LICENSE_KEY;

// Now safe to import — license auto-discovered
import { Tempo } from '@magmacomputing/tempo/core';
import '@magmacomputing/tempo-plugin-astro';
```

#### Micro-frontends / Shared Global Space
In architectures where multiple independently-bundled applications share a single browser tab, set the key once in the host container. All dynamically-loaded sub-applications will auto-discover it without needing individual configuration:

```typescript
// host-container.ts
globalThis.TEMPO_LICENSE_KEY = 'ey...';

// Sub-apps loaded later will automatically run in licensed mode
```

## 📡 Network Requests & Offline Behavior

To verify license validity and prevent abuse, Tempo's licensing engine performs background synchronization with our revocation registry:

* **Outbound Request:** When a license key is active, Tempo asynchronously fetches a cryptographically signed revocation list (JWS).
* **Endpoint:** `https://api.magmacomputing.com.au/tempo/v1/revoked.jws` (useful for configuring Content Security Policies (CSP) or egress firewall rules).
* **Frequency:** The revocation check occurs once every **7 days**. The last-checked state is cached to avoid redundant network traffic on subsequent startups.
* **Offline Resilience (Fail-Open):** If your application is offline, behind a strict firewall, or the registry server is temporarily unreachable, the validation **fails open**. Tempo logs a warning in the console but continues to grant access to premium features (relying on the local cryptographic expiration of the JWT).

## 🤝 Commercialize Your Own Plugin

Are you a developer who has built an incredibly useful, domain-specific Tempo plugin (e.g., medical billing cycles, legal discovery windows, complex religious calendars)? 

If you would like to monetize your logic without having to build your own licensing infrastructure, **we want to partner with you**. 

Get in touch with us with your proposed code and use-case. If it meets our quality and performance standards, we can publish it as an official Premium Extension secured behind the Tempo License Key system, under a mutually beneficial commercial revenue-sharing arrangement.
