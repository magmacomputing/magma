import { Tempo } from '#tempo';
import { Token } from '#tempo/support';

describe('Canonical {tz} timezone token', () => {
  beforeEach(() => {
    Tempo.init();
  });

  afterEach(() => {
    Tempo.init();
  });

  it('exposes Token.tz symbol', () => {
    expect(Token.tz).toBeDefined();
    expect(typeof Token.tz).toBe('symbol');
  });

  it('parses standard date-times with timezone offsets and abbreviations via default layouts', () => {
    const t1 = new Tempo('2026-08-06 16:16 GMT+10');
    expect(t1.isValid).toBe(true);
    expect(t1.tz).toBe('+10:00');
    expect(t1.format('{tz:offset}')).toBe('+10:00');

    const t2 = new Tempo('2026-08-06 16:16 AEST');
    expect(t2.isValid).toBe(true);
    expect(t2.tz).toBe('Australia/Sydney');
  });

  it('supports custom layouts using canonical {tz}', () => {
    const layout = '{tz}{sep}+{dt}{sep}+{tm}';
    const reg = Tempo.regexp(layout);
    expect(reg.source).toContain('(?<tz>');

    Tempo.init({
      locale: 'en-AU',
      registry: {
        layouts: {
          leadingTz: layout
        }
      }
    });

    const t = new Tempo('PST 8 Aug 2026 10:30');
    expect(t.isValid).toBe(true);
    expect(t.tz).toBe('America/Los_Angeles');
    expect(t.hh).toBe(10);
    expect(t.mi).toBe(30);
  });

  it('formats with canonical {tz} and modifiers', () => {
    const t = new Tempo('2026-08-06T16:16:00+10:00[Australia/Sydney]', { locale: 'en-AU' });
    expect(t.format('{tz}')).toBe('Australia/Sydney');
    expect(t.format('{tz:offset}')).toBe('+10:00');
    expect(t.format('{tz:offset:short}')).toBe('+10');
    expect(t.format('{tz:short:offset}')).toBe('+10');
    expect(t.format('{tz:offset:compact}')).toBe('+1000');
    expect(t.format('{tz:short}')).toBe('AEST');
    expect(t.format('{tz:long}')).toBe('Australian Eastern Standard Time');
  });
});
