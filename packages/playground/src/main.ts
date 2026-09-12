import './polyfill';
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';
import { AstroPlugin } from '@magmacomputing/tempo-plugin-astro';
import { CelestialPlugin } from '@magmacomputing/tempo-plugin-celestial';

// 1. Initialize Tempo with custom event aliases (enables "Easter", "Black Friday", etc.)
Tempo.init({
  registry: {
    events: {
      easter: '2026-04-05',
      'black friday': '2026-11-27',
      eofy: '30 Jun',
    },
  },
});

// 2. Register plugins after Tempo.init() (the .geo check ensures idempotence across Vite HMR reloads)
if (!(Tempo as any).geo) Tempo.use(GeoPlugin);
Tempo.use(AstroPlugin);
Tempo.use(CelestialPlugin);

// Expose on window for interactive browser debugging
(window as any).Tempo = Tempo;

// App State
type AppMode = 'core' | 'plugins';
let activeMode: AppMode = 'core';

let mutationDays = 0;
let mutationMonths = 0;
let snapMode: 'none' | 'start-week' | 'end-month' = 'none';

interface GeoPreset {
  id: string;
  name: string;
  flag: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  timezone: string;
  sphere: 'north' | 'south';
}

const CITY_PRESETS: GeoPreset[] = [
  { id: 'syd', name: 'Sydney', flag: '🇦🇺', lat: -33.8688, lng: 151.2093, city: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', sphere: 'south' },
  { id: 'tok', name: 'Tokyo', flag: '🇯🇵', lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', sphere: 'north' },
  { id: 'lon', name: 'London', flag: '🇬🇧', lat: 51.5074, lng: -0.1278, city: 'London', country: 'United Kingdom', timezone: 'Europe/London', sphere: 'north' },
  { id: 'nyc', name: 'New York', flag: '🇺🇸', lat: 40.7128, lng: -74.0060, city: 'New York', country: 'United States', timezone: 'America/New_York', sphere: 'north' },
  { id: 'rey', name: 'Reykjavik', flag: '🇮🇸', lat: 64.1466, lng: -21.9426, city: 'Reykjavik', country: 'Iceland', timezone: 'Atlantic/Reykjavik', sphere: 'north' },
  { id: 'scl', name: 'Santiago', flag: '🇨🇱', lat: -33.4489, lng: -70.6693, city: 'Santiago', country: 'Chile', timezone: 'America/Santiago', sphere: 'south' },
];

let activeGeo: GeoPreset = CITY_PRESETS[0]; // default to Sydney (high-contrast southern hemisphere)
let selectedTermProp = 't.term.lunar.phase';

const TOKENS = [
  '{yyyy}',
  '{yy}',
  '{mon}',
  '{mmm}',
  '{mm}',
  '{dd}',
  '{dd:ord}',
  '{wkd}',
  '{www}',
  '{dow}',
  '{hh}',
  '{mi}',
  '{ss}',
  '{tz}',
  '{tz:offset}',
  '{mon:upper}',
];

const PRESET_FORMATS: Record<string, string> = {
  Friendly: '{wkd}, {dd} {mon} {yyyy} at {hh}:{mi}',
  'Ordinal Human': '{wkd}, {mon} {dd:ord}, {yyyy}',
  'ISO Date': '{yyyy}-{mm}-{dd}',
  'EU Standard': '{dd}/{mm}/{yyyy}',
  'US Standard': '{mm}/{dd}/{yyyy}',
  Timestamp: '{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss} {tz}',
};

interface TermPropertyDefinition {
  prop: string;
  category: 'astro' | 'solar' | 'lunar' | 'tides';
  label: string;
  description: string;
}

const TERM_PROPERTIES: TermPropertyDefinition[] = [
  // AstroTerm
  { prop: 't.term.astro', category: 'astro', label: 'astro', description: 'Astronomical Solstice / Equinox event key ("Vernal", "Summer", "Autumnal", "Winter")' },
  { prop: 't.term.astronomy.season', category: 'astro', label: 'astronomy.season', description: 'Hemisphere-aware Astronomical Season ("Spring", "Summer", "Autumn", "Winter")' },
  { prop: 't.term.astronomy.event', category: 'astro', label: 'astronomy.event', description: 'Astronomical Event category ("Equinox" vs "Solstice")' },
  { prop: 't.term.equinox', category: 'astro', label: 'equinox', description: 'Nearest Astronomical Equinox event ("Vernal" or "Autumnal")' },
  { prop: 't.term.solstice', category: 'astro', label: 'solstice', description: 'Nearest Astronomical Solstice event ("Summer" or "Winter")' },

  // SolarTerm
  { prop: 't.term.sun', category: 'solar', label: 'sun', description: 'Current Solar Twilight state ("daylight", "civil-twilight", "nautical-twilight", "night")' },
  { prop: 't.term.solar.phase', category: 'solar', label: 'solar.phase', description: 'Capitalized Solar Phase Name (e.g. "Daylight", "Civil Twilight", "Night")' },
  { prop: 't.term.solar.sunrise', category: 'solar', label: 'solar.sunrise', description: 'Tempo instance for local civil sunrise at coordinates' },
  { prop: 't.term.solar.sunset', category: 'solar', label: 'solar.sunset', description: 'Tempo instance for local civil sunset at coordinates' },
  { prop: 't.term.solar.noon', category: 'solar', label: 'solar.noon', description: 'Tempo instance for true solar noon at coordinates' },
  { prop: 't.term.solar.daylightDurationMs', category: 'solar', label: 'solar.daylightDurationMs', description: 'Total daylight length in milliseconds for current date' },

  // LunarTerm
  { prop: 't.term.moon', category: 'lunar', label: 'moon', description: 'Canonical Lunar Phase key ("new-moon", "waxing-crescent", "full-moon", etc.)' },
  { prop: 't.term.lunar.phase', category: 'lunar', label: 'lunar.phase', description: 'Human-readable Lunar Phase name (e.g. "Full Moon", "Waxing Crescent")' },
  { prop: 't.term.lunar.emoji', category: 'lunar', label: 'lunar.emoji', description: 'Hemisphere-accurate moon phase emoji indicator (🌑, 🌒, 🌓, 🌔, 🌕, 🌖, 🌗, 🌘)' },
  { prop: 't.term.lunar.illumination', category: 'lunar', label: 'lunar.illumination', description: 'Fraction of lunar disk illuminated (0.00 to 1.00)' },
  { prop: 't.term.lunar.ageDays', category: 'lunar', label: 'lunar.ageDays', description: 'Current age of lunar cycle in elapsed days (0.0 to 29.5)' },
  { prop: 't.term.lunar.moonrise', category: 'lunar', label: 'lunar.moonrise', description: 'Tempo instance for local moonrise at coordinates' },

  // TidalTerm
  { prop: 't.term.tide', category: 'tides', label: 'tide', description: 'Pure deterministic tidal state ("spring", "neap", or "normal")' },
  { prop: 't.term.tides.alignmentDeg', category: 'tides', label: 'tides.alignmentDeg', description: 'Solar-Lunar ecliptic longitude alignment angle (0° to 360°)' },
  { prop: 't.term.tides.isSpringTide', category: 'tides', label: 'tides.isSpringTide', description: 'True during Syzygy (Solar-Lunar alignment at New Moon or Full Moon)' },
  { prop: 't.term.tides.isNeapTide', category: 'tides', label: 'tides.isNeapTide', description: 'True during Quadrature (1st or 3rd Quarter moons)' },
  { prop: 't.term.tides.isKingTide', category: 'tides', label: 'tides.isKingTide', description: 'True when Spring Tide coincides with Lunar Perigee proximity' },
];

// Helper to evaluate property expression safely
function evaluateProperty(t: any, path: string): { val: any; type: string; codeDisplay: string } {
  try {
    const clean = path.replace(/^t\./, '');
    const parts = clean.split('.');
    let curr = t;
    for (const part of parts) {
      if (curr == null) return { val: 'null', type: 'null', codeDisplay: 'null' };
      curr = curr[part];
    }
    if (curr === undefined) return { val: 'undefined', type: 'undefined', codeDisplay: 'undefined' };
    if (curr === null) return { val: 'null', type: 'null', codeDisplay: 'null' };
    if (typeof curr === 'object' && typeof curr.format === 'function') {
      const formatted = curr.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss} {tz}');
      return { val: formatted, type: 'Tempo', codeDisplay: `Tempo("${curr.iso}") /* ${formatted} */` };
    }
    if (typeof curr === 'number') {
      const formattedNum = Number.isInteger(curr) ? String(curr) : curr.toFixed(2);
      return { val: formattedNum, type: 'number', codeDisplay: String(curr) };
    }
    if (typeof curr === 'boolean') {
      return { val: curr ? 'true' : 'false', type: 'boolean', codeDisplay: String(curr) };
    }
    return { val: String(curr), type: typeof curr, codeDisplay: JSON.stringify(curr) };
  } catch (err: any) {
    return { val: `Error: ${err.message}`, type: 'error', codeDisplay: `/* Error: ${err.message} */` };
  }
}

// 3. Render UI Shell
function initUI() {
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  document.getElementById('app')!.innerHTML = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 920px; margin: 24px auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
      
      <!-- TOP BAR WITH LOGO, MODE SWITCHER & BADGES -->
      <div style="border-bottom: 1px solid #334155; padding-bottom: 18px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
        
        <!-- Logo & Title -->
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="/tempo-logo-cyan.svg" alt="Tempo Logo" style="width: 44px; height: 44px; filter: drop-shadow(0 0 8px rgba(56,189,248,0.35));" />
          <div>
            <h1 style="margin: 0; font-size: 1.45rem; font-weight: 800; color: #38bdf8; letter-spacing: -0.02em;">
              Tempo Interactive Workbench
            </h1>
            <p style="margin: 2px 0 0; color: #94a3b8; font-size: 0.82rem;">
              The Professional Date-Time Library for the Temporal API
            </p>
          </div>
        </div>

        <!-- Right Side: Top-Line Mode Switcher + Badges -->
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          
          <!-- Mode Switcher Tabs -->
          <div class="mode-tab-group" id="mode-switcher">
            <button id="btn-mode-core" class="mode-tab ${activeMode === 'core' ? 'active' : ''}">
              <span style="font-size: 0.85rem;">⚡</span>
              <span>Core Engine</span>
            </button>
            <button id="btn-mode-plugins" class="mode-tab ${activeMode === 'plugins' ? 'active' : ''}">
              <span style="font-size: 0.85rem;">🔌</span>
              <span>Plugins & Terms</span>
            </button>
          </div>

          <!-- Version & Status Badges -->
          <span style="background: #1e293b; border: 1px solid #334155; color: #38bdf8; font-size: 0.75rem; padding: 4px 10px; border-radius: 999px; font-weight: 600;">v4.2.0</span>
          <span id="badge-tz" style="background: #1e293b; border: 1px solid #334155; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; color: #4ade80; font-family: monospace;">● Ready (${localTz})</span>
        </div>
      </div>

      <!-- SECTION 1: ANCHOR DATE (PERSISTENT ACROSS BOTH MODES) -->
      <div style="background: #1e293b; padding: 16px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #334155;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #38bdf8;">
              1. Anchor Date / Expression
            </label>
            <span id="label-mode-indicator" style="font-size: 0.7rem; background: #0f172a; padding: 2px 8px; border-radius: 999px; color: ${activeMode === 'core' ? '#38bdf8' : '#c084fc'}; border: 1px solid ${activeMode === 'core' ? '#38bdf840' : '#c084fc40'};">
              ${activeMode === 'core' ? '⚡ Core Mode Active' : '🔌 Plugins Mode Active'}
            </span>
          </div>
          <span id="badge-iso" style="font-size: 0.75rem; color: #94a3b8; font-family: monospace;"></span>
        </div>

        <input id="input-base" type="text" value="next Friday at 3pm" placeholder="e.g. 'tomorrow 9am', 'Christmas', 'Easter', '2026-10-15'" style="width: 100%; padding: 10px 14px; border-radius: 8px; background: #0f172a; color: white; border: 1px solid #475569; font-size: 1rem; box-sizing: border-box; outline: none;">
        <div id="error-base" style="color: #f87171; font-size: 0.8rem; margin-top: 6px; display: none;"></div>
        
        <div style="margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
          <span style="font-size: 0.75rem; color: #64748b;">Try:</span>
          ${[
            'now',
            'tomorrow at 9am',
            'next Friday at 3pm',
            'Christmas',
            'Easter',
            'in 3 days',
            'afternoon',
          ]
            .map(
              (p) => `
            <button class="btn-preset-base" data-val="${p}" style="background: #0f172a; border: 1px solid #334155; color: #cbd5e1; font-size: 0.75rem; padding: 3px 8px; border-radius: 6px; cursor: pointer;">${p}</button>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- CORE ENGINE CONTAINER: SECTIONS 2, 3, 4 -->
      <!-- ========================================================================= -->
      <div id="container-core-sections" style="display: ${activeMode === 'core' ? 'block' : 'none'};">
        
        <!-- SECTION 2: LIVE FORMAT STRING TESTER -->
        <div style="background: #1e293b; padding: 18px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #38bdf8;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #38bdf8;">
              2. Live Format String Tester
            </label>
            <span style="font-size: 0.75rem; color: #fde68a;">Instant Keystroke Evaluation</span>
          </div>

          <input id="input-format" type="text" value="{wkd}, {dd} {mon} {yyyy} at {hh}:{mi}" placeholder="Type tokens e.g. {yyyy}-{mm}-{dd}" style="width: 100%; padding: 12px 14px; border-radius: 8px; background: #0f172a; color: #38bdf8; border: 1px solid #475569; font-size: 1.1rem; font-family: monospace; box-sizing: border-box; outline: none;">
          
          <!-- Live Formatted Output Banner -->
          <div style="margin-top: 12px; padding: 14px 18px; background: #0f172a; border-radius: 8px; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Formatted Output:</span>
            <span id="output-formatted" style="font-size: 1.25rem; font-weight: 700; color: #4ade80; font-family: system-ui;"></span>
          </div>

          <!-- Clickable Token Chips -->
          <div style="margin-top: 12px;">
            <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 6px;">Click to append token:</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${TOKENS.map(
                (tok) => `
                <button class="btn-token" data-token="${tok}" style="background: #0f172a; border: 1px solid #334155; color: #38bdf8; font-family: monospace; font-size: 0.75rem; padding: 3px 8px; border-radius: 6px; cursor: pointer;">
                  + ${tok}
                </button>
              `
              ).join('')}
            </div>
          </div>

          <!-- Presets -->
          <div style="margin-top: 12px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
            <span style="font-size: 0.75rem; color: #64748b;">Presets:</span>
            ${Object.entries(PRESET_FORMATS)
              .map(
                ([name, tmpl]) => `
              <button class="btn-preset-format" data-tmpl="${tmpl}" style="background: #334155; border: none; color: #e2e8f0; font-size: 0.75rem; padding: 3px 8px; border-radius: 4px; cursor: pointer;">
                ${name}
              </button>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- TWO COLUMNS: MUTATIONS & DURATIONS -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          
          <!-- SECTION 3: MUTATION BENCH -->
          <div style="background: #1e293b; padding: 16px; border-radius: 12px; border: 1px solid #334155;">
            <label style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #a855f7; margin-bottom: 10px;">
              3. Chained Mutations (.add / .set)
            </label>
            
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
              <button id="btn-add-day" style="background: #334155; border: 1px solid #475569; color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; cursor: pointer;">+1 Day</button>
              <button id="btn-sub-day" style="background: #334155; border: 1px solid #475569; color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; cursor: pointer;">-1 Day</button>
              <button id="btn-add-week" style="background: #334155; border: 1px solid #475569; color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; cursor: pointer;">+1 Week</button>
              <button id="btn-add-month" style="background: #334155; border: 1px solid #475569; color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; cursor: pointer;">+1 Month</button>
              <button id="btn-snap-week" style="background: #334155; border: 1px solid #475569; color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; cursor: pointer;">Start of Week</button>
              <button id="btn-snap-month" style="background: #334155; border: 1px solid #475569; color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; cursor: pointer;">End of Month</button>
              <button id="btn-reset-mut" style="background: #b91c1c; border: none; color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; cursor: pointer;">Reset</button>
            </div>

            <div style="font-size: 0.8rem; color: #94a3b8;">
              Net Shift: <span id="label-mutation-status" style="color: #c084fc; font-weight: 600;">None</span>
            </div>
          </div>

          <!-- SECTION 4: DURATION CALCULATOR -->
          <div style="background: #1e293b; padding: 16px; border-radius: 12px; border: 1px solid #334155;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #22c55e;">
                4. Duration & Relative Time
              </label>
              <span style="font-size: 0.7rem; color: #94a3b8;">Math vs. Intl Narrative</span>
            </div>
            <div style="margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 0.75rem; color: #94a3b8;">Compare against target:</span>
                <div style="display: flex; gap: 4px;">
                  <button class="btn-preset-target" data-val="Christmas" style="background: #0f172a; border: 1px solid #334155; color: #cbd5e1; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; cursor: pointer;">Christmas</button>
                  <button class="btn-preset-target" data-val="Easter" style="background: #0f172a; border: 1px solid #334155; color: #cbd5e1; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; cursor: pointer;">Easter</button>
                  <button class="btn-preset-target" data-val="1 week ago" style="background: #0f172a; border: 1px solid #334155; color: #cbd5e1; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; cursor: pointer;">1 week ago</button>
                </div>
              </div>
              <input id="input-target" type="text" value="Christmas" style="width: 100%; padding: 6px 10px; border-radius: 6px; background: #0f172a; color: white; border: 1px solid #475569; font-size: 0.85rem; box-sizing: border-box;">
              <div id="error-target" style="color: #f87171; font-size: 0.75rem; margin-top: 4px; display: none;"></div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem;">
              <div style="background: #0f172a; padding: 10px; border-radius: 8px; border: 1px solid #1e293b;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="color: #64748b; font-size: 0.7rem; text-transform: uppercase; font-weight: 700;">.until() Balanced</span>
                  <span id="output-until-days" style="color: #64748b; font-size: 0.7rem;"></span>
                </div>
                <div id="output-until-formatted" style="color: #4ade80; font-weight: 700; font-size: 0.85rem; line-height: 1.3;">-</div>
              </div>
              <div style="background: #0f172a; padding: 10px; border-radius: 8px; border: 1px solid #1e293b;">
                <div style="color: #64748b; font-size: 0.7rem; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">.since() Intl Relative</div>
                <div id="output-since-str" style="color: #38bdf8; font-weight: 700; font-size: 0.95rem; line-height: 1.3;">-</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- PLUGINS & TERMS CONTAINER: SECTIONS 2, 3, 4 (GEO, ASTRO, CELESTIAL) -->
      <!-- ========================================================================= -->
      <div id="container-plugin-sections" style="display: ${activeMode === 'plugins' ? 'block' : 'none'};">
        
        <!-- SECTION 2 (PLUGINS): GEOLOCATION & NATURAL SOLAR TIME -->
        <div style="background: #1e293b; padding: 18px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #38bdf8;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #38bdf8;">
                2. Geolocation & Natural Solar Time
              </label>
              <span style="font-size: 0.7rem; background: #0369a1; color: white; padding: 2px 8px; border-radius: 999px; font-weight: 600;">@tempo-plugin-geo</span>
            </div>
            
            <!-- Detect My IP Action Button -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <button id="btn-detect-ip" style="background: #0369a1; border: 1px solid #38bdf8; color: white; font-size: 0.75rem; padding: 5px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-weight: 600;">
                <span>📍</span> Detect My IP
              </button>
              <span id="geo-status" style="font-size: 0.75rem; color: #94a3b8;"></span>
            </div>
          </div>

          <!-- City Presets -->
          <div style="margin-bottom: 14px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
            <span style="font-size: 0.75rem; color: #64748b;">City Presets:</span>
            ${CITY_PRESETS.map(
              (c) => `
              <button class="city-btn ${c.id === activeGeo.id ? 'active' : ''}" data-city-id="${c.id}">
                <span>${c.flag}</span> ${c.name} (${c.sphere === 'south' ? 'S' : 'N'})
              </button>
            `
            ).join('')}
          </div>

          <!-- Geo Details & Solar Offset Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
            
            <div style="background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
              <div style="font-size: 0.7rem; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Coordinates</div>
              <div style="font-family: monospace; font-size: 0.9rem; color: #f8fafc;">
                <span id="geo-lat">${activeGeo.lat.toFixed(4)}</span>°, <span id="geo-lng">${activeGeo.lng.toFixed(4)}</span>°
              </div>
              <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 4px;">
                Hemisphere: <span id="geo-sphere" style="color: ${activeGeo.sphere === 'south' ? '#f472b6' : '#38bdf8'}; font-weight: 700;">${activeGeo.sphere.toUpperCase()}</span> 🧭
              </div>
            </div>

            <div style="background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
              <div style="font-size: 0.7rem; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Location & Zone</div>
              <div id="geo-location-name" style="font-weight: 700; font-size: 0.95rem; color: #38bdf8;">
                ${activeGeo.city}, ${activeGeo.country}
              </div>
              <div id="geo-timezone-name" style="font-size: 0.72rem; color: #94a3b8; margin-top: 4px; font-family: monospace;">
                ${activeGeo.timezone}
              </div>
            </div>

            <div style="background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 0.7rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Solar Offset</span>
                <span style="font-size: 0.65rem; color: #4ade80;">Δλ × 4m</span>
              </div>
              <div id="geo-solar-offset" style="font-weight: 700; font-size: 1.05rem; color: #fbbf24;">
                +0.00 min
              </div>
              <div id="geo-solar-noon" style="font-size: 0.72rem; color: #94a3b8; margin-top: 4px;">
                Solar Noon: <span id="val-solar-noon" style="color: #f1f5f9; font-weight: 600;">12:00</span>
              </div>
            </div>

          </div>
        </div>

        <!-- SECTION 3 (PLUGINS): ASTRONOMICAL & CELESTIAL EPHEMERIS (SINGLE ROW) -->
        <div style="background: #1e293b; padding: 14px 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid #c084fc;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #c084fc;">
                3. Astronomical & Celestial Ephemeris
              </label>
              <span style="font-size: 0.68rem; background: #581c87; color: #e9d5ff; padding: 2px 8px; border-radius: 999px; font-weight: 600;">@tempo-plugin-astro & celestial</span>
            </div>
            <span style="font-size: 0.7rem; color: #94a3b8;">Deterministic Celestial Mechanics</span>
          </div>

          <!-- 4 Cards on Same Line -->
          <div class="ephemeris-grid">
            
            <!-- Card 1: Astro Event & Season -->
            <div class="ephemeris-card">
              <div>
                <div class="ephemeris-card-header">
                  <span class="ephemeris-card-title" style="color: #c084fc;">🪐 Astro Event</span>
                  <span id="badge-astro-event-type" style="font-size: 0.62rem; background: #3b0764; color: #d8b4fe; padding: 1px 5px; border-radius: 4px; white-space: nowrap;">Equinox</span>
                </div>
                <div id="val-astro-key" class="ephemeris-card-value">
                  Vernal
                </div>
                <div class="ephemeris-card-sub">
                  Season: <span id="val-astro-season" style="color: #c084fc; font-weight: 700;">Spring</span>
                </div>
              </div>
              <div class="ephemeris-card-footer" title="Flips automatically by hemisphere">
                Hemisphere aware
              </div>
            </div>

            <!-- Card 2: Solar Day State -->
            <div class="ephemeris-card">
              <div>
                <div class="ephemeris-card-header">
                  <span class="ephemeris-card-title" style="color: #fbbf24;">☀️ Solar State</span>
                  <span id="badge-solar-state" style="font-size: 0.62rem; background: #78350f; color: #fde68a; padding: 1px 5px; border-radius: 4px; white-space: nowrap;">daylight</span>
                </div>
                <div id="val-solar-phase" class="ephemeris-card-value">
                  Daylight
                </div>
                <div class="ephemeris-card-sub">
                  <span id="val-solar-sunrise" style="color: #f1f5f9; font-weight: 600;">06:00</span> → <span id="val-solar-sunset" style="color: #f1f5f9; font-weight: 600;">18:00</span>
                </div>
              </div>
              <div id="val-solar-daylight-len" class="ephemeris-card-footer">
                Daylight: 12.0 hrs
              </div>
            </div>

            <!-- Card 3: Lunar Phase -->
            <div class="ephemeris-card">
              <div>
                <div class="ephemeris-card-header">
                  <span class="ephemeris-card-title" style="color: #38bdf8;">🌙 Lunar Phase</span>
                  <span id="val-lunar-emoji" style="font-size: 1rem; line-height: 1;">🌑</span>
                </div>
                <div id="val-lunar-phase" class="ephemeris-card-value">
                  New Moon
                </div>
                <div class="ephemeris-card-sub">
                  Illum: <span id="val-lunar-illum" style="color: #38bdf8; font-weight: 700;">0%</span>
                </div>
              </div>
              <div id="val-lunar-age" class="ephemeris-card-footer">
                Age: 0.0 days
              </div>
            </div>

            <!-- Card 4: Tidal Mechanics -->
            <div class="ephemeris-card">
              <div>
                <div class="ephemeris-card-header">
                  <span class="ephemeris-card-title" style="color: #34d399;">🌊 Tidal State</span>
                  <span id="badge-king-tide" style="font-size: 0.62rem; background: #064e3b; color: #6ee7b7; padding: 1px 5px; border-radius: 4px; white-space: nowrap;">Normal</span>
                </div>
                <div id="val-tide-state" class="ephemeris-card-value" style="text-transform: capitalize;">
                  Spring Tide
                </div>
                <div class="ephemeris-card-sub">
                  Align: <span id="val-tide-align" style="color: #34d399; font-weight: 700;">0.0°</span>
                </div>
              </div>
              <div id="val-tide-desc" class="ephemeris-card-footer" title="Syzygy (Sun-Moon-Earth alignment)">
                Syzygy alignment
              </div>
            </div>

          </div>
        </div>

        <!-- SECTION 4 (PLUGINS): TERM PROPERTY CHIPS & LIVE INSPECTOR -->
        <div style="background: #1e293b; padding: 18px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #334155;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #f8fafc;">
              4. Term Properties & Live Inspector (Astro, Solar, Lunar, Tides)
            </label>
            <span style="font-size: 0.75rem; color: #94a3b8;">Click property chip to inspect</span>
          </div>

          <!-- Grouped Chips -->
          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;">
            
            <!-- Astro Chips -->
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 0.7rem; color: #c084fc; font-weight: 700; width: 60px;">Astro:</span>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                ${TERM_PROPERTIES.filter((p) => p.category === 'astro')
                  .map(
                    (p) => `
                  <button class="term-chip chip-astro ${p.prop === selectedTermProp ? 'active' : ''}" data-prop="${p.prop}">
                    ${p.label}
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>

            <!-- Solar Chips -->
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 0.7rem; color: #fbbf24; font-weight: 700; width: 60px;">Solar:</span>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                ${TERM_PROPERTIES.filter((p) => p.category === 'solar')
                  .map(
                    (p) => `
                  <button class="term-chip chip-solar ${p.prop === selectedTermProp ? 'active' : ''}" data-prop="${p.prop}">
                    ${p.label}
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>

            <!-- Lunar Chips -->
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 0.7rem; color: #38bdf8; font-weight: 700; width: 60px;">Lunar:</span>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                ${TERM_PROPERTIES.filter((p) => p.category === 'lunar')
                  .map(
                    (p) => `
                  <button class="term-chip chip-lunar ${p.prop === selectedTermProp ? 'active' : ''}" data-prop="${p.prop}">
                    ${p.label}
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>

            <!-- Tidal Chips -->
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 0.7rem; color: #34d399; font-weight: 700; width: 60px;">Tidal:</span>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                ${TERM_PROPERTIES.filter((p) => p.category === 'tides')
                  .map(
                    (p) => `
                  <button class="term-chip chip-tides ${p.prop === selectedTermProp ? 'active' : ''}" data-prop="${p.prop}">
                    ${p.label}
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>

          </div>

          <!-- Live Property Evaluation Inspector Box -->
          <div style="background: #0f172a; padding: 14px 18px; border-radius: 8px; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="inspect-prop-name" style="font-family: monospace; font-size: 0.95rem; font-weight: 700; color: #f8fafc;">${selectedTermProp}</span>
                <span id="inspect-prop-type" style="font-size: 0.7rem; background: #1e293b; color: #94a3b8; padding: 2px 6px; border-radius: 4px; font-family: monospace;">string</span>
              </div>
              <div id="inspect-prop-desc" style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">
                Inspected term property documentation
              </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="text-align: right;">
                <span style="font-size: 0.7rem; color: #64748b; text-transform: uppercase;">Evaluated Value:</span>
                <div id="inspect-prop-val" style="font-family: monospace; font-size: 1.15rem; font-weight: 700; color: #4ade80;">-</div>
              </div>
              <button id="btn-copy-prop" style="background: #1e293b; border: 1px solid #334155; color: #38bdf8; font-size: 0.75rem; padding: 6px 10px; border-radius: 6px; cursor: pointer;">
                📋 Copy
              </button>
            </div>
          </div>

        </div>

      </div>

      <!-- ========================================================================= -->
      <!-- SECTION 5: GENERATED TYPESCRIPT CODE (PERSISTENT ACROSS BOTH MODES) -->
      <!-- ========================================================================= -->
      <div style="background: #1e293b; padding: 16px; border-radius: 12px; border: 1px solid #334155;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #94a3b8;">
              5. Generated TypeScript Code
            </label>
            <span id="badge-code-mode" style="font-size: 0.7rem; color: #64748b; font-family: monospace;">
              ${activeMode === 'core' ? '[Core Engine Snippet]' : '[Plugins & Terms Snippet]'}
            </span>
          </div>
          <button id="btn-copy-code" style="background: #334155; border: 1px solid #475569; color: #38bdf8; font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; cursor: pointer;">
            📋 Copy Code
          </button>
        </div>
        <pre id="output-code" style="margin: 0; background: #0f172a; padding: 14px 16px; border-radius: 8px; color: #e2e8f0; font-size: 0.85rem; font-family: 'Fira Code', monospace, Consolas; overflow-x: auto; overflow-y: scroll; max-height: 180px; line-height: 1.6; border: 1px solid #334155; white-space: pre;"></pre>
      </div>

    </div>
  `;

  attachEventListeners();
}

// 4. Reactive Update Engine
let baseDebounceTimer: any = null;
let targetDebounceTimer: any = null;
let lastValidTempo: any = null;
let lastValidTarget: any = null;

try {
  lastValidTempo = new Tempo('next Friday at 3pm');
  lastValidTarget = new Tempo('Christmas');
} catch {
  lastValidTempo = new Tempo();
}

function update(isTyping = false) {
  const baseInputEl = document.getElementById('input-base') as HTMLInputElement;
  const formatInputEl = document.getElementById('input-format') as HTMLInputElement;
  const targetInputEl = document.getElementById('input-target') as HTMLInputElement;

  const baseText = baseInputEl?.value.trim() || '';
  const formatText = formatInputEl?.value || '{yyyy}-{mm}-{dd}';
  const targetText = targetInputEl?.value.trim() || '';

  const errorBaseEl = document.getElementById('error-base')!;
  const errorTargetEl = document.getElementById('error-target');
  const badgeIsoEl = document.getElementById('badge-iso')!;
  const badgeTzEl = document.getElementById('badge-tz')!;
  const outputCodeEl = document.getElementById('output-code')!;

  // 1. Resolve Anchor Date
  let currentTempo = lastValidTempo;
  let isBaseValid = true;

  try {
    const candidate = new Tempo(baseText || undefined, {
      timeZone: activeGeo.timezone,
      sphere: activeGeo.sphere,
      geo: { latitude: activeGeo.lat, longitude: activeGeo.lng, city: activeGeo.city, country: activeGeo.country },
    });
    lastValidTempo = candidate;
    currentTempo = candidate;
    isBaseValid = true;

    errorBaseEl.style.display = 'none';
    if (baseInputEl) baseInputEl.style.borderColor = '#475569';
    badgeIsoEl.textContent = candidate.iso;
    badgeIsoEl.style.color = '#38bdf8';
    badgeTzEl.textContent = `● Ready (${candidate.tz})`;
  } catch (err: any) {
    isBaseValid = false;
    currentTempo = lastValidTempo;

    if (isTyping) {
      badgeIsoEl.innerHTML = `<span style="color: #93c5fd; font-style: italic;">typing...</span>`;
      errorBaseEl.style.display = 'none';
      if (baseInputEl) baseInputEl.style.borderColor = '#38bdf8';
    } else {
      badgeIsoEl.innerHTML = `<span style="color: #f87171;">Incomplete</span>`;
      if (baseInputEl) baseInputEl.style.borderColor = '#f87171';
      errorBaseEl.textContent = `⚠️ Incomplete or unrecognized expression — try a date (e.g. '2026-12-31') or phrase (e.g. 'tomorrow 9am', 'Easter')`;
      errorBaseEl.style.display = 'block';
    }
  }

  // Apply mutations on currentTempo
  let mutatedTempo = currentTempo;
  if (mutationDays !== 0) mutatedTempo = mutatedTempo.add({ days: mutationDays });
  if (mutationMonths !== 0) mutatedTempo = mutatedTempo.add({ months: mutationMonths });
  if (snapMode === 'start-week') mutatedTempo = mutatedTempo.set({ week: 'start' });
  if (snapMode === 'end-month') mutatedTempo = mutatedTempo.set({ month: 'end' });

  if (isBaseValid) {
    badgeIsoEl.textContent = mutatedTempo.iso;
  }

  // =========================================================================
  // CORE ENGINE UPDATES
  // =========================================================================
  let formattedResult = '';
  const outputFormattedEl = document.getElementById('output-formatted');
  if (outputFormattedEl) {
    try {
      formattedResult = mutatedTempo.format(formatText);
      outputFormattedEl.textContent = formattedResult;
      outputFormattedEl.style.color = '#4ade80';
    } catch (err: any) {
      outputFormattedEl.textContent = `[Format Error: ${err.message}]`;
      outputFormattedEl.style.color = '#f87171';
    }
  }

  const outputUntilFormattedEl = document.getElementById('output-until-formatted');
  const outputUntilDaysEl = document.getElementById('output-until-days');
  const outputSinceStrEl = document.getElementById('output-since-str');

  if (targetText && outputUntilFormattedEl && outputUntilDaysEl && outputSinceStrEl && errorTargetEl) {
    try {
      const target = new Tempo(targetText);
      lastValidTarget = target;
      errorTargetEl.style.display = 'none';
      if (targetInputEl) targetInputEl.style.borderColor = '#475569';

      const dur = mutatedTempo.until(target);
      const totalDays = Math.round(mutatedTempo.until(target, 'days'));
      outputUntilFormattedEl.textContent = dur.format() || `${totalDays} days`;
      outputUntilDaysEl.textContent = `(${totalDays > 0 ? '+' : ''}${totalDays}d total)`;
      outputSinceStrEl.textContent = mutatedTempo.since(target, { unit: 'days', numeric: 'auto' });
    } catch (err: any) {
      if (isTyping) {
        if (lastValidTarget) {
          const dur = mutatedTempo.until(lastValidTarget);
          const totalDays = Math.round(mutatedTempo.until(lastValidTarget, 'days'));
          outputUntilFormattedEl.textContent = dur.format() || `${totalDays} days`;
          outputUntilDaysEl.textContent = `(${totalDays > 0 ? '+' : ''}${totalDays}d total)`;
          outputSinceStrEl.textContent = mutatedTempo.since(lastValidTarget, { unit: 'days', numeric: 'auto' });
        }
      } else {
        errorTargetEl.textContent = `⚠️ Incomplete target date or expression`;
        errorTargetEl.style.display = 'block';
        if (targetInputEl) targetInputEl.style.borderColor = '#f87171';
        outputUntilFormattedEl.textContent = '—';
        outputUntilDaysEl.textContent = '';
        outputSinceStrEl.textContent = '—';
      }
    }
  } else if (outputUntilFormattedEl && outputUntilDaysEl && outputSinceStrEl) {
    outputUntilFormattedEl.textContent = '—';
    outputUntilDaysEl.textContent = '';
    outputSinceStrEl.textContent = '—';
  }

  const labelMutationStatusEl = document.getElementById('label-mutation-status');
  if (labelMutationStatusEl) {
    const mutParts: string[] = [];
    if (mutationDays !== 0) mutParts.push(`${mutationDays > 0 ? '+' : ''}${mutationDays}d`);
    if (mutationMonths !== 0) mutParts.push(`${mutationMonths > 0 ? '+' : ''}${mutationMonths}m`);
    if (snapMode !== 'none') mutParts.push(`snap: ${snapMode}`);
    labelMutationStatusEl.textContent = mutParts.length > 0 ? mutParts.join(', ') : 'None';
  }

  // =========================================================================
  // PLUGINS & TERMS UPDATES (GEO, ASTRO, CELESTIAL)
  // =========================================================================
  // Geo Details
  const geoLatEl = document.getElementById('geo-lat');
  const geoLngEl = document.getElementById('geo-lng');
  const geoSphereEl = document.getElementById('geo-sphere');
  const geoLocationNameEl = document.getElementById('geo-location-name');
  const geoTimezoneNameEl = document.getElementById('geo-timezone-name');
  const geoSolarOffsetEl = document.getElementById('geo-solar-offset');
  const valSolarNoonEl = document.getElementById('val-solar-noon');

  if (geoLatEl) geoLatEl.textContent = activeGeo.lat.toFixed(4);
  if (geoLngEl) geoLngEl.textContent = activeGeo.lng.toFixed(4);
  if (geoSphereEl) {
    geoSphereEl.textContent = activeGeo.sphere.toUpperCase();
    geoSphereEl.style.color = activeGeo.sphere === 'south' ? '#f472b6' : '#38bdf8';
  }
  if (geoLocationNameEl) geoLocationNameEl.textContent = `${activeGeo.city}, ${activeGeo.country}`;
  if (geoTimezoneNameEl) geoTimezoneNameEl.textContent = activeGeo.timezone;

  // Calculate Natural Solar Offset
  let solarOffsetMinutes = 0;
  try {
    solarOffsetMinutes = mutatedTempo.geoSolarOffset({ unit: 'minutes' });
    if (geoSolarOffsetEl) {
      const sign = solarOffsetMinutes >= 0 ? '+' : '';
      geoSolarOffsetEl.textContent = `${sign}${solarOffsetMinutes.toFixed(2)} min`;
      geoSolarOffsetEl.style.color = Math.abs(solarOffsetMinutes) > 30 ? '#f87171' : '#fbbf24';
    }
  } catch {
    if (geoSolarOffsetEl) geoSolarOffsetEl.textContent = 'N/A';
  }

  // Ephemeris details
  try {
    const solarNoon = mutatedTempo.term.solar?.noon;
    if (valSolarNoonEl) {
      valSolarNoonEl.textContent = solarNoon ? solarNoon.format('{hh}:{mi}:{ss}') : '12:00:00';
    }

    // Astro
    const valAstroKeyEl = document.getElementById('val-astro-key');
    const valAstroSeasonEl = document.getElementById('val-astro-season');
    const badgeAstroEventTypeEl = document.getElementById('badge-astro-event-type');
    if (valAstroKeyEl) valAstroKeyEl.textContent = mutatedTempo.term.astro || 'Vernal';
    if (valAstroSeasonEl) valAstroSeasonEl.textContent = mutatedTempo.term.astronomy?.season || 'Spring';
    if (badgeAstroEventTypeEl) badgeAstroEventTypeEl.textContent = mutatedTempo.term.astronomy?.event || 'Equinox';

    // Solar
    const valSolarPhaseEl = document.getElementById('val-solar-phase');
    const badgeSolarStateEl = document.getElementById('badge-solar-state');
    const valSolarSunriseEl = document.getElementById('val-solar-sunrise');
    const valSolarSunsetEl = document.getElementById('val-solar-sunset');
    const valSolarDaylightLenEl = document.getElementById('val-solar-daylight-len');

    if (valSolarPhaseEl) valSolarPhaseEl.textContent = mutatedTempo.term.solar?.phase || 'Daylight';
    if (badgeSolarStateEl) badgeSolarStateEl.textContent = mutatedTempo.term.sun || 'daylight';
    if (valSolarSunriseEl) valSolarSunriseEl.textContent = mutatedTempo.term.solar?.sunrise?.format('{hh}:{mi}') || 'N/A';
    if (valSolarSunsetEl) valSolarSunsetEl.textContent = mutatedTempo.term.solar?.sunset?.format('{hh}:{mi}') || 'N/A';
    if (valSolarDaylightLenEl) {
      const ms = mutatedTempo.term.solar?.daylightDurationMs;
      valSolarDaylightLenEl.textContent = ms != null ? `Daylight: ${(ms / 3600000).toFixed(1)} hrs` : 'Daylight: N/A';
    }

    // Lunar
    const valLunarEmojiEl = document.getElementById('val-lunar-emoji');
    const valLunarPhaseEl = document.getElementById('val-lunar-phase');
    const valLunarIllumEl = document.getElementById('val-lunar-illum');
    const valLunarAgeEl = document.getElementById('val-lunar-age');

    if (valLunarEmojiEl) valLunarEmojiEl.textContent = mutatedTempo.term.lunar?.emoji || '🌑';
    if (valLunarPhaseEl) valLunarPhaseEl.textContent = mutatedTempo.term.lunar?.phase || 'New Moon';
    if (valLunarIllumEl) {
      const illum = mutatedTempo.term.lunar?.illumination ?? 0;
      valLunarIllumEl.textContent = `${Math.round(illum * 100)}%`;
    }
    if (valLunarAgeEl) {
      const age = mutatedTempo.term.lunar?.ageDays ?? 0;
      valLunarAgeEl.textContent = `Age: ${age.toFixed(1)} days`;
    }

    // Tides
    const valTideStateEl = document.getElementById('val-tide-state');
    const valTideAlignEl = document.getElementById('val-tide-align');
    const badgeKingTideEl = document.getElementById('badge-king-tide');
    const valTideDescEl = document.getElementById('val-tide-desc');

    if (valTideStateEl) valTideStateEl.textContent = `${mutatedTempo.term.tide ?? 'Normal'} Tide`;
    if (valTideAlignEl) {
      const deg = mutatedTempo.term.tides?.alignmentDeg ?? 0;
      valTideAlignEl.textContent = `${deg.toFixed(1)}°`;
    }
    if (badgeKingTideEl) {
      const isKing = mutatedTempo.term.tides?.isKingTide;
      badgeKingTideEl.textContent = isKing ? '🚨 King Tide' : 'Normal';
      badgeKingTideEl.style.background = isKing ? '#991b1b' : '#064e3b';
      badgeKingTideEl.style.color = isKing ? '#fecaca' : '#6ee7b7';
    }
    if (valTideDescEl) {
      const isSpring = mutatedTempo.term.tides?.isSpringTide;
      const isNeap = mutatedTempo.term.tides?.isNeapTide;
      valTideDescEl.textContent = isSpring
        ? 'Syzygy (Sun-Moon-Earth syzygetic alignment)'
        : isNeap
        ? 'Quadrature (Right-angle gravitational cancellation)'
        : 'Intermediate orbit configuration';
    }
  } catch (err: any) {
    console.error('Celestial calculation error:', err);
  }

  // Term Property Inspector update
  const inspectPropNameEl = document.getElementById('inspect-prop-name');
  const inspectPropTypeEl = document.getElementById('inspect-prop-type');
  const inspectPropDescEl = document.getElementById('inspect-prop-desc');
  const inspectPropValEl = document.getElementById('inspect-prop-val');

  const activePropDef = TERM_PROPERTIES.find((p) => p.prop === selectedTermProp);
  if (inspectPropNameEl) inspectPropNameEl.textContent = selectedTermProp;
  if (inspectPropDescEl) inspectPropDescEl.textContent = activePropDef?.description || 'Active property';

  const evaluated = evaluateProperty(mutatedTempo, selectedTermProp);
  if (inspectPropTypeEl) inspectPropTypeEl.textContent = evaluated.type;
  if (inspectPropValEl) {
    inspectPropValEl.textContent = String(evaluated.val);
    inspectPropValEl.style.color = evaluated.type === 'error' ? '#f87171' : '#4ade80';
  }

  // =========================================================================
  // SECTION 5: GENERATE TYPESCRIPT CODE (PERSISTENT & CONTEXT-AWARE)
  // =========================================================================
  if (activeMode === 'core') {
    let codeSnippet = `import { Tempo } from '@magmacomputing/tempo';\n\n`;
    codeSnippet += `// Initialize Tempo with custom event registry (enables "Easter", "Black Friday", etc.)\n`;
    codeSnippet += `Tempo.init({\n`;
    codeSnippet += `  registry: {\n`;
    codeSnippet += `    events: {\n`;
    codeSnippet += `      easter: '2026-04-05',\n`;
    codeSnippet += `      'black friday': '2026-11-27',\n`;
    codeSnippet += `      eofy: '30 Jun',\n`;
    codeSnippet += `    },\n`;
    codeSnippet += `  },\n`;
    codeSnippet += `});\n\n`;
    codeSnippet += `const t = new Tempo(${JSON.stringify(baseText || 'now')})`;
    if (mutationDays !== 0 || mutationMonths !== 0) {
      const muts: string[] = [];
      if (mutationDays !== 0) muts.push(`days: ${mutationDays}`);
      if (mutationMonths !== 0) muts.push(`months: ${mutationMonths}`);
      codeSnippet += `\n  .add({ ${muts.join(', ')} })`;
    }
    if (snapMode === 'start-week') codeSnippet += `\n  .set({ week: 'start' })`;
    if (snapMode === 'end-month') codeSnippet += `\n  .set({ month: 'end' })`;
    codeSnippet += `;\n\n`;
    codeSnippet += `// 1. Live Formatting\n`;
    codeSnippet += `const formatted = t.format(${JSON.stringify(formatText)});\n`;
    codeSnippet += `console.log(formatted); // "${formattedResult}"\n\n`;
    if (targetText && lastValidTarget) {
      codeSnippet += `// 2. Balanced Duration vs. Intl Relative Time:\n`;
      codeSnippet += `const target = new Tempo(${JSON.stringify(targetText)});\n`;
      codeSnippet += `const countdown = t.until(target);       // Duration EDO\n`;
      codeSnippet += `console.log(countdown.format());         // "${outputUntilFormattedEl?.textContent || ''}"\n`;
      codeSnippet += `console.log(t.since(target, { unit: 'days', numeric: 'auto' })); // "${outputSinceStrEl?.textContent || ''}"\n`;
    }
    outputCodeEl.textContent = codeSnippet;
  } else {
    // Plugins Mode Code
    let pluginSnippet = `import { Tempo } from '@magmacomputing/tempo';\n`;
    pluginSnippet += `import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';\n`;
    pluginSnippet += `import '@magmacomputing/tempo-plugin-astro';\n`;
    pluginSnippet += `import '@magmacomputing/tempo-plugin-celestial';\n\n`;
    pluginSnippet += `// 1. Register Geolocation Plugin onto Tempo\n`;
    pluginSnippet += `Tempo.use(GeoPlugin);\n\n`;
    pluginSnippet += `// 2. Initialize with Geographic Context\n`;
    pluginSnippet += `const t = new Tempo(${JSON.stringify(baseText || 'now')}, {\n`;
    pluginSnippet += `  timeZone: '${activeGeo.timezone}',\n`;
    pluginSnippet += `  sphere: '${activeGeo.sphere}',\n`;
    pluginSnippet += `  geo: {\n`;
    pluginSnippet += `    latitude: ${activeGeo.lat.toFixed(4)},\n`;
    pluginSnippet += `    longitude: ${activeGeo.lng.toFixed(4)},\n`;
    pluginSnippet += `    city: '${activeGeo.city}',\n`;
    pluginSnippet += `    country: '${activeGeo.country}',\n`;
    pluginSnippet += `  },\n`;
    pluginSnippet += `});\n\n`;
    pluginSnippet += `// 3. Astronomical Events (Hemisphere-aware: ${activeGeo.sphere.toUpperCase()})\n`;
    pluginSnippet += `console.log(t.term.astro);             // "${mutatedTempo.term.astro}"\n`;
    pluginSnippet += `console.log(t.term.astronomy?.season); // "${mutatedTempo.term.astronomy?.season}"\n\n`;
    pluginSnippet += `// 4. Solar Twilight & Natural Solar Offset\n`;
    pluginSnippet += `console.log(t.term.sun);               // "${mutatedTempo.term.sun}"\n`;
    pluginSnippet += `console.log('Solar Noon:', t.term.solar?.noon?.format('{hh}:{mi}:{ss}'));\n`;
    pluginSnippet += `console.log('Solar Offset:', t.geoSolarOffset({ unit: 'minutes' }), 'min');\n\n`;
    pluginSnippet += `// 5. Lunar Phase & Illumination\n`;
    pluginSnippet += `console.log(t.term.lunar?.phase, t.term.lunar?.emoji); // "${mutatedTempo.term.lunar?.phase} ${mutatedTempo.term.lunar?.emoji}"\n`;
    pluginSnippet += `console.log('Illumination:', '${Math.round((mutatedTempo.term.lunar?.illumination ?? 0) * 100)}%');\n\n`;
    pluginSnippet += `// 6. Astronomical Tidal Mechanics\n`;
    pluginSnippet += `console.log(t.term.tide);              // "${mutatedTempo.term.tide ?? 'Normal'}"\n`;
    pluginSnippet += `console.log('King Tide:', ${mutatedTempo.term.tides?.isKingTide});\n\n`;
    pluginSnippet += `// 7. Inspected Term Property (${selectedTermProp})\n`;
    pluginSnippet += `console.log('${selectedTermProp}:', ${evaluated.codeDisplay});\n`;

    outputCodeEl.textContent = pluginSnippet;
  }
}

function attachEventListeners() {
  const baseInputEl = document.getElementById('input-base') as HTMLInputElement;
  const formatInputEl = document.getElementById('input-format') as HTMLInputElement;
  const targetInputEl = document.getElementById('input-target') as HTMLInputElement;

  // --- Top-Line Mode Switcher ---
  const btnModeCore = document.getElementById('btn-mode-core')!;
  const btnModePlugins = document.getElementById('btn-mode-plugins')!;
  const containerCore = document.getElementById('container-core-sections')!;
  const containerPlugins = document.getElementById('container-plugin-sections')!;
  const labelModeIndicator = document.getElementById('label-mode-indicator')!;
  const badgeCodeMode = document.getElementById('badge-code-mode')!;

  function setMode(mode: AppMode) {
    activeMode = mode;
    if (mode === 'core') {
      btnModeCore.classList.add('active');
      btnModePlugins.classList.remove('active');
      containerCore.style.display = 'block';
      containerPlugins.style.display = 'none';
      labelModeIndicator.textContent = '⚡ Core Mode Active';
      labelModeIndicator.style.color = '#38bdf8';
      labelModeIndicator.style.borderColor = '#38bdf840';
      badgeCodeMode.textContent = '[Core Engine Snippet]';
    } else {
      btnModeCore.classList.remove('active');
      btnModePlugins.classList.add('active');
      containerCore.style.display = 'none';
      containerPlugins.style.display = 'block';
      labelModeIndicator.textContent = '🔌 Plugins Mode Active';
      labelModeIndicator.style.color = '#c084fc';
      labelModeIndicator.style.borderColor = '#c084fc40';
      badgeCodeMode.textContent = '[Plugins & Terms Snippet]';
    }
    update(false);
  }

  btnModeCore.addEventListener('click', () => setMode('core'));
  btnModePlugins.addEventListener('click', () => setMode('plugins'));

  // --- Detect My IP Button ---
  const btnDetectIp = document.getElementById('btn-detect-ip');
  const geoStatusEl = document.getElementById('geo-status');
  btnDetectIp?.addEventListener('click', async () => {
    if (geoStatusEl) {
      geoStatusEl.textContent = '⏳ Querying IP geolocation...';
      geoStatusEl.style.color = '#fbbf24';
    }
    try {
      const res = await Tempo.geo.server();
      if (res && res.lat !== undefined && res.lng !== undefined) {
        const sphere: 'north' | 'south' = res.lat >= 0 ? 'north' : 'south';
        activeGeo = {
          id: 'custom-ip',
          name: res.city || 'Detected Location',
          flag: '🌐',
          lat: Math.round(res.lat * 10000) / 10000,
          lng: Math.round(res.lng * 10000) / 10000,
          city: res.city || 'Local City',
          country: res.country || 'Local Country',
          timezone: res.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          sphere,
        };

        // Deselect city preset pills
        document.querySelectorAll('.city-btn').forEach((b) => b.classList.remove('active'));

        if (geoStatusEl) {
          geoStatusEl.textContent = `📍 ${activeGeo.city}, ${activeGeo.country}`;
          geoStatusEl.style.color = '#4ade80';
        }
        update(false);
      } else {
        if (geoStatusEl) {
          geoStatusEl.textContent = '❌ Lookup failed';
          geoStatusEl.style.color = '#f87171';
        }
      }
    } catch (err: any) {
      if (geoStatusEl) {
        geoStatusEl.textContent = `❌ ${err.message || 'Network error'}`;
        geoStatusEl.style.color = '#f87171';
      }
    }
  });

  // --- City Presets ---
  document.querySelectorAll('.city-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const cityId = (e.currentTarget as HTMLElement).getAttribute('data-city-id');
      const found = CITY_PRESETS.find((c) => c.id === cityId);
      if (found) {
        activeGeo = found;
        document.querySelectorAll('.city-btn').forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        if (geoStatusEl) geoStatusEl.textContent = '';
        update(false);
      }
    });
  });

  // --- Term Property Chips ---
  document.querySelectorAll('.term-chip').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const prop = (e.currentTarget as HTMLElement).getAttribute('data-prop');
      if (prop) {
        selectedTermProp = prop;
        document.querySelectorAll('.term-chip').forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        update(false);
      }
    });
  });

  // --- Copy Inspected Property ---
  document.getElementById('btn-copy-prop')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-copy-prop')!;
    try {
      await navigator.clipboard.writeText(selectedTermProp);
      btn.textContent = '✅ Copied!';
    } catch {
      btn.textContent = '❌ Copy failed';
    }
    setTimeout(() => {
      btn.textContent = '📋 Copy';
    }, 1500);
  });

  // --- Core Listeners ---
  baseInputEl.addEventListener('input', () => {
    update(true);
    clearTimeout(baseDebounceTimer);
    baseDebounceTimer = setTimeout(() => update(false), 300);
  });

  baseInputEl.addEventListener('blur', () => {
    clearTimeout(baseDebounceTimer);
    update(false);
  });

  formatInputEl?.addEventListener('input', () => update(false));

  targetInputEl?.addEventListener('input', () => {
    update(true);
    clearTimeout(targetDebounceTimer);
    targetDebounceTimer = setTimeout(() => update(false), 300);
  });

  targetInputEl?.addEventListener('blur', () => {
    clearTimeout(targetDebounceTimer);
    update(false);
  });

  // Anchor presets
  document.querySelectorAll('.btn-preset-base').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      clearTimeout(baseDebounceTimer);
      baseInputEl.value = (e.target as HTMLElement).getAttribute('data-val') || '';
      update(false);
    });
  });

  // Target presets
  document.querySelectorAll('.btn-preset-target').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      clearTimeout(targetDebounceTimer);
      if (targetInputEl) targetInputEl.value = (e.target as HTMLElement).getAttribute('data-val') || '';
      update(false);
    });
  });

  // Format Tokens
  document.querySelectorAll('.btn-token').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const tok = (e.target as HTMLElement).getAttribute('data-token') || '';
      if (formatInputEl) {
        formatInputEl.value += (formatInputEl.value.endsWith(' ') || formatInputEl.value === '' ? '' : ' ') + tok;
        update(false);
      }
    });
  });

  // Format presets
  document.querySelectorAll('.btn-preset-format').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (formatInputEl) {
        formatInputEl.value = (e.target as HTMLElement).getAttribute('data-tmpl') || '';
        update(false);
      }
    });
  });

  // Mutation buttons
  document.getElementById('btn-add-day')?.addEventListener('click', () => {
    mutationDays += 1;
    update(false);
  });
  document.getElementById('btn-sub-day')?.addEventListener('click', () => {
    mutationDays -= 1;
    update(false);
  });
  document.getElementById('btn-add-week')?.addEventListener('click', () => {
    mutationDays += 7;
    update(false);
  });
  document.getElementById('btn-add-month')?.addEventListener('click', () => {
    mutationMonths += 1;
    update(false);
  });
  document.getElementById('btn-snap-week')?.addEventListener('click', () => {
    snapMode = snapMode === 'start-week' ? 'none' : 'start-week';
    update(false);
  });
  document.getElementById('btn-snap-month')?.addEventListener('click', () => {
    snapMode = snapMode === 'end-month' ? 'none' : 'end-month';
    update(false);
  });
  document.getElementById('btn-reset-mut')?.addEventListener('click', () => {
    mutationDays = 0;
    mutationMonths = 0;
    snapMode = 'none';
    update(false);
  });

  // Copy code button
  document.getElementById('btn-copy-code')?.addEventListener('click', async () => {
    const code = document.getElementById('output-code')!.textContent || '';
    const btn = document.getElementById('btn-copy-code')!;
    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = '✅ Copied!';
    } catch {
      btn.textContent = '❌ Copy failed';
    }
    setTimeout(() => {
      btn.textContent = '📋 Copy Code';
    }, 1500);
  });
}

// Initialize and evaluate
initUI();
update(false);
