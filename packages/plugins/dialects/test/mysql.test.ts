import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '../src/index.js';

describe('MySQL / MariaDB Format & Parse Dialect', () => {
	Tempo.use(DialectsPlugin);

	const dt = new Tempo('2026-10-24T15:30:45.123456', { timeZone: 'UTC' });

	describe('Formatting', () => {
		it('formats standard MySQL date-time with %i for minute', () => {
			expect(dt.format('%Y-%m-%d %H:%i:%s', { dialect: DIALECT.Mysql })).toBe('2026-10-24 15:30:45');
			expect(dt.dialects.mysql('%Y-%m-%d %H:%i:%s')).toBe('2026-10-24 15:30:45');
		});

		it('formats MySQL month specifiers (%M for full name, %b for short, %c for unpadded, %m for zero-padded)', () => {
			expect(dt.dialects.mysql('%M')).toBe('October');
			expect(dt.dialects.mysql('%b')).toBe('Oct');
			expect(dt.dialects.mysql('%m')).toBe('10');
			expect(dt.dialects.mysql('%c')).toBe('10');

			const jan = new Tempo('2026-01-05T00:00:00Z', { timeZone: 'UTC' });
			expect(jan.dialects.mysql('%c')).toBe('1');
			expect(jan.dialects.mysql('%m')).toBe('01');
		});

		it('formats MySQL day specifiers (%d for zero-padded, %e for unpadded, %D for ordinal suffix)', () => {
			expect(dt.dialects.mysql('%d')).toBe('24');
			expect(dt.dialects.mysql('%e')).toBe('24');
			expect(dt.dialects.mysql('%D')).toBe('24th');

			const jan = new Tempo('2026-01-01T00:00:00Z', { timeZone: 'UTC' });
			expect(jan.dialects.mysql('%d')).toBe('01');
			expect(jan.dialects.mysql('%e')).toBe('1');
			expect(jan.dialects.mysql('%D')).toBe('1st');

			const jan2 = new Tempo('2026-01-02T00:00:00Z', { timeZone: 'UTC' });
			expect(jan2.dialects.mysql('%D')).toBe('2nd');
		});

		it('formats MySQL hour specifiers (%H 24-hr padded, %k 24-hr unpadded, %h/%I 12-hr padded, %l 12-hr unpadded)', () => {
			expect(dt.dialects.mysql('%H')).toBe('15');
			expect(dt.dialects.mysql('%k')).toBe('15');
			expect(dt.dialects.mysql('%h')).toBe('03');
			expect(dt.dialects.mysql('%I')).toBe('03');
			expect(dt.dialects.mysql('%l')).toBe('3');

			const morning = new Tempo('2026-10-24T09:05:00Z', { timeZone: 'UTC' });
			expect(morning.dialects.mysql('%H')).toBe('09');
			expect(morning.dialects.mysql('%k')).toBe('9');
			expect(morning.dialects.mysql('%h')).toBe('09');
			expect(morning.dialects.mysql('%l')).toBe('9');
		});

		it('formats MySQL 12-hour (%r) and 24-hour (%T) composite times', () => {
			expect(dt.dialects.mysql('%r')).toBe('03:30:45 PM');
			expect(dt.dialects.mysql('%T')).toBe('15:30:45');
		});

		it('formats MySQL weekday names (%W full, %a short, %w numeric 0=Sun..6=Sat)', () => {
			// 2026-10-24 is Saturday
			expect(dt.dialects.mysql('%W')).toBe('Saturday');
			expect(dt.dialects.mysql('%a')).toBe('Sat');
			expect(dt.dialects.mysql('%w')).toBe('6');

			const sun = new Tempo('2026-10-25T00:00:00Z', { timeZone: 'UTC' });
			expect(sun.dialects.mysql('%w')).toBe('0');
			expect(sun.dialects.mysql('%W')).toBe('Sunday');
		});

		it('formats MySQL microsecond specifier (%f)', () => {
			expect(dt.dialects.mysql('%f')).toBe('123456');
			const dtLowMicro = new Tempo('2026-10-24T15:30:45.005020Z', { timeZone: 'UTC' });
			expect(dtLowMicro.dialects.mysql('%f')).toBe('005020');
		});

		it('formats MySQL ISO week (%v) and ISO week-year (%x)', () => {
			// 2024-12-30 is ISO week 1 of 2025
			const tEdge = new Tempo('2024-12-30T10:00:00Z', { timeZone: 'UTC' });
			expect(tEdge.dialects.mysql('%v')).toBe('01');
			expect(tEdge.dialects.mysql('%x')).toBe('2025');
		});

		it('formats MySQL Mode 0 week (%U), Mode 1 week (%u), and Mode 2 week/year (%V, %X)', () => {
			// 2026-01-01 is Thursday
			const jan1 = new Tempo('2026-01-01T00:00:00Z', { timeZone: 'UTC' });
			// %U: Sunday-based, days before first Sunday are week 00
			expect(jan1.dialects.mysql('%U')).toBe('00');
			// %u: Monday-based, 4+ days in week 1 -> Jan 1 is week 01
			expect(jan1.dialects.mysql('%u')).toBe('01');
			// %V / %X: Sunday-based, week 1 begins on first Sunday -> Jan 1 (Thu) belongs to week 52 of 2025
			expect(jan1.dialects.mysql('%X-%V')).toBe('2025-52');

			// 2026-01-04 is Sunday -> first Sunday of 2026
			const jan4 = new Tempo('2026-01-04T00:00:00Z', { timeZone: 'UTC' });
			expect(jan4.dialects.mysql('%U')).toBe('01');
			expect(jan4.dialects.mysql('%X-%V')).toBe('2026-01');
		});

		it('supports mariadb alias and auto-detects %i as MySQL', () => {
			expect(dt.format('%Y-%m-%d %H:%i:%s', { dialect: 'mariadb' })).toBe('2026-10-24 15:30:45');
			// %i is unique to MySQL and should trigger MySQL auto-detection
			expect(dt.dialects.format('%Y-%m-%d %H:%i:%s')).toBe('2026-10-24 15:30:45');
		});
	});

	describe('Parsing', () => {
		it('parses standard MySQL date-time with %i for minute', () => {
			const parsed = Tempo.dialects.parse('2026-10-24 15:30:45', '%Y-%m-%d %H:%i:%s', DIALECT.Mysql);
			expect(parsed.isValid).toBe(true);
			expect(parsed.yy).toBe(2026);
			expect(parsed.mm).toBe(10);
			expect(parsed.dd).toBe(24);
			expect(parsed.hh).toBe(15);
			expect(parsed.mi).toBe(30);
			expect(parsed.ss).toBe(45);
		});

		it('parses %W, %M %D, %Y textual masks', () => {
			const parsed = Tempo.dialects.parse('Saturday, October 24th, 2026', '%W, %M %D, %Y', DIALECT.Mysql);
			expect(parsed.isValid).toBe(true);
			expect(parsed.yy).toBe(2026);
			expect(parsed.mm).toBe(10);
			expect(parsed.dd).toBe(24);
		});

		it('parses 12-hour %r time format', () => {
			const parsed = Tempo.dialects.parse('2026-10-24 03:30:45 PM', '%Y-%m-%d %r', DIALECT.Mysql);
			expect(parsed.isValid).toBe(true);
			expect(parsed.hh).toBe(15);
			expect(parsed.mi).toBe(30);
			expect(parsed.ss).toBe(45);
		});

		it('parses unpadded %c and %e specifiers', () => {
			const parsed = Tempo.dialects.parse('2026-1-5 9:5:2', '%Y-%c-%e %k:%i:%s', DIALECT.Mysql);
			expect(parsed.isValid).toBe(true);
			expect(parsed.mm).toBe(1);
			expect(parsed.dd).toBe(5);
			expect(parsed.hh).toBe(9);
			expect(parsed.mi).toBe(5);
			expect(parsed.ss).toBe(2);
		});

		it('parses ISO week %v and %x specifiers', () => {
			const parsed = Tempo.dialects.parse('2025-01-1', '%x-%v-%w', DIALECT.Mysql);
			expect(parsed.isValid).toBe(true);
			expect(parsed.yy).toBe(2024);
			expect(parsed.mm).toBe(12);
			expect(parsed.dd).toBe(30);
		});

		it('rejects contradictory weekday input', () => {
			// 2026-10-24 is Saturday (%w = 6). 0 (Sunday) is a contradiction.
			const parsed = Tempo.dialects.parse('2026-10-24 0', '%Y-%m-%d %w', DIALECT.Mysql, { error: 'catch' });
			expect(parsed.isValid).toBe(false);
		});
	});

	describe('Explain & Transpilation', () => {
		it('explains MySQL masks into native Tempo braced tokens', () => {
			const res = Tempo.dialects.explain('%Y-%m-%d %H:%i:%s', DIALECT.Mysql);
			expect(res.dialect).toBe(DIALECT.Mysql);
			expect(res.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');
			expect(res.tokens.find(t => t.source === '%i')?.desc).toBe('Zero-padded minute (00-59)');
		});

		it('explains MySQL month name (%M) and weekday name (%W) correctly', () => {
			const res = Tempo.dialects.explain('%W, %M %D, %Y', DIALECT.Mysql);
			expect(res.pattern).toBe('{wkd}, {mon} {dd:ord}, {yyyy}');
		});
	});
});
