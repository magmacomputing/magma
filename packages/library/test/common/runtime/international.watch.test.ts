import { describe, it, expect, vi, afterEach } from 'vitest';
import { watchIntl } from '#library/international.library.js';

describe('watchIntl()', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('notifies only when locale or timeZone changes via check() or subscribe()', () => {
		let mockLocale = 'en-US';
		let mockTimeZone = 'UTC';
		const OrigDTF = Intl.DateTimeFormat;
		vi.spyOn(Intl, 'DateTimeFormat').mockImplementation((...args: any[]) => {
			const dtf = new OrigDTF(...args);
			const origResolved = dtf.resolvedOptions.bind(dtf);
			dtf.resolvedOptions = () => ({
				...origResolved(),
				locale: mockLocale,
				timeZone: mockTimeZone,
			});
			return dtf;
		});

		let triggerFn: (() => void) | null = null;
		const unsubSpy = vi.fn();
		const changes: Array<{ next: { locale: string; timeZone: string }; prev: { locale: string; timeZone: string } }> = [];

		using watcher = watchIntl(
			(next, prev) => changes.push({ next, prev }),
			{
				subscribe: (trigger) => {
					triggerFn = trigger;
					return unsubSpy;
				},
			},
		);

		expect(watcher.current).toEqual({ locale: 'en-US', timeZone: 'UTC' });
		expect(watcher.check()).toBe(false);
		expect(changes).toHaveLength(0);

		mockTimeZone = 'Australia/Sydney';
		triggerFn!();
		expect(changes).toEqual([
			{
				next: { locale: 'en-US', timeZone: 'Australia/Sydney' },
				prev: { locale: 'en-US', timeZone: 'UTC' },
			},
		]);

		mockLocale = 'fr-FR';
		expect(watcher.check()).toBe(true);
		expect(watcher.current).toEqual({ locale: 'fr-FR', timeZone: 'Australia/Sydney' });

		watcher.dispose();
		expect(unsubSpy).toHaveBeenCalledTimes(1);
		mockTimeZone = 'Europe/Paris';
		expect(watcher.check()).toBe(false);
	});

	it('supports immediate: true, optional pollIntervalMs, and rejects oversized poll delays', () => {
		vi.useFakeTimers();
		let mockLocale = 'en-US';
		let mockTimeZone = 'UTC';
		const OrigDTF = Intl.DateTimeFormat;
		vi.spyOn(Intl, 'DateTimeFormat').mockImplementation((...args: any[]) => {
			const dtf = new OrigDTF(...args);
			const origResolved = dtf.resolvedOptions.bind(dtf);
			dtf.resolvedOptions = () => ({
				...origResolved(),
				locale: mockLocale,
				timeZone: mockTimeZone,
			});
			return dtf;
		});

		expect(() => watchIntl(() => {}, { pollIntervalMs: 2_147_483_648 })).toThrow(RangeError);

		const seen: string[] = [];
		using watcher = watchIntl(
			(next) => seen.push(`${next.locale}|${next.timeZone}`),
			{ immediate: true, pollIntervalMs: 1_000 },
		);

		expect(seen).toEqual(['en-US|UTC']);
		mockTimeZone = 'Asia/Tokyo';
		vi.advanceTimersByTime(1_000);
		expect(seen).toEqual(['en-US|UTC', 'en-US|Asia/Tokyo']);
		void watcher;
	});

	it('attaches and cleans up browser window, document, and connection listeners when available', () => {
		let mockLocale = 'en-US';
		let mockTimeZone = 'UTC';
		const OrigDTF = Intl.DateTimeFormat;
		vi.spyOn(Intl, 'DateTimeFormat').mockImplementation((...args: any[]) => {
			const dtf = new OrigDTF(...args);
			const origResolved = dtf.resolvedOptions.bind(dtf);
			dtf.resolvedOptions = () => ({
				...origResolved(),
				locale: mockLocale,
				timeZone: mockTimeZone,
			});
			return dtf;
		});

		const winListeners = new Map<string, () => void>();
		const docListeners = new Map<string, () => void>();
		const connListeners = new Map<string, () => void>();
		const docMock: any = {
			visibilityState: 'hidden',
			addEventListener: (ev: string, fn: () => void) => docListeners.set(ev, fn),
			removeEventListener: (ev: string) => docListeners.delete(ev),
		};

		vi.stubGlobal('window', {
			addEventListener: (ev: string, fn: () => void) => winListeners.set(ev, fn),
			removeEventListener: (ev: string) => winListeners.delete(ev),
		});
		vi.stubGlobal('document', docMock);
		vi.stubGlobal('navigator', {
			connection: {
				addEventListener: (ev: string, fn: () => void) => connListeners.set(ev, fn),
				removeEventListener: (ev: string) => connListeners.delete(ev),
			},
		});

		const changes: string[] = [];
		const watcher = watchIntl((next) => changes.push(next.timeZone));

		mockTimeZone = 'Europe/London';
		docListeners.get('visibilitychange')?.(); // hidden -> ignored
		expect(changes).toEqual([]);

		docMock.visibilityState = 'visible';
		docListeners.get('visibilitychange')?.();
		expect(changes).toEqual(['Europe/London']);

		mockTimeZone = 'America/New_York';
		winListeners.get('focus')?.();
		expect(changes).toEqual(['Europe/London', 'America/New_York']);

		mockTimeZone = 'Asia/Seoul';
		connListeners.get('change')?.();
		expect(changes).toEqual(['Europe/London', 'America/New_York', 'Asia/Seoul']);

		watcher.dispose();
		expect(winListeners.size).toBe(0);
		expect(docListeners.size).toBe(0);
		expect(connListeners.size).toBe(0);
	});

	it('rolls back setup when immediate onChange throws and drains all cleanups when one throws', () => {
		const unsub1 = vi.fn();
		const removeWin = vi.fn();
		vi.stubGlobal('window', {
			addEventListener: vi.fn(),
			removeEventListener: removeWin,
		});

		expect(() => watchIntl(() => {
			throw new Error('immediate boom');
		}, {
			immediate: true,
			subscribe: () => unsub1,
		})).toThrow('immediate boom');
		expect(unsub1).toHaveBeenCalledTimes(1);
		expect(removeWin).toHaveBeenCalledTimes(2);

		const removeWin2 = vi.fn();
		vi.stubGlobal('window', {
			addEventListener: vi.fn(),
			removeEventListener: removeWin2,
		});
		const watcher = watchIntl(() => {}, {
			subscribe: () => () => {
				throw new Error('cleanup boom');
			},
		});
		expect(() => watcher.dispose()).toThrow('cleanup boom');
		expect(removeWin2).toHaveBeenCalledTimes(2);
	});
});
