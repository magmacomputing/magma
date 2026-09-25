# Cultural Locale Synchronization

This guide explores the cultural synchronization engine in `@magmacomputing/tempo-plugin-geo`, linking physical geography with localized language, date formatting, and regional calendar conventions.

---

## 1. The Challenge of Geographic Formatting

When a user travels or logs in from another country (e.g. from London to Tokyo or Cairo), updating their `timeZone` alone is often insufficient:
- Updating timezone shifts the clock time, but date formatting and day names might still remain in the home language (`en-US`).
- Setting a cultural locale (`ar-EG`, `ja-JP`, `de-DE`, `fr-FR`) ensures month names, day names, relative periods ("yesterday", "tomorrow"), and calendar numbering conventions match the observer's physical territory.

---

## 2. Automatic Cultural Sync (`t.geoLocate({ setLocale: true })`)

When calling `t.geoLocate()`, passing `{ setLocale: true }` automatically infers the primary BCP 47 language/locale tag for the resolved geographic coordinates and updates the instance's locale configuration.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

const t = new Tempo('2026-06-21T12:00:00Z', {
  geo: { lat: 30.0444, lng: 31.2357 } // Cairo, Egypt
});

// Locate with cultural locale synchronization enabled
const localized = await t.geoLocate({ setLocale: true });

console.log(localized.tz);     // 'Africa/Cairo'
console.log(localized.locale); // 'ar-EG'
console.log(localized.format('full')); // Arabic calendar date string
```

### Call-Site Preference Priority

Explicit caller preferences always win:
```typescript
// If caller explicitly provides a custom locale, it overrides automatic inference:
const custom = await t.geoLocate({ setLocale: 'fr-EG' });
console.log(custom.locale); // 'fr-EG'
```

---

## 3. Pure Cultural Locale Inference (`resolveCulturalLocale`)

`resolveCulturalLocale` maps geographic coordinates, ISO country codes, or bounding territories to a standard BCP 47 locale tag:

```typescript
import { resolveCulturalLocale } from '@magmacomputing/tempo-plugin-geo';

// From geographic coordinate objects
console.log(resolveCulturalLocale({ lat: 35.6762, lng: 139.6503 })); // 'ja-JP' (Tokyo)
console.log(resolveCulturalLocale({ lat: 52.5200, lng: 13.4050 }));  // 'de-DE' (Berlin)
console.log(resolveCulturalLocale({ lat: 48.8566, lng: 2.3522 }));   // 'fr-FR' (Paris)
console.log(resolveCulturalLocale({ lat: -33.8688, lng: 151.2093 })); // 'en-AU' (Sydney)

// From country code directly
console.log(resolveCulturalLocale({ countryCode: 'BR' })); // 'pt-BR'
console.log(resolveCulturalLocale({ countryCode: 'IT' })); // 'it-IT'
```

---

## 4. Internationalization Synergy with `@magmacomputing/library`

`resolveCulturalLocale` leverages `getLC()` from `#library/international.library.js`. It validates and memoizes `Intl.Locale` instances, applying defensive normalization to avoid runtime locale tag errors across different JavaScript runtimes.
