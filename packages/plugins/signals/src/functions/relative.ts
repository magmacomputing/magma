import { Tempo } from '@magmacomputing/tempo';
import {
	Signify,
	isBigInt,
	isFunction,
	isNumber,
	isText,
} from '@magmacomputing/tempo/plugin/sdk';
import { localeSignal } from '../core/config.js';
import { createDisposableSignal } from '../core/disposable.js';
import type { DisposableSignal, RelativeSignalOptions, RelativeSignalTarget } from '../types/index.js';

const RTF_CACHE = new Map<string, Intl.RelativeTimeFormat>();

/** Formats a relative value and unit via a cached `Intl.RelativeTimeFormat`. */
function formatRelative(
	value: number,
	unit: Intl.RelativeTimeFormatUnit,
	locale: string,
	style: Intl.RelativeTimeFormatStyle,
	numeric: Intl.RelativeTimeFormatNumeric,
): string {
	const key = `${locale}|${style}|${numeric}`;
	let rtf = RTF_CACHE.get(key);
	if (!rtf) {
		rtf = new Intl.RelativeTimeFormat(locale, { style, numeric });
		RTF_CACHE.set(key, rtf);
	}
	return rtf.format(value, unit);
}

const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const MS_PER_MONTH = 2_592_000_000;
const MS_PER_YEAR = 31_536_000_000;
const MAX_TIMEOUT_MS = 2_147_483_647;

interface RelativeBucket {
	readonly value: number;
	readonly unit: Intl.RelativeTimeFormatUnit;
	readonly nextDelayMs: number;
}

/** Extracts epoch milliseconds from a supported temporal target. */
function resolveTargetMs(target: RelativeSignalTarget): number {
	if (isNumber(target))
		return target;

	const epochMs = (target as any)?.epoch?.ms;
	if (isNumber(epochMs))
		return epochMs;

	const temporalMs = (target as any)?.epochMilliseconds;
	if (isNumber(temporalMs))
		return temporalMs;

	const epochNs = (target as any)?.epoch?.ns;
	if (isBigInt(epochNs))
		return Number(epochNs / 1_000_000n) + Number(epochNs % 1_000_000n) / 1_000_000;

	const temporalNs = (target as any)?.epochNanoseconds;
	if (isBigInt(temporalNs))
		return Number(temporalNs / 1_000_000n) + Number(temporalNs % 1_000_000n) / 1_000_000;

	if (isBigInt(target))
		return Number(target / 1_000_000n) + Number(target % 1_000_000n) / 1_000_000;

	const instance = new Tempo(target as any);
	if (!instance.isValid)
		throw new TypeError('toRelativeSignal requires a valid temporal target');

	return instance.epoch.ms;
}

/** Computes the current relative-time bucket and exact ms delay until the next transition. */
function computeRelativeBucket(diffMs: number): RelativeBucket {
	const absMs = Math.abs(diffMs);

	let unit: Intl.RelativeTimeFormatUnit;
	let stepMs: number;
	let nextUnitMs: number;

	if (absMs < MS_PER_MINUTE) {
		unit = 'second';
		stepMs = MS_PER_SECOND;
		nextUnitMs = MS_PER_MINUTE;
	} else if (absMs < MS_PER_HOUR) {
		unit = 'minute';
		stepMs = MS_PER_MINUTE;
		nextUnitMs = MS_PER_HOUR;
	} else if (absMs < MS_PER_DAY) {
		unit = 'hour';
		stepMs = MS_PER_HOUR;
		nextUnitMs = MS_PER_DAY;
	} else if (absMs < MS_PER_MONTH) {
		unit = 'day';
		stepMs = MS_PER_DAY;
		nextUnitMs = MS_PER_MONTH;
	} else if (absMs < MS_PER_YEAR) {
		unit = 'month';
		stepMs = MS_PER_MONTH;
		nextUnitMs = MS_PER_YEAR;
	} else {
		unit = 'year';
		stepMs = MS_PER_YEAR;
		nextUnitMs = Infinity;
	}

	const value = Math.trunc(diffMs / stepMs);
	const remainder = absMs % stepMs;

	let nextDelayMs: number;
	if (diffMs <= 0)
		nextDelayMs = Math.min(stepMs - remainder, nextUnitMs - absMs);
	else if (remainder === 0)
		nextDelayMs = 1;
	else
		nextDelayMs = remainder;

	return {
		value,
		unit,
		nextDelayMs: Math.min(Math.max(nextDelayMs, 1), MAX_TIMEOUT_MS),
	};
}

/**
 * Creates an adaptive, self-updating `DisposableSignal<string>` that formats `target`
 * relative to the current time (`"5 minutes ago"`, `"in 2 hours"`, `"just now"`).
 *
 * Schedules one-shot `setTimeout` ticks at exact unit-bucket boundaries rather than
 * polling on a fixed interval, and reacts to global `Tempo.init({ locale })` changes
 * unless an explicit `options.locale` is provided.
 */
export function toRelativeSignal(
	target: RelativeSignalTarget,
	options: RelativeSignalOptions = {},
): DisposableSignal<string> {
	const targetMs = resolveTargetMs(target);
	const nowFn = isFunction(options.now) ? options.now : Date.now;
	const style = options.style ?? 'narrow';
	const numeric = options.numeric ?? 'auto';
	const explicitLocale = isText(options.locale) ? options.locale : undefined;
	const activeLocaleSignal = explicitLocale ? undefined : localeSignal();

	const bucketState = new Signify.State<RelativeBucket>(
		computeRelativeBucket(targetMs - nowFn()),
		{ equals: (a, b) => a.value === b.value && a.unit === b.unit },
	);

	let timer: ReturnType<typeof setTimeout> | null = null;
	let isDisposed = false;

	const scheduleNext = (delayMs: number): void => {
		if (isDisposed)
			return;
		timer = setTimeout(() => {
			timer = null;
			if (isDisposed)
				return;
			const next = computeRelativeBucket(targetMs - nowFn());
			bucketState.set(next);
			scheduleNext(next.nextDelayMs);
		}, delayMs);
	};

	scheduleNext(bucketState.get().nextDelayMs);

	const formatted = new Signify.Computed(() => {
		const { value, unit } = bucketState.get();
		const locale = explicitLocale ?? activeLocaleSignal!.get();
		return formatRelative(value, unit, locale, style, numeric);
	});

	return createDisposableSignal(formatted, () => {
		isDisposed = true;
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
	});
}
