import { Tempo } from '#tempo/core';
import { FormatModule } from '#tempo/format';
import { DurationModule } from '#tempo/duration';
import { MutateModule } from '#tempo/mutate';
import { ParseModule } from '#tempo/parse';
import { StandardTerms } from '#tempo/std';
import { TermsModule } from '#tempo';

Tempo.use([ParseModule, FormatModule, MutateModule, DurationModule, TermsModule, StandardTerms]);

describe('Number-Word Pilot (0-10)', () => {
	it('should resolve word-based counts in weekday patterns', () => {
		const base = new Tempo('2024-03-20');									// A Wednesday

		// "one Wednesday ago" -> 2024-03-13
		const res = base.add('one Wednesday ago');
		expect(res.toPlainDate().toString({ calendarName: 'never' })).toBe('2024-03-13');

		// "two Mondays hence" -> 2024-04-01
		expect(base.add('two Mondays hence').toPlainDate().toString({ calendarName: 'never' })).toBe('2024-04-01');

		expect(base.add('zero Tuesdays from now').toPlainDate().toString({ calendarName: 'never' })).toBe('2024-03-19');
	});

	it('should resolve word-based counts in relative unit patterns', () => {
		const base = new Tempo('2024-03-20');

		expect(base.add('three days ago').toPlainDate().toString({ calendarName: 'never' })).toBe('2024-03-17');
		expect(base.add('ten weeks hence').toPlainDate().toString({ calendarName: 'never' })).toBe('2024-05-29');
	});

	it('should be extendable via global discovery', () => {
		Tempo.use({
			registry: {
				numbers: { eleven: 11 }
			}
		});

		const base = new Tempo('2024-03-20');
		expect(base.add('eleven days hence').toPlainDate().toString({ calendarName: 'never' })).toBe('2024-03-31');
	});
});
