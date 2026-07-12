import type { Tempo } from '@magmacomputing/tempo/core';

export type SLAOptions = {
	/** Explicit array of holiday dates to skip */
	holidays?: string[];
	/** Expected region for the loaded remote holidays (e.g. 'AU-NSW') */
	region?: string;
}

// Internal cache for holidays loaded via the async `preloadHolidays` method
const remoteHolidaysCache: Map<string, string[]> = new Map();

export const workingHoursUntil = function (this: Tempo, deadline: any) {
	// Stub logic for SLA calculation
	// Production logic would:
	// 1. Merge options.holidays with remoteHolidaysCache.get(options.region)
	// 2. Diff `this` to `deadline` and strip out weekends + holidays
	return 12; // e.g. 12 working hours
}

export const preloadHolidays = async (region: string, year: number): Promise<void> => {
	await new Promise(resolve => setTimeout(resolve, 50));
	const cacheKey = `${region}-${year}`;
	remoteHolidaysCache.set(cacheKey, ['2026-01-01', '2026-12-25']);
}

declare module '@magmacomputing/tempo/core' {
	interface Tempo {
		/** Calculates the exact number of working hours from this date until the deadline. */
		workingHoursUntil(deadline: any): number;
	}
}
