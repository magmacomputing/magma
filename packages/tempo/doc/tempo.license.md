# 🔑 License Keys

To support the ongoing development of the open-source core, Magma Computing provides specialized, proprietary plugins known as **Premium Extensions**.

Unlike typical commercial software that requires complex authentication with private registries, we publish all our packages (including Premium Extensions) directly to the standard public NPM registry (`npmjs.com`). However, access to the advanced capabilities within these premium packages is protected by a cryptographically secure **License Key**.

## 🌟 Free Showcase: Astronomical Seasons Plugin

To demonstrate the power of the Terms engine and the seamless License Key integration, we offer our **Astronomical Seasons** premium plugin completely free of charge.

This extension calculates the exact astronomical season (Equinoxes and Solstices) for any date using the **Jean Meeus polynomial algorithm**. Because it is a true astronomical calculation rather than a fixed calendar date, it precisely determines the exact minute the sun crosses the celestial equator. It is also **hemisphere-aware**: by configuring your Tempo instance with a `sphere` (e.g., `sphere: 'south'`), the plugin accurately flips the Vernal Equinox from Spring to Autumn.

::: info Meteorological vs Astronomical
Unlike Tempo's built-in **Meteorological** `season` Term—which rigidly snaps to the 1st day of calendar months—this **Astronomical** plugin calculates the dynamic, true solar boundaries that shift slightly year-over-year.
:::

It introduces the `astro` Term, giving you access to both a short identifier (`t.term.astro`) and a rich metadata object (`t.term.astronomy`):

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
1. Run `npm install @magmacomputing/term-plugin-astro` in your project.
2. Send us an email at [contact@magmacomputing.com.au](mailto:contact@magmacomputing.com.au) with your preferred email address, and we will issue a **one-year expiry key** straight to your inbox.

## ⚙️ Applying Your License Key

Once you receive your License Key, you must provide it to your Tempo-enabled codebase so the engine can verify and unlock the premium features. 

There are two supported ways to provide your key:

### 1. Environment Variable (Recommended for Node/SSR)
The easiest method for backend or server-side rendered environments is to expose the key via an environment variable. Tempo will automatically detect it during initialization.

```bash
# Set this in your deployment environment or .env file
export TEMPO_LICENSE_KEY="key..."
```

### 2. Programmatic Initialization (Recommended for Browsers)
If you are running Tempo in a client-side browser environment or prefer explicit configuration, you can pass the key directly into the `Tempo.init()` method before instantiating any dates or registering the premium plugins.

```typescript
import { Tempo } from '@magmacomputing/tempo/core';

// 1. Initialize the core engine with your license key
Tempo.init({
  licenseKey: 'key...'
});

// 2. Extend Tempo with the premium plugin
import { AstroSeasonTerm } from '@magmacomputing/term-plugin-astro'; 
Tempo.extend(AstroSeasonTerm);

// 3. The premium Term is unlocked and ready to use!
const t = new Tempo('21-Mar-2026');

console.log(t.term.astro);        
// → 'Spring'

console.log(t.term.astronomy); 
// → { key: 'Spring', year: 2026, month: 3, day: 20, hour: 14, minute: 45, ... }
```

## 🤝 Commercialize Your Own Plugin

Are you a developer who has built an incredibly useful, domain-specific Tempo plugin (e.g., medical billing cycles, legal discovery windows, complex religious calendars)? 

If you would like to monetize your logic without having to build your own licensing infrastructure, **we want to partner with you**. 

Get in touch with us with your proposed code and use-case. If it meets our quality and performance standards, we can publish it as an official Premium Extension secured behind the Tempo License Key system, under a mutually beneficial commercial revenue-sharing arrangement.
