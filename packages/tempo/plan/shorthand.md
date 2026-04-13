Here are my thoughts, and why I'm not happy with this feature.
1) it has introduced regression errors
2) it has introduced non-deterministic results (the first match wins ?!  not good enough in a public utility)
3) it already has similar-enough syntax available {start:'#period'}
4) I'm not convinced that this will be a high-hit feature, so am wary about the effort that will go into dev / test / maintaining it.

Because we've gone quite a ways down this path, I'd like to 'firm-up' the requirements (although I'm still not committed to delivering this feature).
Important to remember that we have a TermKey (like 'qtr'), a TermScope (like 'quarter'), and a RangeKey (like 'q1')
All lookups for a TermKey or TermScope will be performed against the current Tempo's Term definition, all lookups mapped to lowercase for matching.
Important to retain the assigned Range-list when using a TermKey or TermScope (for example, the existing list should already be keyed by 'sphere' for zodiac)

## .set()
1) {start: '#quarter'}  returns a Tempo at the beginning of the current quarter
2) {start: '#period' }  returns a Tempo based at the beginning of the current period (e.g. if 'morning' at 08:15, returns 08:00)
3) {start: '#zodiac' } returns a Tempo based at the beginning of the current zodiac sign
4) {start: '#season' } returns a Tempo based at the beginning of the current season
** the above is already established and working and remains the gold-standard
5) {start: '#quarter.q1' } names the Term and RangeKey that will be used to set the new Tempo
6) {start: '#period.afternoon' } names the Term and RangeKey that will be used to set the new Tempo
7) {start: '#zodiac.aries' } names the Term and RangeKey
8) {start: '#season.summer' } names the Term and RangeKey that will be used to set the new Tempo (within the fiscal year, so it might be greater or lesser than current season)
** allowable to use the TermKey ('#qtr.q3') or TermScope ('#quarter.q3') interchangeably in the above.
** allowable to use the string value from the above as a shorthand only to denote 'start' e.g.  .set('#zodiac.taurus')
** each of the above keys can be 'start' | 'mid' | 'end' to determine where the Tempo date lands

## .add()
1) {'#quarter':1} remains the gold-standard... returns a new Tempo at the beginning date of the next quarter
2) {'#period': 2} returns a new Tempo offsetting the current Period (e.g. morning) by two terms, so effectively two days later at 08:00
3) { '#zodiac': 3} returns a new Tempo at the beginning date of the next three zodiac signs, wrapping around the year boundary
4) { '#season': 2 } returns a new Tempo offsetting the current Season (e.g. Winter) by two terms, so effectively two years later
** the above is already established and working
5) { '#quarter.q1': 1 } returns a new Tempo at the beginning of the next quarter-one (today, or in the in the future)
6) { '#period.afternoon': 2 } returns a new Tempo at the beginning of the 'afternoon' on the clock two days from current Tempo
7) { '#zodiac.taurus': 3 } returns a new Tempo at the beginning of the 'Taurus' term three cycles from current Tempo
8) { '#season.autumn': 4 } returns a new Tempo at the beginning of the next 'Autumn' term
** allowable to use the TermKey ('#qtr.q3') or TermScope ('#quarter.q3') interchangeably in the above.
** if the offset values are negative, then new Tempos are returned prior to the current Tempo
** allowable to use the string key from the above as a shorthand only to denote '1' term e.g. .add('#zodiac.aries')


## Extended Term Syntax

Term PlugIns and Extension PlugIns are where Tempo will really shine.
If we can make the syntax for these clear, concise, and easy to remember, then we'll have a winner.

Extended Term usage involves combining a Term Key (or Term Scope as an alias, if defined) with a Range Key, separated by a '.' to do some interesting things.  Combine this with 'shorthand' keys (see below) and we can make this very concise.

In order to make this really easy for the developer, they will need the ability to query the available Term Keys and Range Keys for the current Tempo.  (I'm not sure if they have this already ?)

### .until() with Extended Terms
Just as we've done above with .set() and .add(), I can see some benefits to allowing Extended Terms to be used in .until() as well.  the .until() method returns a Tempo.Duration object (a standard Temporal.DurationLikeObject but with an .iso property as well)... let's call it a DLO (for duration-like object) in these notes.

## #quarter
1) { start: '#quarter' } returns a DLO representing the duration from the current Tempo to the beginning of the current quarter (so usually negative)
2) { start: '#quarter.q2'} returns a DLO representing the duration from the current Tempo to the beginning of the second quarter in the current Term
3) { mid: '#quarter' } returns a DLO representing the duration from the current Tempo to the middle of the current quarter
4) { mid: '#quarter.q3' } returns a DLO representing the duration from the current Tempo to the middle of the third quarter in the current Term
5) { end: '#quarter' } returns a DLO representing the duration from the current Tempo to the end of the current quarter
6) { end: '#quarter.q4' } returns a DLO representing the duration from the current Tempo to the end of the fourth quarter in the current Term

## #period
7) { start: '#period' } returns a DLO representing the duration from the current Tempo to the beginning of the current period (so usually negative)
8) { start: '#period.afternoon' } returns a DLO representing the duration from the current Tempo to the beginning of the 'afternoon'
9) { mid: '#period' } returns a DLO representing the duration from the current Tempo to the middle of the current period
10) { mid: '#period.evening' } returns a DLO representing the duration from the current Tempo to the middle of the 'evening'
11) { end: '#period' } returns a DLO representing the duration from the current Tempo to the end of the current period
12) { end: '#period.night' } returns a DLO representing the duration from the current Tempo to the end of the 'night'

## #zodiac
13) { start: '#zodiac' } returns a DLO representing the duration from the current Tempo to the beginning of the current zodiac sign (so usually negative)
14) { start: '#zodiac.taurus' } returns a DLO representing the duration from the current Tempo to the beginning of the 'Taurus' sign
15) { mid: '#zodiac' } returns a DLO representing the duration from the current Tempo to the middle of the current zodiac sign
16) { mid: '#zodiac.taurus' } returns a DLO representing the duration from the current Tempo to the middle of the 'Taurus' sign
17) { end: '#zodiac' } returns a DLO representing the duration from the current Tempo to the end of the current zodiac sign
18) { end: '#zodiac.taurus' } returns a DLO representing the duration from the current Tempo to the end of the 'Taurus' sign

## #season
19) { start: '#season' } returns a DLO representing the duration from the current Tempo to the beginning of the current season (so usually negative)
20) { start: '#season.summer' } returns a DLO representing the duration from the current Tempo to the beginning of the 'Summer' season
21) { mid: '#season' } returns a DLO representing the duration from the current Tempo to the middle of the current season
22) { mid: '#season.summer' } returns a DLO representing the duration from the current Tempo to the middle of the 'Summer' season
23) { end: '#season' } returns a DLO representing the duration from the current Tempo to the end of the current season
24) { end: '#season.summer' } returns a DLO representing the duration from the current Tempo to the end of the 'Summer' season

## combining with 'shorthand' (which implies 'start')
25) '#qtr.q1' is a shorthand for { start: '#quarter.q1' }
26) '#period.afternoon' is a shorthand for { start: '#period.afternoon' }
27) '#zodiac.taurus' is a shorthand for { start: '#zodiac.taurus' }
28) '#season.summer' is a shorthand for { start: '#season.summer' }

## Gotcha's
- When running in 'lite' mode (#tempo/core) then the TermModule must be activated for this to be useful.
If it is not, then a Tempo created with any of the above syntax will throw an error (respecting the catch:boolean flag)
- Ranges have upper- and lower-bounds (e.g. Q1-Q4, Aries-Pisces, Spring-Winter, Morning-Night) determined by their sorted Duration fields (year, month, day, etc).   When using 'until' it is expected that the DLO will be in the same range as the current Tempo (defined by that Tempo's year/month/day, etc).  For example, in Q3 then '#qtr.q2' will return a negative DLO... in Morning then '#period.night' will return a positive DLO.  in 'Taurus' then '#zodiac.aries' will return a negative DLO.  in 'Spring' then '#season.winter' will return a negative DLO in southern hemisphere, but positive in northern hemisphere.
- To move outside of a Range requires the use of the 'add' method.  For example, t1.until(t1.add({years:1}).set('#qtr.q2'))
- No consideration is being given (at this release) to the 'CN' (Chinese) sub-objects on any of the terms.

## Slick (as an alternative to 'knowing' what unit to use in an 'add()')
- To provide a 'slick' method for moving across a Range (and beyond), we will consider using the Tempo.Modifier syntax
1) .until('#qtr.>q2') will return a DLO representing the time from the current Tempo to the beginning of the next quarter-two
2) .until('#zdc.>=Aries') will return a DLO representing the duration from the current Tempo to the beginning of the next Aries term
3) .until('#szn.-Winter') will return a DLO representing the duration from the current Tempo to the beginning of the previous Winter term
4) .until('#period.>=morning') will return a DLO representing the duration from the current Tempo to the beginning of the next morning

## and to take this one step further
5) .until({start: '#qtr.>q2'}) is the long-version of ('#qtr.>q2')
6) .until({mid: '#qtr.>q3'}) returns a DLO representing the duration from the current Tempo to the middle of the next quarter-three
7) .until({start: '#period.-3morning}) returns a DLO representing the duration from the current Tempo to 3 days ago in the morning

so t1.until(t1.add({years:1}).set('#qtr.q2')) can be re-written as t1.until('#qtr.>q2')