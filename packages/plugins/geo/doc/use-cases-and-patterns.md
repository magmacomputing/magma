<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-geo</a>
</div>

<br>

# Production Use Cases & Architectural Patterns

Modern cloud applications serve global users across varying jurisdictions, languages, and timezones. Handling geographic context in production requires solving three architectural challenges:
1. **Vendor Independence**: Decoupling your application code from specific proprietary geocoding APIs (Google Maps, Mapbox, OpenCage, or self-hosted Nominatim).
2. **Multi-Tenant Context Partitioning**: Caching geographic metadata without leaking coordinates across enterprise tenants or making expensive repeated HTTP lookups.
3. **Cultural Localization**: Automatically adapting dates, time formats, first day of the week, and number formats based on visitor location.

The `@magmacomputing/tempo-plugin-geo` plugin provides an extensible provider gateway, multi-tenant partitioned caching, and cultural locale synchronization.

---

## 1. Multi-Tenant SaaS Cultural Locale Synchronization

When an international customer visits an e-commerce or booking platform, their browser locale might be generic (`en-US`), but their physical IP or GPS location is Australia, Japan, or Egypt.

Using `resolveCulturalLocale`, apps dynamically align formatting conventions:
- **`'regional'` mode**: Preserves user language while adjusting regional formatting (e.g. `en-US` in `AU` $\rightarrow$ `en-AU` for `DD/MM/YYYY` dates).
- **`'native'` mode**: Fully translates to the country's primary official language (e.g. `en-US` in `JP` $\rightarrow$ `ja-JP`, or `EG` $\rightarrow$ `ar-EG`).

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { resolveCulturalLocale } from '@magmacomputing/tempo-plugin-geo';

export function formatInvoiceDateForVisitor(
  dateIso: string,
  userAcceptLanguage: string,
  visitorCountry: string
): string {
  // Synchronize locale to visitor's geographic region
  const targetLocale = resolveCulturalLocale(userAcceptLanguage, visitorCountry, 'regional') ?? userAcceptLanguage;

  const invoiceDate = new Tempo(dateIso, {
    locale: targetLocale,
    geo: { country: visitorCountry }
  });

  return invoiceDate.format('{shortDate}');
}

// Example 1: American tourist booking in Sydney, Australia
// Output switches to DD/MM/YYYY convention
const sydneyBooking = formatInvoiceDateForVisitor('2026-03-05', 'en-US', 'AU');
console.log(sydneyBooking); // '05/03/2026'

// Example 2: Native mode conversion for local language
const tokyoNative = resolveCulturalLocale('en-US', 'JP', 'native');
console.log(tokyoNative); // 'ja-JP'
```

---

## 2. Pluggable Resilient Geocoding Gateway (Custom Provider)

Hard-coding proprietary geocoding SDKs creates vendor lock-in and high recurring API bills. `Tempo.geo.setProvider` lets you plug in any custom provider (Mapbox, OpenStreetMap Nominatim, or an internal microservice) through a uniform interface:

```typescript
import '@magmacomputing/tempo-plugin-geo/install';
import { Tempo } from '@magmacomputing/tempo';
import type { GeoProvider } from '@magmacomputing/tempo-plugin-geo';

// Implement enterprise proxy with fallback
const enterpriseGeoGateway: GeoProvider = {
  name: 'enterprise-geocoder',

  async lookup(opts) {
    const res = await fetch('/api/internal/geo/lookup');
    return res.json();
  },

  async forwardGeocode(query, opts) {
    const res = await fetch(`/api/internal/geo/forward?q=${encodeURIComponent(query)}`);
    return res.json();
  },

  async reverseGeocode(coords, opts) {
    const lat = typeof coords === 'object' && 'lat' in coords ? coords.lat : coords[0];
    const lng = typeof coords === 'object' && 'lng' in coords ? coords.lng : coords[1];

    const res = await fetch(`/api/internal/geo/reverse?lat=${lat}&lng=${lng}`);
    return res.json();
  }
};

// Register gateway globally
Tempo.geo.setProvider(enterpriseGeoGateway);

// All Tempo.geo calls now route through the enterprise gateway
const location = await Tempo.geo.forward('100 Queen St, Melbourne');
console.log(location.country, location.lat, location.lng);
```

---

## 3. Multi-Tenant Partitioned Geo Storage & 24h Caching

Calling external geocoding APIs on every incoming HTTP request degrades latency and exhausts rate limits. `Tempo.geo.stash` and `Tempo.geo.get` provide built-in partitioned storage with TTL support:

```typescript
import '@magmacomputing/tempo-plugin-geo/install';
import { Tempo } from '@magmacomputing/tempo';

export async function resolveTenantLocation(
  tenantId: string,
  rawAddress: string
) {
  const partitionKey = `tenant_${tenantId}`;

  // 1. Check partitioned cache first
  const cached = Tempo.geo.get({ partition: partitionKey });
  if (cached) {
    return cached;
  }

  // 2. Perform external geocoding lookup
  const resolved = await Tempo.geo.forward(rawAddress);

  // 3. Stash coordinates in tenant's isolated partition for 24 hours
  Tempo.geo.stash(resolved, {
    partition: partitionKey,
    ttl: 86_400_000 // 24 hours in ms
  });

  return resolved;
}
```

---

## 4. Server-Side Edge Middleware Request Localization

In Next.js, Remix, Fastify, or Cloudflare Workers, incoming requests include CDN geographic headers (e.g. `cf-ipcountry` or `x-vercel-ip-country`). Edge middleware can extract these headers, hydrate a `Tempo` instance, and pass it downstream via request context:

```typescript
import '@magmacomputing/tempo-plugin-geo/install';
import { Tempo } from '@magmacomputing/tempo';

export function createRequestContext(req: Request) {
  // Extract edge CDN geolocation headers
  const country = req.headers.get('cf-ipcountry') ?? 'US';
  const timeZone = req.headers.get('cf-timezone') ?? 'UTC';

  // Instantiate request-scoped Tempo context
  const requestTime = new Tempo('now', {
    geo: { country },
    timeZone
  });

  return {
    requestTime,
    visitorCountry: country,
    visitorTimeZone: timeZone
  };
}
```
