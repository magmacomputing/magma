import { Tempo } from '#tempo/core';
import '#tempo/parse';
import '#tempo/format';

describe('Tempo Shorthand Constructor', () => {
	beforeEach(() => {
		Tempo.init();
	});

	it('should support DurationLike objects as shorthand for "now plus duration"', () => {
		const t = new Tempo({ hours: 2 });
		
		// Since we can't easily mock the internal 'instant()' call in the constructor 
		// without deeper integration, we'll verify it's approximately 2 hours from now.
		const now = Temporal.Now.zonedDateTimeISO('UTC');
		const expected = now.add({ hours: 2 });
		
		// Allow for 1 second of drift during test execution
		const diff = t.toDateTime().epochMilliseconds - expected.epochMilliseconds;
		expect(Math.abs(diff)).toBeLessThanOrEqual(1000);
	});

	it('should support negative durations as shorthand for "now minus duration"', () => {
		const t = new Tempo({ days: -1 });
		const now = Temporal.Now.zonedDateTimeISO('UTC');
		const expected = now.subtract({ days: 1 });
		
		const diff = t.toDateTime().epochMilliseconds - expected.epochMilliseconds;
		expect(Math.abs(diff)).toBeLessThanOrEqual(1000);
	});

	it('should still support standard date strings along with shorthand options', () => {
		const t = new Tempo('2024-05-20', { sphere: 'south' });
		expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2024-05-20');
		expect(t.config.sphere).toBe('south');
	});
});
