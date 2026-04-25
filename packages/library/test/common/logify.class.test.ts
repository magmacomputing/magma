import { Logify } from '#library/logify.class.js';

describe('Logify severity gating', () => {
	test('defaults to Info level when debug is false/undefined', () => {
		const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
		const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

		try {
			const log = new Logify('LogifyTestDefault');
			log.info('info-visible');
			log.debug('debug-hidden');

			expect(infoSpy).toHaveBeenCalledTimes(1);
			expect(infoSpy).toHaveBeenCalledWith('LogifyTestDefault: info-visible');
			expect(debugSpy).not.toHaveBeenCalled();
		} finally {
			infoSpy.mockRestore();
			debugSpy.mockRestore();
		}
	});

	test('enables trace level when debug is true', () => {
		const traceSpy = vi.spyOn(console, 'trace').mockImplementation(() => {});
		const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

		try {
			const log = new Logify('LogifyTestTrace', { debug: true });
			log.trace('trace-visible');
			log.debug('debug-visible');

			expect(traceSpy).toHaveBeenCalledTimes(1);
			expect(traceSpy).toHaveBeenCalledWith('LogifyTestTrace: trace-visible');
			expect(debugSpy).toHaveBeenCalledTimes(1);
			expect(debugSpy).toHaveBeenCalledWith('LogifyTestTrace: debug-visible');
		} finally {
			traceSpy.mockRestore();
			debugSpy.mockRestore();
		}
	});

	test('uses numeric debug level directly', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

		try {
			const log = new Logify('LogifyTestNumeric', { debug: 2 });
			log.warn('warn-visible');
			log.info('info-hidden');

			expect(warnSpy).toHaveBeenCalledTimes(1);
			expect(warnSpy).toHaveBeenCalledWith('LogifyTestNumeric: warn-visible');
			expect(infoSpy).not.toHaveBeenCalled();
		} finally {
			warnSpy.mockRestore();
			infoSpy.mockRestore();
		}
	});

	test('rethrows errors even when log emission is gated off', () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const err = new Error('boom');

		try {
			const log = new Logify('LogifyTestRethrow', { debug: 0, catch: false });
			expect(() => log.error(err)).toThrow('LogifyTestRethrow: boom');
			expect(errorSpy).not.toHaveBeenCalled();
		} finally {
			errorSpy.mockRestore();
		}
	});
});
