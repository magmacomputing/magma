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

  it('should handle yw and yow for ISO year, and wy / woy for ISO week', () => {
    const t3 = new Tempo('2024-12-30');										// Monday, Week 1 of 2025
    expect(t3.yw).toBe(2025);
    expect(t3.yow).toBe(2025);
    expect(t3.wy).toBe(1);
    expect(t3.woy).toBe(1);
    expect(t3.format('{yw}{ww}')).toBe('202501');
    expect(t3.format('{yow}{woy}')).toBe('202501');
    expect(t3.format('{yywoy}')).toBe('202501');
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

    it('slices fractional seconds with precision modifiers on {ff:N}', () => {
      const tFrac = new Tempo('2026-10-24T15:30:45.789123456Z');
      expect(tFrac.format('{ss}.{ff:0}')).toBe('45.789123456');
      expect(tFrac.format('{ss}.{ff:1}')).toBe('45.7');
      expect(tFrac.format('{ss}.{ff:2}')).toBe('45.78');
      expect(tFrac.format('{ss}.{ff:3}')).toBe('45.789');
      expect(tFrac.format('{ss}.{ff:6}')).toBe('45.789123');
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
      expect(t.format('{tz:offset:short}')).toBe('-04');
      expect(t.format('{tz:offset:compact}')).toBe('-0400');
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

  describe('numeric-padding-modifiers', () => {
    const tNum = new Tempo('2024-05-09T03:05:07.042000005Z');

    it('zero-fills numeric tokens to specified width', () => {
      expect(tNum.format('{day:2}')).toBe('09');
      expect(tNum.format('{day:3}')).toBe('009');
      expect(tNum.format('{dow:2}')).toBe('04');
      expect(tNum.format('{doy}')).toBe('130');
      expect(tNum.format('{doy:4}')).toBe('0130');
      expect(tNum.format('{ns:3}')).toBe('005');
      expect(tNum.format('{ns:6}')).toBe('000005');
      expect(tNum.format('{yy:4}')).toBe('0024');
    })

    it('leaves unpadded numbers untouched if width is already equal or smaller', () => {
      const tBig = new Tempo('2024-11-25T15:30:45');
      expect(tBig.format('{day:2}')).toBe('25');
      expect(tBig.format('{day:1}')).toBe('25');
    })

    it('works with custom registered tokens returning numeric values (including negative values)', () => {
      const tCust = new Tempo('2024-05-05', {
        registry: {
          tokens: {
            stepIndex: () => 7,
            negVal: () => -5
          }
        }
      });
      expect(tCust.format('{stepIndex:3}' as any)).toBe('007');
      expect(tCust.format('{negVal:3}' as any)).toBe('-05');
    })
  })

  describe('ordinal-modifiers', () => {
    it('supports :ord and :nth as aliases for ordinal formatting', () => {
      const t1 = new Tempo('2024-05-01');
      const t2 = new Tempo('2024-05-02');
      const t3 = new Tempo('2024-05-03');
      const t4 = new Tempo('2024-05-04');

      expect(t1.format('{dd:ord}')).toBe('1st');
      expect(t1.format('{dd:nth}')).toBe('1st');

      expect(t2.format('{dd:ord}')).toBe('2nd');
      expect(t2.format('{dd:nth}')).toBe('2nd');

      expect(t3.format('{dd:ord}')).toBe('3rd');
      expect(t3.format('{dd:nth}')).toBe('3rd');

      expect(t4.format('{dd:ord}')).toBe('4th');
      expect(t4.format('{dd:nth}')).toBe('4th');
    })
  })

  describe('roman-modifier', () => {
    it('supports :roman modifier for integer date and time tokens', () => {
      const dt = new Tempo('2026-10-24T15:30:45');
      expect(dt.format('{yyyy:roman}')).toBe('MMXXVI');
      expect(dt.format('{mm:roman}')).toBe('X');
      expect(dt.format('{mm:roman:lower}')).toBe('x');
      expect(dt.format('{dd:roman}')).toBe('XXIV');
      expect(dt.format('{woy:roman}')).toBe('XLIII');
      expect(dt.format('{dow:roman}')).toBe('VI');
    })

    it('falls back to original value when token is out of Roman range or non-integer', () => {
      const dtFuture = new Tempo('4050-10-24T15:30:45');
      expect(dtFuture.format('{yyyy:roman}')).toBe('4050');
      expect(dtFuture.format('{mon:long:roman}')).toBe('October');
    })
  })

  describe('numeric-width and slicing modifiers', () => {
    const dt = new Tempo('2026-10-05T09:07:03.789123456');

    it('supports positive numeric modifiers for minimum zero padding', () => {
      expect(dt.format('{yyyy:6}')).toBe('002026');
      expect(dt.format('{dd:3}')).toBe('005');
      expect(dt.format('{mi:4}')).toBe('0007');
    })

    it('supports negative numeric modifiers for right-side tail slicing', () => {
      expect(dt.format('{yyyy:-3}')).toBe('026');
      expect(dt.format('{yyyy:-2}')).toBe('26');
      expect(dt.format('{yyyy:-1}')).toBe('6');

      expect(dt.format('{yow:-3}')).toBe('026');
      expect(dt.format('{yow:-2}')).toBe('26');
      expect(dt.format('{yow:short}')).toBe('26');
      expect(dt.format('{yow:-1}')).toBe('6');
    })

    it('preserves left-to-right fractional seconds precision slicing with {ff:N}', () => {
      expect(dt.format('{ff:3}')).toBe('789');
      expect(dt.format('{ff:6}')).toBe('789123');
    })

    it('supports :space padding modifier with default and explicit widths', () => {
      expect(dt.format('{dd:space}')).toBe(' 5');
      expect(dt.format('{dd:2:space}')).toBe(' 5');
      expect(dt.format('{h12:space}')).toBe('09 am');
      expect(dt.format('{h12:space:2}')).toBe(' 9 am');

      const dtSingleDoy = new Tempo('2026-01-05T04:00:00');
      expect(dtSingleDoy.format('{doy:space}')).toBe('  5');
      expect(dtSingleDoy.format('{doy:3:space}')).toBe('  5');
      expect(dtSingleDoy.format('{hh:space}')).toBe(' 4');
    })
  })

  describe('extended timezone offset modifiers', () => {
    const dtUtc = new Tempo('2026-10-05T09:07:03Z');
    const dtPos = new Tempo('2026-10-05T09:07:03+08:00');
    const dtNeg = new Tempo('2026-10-05T09:07:03-05:00');
    const dtHalf = new Tempo('2026-10-05T09:07:03+05:30');

    it('formats offset hours with sign via :hh and :hour', () => {
      expect(dtUtc.format('{tz:offset:hh}')).toBe('+00');
      expect(dtUtc.format('{tz:offset:hour}')).toBe('+00');
      expect(dtPos.format('{tz:offset:hh}')).toBe('+08');
      expect(dtPos.format('{tz:offset:hour}')).toBe('+08');
      expect(dtNeg.format('{tz:offset:hh}')).toBe('-05');
      expect(dtNeg.format('{tz:offset:hour}')).toBe('-05');
      expect(dtHalf.format('{tz:offset:hh}')).toBe('+05');
    })

    it('formats offset minutes without sign via :mi, :min, and :mm', () => {
      expect(dtUtc.format('{tz:offset:mi}')).toBe('00');
      expect(dtUtc.format('{tz:offset:min}')).toBe('00');
      expect(dtPos.format('{tz:offset:mi}')).toBe('00');
      expect(dtNeg.format('{tz:offset:mi}')).toBe('00');
      expect(dtHalf.format('{tz:offset:mi}')).toBe('30');
      expect(dtHalf.format('{tz:offset:min}')).toBe('30');
    })

    it('formats offset with seconds via :ss, :sec, and :second', () => {
      expect(dtUtc.format('{tz:offset:ss}')).toBe('+00:00:00');
      expect(dtUtc.format('{tz:offset:sec}')).toBe('+00:00:00');
      expect(dtPos.format('{tz:offset:ss}')).toBe('+08:00:00');
      expect(dtPos.format('{tz:offset:sec}')).toBe('+08:00:00');
      expect(dtPos.format('{tz:offsetcompact:ss}')).toBe('+080000');
      expect(dtPos.format('{tz:offset:compact:ss}')).toBe('+080000');
      expect(dtPos.format('{tz:offsetcompact:sec}')).toBe('+080000');
      expect(dtPos.format('{tz:offset:compact:sec}')).toBe('+080000');
      expect(dtHalf.format('{tz:offset:ss}')).toBe('+05:30:00');
      expect(dtHalf.format('{tz:offsetcompact:ss}')).toBe('+053000');
    })

    it('formats UTC Z indicator via canonical :utc and internal alias :z', () => {
      // Canonical :utc
      expect(dtUtc.format('{tz:offset:utc}')).toBe('Z');
      expect(dtUtc.format('{tz:offsetcompact:utc}')).toBe('Z');
      expect(dtUtc.format('{tz:offset:compact:utc}')).toBe('Z');
      expect(dtUtc.format('{tz:offset:short:utc}')).toBe('Z');
      expect(dtUtc.format('{tz:offset:ss:utc}')).toBe('Z');
      expect(dtUtc.format('{tz:offset:sec:utc}')).toBe('Z');
      expect(dtUtc.format('{tz:offsetcompact:ss:utc}')).toBe('Z');
      expect(dtUtc.format('{tz:offsetcompact:sec:utc}')).toBe('Z');

      expect(dtPos.format('{tz:offset:utc}')).toBe('+08:00');
      expect(dtPos.format('{tz:offsetcompact:utc}')).toBe('+0800');
      expect(dtPos.format('{tz:offset:short:utc}')).toBe('+08');
      expect(dtPos.format('{tz:offset:ss:utc}')).toBe('+08:00:00');
      expect(dtPos.format('{tz:offset:sec:utc}')).toBe('+08:00:00');
      expect(dtPos.format('{tz:offsetcompact:ss:utc}')).toBe('+080000');
      expect(dtPos.format('{tz:offsetcompact:sec:utc}')).toBe('+080000');

      expect(dtHalf.format('{tz:offset:utc}')).toBe('+05:30');
      expect(dtHalf.format('{tz:offsetcompact:utc}')).toBe('+0530');
      expect(dtHalf.format('{tz:offset:short:utc}')).toBe('+05:30');

      // Internal alias :z
      expect(dtUtc.format('{tz:offset:z}')).toBe('Z');
      expect(dtUtc.format('{tz:offsetcompact:z}')).toBe('Z');
      expect(dtUtc.format('{tz:offset:compact:z}')).toBe('Z');
      expect(dtUtc.format('{tz:offset:short:z}')).toBe('Z');
      expect(dtUtc.format('{tz:offset:ss:z}')).toBe('Z');
      expect(dtUtc.format('{tz:offset:sec:z}')).toBe('Z');
      expect(dtUtc.format('{tz:offsetcompact:ss:z}')).toBe('Z');
      expect(dtUtc.format('{tz:offsetcompact:sec:z}')).toBe('Z');

      expect(dtPos.format('{tz:offset:z}')).toBe('+08:00');
      expect(dtPos.format('{tz:offsetcompact:z}')).toBe('+0800');
      expect(dtPos.format('{tz:offset:short:z}')).toBe('+08');
      expect(dtPos.format('{tz:offset:ss:z}')).toBe('+08:00:00');
      expect(dtPos.format('{tz:offset:sec:z}')).toBe('+08:00:00');
      expect(dtPos.format('{tz:offsetcompact:ss:z}')).toBe('+080000');
      expect(dtPos.format('{tz:offsetcompact:sec:z}')).toBe('+080000');

      expect(dtHalf.format('{tz:offset:z}')).toBe('+05:30');
      expect(dtHalf.format('{tz:offsetcompact:z}')).toBe('+0530');
      expect(dtHalf.format('{tz:offset:short:z}')).toBe('+05:30');
    })
  })

  describe('Phase 4 specialized tokens, scoped modifiers & zero-indexing', () => {
    const tEpoch = new Tempo('1970-01-01T00:00:00Z');
    const tTarget = new Tempo('2026-10-17T15:30:45[Australia/Sydney]'); // Saturday, DOY 290
    const tSunday = new Tempo('2026-10-18T10:00:00[Australia/Sydney]'); // Sunday (dow 7 ISO, 0 in zero-index)
    const tMonday = new Tempo('2026-10-19T10:00:00[Australia/Sydney]'); // Monday (dow 1 ISO, 1 in zero-index)
    const tFebLeap = new Tempo('2024-02-15T00:00:00Z');
    const tFebNonLeap = new Tempo('2026-02-15T00:00:00Z');

    it('formats astronomical Julian day ({jj} and {julian}) and provides .jj getter', () => {
      expect(tEpoch.format('{jj}')).toBe('2440588');
      expect(tEpoch.format('{julian}')).toBe('2440588');
      expect(tEpoch.jj).toBe(2440588);

      expect(tTarget.format('{jj}')).toBe('2461331');
      expect(tTarget.format('{julian}')).toBe('2461331');
      expect(tTarget.jj).toBe(2461331);
    });

    it('formats days in month ({dim}) and provides .dim getter', () => {
      expect(tFebLeap.format('{dim}')).toBe('29');
      expect(tFebLeap.dim).toBe(29);
      expect(tFebNonLeap.format('{dim}')).toBe('28');
      expect(tFebNonLeap.dim).toBe(28);
      expect(tTarget.format('{dim}')).toBe('31');
      expect(tTarget.dim).toBe(31);
    });

    it('formats century ({cen} and {century})', () => {
      expect(tTarget.format('{cen}')).toBe('20');
      expect(tTarget.format('{century}')).toBe('20');
      expect(new Tempo('1999-12-31').format('{cen}')).toBe('19');
      expect(new Tempo('0750-01-01').format('{cen}')).toBe('07');
      expect(new Tempo('-000050-01-01').format('{cen}')).toBe('01');
    });

    it('formats week of month ({wom}) and calendar week ({woy:cal})', () => {
      // October 1 is Day 1 -> Week 1 of month
      const tOct1 = new Tempo('2026-10-01T00:00:00');
      expect(tOct1.format('{wom}')).toBe('1');
      expect(tOct1.format('{ww:month}')).toBe('1');

      // October 8 is Day 8 -> Week 2 of month
      const tOct8 = new Tempo('2026-10-08T00:00:00');
      expect(tOct8.format('{wom}')).toBe('2');

      // October 31 is Day 31 -> Week 5 of month
      const tOct31 = new Tempo('2026-10-31T00:00:00');
      expect(tOct31.format('{wom}')).toBe('5');

      // Jan 1 to Jan 7 is Week 1 of year (Jan 1 basis)
      const tJan1 = new Tempo('2026-01-01T00:00:00');
      expect(tJan1.format('{woy:cal}')).toBe('01');

      const tJan8 = new Tempo('2026-01-08T00:00:00');
      expect(tJan8.format('{woy:cal}')).toBe('02');
    });

    it('supports dimensional time scope modifiers (:day, :week)', () => {
      // 15:30:45 -> 15*3600 + 30*60 + 45 = 55845 seconds of day
      expect(tTarget.format('{ss:day}')).toBe('55845');
      expect(tTarget.format('{ss:day:5}')).toBe('55845');

      // 00:00:05 -> 5 seconds of day (padded with explicit width or space)
      const tMidnight5 = new Tempo('2026-10-17T00:00:05');
      expect(tMidnight5.format('{ss:day}')).toBe('5');
      expect(tMidnight5.format('{ss:day:5}')).toBe('00005');
      expect(tMidnight5.format('{ss:day:space}')).toBe('    5');

      // Minute of day: 15*60 + 30 = 930
      expect(tTarget.format('{mi:day}')).toBe('930');

      // Hour of week: Saturday (day 6 ISO, 5 days prior = 5 * 24 = 120 + 15 = 135)
      expect(tTarget.format('{hh:week}')).toBe('135');
    });

    it('supports scoped day of year via {dd:year}', () => {
      // DOY 290
      expect(tTarget.format('{dd:year}')).toBe('290');
      expect(tTarget.format('{dd:year:raw}')).toBe('290');
      expect(tTarget.format('{doy}')).toBe('290');

      const tJan2 = new Tempo('2026-01-02');
      expect(tJan2.format('{dd:year}')).toBe('002');
      expect(tJan2.format('{dd:year:raw}')).toBe('2');
      expect(tJan2.format('{dd:year:space}')).toBe('  2');
    });

    it('supports generalized zero-indexing via :zero and :0', () => {
      // Day of year zero-indexed: 290 -> 289
      expect(tTarget.format('{doy:zero}')).toBe('289');
      expect(tTarget.format('{doy:0}')).toBe('289');
      expect(tTarget.format('{dd:year:zero}')).toBe('289');
      expect(tTarget.format('{dd:year:0}')).toBe('289');

      const tJan1 = new Tempo('2026-01-01');
      expect(tJan1.format('{doy:zero}')).toBe('000');
      expect(tJan1.format('{doy:0}')).toBe('000');
      expect(tJan1.format('{doy:raw:0}')).toBe('0');
      expect(tJan1.format('{dd:year:raw:0}')).toBe('0');

      // Day of week zero-indexed (Sunday = 0, Monday = 1, Saturday = 6)
      expect(tSunday.format('{dow:zero}')).toBe('0');
      expect(tSunday.format('{dow:0}')).toBe('0');
      expect(tMonday.format('{dow:zero}')).toBe('1');
      expect(tMonday.format('{dow:0}')).toBe('1');
      expect(tTarget.format('{dow:zero}')).toBe('6'); // Saturday
      expect(tTarget.format('{dow:0}')).toBe('6');

      // Month zero-indexed: October (10) -> 09 / 9
      expect(tTarget.format('{mm:zero}')).toBe('09');
      expect(tTarget.format('{mm:0}')).toBe('09');
      expect(tTarget.format('{mm:raw:0}')).toBe('9');

      // Week of year zero-indexed
      expect(tTarget.format('{woy:zero}')).toBe('41');
      expect(tTarget.format('{woy:0}')).toBe('41');
    });
  })
})

