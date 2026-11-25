import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Interval, Tempo } from 'tempo-kit';
import {
	SignalsPlugin,
	createConfigSignals,
	disposeConfigSignals,
	intervalSignal,
	localeSignal,
	timeZoneSignal,
	toRelativeSignal,
} from '../src/index.js';

describe('Tree-Shakeability & Purity (without install.js)', () => {
	afterEach(() => {
		disposeConfigSignals();
	});

	it('does NOT install SignalsPlugin onto Tempo when importing the root entry', () => {
		expect(SignalsPlugin.name).toBe('signals');
		expect((Tempo as any).signals).toBeUndefined();
		expect((Tempo.prototype as any).toRelativeSignal).toBeUndefined();
		expect((Interval.prototype as any).toSignal).toBeUndefined();
	});

	it('declares sideEffects: ["./dist/install.js"] in package.json so root imports remain tree-shakeable', () => {
		const pkgPath = resolve(import.meta.dirname, '../package.json');
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
		expect(pkg.sideEffects).toEqual(['./dist/install.js']);
	});

	it('allows standalone tree-shakeable helpers to work without installing the plugin', () => {
		const cfg = createConfigSignals({ locale: 'en-US', timeZone: 'UTC' });
		expect(typeof cfg.locale.get()).toBe('string');
		expect(typeof cfg.timeZone.get()).toBe('string');
		expect(localeSignal().get()).toBe(cfg.locale.get());
		expect(timeZoneSignal().get()).toBe(cfg.timeZone.get());

		const nowMs = Date.now();
		using rel = toRelativeSignal(nowMs + 10_000, {
			locale: 'en-US',
			now: () => nowMs,
		});
		expect(typeof rel.get()).toBe('string');
		expect(rel.disposed).toBe(false);

		const start = new Tempo(nowMs + 1_000);
		const end = new Tempo(nowMs + 11_000);
		using iv = intervalSignal(new Interval(start, end), {
			now: () => nowMs,
			progressInterval: false,
		});
		expect(iv.isFuture.get()).toBe(true);
		expect(iv.isCurrent.get()).toBe(false);
		expect(iv.isPast.get()).toBe(false);
		expect(iv.progress.get()).toBe(0);
	});
});
