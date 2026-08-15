import { Tempo } from '#tempo';

const label = 'accessors:';
const date = new Date();
const tempo = new Tempo();

/**
 * Test the Tempo accessors
*/
describe(`${label}`, () => {

  test(`${label} get the right day-of-week (${date.getDay()})`, () => {
    const dow = date.getDay() || 7;
    expect(tempo.dow).toBe(dow)
  })

  test(`${label} get the right day-of-month (${date.getDate()})`, () => {
    expect(tempo.dd).toBe(date.getDate())
  })

  test(`${label} get instance locale and sphere getters`, () => {
    const tDefault = new Tempo('2024-05-20');
    expect(tDefault.locale).toBeDefined();
    expect(tDefault.sphere).toBeDefined();

    const tCustom = new Tempo('2024-05-20', { locale: 'fr-FR', sphere: 'south' });
    expect(tCustom.locale).toBe('fr-FR');
    expect(tCustom.sphere).toBe('south');
  })
})