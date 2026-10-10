![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-celestial

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-celestial"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-celestial?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-celestial/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-celestial"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-celestial?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/celestial.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

Tempo plugin for location-aware solar twilight events (`sun`/`solar`), lunar phase tracking (`moon`/`lunar`), and astronomical tidal mechanics (`tide`/`tides`).

## Installation

```bash
npm install @magmacomputing/tempo-plugin-celestial
```

## Features

- **Astronomical Seasons & Solar Events**: Calculates precise astronomical equinoxes (Vernal, Autumnal) and solstices (Summer, Winter) with sub-minute precision, hemisphere awareness (`sphere: 'north' | 'south'`), and standard Tempo terms (`t.term.astro`, `t.term.equinox`, `t.term.solstice`, `t.term.astronomy`).
- **Solar Day Cycles**: Calculates `daylight`, `night`, `civil-twilight`, `nautical-twilight`, and `astronomical-twilight`.
- **Ephemeris Data**: Returns `sunrise`, `sunset`, `noon`, `solarTime` (Local Apparent Solar Time), total `daylightDurationMs`, and explicit `latitude`/`longitude` for given coordinates.
- **Lunar Phase & Ephemeris**: Calculates 8 discrete lunar phase states (`new-moon`, `waxing-crescent`, etc.), illumination 0.0–1.0 fraction, age in days, hemisphere-aware emoji indicators, and location-aware `moonrise` and `moonset` events.
- **Astronomical Tidal Mechanics**: Provides pure astronomical solar/lunar alignment calculations (`t.term.tide`, `t.term.tides`) for `spring`, `neap`, and `normal` tides, alongside `isKingTide` perigee indicators.

> [!NOTE]
> **Pure Astronomical Calculations**:
> Tidal state resolution relies exclusively on deterministic celestial mechanics (solar-lunar ecliptic longitude alignment (Δλ) and anomalistic lunar perigee proximity) for reproducible, offset-independent math across all time zones and locations.

## Geographic Coordinates & Null Contract

> [!IMPORTANT]
> **Location-Dependent Null Contract**:
> - **Global Astronomical Properties** (`t.term.moon`, `t.term.lunar.phase`, `t.term.tides.isSpringTide`, `t.term.tides.alignmentDeg`) resolve location-independently and are always computed.
> - **Geo-Dependent Properties** (`t.term.sun`, `solar.sunrise`, `solar.sunset`, `solar.noon`, `solar.solarTime`, `lunar.moonrise`, `lunar.moonset`, `tides.lunarTideMinute`) evaluate to `null` when geographic coordinates (`geo: { lat, lng }`) are omitted.
> - **Distinction**: Property access on `t.term` evaluates to `undefined` if `CelestialPlugin` is not loaded, and to `null` if the plugin is active but location coordinates were not supplied. When `debug >= 1` is enabled in `Tempo` configuration, a developer warning is logged when evaluating geo-dependent keys without coordinates.

### Obtaining Coordinates

Use `geoLookup()` from `@magmacomputing/tempo-plugin-geo` to automatically resolve location coordinates across both browser and server environments:

```bash
npm install @magmacomputing/tempo-plugin-geo
```

> [!WARNING]
> **Geolocation Behavior**:
> - **Browser**: On first invocation, `geoLookup()` will prompt the user for permission to access hardware location services.
> - **Server**: In Node.js or server environments without GPS hardware, coordinates are resolved via IP geolocation representing the physical server/datacenter network location.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin } from '@magmacomputing/tempo-plugin-celestial';
import { geoLookup } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(CelestialPlugin);

// Automatically resolves location coordinates via browser hardware or server IP
const geo = await geoLookup();
const t = new Tempo({ geo });

console.log(t.term.sun);                 // 'daylight' or 'night'
console.log(t.term.lunar.moonrise);      // Tempo instance for local moonrise
console.log(t.term.tide);                // 'spring', 'neap', or 'normal'
```

### Auto-Installation (Side-Effect Import)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { geoLookup } from '@magmacomputing/tempo-plugin-geo';
import '@magmacomputing/tempo-plugin-celestial/install';

const geo = await geoLookup();
const t = new Tempo({ geo });
console.log(t.term.sun);
```

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin } from '@magmacomputing/tempo-plugin-celestial';

Tempo.use(CelestialPlugin);

const t = new Tempo('2026-06-21T12:00:00Z', { geo: { lat: 40.7128, lng: -74.006 } });

// --- Astronomical Seasons & Solar Events ---
console.log(t.term.astro);               // 'Summer' (or 'Winter' if sphere: 'south')
console.log(t.term.astronomy.season);    // 'Summer'
console.log(t.term.astronomy.event);     // 'Solstice'
console.log(t.term.solstice);            // 'Summer'

// --- Solar Day State & Phase Querying ---
console.log(t.term.sun);                 // 'daylight'
console.log(t.term.solar.key);           // 'daylight'
console.log(t.term.solar.phase);         // 'Daylight'
console.log(t.term.solar.phases);        // ['night', 'astronomical-twilight', 'nautical-twilight', 'civil-twilight', 'daylight']
console.log(t.term.solar.sunrise);       // Tempo instance for local sunrise
console.log(t.term.solar.noon);          // Tempo instance for local solar noon (upper culmination)
console.log(t.term.solar.nadir);         // Tempo instance for local solar midnight (lower culmination)
console.log(t.term.solar.zenith);        // Zenith angle in degrees (90° - altitude)
console.log(t.term.solar.solarTime);     // Tempo instance for local apparent solar time
console.log(t.term.solar.geo);           // { latitude: 40.7128, longitude: -74.006 }

// --- Lunar Phase & Ephemeris ---
console.log(t.term.moon);                // 'waxing-crescent'
console.log(t.term.lunar.phase);         // 'Waxing Crescent'
console.log(t.term.lunar.phases);        // ['new-moon', 'waxing-crescent', 'first-quarter', 'waxing-gibbous', 'full-moon', 'waning-gibbous', 'third-quarter', 'waning-crescent']
console.log(t.term.lunar.illumination);  // 0.45
console.log(t.term.lunar.moonrise);      // Tempo instance for local moonrise (or null)
console.log(t.term.lunar.transit);       // Tempo instance for upper meridian culmination (or null)
console.log(t.term.lunar.nadir);         // Tempo instance for lower culmination / anti-transit (or null)
console.log(t.term.lunar.zenith);        // Lunar zenith distance angle in degrees (90° - altitude)

// --- Astronomical Tidal Mechanics ---
console.log(t.term.tide);                // 'spring', 'neap', or 'normal'
console.log(t.term.tides.alignmentDeg);  // Solar-lunar alignment angle (0..360°)
console.log(t.term.tides.isSpringTide);  // true during Syzygy (New or Full Moon)
console.log(t.term.tides.isNeapTide);    // true during Quadrature (1st or 3rd Quarter)
console.log(t.term.tides.isKingTide);    // true when Spring Tide aligns with Lunar Perigee

// --- Programmatic Navigation ---
// Use .phases to dynamically navigate to the next lunar phase
const nextPhaseKey = t.term.lunar.phases[t.term.lunar.index % 8];
const nextMoonTempo = t.set(`#lunar.${nextPhaseKey}`);
```

> ⚡ **[Try this live in the interactive Tempo Sandbox ↗](https://magmacomputing.github.io/magma/repl/index.html?plugin=celestial)**

## Term Lifecycle Hooks (Showcase)

`CelestialPlugin` showcases Tempo's core `TermHook` lifecycle system across all four terms:

### 1. Stepping, Difference & Boundary Snapping (`[TermHook.step]`, `[TermHook.diff]`, `[TermHook.bound]`)
```typescript
// Lunar phase navigation & synodic lunation stepping (~29.53 days)
t.set('#moon.start');            // Snap to start of active lunar phase
t.set('#moon.end');              // Snap to end of active lunar phase
t.add({ '#moon': 1 });           // Advance by 1 full synodic lunation
t1.until(t2, '#moon');           // Count elapsed synodic lunations (or t2.since(t1, '#moon'))

// Solar cycle snapping
t.set('#solar.start');           // Snap to local sunrise
t.set('#solar.mid');             // Snap to local solar noon
t.set('#solar.end');             // Snap to local sunset

// Astronomical season snapping
t.set('#astro.start');           // Start of current astronomical season
t.set('#astro.mid');             // Midpoint of current astronomical season
t.set('#astro.end');             // End of current astronomical season

// Semidiurnal tidal cycle stepping (745 min) & high/low tide snapping
t.add({ '#tide': 1 });           // Step by 1 tidal cycle (12h 25m)
t.set('#tide.start');            // Snap to next high tide
t.set('#tide.end');              // Snap to next low tide
t1.until(t2, '#tide');           // Count elapsed tidal cycles
```

### 2. Semantic Parsing & Natural Language Ordinals (`[TermHook.parse]`, `[TermHook.ordinal]`)
```typescript
// Direct solar & astronomical parse targets
Tempo.from('#solar.sunrise', { anchor });   // Next sunrise from anchor
Tempo.from('#solar.sunset', { anchor });    // Next sunset from anchor
Tempo.from('#solar.noon', { anchor });      // Next solar noon from anchor
Tempo.from('#equinox.vernal', { anchor });  // Vernal equinox for anchor year
Tempo.from('#solstice.summer', { anchor }); // Summer solstice for anchor year

// Natural language astronomical ordinals
Tempo.from('1st equinox of 2026');
Tempo.from('2nd solstice of #year');
Tempo.from('last equinox');
```

### 3. Dynamic Format Token Interpolation (`[TermHook.format]`)
```typescript
// Format templates resolve contextual celestial tokens
t.format('Current Moon: {#moon.emoji} {#moon.phase} ({#moon.illumination})');
// => "Current Moon: 🌔 Waxing Gibbous (78%)"

t.format('Sun: {#solar.phase} | Elev: {#solar.elevation}° | Azimuth: {#solar.azimuth}°');
// => "Sun: Daylight | Elev: 42.5° | Azimuth: 180.2°"

t.format('Tide: {#tide.state} | Season: {#astro.season}');
// => "Tide: Spring | Season: Summer"
```

## Phase & State Discovery Metadata

`LunarTerm`, `SolarTerm`, and `TidalTerm` expose immutable, frozen array references (`Object.freeze`) containing all valid identifiers for terms resolution:

- **Static Term References**: `LunarTerm.phases`, `SolarTerm.phases`, and `TidalTerm.phases` are available on the plugin definitions without instantiating a `Tempo` object.
- **Instance Scope References**: `t.term.lunar.phases`, `t.term.solar.phases`, and `t.term.tides.states` share the exact same frozen array references (`t.term.lunar.phases === LunarTerm.phases`), adding zero memory or GC overhead.

> [!TIP]
> **Indexing Tip**: Following ISO calendar standards that drive Temporal and Tempo, `.index` is 1-based (`1..8`), while `.phases` is a standard 0-indexed JavaScript array (`0..7`).
> - **Current Phase**: Use `lunar.key` or `lunar.phases[lunar.index - 1]`.
> - **Next Phase**: Use `lunar.phases[lunar.index % 8]` (1-based index modulo 8 seamlessly targets the next phase index with automatic wrap-around).

## Documentation

For full documentation and live examples, visit the [Celestial Plugin Documentation](https://magmacomputing.github.io/magma/doc/9-plugins/celestial.index.html).

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.

## License

MIT
