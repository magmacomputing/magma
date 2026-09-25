# Cultural Locale Synchronization

This guide explores the cultural synchronization engine in `@magmacomputing/tempo-plugin-geo`, linking physical geography with localized language, date formatting, and regional calendar conventions.

---

## 1. The Challenge of Geographic Formatting

When a user travels or logs in from another country (e.g. from London to Tokyo or Cairo), updating their `timeZone` alone is often insufficient:
- Updating timezone shifts the clock time, but date formatting and day names might still remain in the home language (`en-US`).
- Setting a cultural locale (`ar-EG`, `ja-JP`, `de-DE`, `fr-FR`) ensures month names, day names, relative periods ("yesterday", "tomorrow"), and calendar numbering conventions match the observer's physical territory.

---

## 2. Automatic Cultural Sync (`t.geoLocate({ setLocale })`)

When calling `t.geoLocate()`, the `setLocale` option controls how the BCP 47 locale is synchronized with physical geography:

- **`'native'`**: Converts to the primary native language and culture of the territory (e.g. `ar-EG` in Egypt, `ja-JP` in Japan).
- **`true` / `'regional'`** *(default)*: Preserves the caller's source language while adapting regional calendar rules (e.g. `en-US` + `EG` → `en-EG`).
- **Custom BCP 47 string**: Explicit override (e.g. `'fr-EG'`).
- **`false` / `'none'`**: Opts out of locale synchronization.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

const t = new Tempo('2026-06-21T12:00:00Z', {
  geo: { lat: 30.0444, lng: 31.2357, country: 'EG' } // Cairo, Egypt
});

// 1. Native Cultural Sync: adopts Egypt's primary native language (Arabic)
const localizedNative = await t.geoLocate({ setLocale: 'native' });

console.log(localizedNative.tz);                            // 'Africa/Cairo'
console.log(localizedNative.locale);                        // 'ar-EG'
console.log(localizedNative.format({ dateStyle: 'full' })); // 'الأحد، ٢١ يونيو ٢٠٢٦'

// 2. Regional Adaptation (default): keeps English language, adapts Egyptian calendar/weekend
const localizedRegional = await t.geoLocate({ setLocale: true });

console.log(localizedRegional.locale);                        // 'en-EG'
console.log(localizedRegional.format({ dateStyle: 'full' })); // 'Sunday, 21 June 2026'
```

### Call-Site Preference Priority

Explicit caller preferences always take absolute precedence:
```typescript
// Explicit custom BCP 47 tag
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
