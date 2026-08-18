import { asNumber } from '@magmacomputing/tempo/library';
import { TempoAiError } from './error.js';

/**
 * Concurrently processes an array of items with bounded concurrency and optional soft error normalization.
 *
 * @param items - Array of input items to process
 * @param workerFn - Asynchronous transformation function for each item
 * @param options - Batch options containing softErrors and concurrency limits
 * @returns Array of results or TempoAiErrors
 */
export async function executeBatch<TIn, TOut>(
	items: TIn[],
	workerFn: (item: TIn, index: number) => Promise<TOut>,
	options?: { softErrors?: boolean | undefined; concurrency?: number | undefined } | undefined,
): Promise<(TOut | TempoAiError)[]> {
	if (items.length === 0) return [];
	const softErrors = Boolean(options?.softErrors);
	const customConcurrency = asNumber(options?.concurrency);
	const resolvedConcurrency = customConcurrency ?? (softErrors ? 4 : items.length);
	const concurrencyLimit = Math.max(1, Math.min(16, Math.floor(resolvedConcurrency)));

	if (concurrencyLimit >= items.length && customConcurrency === undefined) {
		if (softErrors) {
			const settled = await Promise.allSettled(items.map((item, idx) => workerFn(item, idx)));
			return settled.map((s, idx) => {
				if (s.status === 'fulfilled') return s.value;
				return s.reason instanceof TempoAiError
					? s.reason
					: new TempoAiError(
						s.reason?.message || `Failed to process item at index ${idx}`,
						asNumber(s.reason?.status, 500),
						undefined,
						{ cause: s.reason },
					);
			});
		}
		return Promise.all(items.map((item, idx) => workerFn(item, idx)));
	}

	const results: (TOut | TempoAiError)[] = new Array(items.length);
	let nextIdx = 0;
	let hasFailed = false;
	let firstError: any = undefined;

	const worker = async () => {
		while (nextIdx < items.length) {
			if (!softErrors && hasFailed) break;
			const currentIndex = nextIdx++;
			const item = items[currentIndex];
			try {
				const res = await workerFn(item, currentIndex);
				results[currentIndex] = res;
			} catch (err: any) {
				if (softErrors) {
					results[currentIndex] = err instanceof TempoAiError
						? err
						: new TempoAiError(
							err?.message || `Failed to process item at index ${currentIndex}`,
							asNumber(err?.status, 500),
							undefined,
							{ cause: err },
						);
				} else {
					if (!hasFailed) {
						hasFailed = true;
						firstError = err;
					}
					break;
				}
			}
		}
	};

	const workers = Array.from({ length: Math.min(concurrencyLimit, items.length) }, () => worker());
	await Promise.all(workers);

	if (!softErrors && hasFailed) throw firstError;
	return results;
}
