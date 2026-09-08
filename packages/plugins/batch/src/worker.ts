import { workerData, parentPort } from 'node:worker_threads';
import { Tempo } from '@magmacomputing/tempo';

function applyMutation(t: any, op: any) {
	if (typeof op === 'string') {
		const match = op.trim().match(/^([+-]?\d+)\s*([a-zA-Z]+)$/);
		if (match) {
			const count = parseInt(match[1], 10);
			const unit = match[2].toLowerCase();
			const unitMap: Record<string, string> = {
				d: 'days', day: 'days', days: 'days',
				w: 'weeks', week: 'weeks', weeks: 'weeks',
				m: 'minutes', min: 'minutes', mins: 'minutes', minute: 'minutes', minutes: 'minutes',
				h: 'hours', hr: 'hours', hrs: 'hours', hour: 'hours', hours: 'hours',
				s: 'seconds', sec: 'seconds', secs: 'seconds', second: 'seconds', seconds: 'seconds',
				mo: 'months', month: 'months', months: 'months',
				y: 'years', yr: 'years', yrs: 'years', year: 'years', years: 'years'
			};
			const mappedUnit = unitMap[unit];
			if (mappedUnit) {
				return t.add({ [mappedUnit]: count });
			}
		}
	}
	return t.add(op);
}

async function run() {
	if (!parentPort) return;

	const { mode, operation } = workerData;

	try {
		if (mode === 'sab') {
			const { inputBuffer, outputBuffer, startIdx, endIdx } = workerData;
			const inputView = new Float64Array(inputBuffer);
			const outputView = new Float64Array(outputBuffer);

			for (let i = startIdx; i < endIdx; i++) {
				const epoch = inputView[i];
				const t = new Tempo(epoch);
				const resultT = applyMutation(t, operation);
				outputView[i] = resultT.epoch.ms;
			}
			parentPort.postMessage({ status: 'done' });

		} else if (mode === 'postMessage') {
			const { chunk } = workerData;
			const result = new Array(chunk.length);

			for (let i = 0; i < chunk.length; i++) {
				const epoch = chunk[i];
				const t = new Tempo(epoch);
				const resultT = applyMutation(t, operation);
				result[i] = resultT.epoch.ms;
			}

			parentPort.postMessage({ status: 'done', result });
		}
	} catch (error: any) {
		parentPort.postMessage({ status: 'error', error: error.message || String(error) });
	}
}

run();
