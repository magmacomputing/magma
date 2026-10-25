import { Tempo } from '@magmacomputing/tempo';
import {
	RomanPlugin,
	formatConsuls,
	toAblativeConsulName,
	getConsulsByYear,
	findConsulYears,
	parseClassicalRomanDate,
} from '../src/index.js';

describe('Classical Roman Consular Catalog (Phase 4)', () => {
	beforeAll(() => {
		Tempo.use(RomanPlugin);
	});

	describe('Fasti lookup & formatting', () => {
		test('historical years of Cicero and Caesar', () => {
			// 63 BCE = astronomical -62 (Cicero & Antonius Hybrida)
			const c63 = getConsulsByYear(-62);
			expect(c63).toBeDefined();
			expect(c63).toEqual(['M. Tullius Cicero', 'C. Antonius Hybrida']);

			const f63 = formatConsuls(-62);
			expect(f63).toBe('M. Tullio Cicerone, C. Antonio Hybrida coss.');

			const f63Nom = formatConsuls(-62, 'nominative');
			expect(f63Nom).toBe('M. Tullius Cicero, C. Antonius Hybrida');

			// 44 BCE = astronomical -43 (Caesar V & Mark Antony)
			const c44 = getConsulsByYear(-43);
			expect(c44).toBeDefined();
			expect(c44).toEqual(['C. Julius Caesar V', 'M. Antonius']);

			const f44 = formatConsuls(-43);
			expect(f44).toBe('C. Julio Caesare V, M. Antonio coss.');

			// First year of Republic: 509 BCE = -508
			const c509 = getConsulsByYear(-508);
			expect(c509).toEqual(['L. Junius Brutus', 'L. Tarquinius Collatinus']);
			expect(formatConsuls(-508)).toBe('L. Junio Bruto, L. Tarquinio Collatino coss.');

			// Last recorded ordinary consul in the West: 541 CE
			const c541 = getConsulsByYear(541);
			expect(c541).toEqual(['Anicius Faustus Albinus Basilius']);
			expect(formatConsuls(541)).toBe('Anicio Fausto Albino Basilio cos.');
		});

		test('returns undefined for years outside catalog or without consuls', () => {
			expect(getConsulsByYear(2026)).toBeUndefined();
			expect(formatConsuls(2026)).toBeUndefined();
			// 375 BCE = -374 (Anarchy / no consuls)
			expect(getConsulsByYear(-374)).toBeUndefined();
		});

		test('findConsulYears searches catalog by name', () => {
			const ciceroMatches = findConsulYears('Cicero');
			expect(ciceroMatches.length).toBeGreaterThan(0);
			expect(ciceroMatches.some(m => m.year === -62)).toBe(true);

			// Handles terminal punctuation and coss./cos. suffixes
			const formulaMatches = findConsulYears('Cicerone coss.');
			expect(formulaMatches.length).toBeGreaterThan(0);
			expect(formulaMatches.some(m => m.year === -62)).toBe(true);

			const caesarMatches = findConsulYears('Caesar');
			expect(caesarMatches.length).toBeGreaterThan(3);
		});
	});

	describe('{roman:consul} formatting token & instance getter', () => {
		test('formats {roman:consul} on Tempo instance', () => {
			// 63 BCE
			const tCicero = new Tempo('-000062-03-15');
			expect(tCicero.format('{roman:consul}')).toBe('M. Tullio Cicerone, C. Antonio Hybrida coss.');
			expect(tCicero.format('{roman:consul:nominative}')).toBe('M. Tullius Cicero, C. Antonius Hybrida');
			expect(tCicero.consuls).toBe('M. Tullio Cicerone, C. Antonio Hybrida coss.');

			// 44 BCE (Ides of March assassination)
			const tCaesar = new Tempo('-000043-03-15');
			expect(tCaesar.format('{roman:consul}')).toBe('C. Julio Caesare V, M. Antonio coss.');
			expect(tCaesar.consuls).toBe('C. Julio Caesare V, M. Antonio coss.');

			// Non-consular year returns empty string in format token, undefined in getter
			const tModern = new Tempo('2026-10-16');
			expect(tModern.format('{roman:consul}')).toBe('');
			expect(tModern.consuls).toBeUndefined();
		});
	});

	describe('Tempo.roman namespace methods', () => {
		test('delegates correctly to consular catalog', () => {
			expect(Tempo.roman.getConsuls(-62)).toEqual(['M. Tullius Cicero', 'C. Antonius Hybrida']);
			expect(Tempo.roman.formatConsuls(-62)).toBe('M. Tullio Cicerone, C. Antonio Hybrida coss.');
			expect(Tempo.roman.findConsuls('Collatinus').length).toBe(1);
		});

		test('toAblativeConsulName applies irregular Pulex -> Pulice override and handles 2nd/3rd declension -er names', () => {
			expect(toAblativeConsulName('Q. Terentius Pulex')).toBe('Q. Terentio Pulice');
			expect(toAblativeConsulName('Q. Caecilius Metellus Celer')).toBe('Q. Caecilio Metello Celere');
			expect(toAblativeConsulName('App. Claudius Pulcher')).toBe('App. Claudio Pulchro');
			expect(toAblativeConsulName('P. Petronius Niger')).toBe('P. Petronio Nigro');
			expect(toAblativeConsulName('L. Flavius Aper')).toBe('L. Flavio Apro');
		});
	});

	describe('Consular dating in classical parser', () => {
		test('resolves dates specifying consular pair instead of numeric year', () => {
			// Parse with consular dating formula
			const parsed = parseClassicalRomanDate('Idibus Martiis Cicerone coss.');
			expect(parsed.year).toBe(-62);
			expect(parsed.month).toBe(3);
			expect(parsed.day).toBe(15);
		});
	});

	describe('Subpath import and dynamic registration (@magmacomputing/tempo-plugin-roman/consuls)', () => {
		test('defaults to landmark seed catalog before subpath import', () => {
			// Year 100 CE is not in the landmark seed catalog
			expect(getConsulsByYear(100)).toBeUndefined();
			expect(formatConsuls(100)).toBeUndefined();
		});

		test('subpath import registers full Fasti consulares (509 BCE - 541 CE)', async () => {
			const subpath = await import('../src/consuls.js');
			expect(subpath.FASTI_CONSULARES).toBeDefined();
			expect(Object.keys(subpath.FASTI_CONSULARES).length).toBeGreaterThan(950);

			// Now year 100 CE Trajan is registered and available!
			const c100 = getConsulsByYear(100);
			expect(c100).toBeDefined();
			expect(c100).toEqual([
				'Imp. Caesar Nerva Trajanus Augustus III',
				'Sex. Julius Frontinus III',
			]);
			expect(formatConsuls(100)).toBe(
				'Imp. Caesare Nerva Trajano Augusto III, Sex. Julio Frontino III coss.',
			);

			// Tempo instance formatting now picks up non-landmark years
			const tTrajan = new Tempo('0100-01-01');
			expect(tTrajan.consuls).toBe(
				'Imp. Caesare Nerva Trajano Augusto III, Sex. Julio Frontino III coss.',
			);
		});
	});
});
