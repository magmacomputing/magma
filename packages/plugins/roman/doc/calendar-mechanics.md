<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-roman</a>
</div>

<br>

# Classical Fasti & Lunar Anchors

The Roman calendar system (*Fasti*) operated on astronomical and liturgical principles distinct from modern sequential month numbering. Rather than numbering days sequentially from 1 to 31, Roman dates were computed by counting backwards from three fixed lunar anchor points.

---

## The Three Lunar Anchor Points

Every Roman month contains three primary anchor points rooted in the lunar calendar of the early Roman Republic:

1. **Kalends** (*Kalendae*):
   - Always occurs on the **1st** day of every month.
   - Originally marked the new crescent moon (*calare*, to call out or announce).
   - In Latin syntax, dates on the Kalends use the feminine plural Ablative: *Kalendis*.

2. **Nones** (*Nonae*):
   - Originally coincided with the First Quarter moon (nine days before the Ides, counting inclusively).
   - Occurs on the **7th day** in the four long "MOM-J" months: **March**, **October**, **May**, and **July**.
   - Occurs on the **5th day** in all remaining eight months.
   - In Latin syntax: *Nonis* (Ablative).

3. **Ides** (*Idus*):
   - Originally coincided with the Full Moon.
   - Occurs on the **15th day** in "MOM-J" months (March, October, May, July).
   - Occurs on the **13th day** in all other months.
   - In Latin syntax: *Idibus* (Ablative).

```
MOM-J Months (March, October, May, July):
  Day 1:  Kalends (Kalendis)
  Day 7:  Nones   (Nonis)
  Day 15: Ides    (Idibus)

All Other Months (Jan, Feb, Apr, Jun, Aug, Sep, Nov, Dec):
  Day 1:  Kalends (Kalendis)
  Day 5:  Nones   (Nonis)
  Day 13: Ides    (Idibus)
```

---

## Inclusive Backward Counting (*Ante Diem*)

Romans did not count forward from the beginning of the month; they counted backwards towards the next upcoming anchor point:

1. **Exact Anchor Days (`relation: 'on'`)**:
   Expressed in the Ablative case without prefixes:
   - March 15 $\implies$ *Idibus Martiis* (`Id. Mart.`)
   - January 1 $\implies$ *Kalendis Januariis* (`Kal. Jan.`)

2. **The Preceding Day (`relation: 'pridie'`)**:
   The day immediately preceding an anchor uses the adverb *Pridie* followed by the anchor and month in the Accusative:
   - March 14 $\implies$ *Pridie Idus Martias* (`Prid. Id. Mart.`)
   - October 31 $\implies$ *Pridie Kalendas Novembres* (`Prid. Kal. Nov.`)

3. **Inclusive Counting (`relation: 'ante_diem'`)**:
   All other days count inclusively, meaning both the starting date and the anchor date itself are counted. The formula for days prior to the Nones or Ides is:

   $$\text{Count} = \text{AnchorDay} - \text{Day} + 1$$

   For example, March 12 before the March 15 Ides:
   $$15 - 12 + 1 = 4 \implies \text{\textit{ante diem IV Idus Martias}}$$

4. **Dates Past the Ides**:
   Once the Ides of a month passes, dates are calculated backwards from the **Kalends of the following month**:

   $$\text{Count} = \text{DaysInMonth} - \text{Day} + 2$$

   For example, October 16 (in a 31-day month) before the November 1 Kalends:
   $$31 - 16 + 2 = 17 \implies \text{\textit{ante diem XVII Kalendas Novembres}}$$

---

## Leap Year Intercalation: The Bissextile Day

Under the Julian calendar reform (45 BCE), an intercalary day was added every four years in February. Rather than appending an extra day at the end of the month (which would have disturbed the religious festivals aligned to the end of February, such as the *Terminalia* on February 23), the Romans doubled the **sixth day before the March Kalends** (*ante diem sextum Kalendas Martias*):

- **February 24**: *ante diem bis sextum Kalendas Martias* (the doubled "second sixth day")
- **February 25**: *ante diem sextum Kalendas Martias* (the sixth day)
- **February 29**: *Pridie Kalendas Martias*

This practice gave rise to the term **Bissextile Year** (*annus bissextilis*). `@magmacomputing/tempo-plugin-roman` faithfully reproduces this classical intercalation by default (`{ bissextile: true }`):

```typescript
const leapDay = new Tempo('2024-02-24');
const res = leapDay.toRomanClassical();

console.log(res.isBissextile); // true
console.log(res.latin);        // "ante diem bis sextum Kalendas Martias"
console.log(res.shortLatin);   // "a.d. bis VI Kal. Mart."
```

---

## Ab Urbe Condita (AUC) Calculations

Years were traditionally recorded by naming the presiding Roman Consuls. Historians also reckoned time **Ab Urbe Condita** ("from the founding of the City"), traditionally fixed to 753 BCE by the scholar Marcus Terentius Varro.

The plugin provides exact mathematical conversions between astronomical years, Common Era years, and AUC:

1. **Common Era ($Y \ge 1$)**:
   $$\text{AUC} = Y + 753$$
   - $1 \text{ CE} \implies 754 \text{ AUC}$
   - $2026 \text{ CE} \implies 2779 \text{ AUC}$

2. **Before Common Era ($Y_{\text{BCE}} \ge 1$)**:
   $$\text{AUC} = 754 - Y_{\text{BCE}}$$
   - $44 \text{ BCE} \implies 754 - 44 = 710 \text{ AUC}$
   - $753 \text{ BCE} \implies 754 - 753 = 1 \text{ AUC}$

3. **Astronomical Years ($Y \le 0$)**:
   Continuous astronomical year numbering ($0 = 1\text{ BCE}$, $-43 = 44\text{ BCE}$) follows a single continuous linear relation:
   $$\text{AUC} = Y + 753$$

---

## Consular Chronology (*Fasti Consulares*)

In everyday Roman civic and legal life, years were designated by naming the two ordinary consuls (*consules ordinarii*) who entered office on the Kalends of January:

$$\text{\textit{Cicerone et Antonio consulibus}} \implies 63 \text{ BCE} \text{ (astronomical } -62)$$

The plugin includes historical consular dating. By default, the core bundle provides a curated seed catalog of landmark years (e.g. 509 BCE founding, 63 BCE Cicero, 44 BCE Caesar, 541 CE Basilius).

To access the complete historical catalog spanning all 1,050 years from the founding of the Roman Republic in 509 BCE (`-508`) through the final recorded consul in the West in 541 CE (`541`), import the `./consuls` subpath:

```typescript
import '@magmacomputing/tempo-plugin-roman/consuls';

const idesMarch44 = new Tempo('-000043-03-15');
console.log(idesMarch44.consuls);
// "C. Julio Caesare V, M. Antonio coss."
```

---

## See Also

- **[Use Cases & Production Patterns](./use-cases-and-patterns.md)**: Applied historical, academic, and numismatic workflows.
