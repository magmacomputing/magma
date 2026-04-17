import { Tempo } from '#tempo'

describe('Tempo Term Literacy (Namespace Shorthand)', () => {

	describe('.set() shorthand', () => {
		test('set("#period.morning") sets to the start of morning', () => {
			const t = new Tempo('2026-01-01T12:00:00', { sphere: 'north' })
			const res = t.set('#period.morning')
			expect(res.hh).toBe(8)
			expect(res.mi).toBe(0)
		})

		test('set("#zodiac.aries") sets to the start of the current Aries (prev year)', () => {
			const t = new Tempo('2026-01-01T12:00:00', { sphere: 'north' })
			const res = t.set('#zodiac.aries')
			expect(res.yy).toBe(2025)
			expect(res.mm).toBe(3)
			expect(res.dd).toBe(21)
		})

		test('set("#qtr.q3") sets to the start of the current Q3 (prev year)', () => {
			const t = new Tempo('2026-01-01T12:00:00', { sphere: 'north' })
			const res = t.set('#qtr.q3')
			expect(res.yy).toBe(2025)
			expect(res.mm).toBe(7)
			expect(res.dd).toBe(1)
		})

		test('set({ start: "#period.night" }) sets explicitly to start of current night', () => {
			const t = new Tempo('2026-01-01T12:00:00', { sphere: 'north' })
			const res = t.set({ start: '#period.night' })
			// Jan 1 12:00. The current night started at Jan 1 20:00 (since it hasn't happened yet today, it looks back)
			// Wait, the logic for 'current range' should find the range that contains the current time, or the last one if we are between.
			// At 12:00, the last night start was Dec 31 20:00.
			expect(res.hh).toBe(20)
			expect(res.dd).toBe(31)
		})
	})

	describe('.add() shorthand', () => {
		test('add("#qtr.q1") moves to the next Q1', () => {
			const t = new Tempo('2026-06-01', { sphere: 'north' })	// 2 months into Q2 (starts Apr 1)
			const res = t.add('#qtr.q1')						// Should find 2027-01-01 and apply 2mo offset
			expect(res.yy).toBe(2027)
			expect(res.mm).toBe(3)
			expect(res.dd).toBe(3)
		})

		test('add({ "#period.morning": 2 }) moves two mornings ahead', () => {
			const t = new Tempo('2026-01-01T09:00:00', { sphere: 'north' })	// 1 hr into morning (starts 08:00)
			const res = t.add({ '#period.morning': 2 })
			// Jan 2 08:00 + 1hr = Jan 2 09:00
			// Jan 3 08:00 + 1hr = Jan 3 09:00
			expect(res.dd).toBe(3)
			expect(res.hh).toBe(9)
		})

		test('add({ "#zodiac.aries": -1 }) moves one cycle back from current Aries', () => {
			const t = new Tempo('2026-06-01', { sphere: 'north' })
			// 11 days into Gemini (starts May 21)
			// Move -1 Aries from Gemini context hits Aries 2026 (Mar 21)
			// Apply 11 days offset -> April 1st 2026
			const res = t.add({ '#zodiac.aries': -1 })
			expect(res.yy).toBe(2026)
			expect(res.mm).toBe(4)
			expect(res.dd).toBe(1)
		})
	})

	describe('Error handling', () => {
		let errorSpy: any;

		beforeEach(() => {
			errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
		})

		afterEach(() => {
			vi.restoreAllMocks()
		})

		test('invalid term shorthand trips #errored (with catch:true)', () => {
			const t = new Tempo('2026-01-01', { catch: true }).set('#invalid.term')
			expect(t.isValid).toBe(false)
			expect(errorSpy).toHaveBeenCalled()
		})

		test('invalid range in known term trips #errored (with catch:true)', () => {
			const t = new Tempo('2026-01-01', { catch: true }).set('#qtr.q99')
			expect(t.isValid).toBe(false)
			expect(errorSpy).toHaveBeenCalled()
		})
	})

})
