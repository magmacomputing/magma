<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-roman</a>
</div>

<br>

# Use Cases & Production Patterns

`@magmacomputing/tempo-plugin-roman` provides deterministic, high-performance classical calendar calculations for applications in classical archaeology, numismatics, epigraphy, academic digital humanities, and legal manuscript processing.

---

## 1. Digital Epigraphy & Classical Inscription Parsing

### The Challenge
Museum catalogs, archaeological excavation databases, and epigraphic registries (such as the *Corpus Inscriptionum Latinarum*) frequently record dates in Latin abbreviations (e.g. `a.d. IV Id. Mart.` or `a.d. XVII Kal. Nov.`). Systems need to compute the exact modern Gregorian/Julian calendar coordinate for temporal indexing and GIS timelines.

### Implementation Pattern

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { RomanPlugin } from '@magmacomputing/tempo-plugin-roman';

Tempo.use(RomanPlugin);

interface InscriptionRecord {
  id: string;
  catalogNumber: string;
  latinDate: string;
  anchor: 'Kalends' | 'Nones' | 'Ides';
  anchorMonth: number;
  relation: 'on' | 'pridie' | 'ante_diem';
  count: number;
  yearAuc: number;
}

function resolveInscriptionDate(record: InscriptionRecord): Tempo {
  // 1. Convert AUC year to astronomical calendar year
  const astronomicalYear = Tempo.roman.aucToYear(record.yearAuc);

  // 2. Resolve classical Roman anchor to calendar date
  const resolved = Tempo.roman.fromClassical(
    record.anchor,
    record.anchorMonth,
    astronomicalYear,
    record.relation,
    record.count,
    false, // isBissextile
    true   // isJulian
  );

  return new Tempo({
    year: resolved.year,
    month: resolved.month,
    day: resolved.day
  });
}

// Example: "a.d. XVII Kal. Nov. 2779 AUC"
const tempoDate = resolveInscriptionDate({
  id: 'c-104',
  catalogNumber: 'CIL VI 2065',
  latinDate: 'a.d. XVII Kal. Nov.',
  anchor: 'Kalends',
  anchorMonth: 11,
  relation: 'ante_diem',
  count: 17,
  yearAuc: 2779
});

console.log(tempoDate.format('{yyyy}-{mm}-{dd}')); // "2026-10-16"
```

---

## 2. Numismatics & Ancient Coin Provenance

### The Challenge
Numismatic databases record Roman imperial coinage dated by AUC foundation years or major commemorative Roman dates. Coin metadata must be indexed synchronously alongside both modern CE/BCE dates and historical AUC timestamps.

### Implementation Pattern

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-roman/install';

interface RomanCoin {
  mintId: string;
  emperor: string;
  issueDate: Tempo;
}

const coinCollection: RomanCoin[] = [
  {
    mintId: 'RIC-I-42',
    emperor: 'Augustus',
    issueDate: new Tempo('-000026-01-16') // January 16, 27 BCE (Title of Augustus conferred)
  },
  {
    mintId: 'RRC-415-1',
    emperor: 'Julius Caesar',
    issueDate: new Tempo('-000043-03-15') // March 15, 44 BCE (Ides of March)
  }
];

// Enrich numismatic metadata with classical Roman and AUC representations
const enrichedCatalog = coinCollection.map(coin => {
  const roman = coin.issueDate.toRomanClassical();
  return {
    mintId: coin.mintId,
    emperor: coin.emperor,
    gregorian: coin.issueDate.format('{yyyy}-{mm}-{dd}'),
    latinDate: roman.latin,
    shortDate: roman.shortLatin,
    yearAuc: `${coin.issueDate.toAUC()} AUC`
  };
});

console.table(enrichedCatalog);
```

---

## 3. Academic Manuscript Dating & Legal Charters

### The Challenge
Medieval papal bulls, monastic annals, and European royal charters frequently dated official decrees using the Roman ecclesiastical calendar. Archival tools need to verify whether transcribed dates match internal document text and compute verified civil calendar dates.

### Implementation Pattern

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-roman/install';

function verifyCharterDating(year: number, month: number, day: number) {
  const tempo = new Tempo({ year, month, day });
  const classical = tempo.toRomanClassical();

  return {
    isoDate: tempo.format('{yyyy}-{mm}-{dd}'),
    formalLatin: classical.latin,
    abbreviated: classical.shortLatin,
    aucYear: classical.auc,
    isLeapIntercalation: classical.isBissextile
  };
}

// Verify a decree signed on February 24 in a leap year
const leapCharter = verifyCharterDating(2024, 2, 24);
console.log(leapCharter.formalLatin);
// "ante diem bis sextum Kalendas Martias"

// Verify an autumn charter signed on October 14
const idesEveCharter = verifyCharterDating(2026, 10, 14);
console.log(idesEveCharter.formalLatin);
// "Pridie Idus Octobres"
```

---

## See Also

- **[Classical Fasti & Lunar Anchors](./calendar-mechanics.md)**: Deep dive on anchor formulas, bissextile intercalation, and Latin declensions.
- **[Plugin Documentation Home](./index.md)**: Complete API surface catalog and interactive live REPL.
