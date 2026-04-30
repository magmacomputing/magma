import { Tempo } from '#tempo';

const label = 'event:';
const year = 2020;
const date = new Date(`25-Dec-${year} 22:30:45`);
const arvo = new Date(`25-Dec-${year} 15:00`);

/**
 * Test the Tempo static properties / methods.
 * Events like 'xmas' must resolve correctly regardless of the system timezone
 * (e.g. MDY-active in America/New_York) because their alias values are predefined
 * semantic strings, not user-entered ambiguous dates.
 */
describe(`${label}`, () => {

  test(`${label} test inbuilt Event: xmas`, () => {
    const t = new Tempo('xmas').set({ year });
    expect(t.dd, 'day should be 25').toBe(25);
    expect(t.mm, 'month should be December (12)').toBe(12);
    expect(t.yy, 'year should be 2020').toBe(year);
  })

  test(`${label} test Event with Period: xmas afternoon`, () => {
    const t = new Tempo('xmas afternoon').set({ year });
    expect(t.dd, 'day should be 25').toBe(25);
    expect(t.mm, 'month should be December (12)').toBe(12);
    expect(t.hh, 'hour should be 15 (3pm)').toBe(15);
  })

  test(`${label} test Event and set Period`, () => {
    const t = new Tempo('xmas').set({ year, time: '10:30:45pm' });
    expect(t.dd, 'day should be 25').toBe(25);
    expect(t.mm, 'month should be December (12)').toBe(12);
    expect(t.hh, 'hour should be 22').toBe(22);
    expect(t.mi, 'minute should be 30').toBe(30);
    expect(t.ss, 'second should be 45').toBe(45);
  })

  test(`${label} test Period and set Event`, () => {
    const t = new Tempo().set({ year, time: '10:30:45pm', event: 'xmas' });
    expect(t.dd, 'day should be 25').toBe(25);
    expect(t.mm, 'month should be December (12)').toBe(12);
    expect(t.hh, 'hour should be 22').toBe(22);
    expect(t.mi, 'minute should be 30').toBe(30);
    expect(t.ss, 'second should be 45').toBe(45);
  })

})