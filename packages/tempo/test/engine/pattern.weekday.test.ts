import { Tempo } from '#tempo';

const label = 'pattern.weekday:';
const Wed = Tempo.WEEKDAY.Wed, Sun = Tempo.WEEKDAY.Sun;

function formatDate(date: Date) {
  const
    month = ('0' + (date.getMonth() + 1)).slice(-2),
    day = ('0' + date.getDate()).slice(-2),
    year = date.getFullYear();

  return Number(`${year}${month}${day}`);
}

/**
 * Test the Tempo static properties / methods
 */
describe(`${label}`, () => {

  test(`${label} test pattern {weekday}, Wednesday this week`, () => {
    const tempo = new Tempo('Wed');
    const date = new Date();

    date.setDate(date.getDate() - (date.getDay() || Sun) + Wed);

    expect(tempo.parse.result?.[0].match)
      .toBe('weekDay');
    expect(tempo.fmt.yearMonthDay)
      .toBe(formatDate(date));
  })

  test(`${label} test pattern {weekday}, Wednesday next week`, () => {
    const tempo = new Tempo('+Wed');
    const date = new Date();

    date.setDate(date.getDate() - (date.getDay() || Sun) + 7 + Wed);

    expect(tempo.parse.result?.[0].match)
      .toBe('weekDay');
    expect(tempo.fmt.yearMonthDay)
      .toBe(formatDate(date));
  })

  test(`${label} test pattern {weekday}, >Wed (next Wednesday)`, () => {
    const tempo = new Tempo('>Wed');
    const date = new Date();
    const current = date.getDay() || Sun;
    const adjust = (current >= Wed) ? 1 : 0;
    date.setDate(date.getDate() - current + Wed + (adjust * 7));

    expect(tempo.parse.result?.[0].match).toBe('weekDay');
    expect(tempo.fmt.yearMonthDay).toBe(formatDate(date));
  })

  test(`${label} test pattern {weekday}, >=Wed (this or next Wednesday)`, () => {
    const tempo = new Tempo('>=Wed');
    const date = new Date();
    const current = date.getDay() || Sun;
    const adjust = (current > Wed) ? 1 : 0;
    date.setDate(date.getDate() - current + Wed + (adjust * 7));

    expect(tempo.parse.result?.[0].match).toBe('weekDay');
    expect(tempo.fmt.yearMonthDay).toBe(formatDate(date));
  })

  test(`${label} test pattern {weekday}, <2Thu (second Thursday before today)`, () => {
    const tempo = new Tempo('<2Thu');
    const Thu = 4;
    const date = new Date();
    const current = date.getDay() || Sun;
    const adjust = (current <= Thu) ? -2 : -1;
    date.setDate(date.getDate() - current + Thu + (adjust * 7));

    expect(tempo.parse.result?.[0].match).toBe('weekDay');
    expect(tempo.fmt.yearMonthDay).toBe(formatDate(date));
  })
})