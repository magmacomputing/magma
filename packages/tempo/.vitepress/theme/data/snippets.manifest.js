/**
 * Tempo Central Snippets & REPL Presets
 * Single Source of Truth for documentation live REPLs and the playground.
 *
 * @typedef {Object} SnippetPreset
 * @property {string} label - Display label for preset dropdown menus
 * @property {string} code - Executable JavaScript snippet code
 * @property {boolean} [autoRun] - Set false to disable auto-running on keypress (e.g. AI token quota conservation)
 * @property {string} [plugin] - Plugin package this preset demonstrates (omit for core, non-plugin presets)
 */

/** @type {Record<string, SnippetPreset>} */
export const SNIPPETS = {
	// ── 1. Core & Non-Plugin Features (Cookbook & Foundations) ───────────────
	quickstart: {
		label: 'Preset: Quick Start (Core)',
		code: `// ⚡ Quick Start with Tempo
const t = new Tempo('now');

console.log('ISO 8601 String:', t.iso);
console.log('Formatted:', t.format('{wkd}, {mon} {dd:ord}, {yyyy} at {h12}:{mi} [{tz}]'));
console.log('Days until next Friday:', t.until('next Friday').format());

// Return value displays in the top Result card:
return t.format('{yyyy}-{mmm}-{dd}');`,
	},

	weekend: {
		label: 'Preset: Weekend Check (Cookbook)',
		code: `// 🗓️ Weekend Checking (from Tempo Cookbook)
const today = new Tempo();
console.log('Today:', today.format('{www}, {dd} {mon}'));
console.log('ISO Day of Week (1..7):', today.dow);

// 1. Simple ISO check (Sat = 6, Sun = 7)
const isIsoWeekend = today.dow >= 6;
console.log('Is ISO Weekend?', isIsoWeekend);

// 2. Locale-Aware check using t.intl.weekend
const us = new Tempo({ locale: 'en-US' });
const sa = new Tempo({ locale: 'ar-SA' });

console.log('en-US Weekend Days:', JSON.stringify(us.intl.weekend)); // [6, 7] (Saturday, Sunday)
console.log('ar-SA Weekend Days:', JSON.stringify(sa.intl.weekend)); // [5, 6] (Friday, Saturday)

return \`Today is \${today.format('{www}')}. Weekend in US? \${us.intl.weekend.includes(today.dow)}\`;`,
	},

	quarters: {
		label: 'Preset: Fiscal Quarters & Math (Core)',
		code: `// 💼 Fiscal Quarters and Tempo Math
const t = new Tempo('2026-02-15', { sphere: 'north' });

console.log('Quarter Key:', t.term.qtr); // "Q1"
console.log('Quarter Label:', t.term.quarter.label); // "First Quarter"
console.log('Quarter Start:', t.term.quarter.start.format('{yyyy}-{mm}-{dd}'));
console.log('Quarter End:', t.term.quarter.end.format('{yyyy}-{mm}-{dd}'));

// Chainable Semantic Term Mutation:
const nextQtr = t.add({ '#quarter': 1 });
console.log('Next Quarter (Key):', nextQtr.term.qtr); // "Q2"
console.log('Next Quarter (Label):', nextQtr.term.quarter.label); // "Second Quarter"

return nextQtr.format('Next quarter: {#quarter}');`,
	},

	seasons: {
		label: 'Preset: Seasons & Lunar Phases (Celestial)',
		plugin: 'celestial',
		code: `// 🌍 Hemispheric Seasons & Lunar Phases
// Tempo terms are hemisphere-aware based on geo coordinates or sphere setting:
const sydney = new Tempo('2026-07-01', { sphere: 'south' });
const london = new Tempo('2026-07-01', { sphere: 'north' });

console.log('Sydney in July:', sydney.term.szn); // "Winter"
console.log('London in July:', london.term.szn); // "Summer"

// Celestial Plugin (Lunar Phase):
const now = new Tempo();
console.log('Moon Phase:', now.term.lunar.phase, now.term.lunar.emoji);
console.log('Illumination:', (now.term.lunar.illumination * 100).toFixed(1) + '%');

return \`Current Lunar Phase: \${now.term.lunar.phase}\`;`,
	},

	// ── 2. Official Plugins & Ecosystem Extensions ───────────────────────────
	spatial: {
		label: 'Preset: Spatial & Navigation (GIS, Haversine, Transit)',
		plugin: 'spatial',
		code: `// 🧭 Great-Circle Navigation & Spatial Geofencing (@magmacomputing/tempo-plugin-spatial)
const { SpatialPlugin } = await import('@magmacomputing/tempo-plugin-spatial');
Tempo.use(SpatialPlugin);

const sydney = { lat: -33.8688, lng: 151.2093 };
const london = { lat: 51.5074, lng: -0.1278 };

// 1. Haversine Distance & Initial Bearing
const distKm = Tempo.spatial.distance(sydney, london, 'km');
const heading = Tempo.spatial.bearing(sydney, london);
console.log('Distance Sydney -> London:', distKm.toFixed(1), 'km');
console.log('Compass Heading:', heading.toFixed(1) + '°');

// 2. Geographic Midpoint
const mid = Tempo.spatial.midpoint(sydney, london);
console.log('Great-Circle Midpoint:', \`\${mid.latitude.toFixed(2)}°, \${mid.longitude.toFixed(2)}° (\${mid.sphere})\`);

// 3. Impossible Travel Anomaly Detection
const loginSydney = new Tempo('2026-03-31T08:00:00Z', { geo: sydney });
const loginLondon = new Tempo('2026-03-31T09:30:00Z', { geo: london }); // 1.5h later
const speed = loginSydney.spatialVelocity(loginLondon);
const isAnomaly = Tempo.spatial.isImpossibleTravel(loginSydney, loginLondon);

console.log('Transit Velocity:', speed.toFixed(1), 'km/h');
console.log('Impossible Travel Alert?', isAnomaly);

return \`Sydney -> London: \${distKm.toFixed(0)} km (Midpoint: \${mid.latitude.toFixed(1)}°, \${mid.longitude.toFixed(1)}°)\`;`,
	},

	geo: {
		label: 'Preset: Live Geolocation & Providers (Geo)',
		plugin: 'geo',
		code: `// 🌍 Live Geolocation & Pluggable Providers (@magmacomputing/tempo-plugin-geo)
// Note: In browser sandbox, resolves browser GPS or IP-based coordinates

const lookup = await Tempo.geo.lookup({ reverse: true });
console.log('Detected City:', lookup.city ?? 'Local City', ',', lookup.country ?? 'Local Country');
console.log('Coordinates:', lookup.lat, lookup.lng);

// Attach coordinates to a Tempo instance:
const localTime = new Tempo('now', { geo: lookup });
console.log('Astronomical Season:', localTime.term.szn);
console.log('Moon Phase:', localTime.term.lunar.phase, localTime.term.lunar.emoji);

// Reverse Geocoding to place details:
const place = await Tempo.geo.reverse({ lat: -33.8688, lng: 151.2093 });
console.log('Reverse Geocoded Place:', place.city, place.country);

return \`Located at \${lookup.city ?? 'Local City'} (\${lookup.lat?.toFixed(2)}°, \${lookup.lng?.toFixed(2)}°)\`;`,
	},

	holidays: {
		label: 'Preset: Regional Public Holidays & SLA Business Days',
		plugin: 'holidays',
		code: `// 🏖️ Regional Public Holidays & SLA Business Days (@magmacomputing/tempo-plugin-holidays)
const { HolidaysPlugin } = await import('@magmacomputing/tempo-plugin-holidays');
Tempo.use(HolidaysPlugin);

// 1. Evaluate holiday by country or instance geo metadata
const christmas = new Tempo('2026-12-25', { geo: { country: 'US' } });
console.log('Is Christmas Day holiday in US?', christmas.holidays.isHoliday());
console.log('Holiday Name:', christmas.holidays.name);
console.log('Is Business Day?', christmas.holidays.isBusinessDay());

// 2. Next & previous business day arithmetic
const nextWorkDay = christmas.holidays.nextBusinessDay();
console.log('Next Business Day after Christmas:', nextWorkDay.format('{www}, {dd} {mon} {yyyy}'));

// 3. Add N working business days
const deadline = christmas.holidays.addBusinessDays(5);
console.log('5 Business Days later:', deadline.format('{www}, {dd} {mon} {yyyy}'));

// 4. SLA Working Hours calculation
const ticketOpened = new Tempo('2026-01-23 15:00:00', { geo: { country: 'AU' } });
const ticketResolved = new Tempo('2026-01-27 11:00:00', { geo: { country: 'AU' } });
const hours = ticketOpened.holidays.workingHoursUntil(ticketResolved);
console.log('SLA Working Hours (9am-5pm window):', hours, 'hours');

return \`Christmas: \${christmas.holidays.name} (Next work day: \${nextWorkDay.format('{www}, {dd} {mon}')})\`;`,
	},

	dialects: {
		label: 'Preset: Dialects (Luxon, strftime, Moment)',
		plugin: 'dialects',
		code: `// 🌐 External Dialect Formatting & Parsing
// Dynamic import of @magmacomputing/tempo-plugin-dialects
const { DialectsPlugin, DIALECT } = await import('@magmacomputing/tempo-plugin-dialects');
Tempo.use(DialectsPlugin);

const t = new Tempo('2026-10-24T15:30:45');

// 1. Luxon-style toFormat & LDML
console.log('Luxon drop-in .toFormat():', t.toFormat('dd LLL yyyy, HH:mm'));
console.log('Dialect namespace LDML:', t.dialects.ldml('yyyy/MM/dd HH:mm'));

// 2. POSIX strftime
console.log('strftime .strftime():', t.dialects.strftime('%Y-%m-%d %H:%M:%S'));
console.log('strftime auto-detect:', t.format('%A, %B %d %Y (%I:%M %p)', { dialect: DIALECT.Strftime }));

// 3. Flexible Multi-Candidate Parsing via Tempo.fromFormats()
const parsed = Tempo.fromFormats('24/10/2026 15:30', [
	'yyyy-MM-dd HH:mm',
	'dd/MM/yyyy HH:mm',
	'MM/dd/yyyy HH:mm',
]);
console.log('Parsed ISO (multi-candidate):', parsed.iso);

return t.toFormat('dd LLL yyyy (HH:mm:ss)');`,
	},

	celestial: {
		label: 'Preset: Celestial Solar & Lunar Ephemeris',
		plugin: 'celestial',
		code: `// 🌙 Celestial Solar & Lunar Ephemeris Demo (@magmacomputing/tempo-plugin-celestial)
const now = new Tempo();
console.log('Moon Phase:', now.term.lunar.phase);
console.log('Illumination:', (now.term.lunar.illumination * 100).toFixed(1) + '%');
console.log('Is King Tide?', now.term.tides.isKingTide);

return \`Phase: \${now.term.lunar.phase} (\${(now.term.lunar.illumination * 100).toFixed(0)}% illuminated)\`;`,
	},

	astro: {
		label: 'Preset: Astronomical Seasons & Solstices',
		plugin: 'celestial',
		code: `// ☀️ Astronomical Seasons & Solstices Demo (@magmacomputing/tempo-plugin-celestial)
const sydney = new Tempo('2026-07-01', { sphere: 'south' });
const london = new Tempo('2026-07-01', { sphere: 'north' });

console.log('Sydney in July:', sydney.term.astro, '-> Season:', sydney.term.szn);
console.log('London in July:', london.term.astro, '-> Season:', london.term.szn);

const equinox = new Tempo('2026-03-20', { sphere: 'north' });
console.log('March 20 Equinox:', equinox.term.equinox);

return \`Sydney: \${sydney.term.szn} | London: \${london.term.szn}\`;`,
	},

	finance: {
		label: 'Preset: Fiscal & Financial Math',
		plugin: 'finance',
		code: `// 💼 Fiscal & Financial Math Demo (@magmacomputing/tempo-plugin-finance)
const { FinanceNamespace } = await import('@magmacomputing/tempo-plugin-finance');
Tempo.use(FinanceNamespace);

const t = new Tempo('2026-07-15');
console.log('Fiscal Quarter:', t.finance.fiscalQuarter);
console.log('Tax Year:', t.finance.taxYear);
console.log('Is Fiscal Year Start?', t.finance.isFiscalYearStart());

return \`Fiscal Q\${t.finance.fiscalQuarter} (Tax Year \${t.finance.taxYear})\`;`,
	},

	snap: {
		label: 'Preset: Time Snapping & Quantization',
		plugin: 'snap',
		code: `// ⏱️ Time Snapping & Quantization Demo (@magmacomputing/tempo-plugin-snap)
const { SnapPlugin } = await import('@magmacomputing/tempo-plugin-snap');
Tempo.use(SnapPlugin);

const t = new Tempo('2026-06-01T14:08:23Z');
console.log('Original time:', t.format('{hh}:{mi}:{ss}'));

// Snap to nearest 15-minute block
const snapped15m = t.snap();
console.log('Snapped (15m):', snapped15m.format('{hh}:{mi}:{ss}'));

// Snap to 1-hour interval upward
const snapHourUp = t.snap({ hh: 1, direction: 'up' });
console.log('Snapped Up (1h):', snapHourUp.format('{hh}:{mi}:{ss}'));

return \`Snapped to \${snapped15m.format('{hh}:{mi}')}\`;`,
	},

	batch: {
		label: 'Preset: Parallel Bulk Mutation',
		plugin: 'batch',
		code: `// ⚡ Parallel Bulk Mutation Demo (@magmacomputing/tempo-plugin-batch)
// Note: @magmacomputing/tempo-plugin-batch uses Node.js worker_threads for multi-threaded processing.
const timestamps = [1700000000000, 1700086400000, 1700172800000];
console.log('Original timestamps count:', timestamps.length);

let mutated;
const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);

if (isNode) {
  const { BatchPlugin } = await import('@magmacomputing/tempo-plugin-batch');
  Tempo.use(BatchPlugin);
  mutated = await Tempo.batch(timestamps, '+1w');
} else {
  console.info('Running browser fallback (BatchPlugin worker_threads requires Node.js).');
  mutated = timestamps.map(ts => new Tempo(ts).add({ weeks: 1 }).epoch.ms);
}

console.log('Mutated +1 week timestamps:', mutated);
return \`Batch processed \${mutated.length} timestamps successfully!\`;`,
	},

	sync: {
		label: 'Preset: Cross-Thread Time Sync',
		plugin: 'sync',
		code: `// 🔄 Cross-Thread Time Sync Demo (@magmacomputing/tempo-plugin-sync)
const { SyncPlugin } = await import('@magmacomputing/tempo-plugin-sync');
Tempo.use(SyncPlugin);

// SharedArrayBuffer requires Cross-Origin Isolation (COOP/COEP) in browsers:
// Cross-Origin-Opener-Policy: same-origin
// Cross-Origin-Embedder-Policy: require-corp
if (typeof SharedArrayBuffer === 'undefined') {
  console.warn('SharedArrayBuffer is unavailable in this environment.');
  console.info('To enable in browsers, serve with COOP/COEP cross-origin isolation headers.');
  return 'SharedArrayBuffer unavailable (requires cross-origin isolation or Node.js)';
}

Tempo.sync.startClock({ interval: 1 });
try {
  const buffer = Tempo.sync.getBuffer();
  console.log('Clock buffer byte length:', buffer.byteLength);

  const nowMs = Tempo.sync.now(buffer);
  console.log('High-precision current epoch ms:', nowMs);

  return \`Sync read successful (Epoch: \${nowMs})\`;
} finally {
  Tempo.sync.stopClock();
}`,
	},

	ntp: {
		label: 'Preset: Network Time Sync & Drift (NTP)',
		plugin: 'ntp',
		code: `// 🌐 Network Time Sync & Drift Calibration (@magmacomputing/tempo-plugin-ntp)
const { NtpPlugin } = await import('@magmacomputing/tempo-plugin-ntp');
Tempo.use(NtpPlugin);

console.log('Calibrating clock with remote time source...');
const sample = await Tempo.ntp.sync('https://worldtimeapi.org/api/timezone/Etc/UTC');

console.log('Sync Result: Offset', sample.offsetMs, 'ms (Uncertainty: ±' + sample.uncertaintyMs + 'ms, Samples: ' + sample.sampleCount + ')');
console.log('Calibrated Tempo:', Tempo.ntp.now().format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}.{ms}'));

return \`Calibrated! Offset: \${Tempo.ntp.offset}ms | Local: \${new Tempo().format('{hh}:{mi}:{ss}.{ms}')} vs NTP: \${Tempo.ntp.now().format('{hh}:{mi}:{ss}.{ms}')}\`;`,
	},

	ticker: {
		label: 'Preset: Continuous Temporal Ticker',
		plugin: 'ticker',
		code: `// ⏰ Continuous Temporal Ticker Demo (@magmacomputing/tempo-plugin-ticker)
const { TickerPlugin } = await import('@magmacomputing/tempo-plugin-ticker');
Tempo.use(TickerPlugin);

console.log('Starting 1-second cadence ticker...');
let count = 0;
const ticker = Tempo.ticker({ seconds: 1 }, (t, stop) => {
  count++;
  console.log(\`Tick #\${count}:\`, t.format('{hh}:{mi}:{ss}'));
  if (count >= 3) {
    console.log('Ticker stopped after 3 ticks.');
    stop();
  }
});

return 'Ticker started (executes in console stream)';`,
	},

	dynamic: {
		label: 'Preset: Dynamic Plugin (ESM import)',
		plugin: 'ticker',
		code: `// 📦 Dynamic Plugin Loading via native ESM
console.log('Dynamically importing @magmacomputing/tempo-plugin-ticker...');
const { TickerPlugin } = await import('@magmacomputing/tempo-plugin-ticker');

// Register the dynamically imported plugin
Tempo.use(TickerPlugin);

console.log('TickerPlugin loaded and active!');
return 'Dynamic import successful!';`,
	},

	ai: {
		label: 'Preset: AI Semantic Parsing & Scheduling',
		plugin: 'ai',
		autoRun: false,
		code: `// 🤖 AI Semantic Parsing & Scheduling (@magmacomputing/tempo-plugin-ai)
const { AiPlugin } = await import('@magmacomputing/tempo-plugin-ai');
Tempo.use(AiPlugin);

// 1. Configure provider (Trial 'tempo' sandbox or BYOK: 'gemini', 'openai', 'groq')
await Tempo.ai.init({ provider: 'tempo', debug: true });

// 2. Parse complex cultural/relative calendar expression
// Note: { force: true } bypasses cached entries for live LLM reasoning
const t = await Tempo.ai.parse("The Friday before Melbourne Cup next year", { force: true });

console.log('📅 Parsed:   ', t.format('{www}, {yyyy}-{mmm}-{dd}'));
console.log('🧠 Reasoning:', t.ai?.reasoning);
console.log('🎯 Provider: ', t.ai?.provider, \`(confidence: \${t.ai?.confidence})\`);

if (t.ai?.limits?.remainingRequests !== undefined) {
  const resetStr = t.ai.limits.resetAt ? t.ai.limits.resetAt.format('{hh}:{mi}:{ss}') : 'in 1h';
  console.log('⏱️ Quota:    ', \`\${t.ai.limits.remainingRequests} req remaining (resets at \${resetStr})\`);
}

return t.iso;`,
	},
};

export default SNIPPETS;
