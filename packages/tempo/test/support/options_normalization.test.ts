import { Tempo } from '#tempo';

describe('Option Key Casing Normalization & Error Macro Policy', () => {
	describe('Track 2: Universal Lowercase Option Normalization', () => {
		it('should accept lowercase "timezone" option key', () => {
			const t = new Tempo('2026-05-20T10:00:00', { timezone: 'UTC' } as any);
			expect(t.tz).toBe('UTC');
			expect(t.config.timeZone).toBe('UTC');
		});

		it('should accept lowercase "timestamp" option key', () => {
			const t = new Tempo(1715900000, { timestamp: 'ss' } as any);
			expect(t.isValid).toBe(true);
			expect(t.format('{yyyy}')).toBe('2024');
		});

		it('should accept lowercase "monthday" option key', () => {
			const t = new Tempo('04012026', { monthday: true } as any);
			expect(t.isValid).toBe(true);
			expect(t.format('{mm}')).toBe('04');
		});
	});

	describe('Track 3: Error Macro Presets (error: policy)', () => {
		it('should apply error: "throw" policy', () => {
			const t = new Tempo('2026-05-20', { error: 'throw' });
			expect(t.config.catch).toBe(false);
			expect(t.config.silent).toBe(false);
		});

		it('should apply error: "catch" policy', () => {
			const invalid = new Tempo('2026-05-20', { timeZone: 'Invalid/Zone', error: 'catch' });
			expect(invalid.isValid).toBe(false);
			expect(invalid.config.catch).toBe(true);
			expect(invalid.config.silent).toBe(false);
		});

		it('should apply error: "silent" policy', () => {
			const invalid = new Tempo('2026-05-20', { timeZone: 'Invalid/Zone', error: 'silent' });
			expect(invalid.isValid).toBe(false);
			expect(invalid.config.catch).toBe(true);
			expect(invalid.config.silent).toBe(true);
		});

		it('should apply error: "log" policy', () => {
			const invalid = new Tempo('2026-05-20', { timeZone: 'Invalid/Zone', error: 'log' });
			expect(invalid.isValid).toBe(false);
			expect(invalid.config.catch).toBe(true);
			expect(invalid.config.silent).toBe(false);
			expect(invalid.config.debug).toBe(2); // DebugLevel.Warn
		});

		it('should allow explicit silent override when error: "catch" is provided', () => {
			const invalid = new Tempo('2026-05-20', { timeZone: 'Invalid/Zone', error: 'catch', silent: true });
			expect(invalid.isValid).toBe(false);
			expect(invalid.config.catch).toBe(true);
			expect(invalid.config.silent).toBe(true);
		});
	});
});
