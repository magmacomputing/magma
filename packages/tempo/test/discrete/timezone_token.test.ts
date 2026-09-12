import { Tempo } from '#tempo';
import { Token } from '#tempo/support';

describe('Canonical {tz} and backwards-compatible {tzd} timezone token', () => {
  it('exposes Token.tz and Token.tzd symbols', () => {
    expect(Token.tz).toBeDefined();
    expect(typeof Token.tz).toBe('symbol');
    expect(Token.tzd).toBeDefined();
    expect(typeof Token.tzd).toBe('symbol');
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

  it('supports custom layouts using deprecated {tzd} for backwards compatibility', () => {
    const layout = '{tzd}{sep}+{dt}{sep}+{tm}';
    const reg = Tempo.regexp(layout);
    expect(reg.source).toContain('(?<tz>');

    Tempo.init({
      registry: {
        layouts: {
          leadingTzdLegacy: layout
        }
      }
    });

    const t = new Tempo('EST 8 Aug 2026 10:30');
    expect(t.isValid).toBe(true);
    expect(t.tz).toBe('America/New_York');
  });

  it('formats with canonical {tz} and modifiers', () => {
    const t = new Tempo('2026-08-06T16:16:00+10:00[Australia/Sydney]');
    expect(t.format('{tz}')).toBe('Australia/Sydney');
    expect(t.format('{tz:offset}')).toBe('+10:00');
    expect(t.format('{tz:short}')).toBe('AEST');
  });

  it('formats with legacy {tzd} and modifiers identically to {tz}', () => {
    const t = new Tempo('2026-08-06T16:16:00+10:00[Australia/Sydney]');
    expect(t.format('{tzd}')).toBe('Australia/Sydney');
    expect(t.format('{tzd:offset}')).toBe('+10:00');
    expect(t.format('{tzd:short}')).toBe('AEST');
  });

  it('resolves cross-fallback between tz and tzd custom snippets', () => {
    // Custom snippet registered under Token.tz resolves when compiling a layout with {tzd}
    const customSnippet = {
      [Token.tz]: /(?<tz>UTC|Z)/
    } as any;

    const compiledLegacy = Tempo.regexp('{tzd}', customSnippet);
    expect(compiledLegacy.test('UTC')).toBe(true);
    expect(compiledLegacy.test('Z')).toBe(true);

    // Custom snippet registered under Token.tzd resolves when compiling a layout with {tz}
    const customLegacySnippet = {
      [Token.tzd]: /(?<tz>GMT)/
    } as any;

    const compiledModern = Tempo.regexp('{tz}', customLegacySnippet);
    expect(compiledModern.test('GMT')).toBe(true);
  });
});
