# Regional Calendars & Dynamic Preloading

The **Regional Holidays Plugin** features high-precision offline algorithmic calendars for major world economies and dynamic asynchronous preloading for over 100+ countries.

---

## Supported Offline Built-in Calendars

The following countries are evaluated locally in memory in sub-millisecond execution time with zero network requests:

| Country | Code | Key Holidays & Statutory Rules |
| :--- | :--- | :--- |
| **United States** | `US` | New Year's Day, MLK Day (3rd Mon Jan), Washington's Birthday (3rd Mon Feb), Memorial Day (Last Mon May), Juneteenth, Independence Day, Labor Day (1st Mon Sep), Columbus Day (2nd Mon Oct), Veterans Day, Thanksgiving (4th Thu Nov), Christmas Day. State overlays (e.g. Day After Thanksgiving in `CA`). |
| **Australia** | `AU` | New Year's Day, Australia Day, Good Friday, Easter Monday, ANZAC Day, King's Birthday, Christmas Day, Boxing Day. State overlays for `NSW`, `VIC`, `QLD`, `WA`, `SA`, `TAS`, `ACT`, and `NT`. Melbourne Cup (`VIC`), King's Birthday October rule (`QLD`), dual Christmas/Boxing Day weekend shift rules. |
| **United Kingdom** | `GB` | New Year's Day, Good Friday, Easter Monday, Early May Bank Holiday, Spring Bank Holiday, Summer Bank Holiday, Christmas Day, Boxing Day. Regional overlays for Scotland (`SCT` - 2nd Jan, August Summer Bank, St Andrew's) and Northern Ireland (`NIR` - St Patrick's Day, Battle of the Boyne). |
| **Canada** | `CA` | New Year's Day, Good Friday, Victoria Day, Canada Day, Civic Holiday, Labour Day, National Day for Truth and Reconciliation, Thanksgiving, Remembrance Day, Christmas Day, Boxing Day. Provincial Family Day overlays. |
| **Germany** | `DE` | Neujahr, Karfreitag, Ostermontag, Tag der Arbeit, Christi Himmelfahrt, Pfingstmontag, Fronleichnam, Tag der Deutschen Einheit, Reformationstag, Allerheiligen, Weihnachtstag, Zweiter Weihnachtstag. State holiday overlays across all 16 Bundesländer. |
| **France** | `FR` | Jour de l'An, Lundi de Pâques, Fête du Travail, Victoire 1945, Ascension, Lundi de Pentecôte, Fête Nationale (Bastille Day), Assomption, Toussaint, Armistice 1918, Noël. Alsace-Moselle overlays (Vendredi Saint, Saint-Étienne). |
| **Japan** | `JP` | 元日 (New Year's), 成人の日 (Coming of Age), 建国記念の日 (National Foundation), 天皇誕生日 (Emperor's Birthday), 春分の日 (Vernal Equinox), 昭和の日 (Shōwa Day), 憲法記念日 (Constitution), みどりの日 (Greenery), こどもの日 (Children's), 海の日 (Marine Day), 山の日 (Mountain Day), 敬老の日 (Respect for the Aged), 秋分の日 (Autumnal Equinox), スポーツの日 (Sports Day), 文化の日 (Culture Day), 勤労感謝の日 (Labor Thanksgiving), 振替休日 (Furikae Kyūjitsu substitute holidays). |
| **New Zealand** | `NZ` | New Year's Day, Day after New Year's Day, Waitangi Day, Good Friday, Easter Monday, ANZAC Day, King's Birthday, Matariki (statutory dates), Labour Day, Christmas Day, Boxing Day. Mondayisation shift rules. |

---

## Resolution Hierarchy & Geo Cohesion

When evaluating a holiday or business day, Tempo resolves the effective country and region using the following priority cascade:

1. **Explicit Option**: `t.holidays.isHoliday({ country: 'GB', region: 'SCT' })`
2. **Instance Geolocation**: `t.geo.country` (and `t.geo.region` / `t.geo.state`)
3. **Instance Internationalization**: `tempo.intl.region`
4. **Instance Locale**: BCP-47 tag (e.g. `en-AU` → `'AU'`, `fr-CA` → `'CA'`, `ja-JP` → `'JP'`)
5. **Default Fallback**: `'US'`

```typescript
import '@magmacomputing/tempo-plugin-holidays/install';
import { Tempo } from '@magmacomputing/tempo';

// Geo-aware instance automatically evaluates Australian national and state holidays
const melb = new Tempo('2026-11-03', {
  geo: { country: 'AU', region: 'VIC' }
});

console.log(melb.holidays.isHoliday());       // true
console.log(melb.holidays.name);              // 'Melbourne Cup Day'
console.log(melb.holidays.country);           // 'AU'
console.log(melb.holidays.region);            // 'VIC'
```

---

## Dynamic Long-Tail Preloading & Storage Caching

For global applications requiring holiday coverage beyond the 8 built-in economies, the plugin integrates with `@magmacomputing/tempo-fns` to fetch statutory public holidays for over 100+ countries.

Fetched calendars are stored in runtime storage with a **24-hour TTL** under the `_magma_holidays_` namespace and registered into the in-memory engine, allowing subsequent queries to execute synchronously with zero latency.

### Using Static / Async `Tempo.holidays.preload()`

```typescript
import '@magmacomputing/tempo-plugin-holidays/install';
import { Tempo } from '@magmacomputing/tempo';

// Preload Italy (IT) for 2026
await Tempo.holidays.preload(2026, 'IT');

// All subsequent synchronous calls now recognize Italian public holidays!
const capodanno = new Tempo('2026-01-01', { geo: { country: 'IT' } });
console.log(capodanno.holidays.isHoliday());          // true
console.log(capodanno.holidays.name);                 // 'Capodanno'
console.log(capodanno.holidays.isBusinessDay());       // false
```

### Using Instance Method `t.holidays.preload()`

```typescript
const brazil = new Tempo('2026-09-07', { geo: { country: 'BR' } });

// Preloads holidays for Brazil for the instance's year
await brazil.holidays.preload();

console.log(brazil.holidays.isHoliday()); // true (Dia da Independência)
```
