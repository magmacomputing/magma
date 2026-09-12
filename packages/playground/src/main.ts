import './polyfill';
import { Tempo } from '@magmacomputing/tempo';

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

// State
let mutationDays = 0;
let mutationMonths = 0;
let snapMode: 'none' | 'start-week' | 'end-month' = 'none';

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

// 2. Render UI Shell Once (prevents input focus loss when typing)
function initUI() {
  document.getElementById('app')!.innerHTML = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 880px; margin: 24px auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
      
      <!-- Top Bar with Official Tempo Logo -->
      <div style="border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="/tempo-logo-cyan.svg" alt="Tempo Logo" style="width: 44px; height: 44px; filter: drop-shadow(0 0 8px rgba(56,189,248,0.35));" />
          <div>
            <h1 style="margin: 0; font-size: 1.5rem; font-weight: 800; color: #38bdf8; letter-spacing: -0.02em;">
              Tempo Interactive Workbench
            </h1>
            <p style="margin: 2px 0 0; color: #94a3b8; font-size: 0.85rem;">
              The Professional Date-Time Library for the Temporal API
            </p>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: #1e293b; border: 1px solid #334155; color: #38bdf8; font-size: 0.75rem; padding: 4px 10px; border-radius: 999px; font-weight: 600;">v4.2.0</span>
          <span id="badge-tz" style="background: #1e293b; border: 1px solid #334155; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; color: #4ade80; font-family: monospace;"></span>
        </div>
      </div>

      <!-- SECTION 1: ANCHOR DATE -->
      <div style="background: #1e293b; padding: 16px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #334155;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #38bdf8;">
            1. Anchor Date / Expression
          </label>
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
          <label style="display: block; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #22c55e; margin-bottom: 8px;">
            4. Duration & Relative Time (.until / .since)
          </label>
          <div style="margin-bottom: 10px;">
            <span style="font-size: 0.75rem; color: #94a3b8;">Compare against target date:</span>
            <input id="input-target" type="text" value="Christmas" style="width: 100%; padding: 6px 10px; border-radius: 6px; background: #0f172a; color: white; border: 1px solid #475569; font-size: 0.85rem; box-sizing: border-box; margin-top: 4px;">
            <div id="error-target" style="color: #f87171; font-size: 0.75rem; margin-top: 4px; display: none;"></div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem;">
            <div style="background: #0f172a; padding: 8px; border-radius: 6px;">
              <div style="color: #64748b; font-size: 0.7rem; text-transform: uppercase;">.until (Days)</div>
              <div id="output-until-days" style="color: #4ade80; font-weight: 700; font-size: 0.95rem;">-</div>
            </div>
            <div style="background: #0f172a; padding: 8px; border-radius: 6px;">
              <div style="color: #64748b; font-size: 0.7rem; text-transform: uppercase;">.since (Relative)</div>
              <div id="output-since-str" style="color: #e2e8f0; font-weight: 600; font-size: 0.85rem;">-</div>
            </div>
          </div>
        </div>

      </div>

      <!-- SECTION 5: GENERATED TS CODE -->
      <div style="background: #1e293b; padding: 16px; border-radius: 12px; border: 1px solid #334155;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #94a3b8;">
            Generated TypeScript Code
          </label>
          <button id="btn-copy-code" style="background: #334155; border: 1px solid #475569; color: #38bdf8; font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; cursor: pointer;">
            📋 Copy Code
          </button>
        </div>
        <pre id="output-code" style="margin: 0; background: #0f172a; padding: 12px; border-radius: 8px; color: #cbd5e1; font-size: 0.8rem; font-family: monospace; overflow-x: auto; line-height: 1.4;"></pre>
      </div>

    </div>
  `;

  attachEventListeners();
}

// 3. Reactive Update Engine (Updates DOM nodes without re-rendering inputs)
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
  const errorTargetEl = document.getElementById('error-target')!;
  const badgeIsoEl = document.getElementById('badge-iso')!;
  const badgeTzEl = document.getElementById('badge-tz')!;
  const outputFormattedEl = document.getElementById('output-formatted')!;
  const outputUntilDaysEl = document.getElementById('output-until-days')!;
  const outputSinceStrEl = document.getElementById('output-since-str')!;
  const labelMutationStatusEl = document.getElementById('label-mutation-status')!;
  const outputCodeEl = document.getElementById('output-code')!;

  // 1. Resolve Anchor Date
  let currentTempo = lastValidTempo;
  let isBaseValid = true;

  try {
    const candidate = new Tempo(baseText || undefined);
    lastValidTempo = candidate;
    currentTempo = candidate;
    isBaseValid = true;

    // Valid state: clear error, set styling
    errorBaseEl.style.display = 'none';
    if (baseInputEl) baseInputEl.style.borderColor = '#475569';
    badgeIsoEl.textContent = candidate.iso;
    badgeIsoEl.style.color = '#38bdf8';
    badgeTzEl.textContent = candidate.tz;
  } catch (err: any) {
    isBaseValid = false;
    currentTempo = lastValidTempo; // preserve last valid tempo for downstream preview

    if (isTyping) {
      // While actively typing: show gentle typing indicator, keep last valid preview
      badgeIsoEl.innerHTML = `<span style="color: #93c5fd; font-style: italic;">typing...</span>`;
      errorBaseEl.style.display = 'none';
      if (baseInputEl) baseInputEl.style.borderColor = '#38bdf8';
    } else {
      // Idle / debounced / on blur: show friendly, clean guidance rather than terrifying raw stack
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

  // Update badge with mutated time if base is valid
  if (isBaseValid) {
    badgeIsoEl.textContent = mutatedTempo.iso;
  }

  // 2. Format String calculation
  let formattedResult = '';
  try {
    formattedResult = mutatedTempo.format(formatText);
    outputFormattedEl.textContent = formattedResult;
    outputFormattedEl.style.color = '#4ade80';
  } catch (err: any) {
    outputFormattedEl.textContent = `[Format Error: ${err.message}]`;
    outputFormattedEl.style.color = '#f87171';
  }

  // 3. Duration calculation
  if (targetText) {
    try {
      const target = new Tempo(targetText);
      lastValidTarget = target;
      errorTargetEl.style.display = 'none';
      if (targetInputEl) targetInputEl.style.borderColor = '#475569';
      const days = mutatedTempo.until(target, 'days');
      outputUntilDaysEl.textContent = `${Math.round(days)} days`;
      outputSinceStrEl.textContent = mutatedTempo.since(target, 'days');
    } catch (err: any) {
      if (isTyping) {
        if (lastValidTarget) {
          const days = mutatedTempo.until(lastValidTarget, 'days');
          outputUntilDaysEl.textContent = `${Math.round(days)} days`;
          outputSinceStrEl.textContent = mutatedTempo.since(lastValidTarget, 'days');
        }
      } else {
        errorTargetEl.textContent = `⚠️ Incomplete target date or expression`;
        errorTargetEl.style.display = 'block';
        if (targetInputEl) targetInputEl.style.borderColor = '#f87171';
        outputUntilDaysEl.textContent = '—';
        outputSinceStrEl.textContent = '—';
      }
    }
  } else {
    errorTargetEl.style.display = 'none';
    if (targetInputEl) targetInputEl.style.borderColor = '#475569';
    outputUntilDaysEl.textContent = '—';
    outputSinceStrEl.textContent = '—';
  }

  // 4. Mutation status label
  const mutParts: string[] = [];
  if (mutationDays !== 0) mutParts.push(`${mutationDays > 0 ? '+' : ''}${mutationDays}d`);
  if (mutationMonths !== 0) mutParts.push(`${mutationMonths > 0 ? '+' : ''}${mutationMonths}m`);
  if (snapMode !== 'none') mutParts.push(`snap: ${snapMode}`);
  labelMutationStatusEl.textContent = mutParts.length > 0 ? mutParts.join(', ') : 'None';

  // 5. Generate copyable TypeScript code
  let codeSnippet = `import { Tempo } from '@magmacomputing/tempo';\\n\\n`;
  codeSnippet += `const t = new Tempo('${baseText || 'now'}')`;
  if (mutationDays !== 0 || mutationMonths !== 0) {
    const muts: string[] = [];
    if (mutationDays !== 0) muts.push(`days: ${mutationDays}`);
    if (mutationMonths !== 0) muts.push(`months: ${mutationMonths}`);
    codeSnippet += `\\n  .add({ ${muts.join(', ')} })`;
  }
  if (snapMode === 'start-week') codeSnippet += `\\n  .set({ week: 'start' })`;
  if (snapMode === 'end-month') codeSnippet += `\\n  .set({ month: 'end' })`;
  codeSnippet += `;\\n\\n`;
  codeSnippet += `const result = t.format('${formatText}');\\n`;
  codeSnippet += `// → "${formattedResult}"`;

  outputCodeEl.textContent = codeSnippet;
}

function attachEventListeners() {
  const baseInputEl = document.getElementById('input-base') as HTMLInputElement;
  const formatInputEl = document.getElementById('input-format') as HTMLInputElement;
  const targetInputEl = document.getElementById('input-target') as HTMLInputElement;

  // Typing in Anchor Date: immediate typing feedback + 300ms debounced validation
  baseInputEl.addEventListener('input', () => {
    update(true);
    clearTimeout(baseDebounceTimer);
    baseDebounceTimer = setTimeout(() => {
      update(false);
    }, 300);
  });

  baseInputEl.addEventListener('blur', () => {
    clearTimeout(baseDebounceTimer);
    update(false);
  });

  // Format String: real-time keystroke update (Tempo handles incomplete tokens gracefully)
  formatInputEl.addEventListener('input', () => update(false));

  // Target Date: typing feedback + 300ms debounced validation
  targetInputEl.addEventListener('input', () => {
    update(true);
    clearTimeout(targetDebounceTimer);
    targetDebounceTimer = setTimeout(() => {
      update(false);
    }, 300);
  });

  targetInputEl.addEventListener('blur', () => {
    clearTimeout(targetDebounceTimer);
    update(false);
  });

  // Anchor presets: immediate update without debounce
  document.querySelectorAll('.btn-preset-base').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      clearTimeout(baseDebounceTimer);
      baseInputEl.value = (e.target as HTMLElement).getAttribute('data-val') || '';
      update(false);
    });
  });

  // Token buttons (insert at cursor / append)
  document.querySelectorAll('.btn-token').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const tok = (e.target as HTMLElement).getAttribute('data-token') || '';
      formatInputEl.value += (formatInputEl.value.endsWith(' ') || formatInputEl.value === '' ? '' : ' ') + tok;
      update(false);
    });
  });

  // Format presets
  document.querySelectorAll('.btn-preset-format').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      formatInputEl.value = (e.target as HTMLElement).getAttribute('data-tmpl') || '';
      update(false);
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
  document.getElementById('btn-copy-code')?.addEventListener('click', () => {
    const code = document.getElementById('output-code')!.textContent || '';
    navigator.clipboard.writeText(code);
    const btn = document.getElementById('btn-copy-code')!;
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
      btn.textContent = '📋 Copy Code';
    }, 1500);
  });
}

// Start
initUI();
update(false);
