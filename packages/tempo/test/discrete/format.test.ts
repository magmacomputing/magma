import { Tempo } from '#tempo';

describe('Tempo.format() refinements', () => {
  const t = new Tempo('2024-05-20T10:00:00Z');

  it('should return a string for named numeric formats', () => {
    const yw = t.format('yearWeek');
    expect(typeof yw).toBe('string');
    expect(yw).toBe('202421');
  })

  it('should return a string for raw numeric patterns', () => {
    const val = t.format('{yyyy}{mm}{dd}');
    expect(typeof val).toBe('string');
    expect(val).toBe('20240520');
  })

  it('should return a string for formats with leading zeros (if not explicitly numeric)', () => {
    const dd = t.format('{dd}');
    expect(typeof dd).toBe('string');
    expect(dd).toBe('20');

    const t2 = new Tempo('2024-05-05');
    expect(t2.format('{dd}')).toBe('05');
    expect(typeof t2.format('{dd}')).toBe('string');
  })

  it('should handle yw for ISO year', () => {
    const t3 = new Tempo('2024-12-30');										// Monday, Week 1 of 2025
    expect(t3.yw).toBe(2025);
    expect(t3.format('{yw}{ww}')).toBe('202501');
    expect(typeof t3.format('{yw}{ww}')).toBe('string');
  })

  it('accepts an options object as the second argument to override configuration', () => {
    const t3 = new Tempo('2024-10-05T10:30:45', { locale: 'en-US' });
    // The default locale is en-US which outputs English. We override it to fr-FR here.
    expect(t3.format('{mon:locale}', { locale: 'fr-FR' })).toBe('octobre');
  })

  describe('auto-meridiem', () => {
    const tAM = new Tempo('2024-05-20T10:30:45');
    const tPM = new Tempo('2024-05-20T22:30:45');

    it('adds am/pm after {h12}', () => {
      expect(tAM.format('{h12}')).toBe('10am');
      expect(tPM.format('{h12}')).toBe('10pm');
    })

    it('adds am/pm after {mi} if it follow {h12}', () => {
      expect(tAM.format('{h12}:{mi}')).toBe('10:30am');
      expect(tPM.format('{h12}:{mi}')).toBe('10:30pm');
    })

    it('adds AM/PM after {mi} if {h12:upper} is used', () => {
      expect(tAM.format('{h12:upper}:{mi}')).toBe('10:30AM');
      expect(tPM.format('{h12:upper}:{mi}')).toBe('10:30PM');
    })

    it('adds am/pm after {mi} if {h12:lower} is used', () => {
      expect(tAM.format('{h12:lower}:{mi}')).toBe('10:30am');
      expect(tPM.format('{h12:lower}:{mi}')).toBe('10:30pm');
    })

    it('adds a.m./p.m. if {h12:dots} is used', () => {
      expect(tAM.format('{h12:dots}:{mi}')).toBe('10:30a.m.');
      expect(tPM.format('{h12:dots}:{mi}')).toBe('10:30p.m.');
    })

    it('adds A.M./P.M. if {h12:upper:dots} is used', () => {
      expect(tAM.format('{h12:upper:dots}:{mi}')).toBe('10:30A.M.');
      expect(tPM.format('{h12:upper:dots}:{mi}')).toBe('10:30P.M.');
    })

    it('injects a space if :space is used', () => {
      expect(tAM.format('{h12:space:dots}:{mi}')).toBe('10:30 a.m.');
      expect(tPM.format('{h12:space:dots}:{mi}')).toBe('10:30 p.m.');
      expect(tPM.format('{h12:space:upper:dots}:{mi}')).toBe('10:30 P.M.');
    })

    it('adds am/pm after {ss} if it follows {h12}', () => {
      expect(tAM.format('{h12}:{mi}:{ss}')).toBe('10:30:45am');
      expect(tPM.format('{h12}:{mi}:{ss}')).toBe('10:30:45pm');
    })

    it('adds am/pm after sub-seconds ({ms}, {us}, {ns}, {ff}) if it follows {h12}', () => {
      expect(tAM.format('{h12}:{mi}:{ss}.{ms}')).toBe('10:30:45.000am');
      expect(tPM.format('{h12}:{mi}:{ss}.{ff}')).toBe('10:30:45.000000000pm');
    })

    it('does not add am/pm if :raw modifier is used on {h12}', () => {
      expect(tAM.format('{h12:raw}:{mi}')).toBe('10:30');
      expect(tPM.format('{h12:raw}:{mi}')).toBe('10:30');
    })

    it('strips leading zeros from any numeric token when :raw is used', () => {
      const tPad = new Tempo('2024-05-09T03:05:07.042Z');
      expect(tPad.format('{mm:raw}')).toBe('5');
      expect(tPad.format('{dd:raw}')).toBe('9');
      expect(tPad.format('{hh:raw}')).toBe('3');
      expect(tPad.format('{mi:raw}')).toBe('5');
      expect(tPad.format('{ss:raw}')).toBe('7');
      expect(tPad.format('{ms:raw}')).toBe('42');
      expect(tPad.format('{h12:raw}')).toBe('3');
    })

    it('supports the {cal} token for calendar tracking', () => {
      expect(tAM.format('{cal}')).toBe('gregory');
    })

    it('does not add am/pm if {mer} is already present', () => {
      expect(tAM.format('{h12} {mer}')).toBe('10 am');
      expect(tPM.format('{h12} {mer}')).toBe('10 pm');
    })

    it('does not add am/pm if {mer:upper} is already present', () => {
      expect(tAM.format('{h12} {mer:upper}')).toBe('10 AM');
      expect(tPM.format('{h12} {mer:upper}')).toBe('10 PM');
    })

    it('formats explicitly with {mer:dots}', () => {
      expect(tAM.format('{h12} {mer:dots}')).toBe('10 a.m.');
      expect(tPM.format('{h12} {mer:dots}')).toBe('10 p.m.');
      expect(tAM.format('{h12} {mer:upper:dots}')).toBe('10 A.M.');
    })

    it('does not add am/pm for {hh} (24-hour)', () => {
      expect(tPM.format('{hh}:{mi}')).toBe('22:30');
    })

    it('handles non-time tokens in between', () => {
      expect(tAM.format('{h12} on {mon}')).toBe('10am on May');
    })
  })

  describe('manual-localize', () => {
    const t = new Tempo('2024-05-20T10:00:00Z', { locale: 'fr-FR' });

    it('should evaluate non-localized tokens normally', () => {
      expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2024-05-20');
      expect(t.format('{hh}:{mi}')).toBe('10:00');
    })

    it('should localize native Intls when :locale is provided', () => {
      expect(t.format('{mon:locale}')).toBe('mai');        // instead of 'May'
      expect(t.format('{www:locale}')).toBe('lun.');       // instead of 'Mon'
      expect(t.format('{mon:locale:upper}')).toBe('MAI');  // casing correctly applied after localization
    })

    it('should localize Terms when :locale is provided', () => {
      expect(t.format('{#tod:locale}')).toBe('Milieu de la matinée');
      expect(t.format('{#timeOfDay:locale}')).toBe('Milieu de la matinée');
    })
  })

  describe('styling-modifiers', () => {
    const t = new Tempo('2024-05-20T10:00:00[America/New_York]', { locale: 'fr-FR' });

    it('should implicitly localize natively formatted tokens', () => {
      expect(t.format('{mon:short}')).toBe('mai'); // fr-FR short month
      expect(t.format('{mon:long}')).toBe('mai');  // fr-FR long month
      expect(t.format('{mon:long}')).toBe(t.format('{mon:locale}')); // Proves redundancy
      expect(t.format('{wkd:long}')).toBe('lundi'); // fr-FR long weekday
      expect(t.format('{wkd:long}')).toBe(t.format('{wkd:locale}'));
    })

    it('should resolve timezone styling correctly', () => {
      expect(t.format('{tz:short}')).toBe('UTC−4'); 
      expect(t.format('{tz:long}')).toBe('heure d’été de l’Est nord-américain'); 
      expect(t.format('{tz:offset}')).toBe('-04:00');
      expect(t.format('{tz:offsetcompact}')).toBe('-0400');
    })
  })
  
  describe('era-formatting', () => {
    it('supports the {era} token with BCE dates', () => {
      const bce = new Tempo('-000100-05-20T10:00:00Z');
      expect(bce.format('{era}')).toMatch(/BC|BCE/i);
    })

    it('supports the {era} token with CE dates', () => {
      const ce = new Tempo('2024-05-20T10:00:00Z');
      expect(ce.format('{era}')).toMatch(/AD|CE/i);
    })
  })
  
  describe('custom-format-tokens', () => {
    it('supports registering and evaluating custom tokens via configuration', () => {
      const t = new Tempo('2024-05-20', {
        registry: {
          tokens: {
            myCustomDay: (zdt: any) => String(zdt.day + 100)
          }
        }
      });
      expect(t.format('{myCustomDay}' as any)).toBe('120');
      
      // Fallback behavior for non-existent custom tokens
      expect(t.format('{nonExistent}' as any)).toBe('{nonExistent}');
    })
  })
})
