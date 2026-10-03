import { workerData, parentPort } from 'node:worker_threads';
import { Tempo } from '@magmacomputing/tempo';
import { isString } from '@magmacomputing/tempo/plugin/sdk';

const RE_SHORTHAND_OP = /^([+-]?\d+)\s*([a-zA-Z]+)$/;

const UNIT_MAP: Record<string, string> = {
	d: 'days', day: 'days', days: 'days',
	w: 'weeks', week: 'weeks', weeks: 'weeks',
	m: 'minutes', min: 'minutes', mins: 'minutes', minute: 'minutes', minutes: 'minutes',
	h: 'hours', hr: 'hours', hrs: 'hours', hour: 'hours', hours: 'hours',
	s: 'seconds', sec: 'seconds', secs: 'seconds', second: 'seconds', seconds: 'seconds',
	mo: 'months', month: 'months', months: 'months',
	y: 'years', yr: 'years', yrs: 'years', year: 'years', years: 'years'
};

/**
 * Normalizes an operation or shorthand duration string into a Tempo-compatible mutation payload.
 *
 * @param op - Raw mutation value or shorthand duration string
 * @returns The resolved mutation payload
 */
function resolveMutationPayload(op: any): any {
	if (isString(op)) {
		const match = op.trim().match(RE_SHORTHAND_OP);
		if (match) {
			const count = parseInt(match[1], 10);
			const unit = match[2].toLowerCase();
			const mappedUnit = UNIT_MAP[unit];
			if (mappedUnit) {
				return { [mappedUnit]: count };
			}
		}
	}
	return op;
}

/**
 * Applies a duration mutation to a Tempo instance.
 *
 * @param t - Tempo instance to mutate
 * @param op - Pre-resolved mutation payload
 * @returns The mutated Tempo instance
 */
function applyMutation(t: any, op: any) {
	return t.add(op);
}

/**
 * Processes the current worker payload and posts either its result or an error to the parent thread.
 */
async function run() {
	if (!parentPort) return;

	const { mode, operation } = workerData;
	const resolvedOp = resolveMutationPayload(operation);

	try {
		if (mode === 'sab') {
			const { inputBuffer, outputBuffer, startIdx, endIdx } = workerData;
			const inputView = new Float64Array(inputBuffer);
			const outputView = new Float64Array(outputBuffer);

			for (let i = startIdx; i < endIdx; i++) {
				const epoch = inputView[i];
				const t = new Tempo(epoch);
				const resultT = applyMutation(t, resolvedOp);
				outputView[i] = resultT.epoch.ms;
			}
			parentPort.postMessage({ status: 'done' });

		} else if (mode === 'postMessage') {
			const { chunk } = workerData;
			const result = new Array(chunk.length);

			for (let i = 0; i < chunk.length; i++) {
				const epoch = chunk[i];
				const t = new Tempo(epoch);
				const resultT = applyMutation(t, resolvedOp);
				result[i] = resultT.epoch.ms;
			}

			parentPort.postMessage({ status: 'done', result });
		}
	} catch (error: any) {
		parentPort.postMessage({ status: 'error', error: error.message || String(error) });
	}
}

run();
