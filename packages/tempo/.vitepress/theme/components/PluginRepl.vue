<script setup lang="ts">
import { ref, computed } from 'vue';

const props = withDefaults(
  defineProps<{
    plugin: string;
    title?: string;
    snippet?: string;
    height?: string;
  }>(),
  {
    title: '',
    snippet: '',
    height: '460px'
  }
);

const isActive = ref(false);

const DEFAULT_SNIPPETS: Record<string, string> = {
  geo: `// 🌍 Live Geolocation Demo (@magmacomputing/tempo-plugin-geo)
// Resolves your browser location or IP coordinates

const lookup = await Tempo.geo.lookup();
console.log('Detected City:', lookup.city ?? 'Local City');
console.log('Coordinates:', lookup.lat, lookup.lng);

// Attach coordinates to a Tempo instance:
const localTime = new Tempo('now', { geo: lookup });
console.log('Astronomical Season:', localTime.term.szn);
console.log('Moon Phase:', localTime.term.lunar.phase);

return \`Located at \${lookup.city ?? 'Local City'} (\${lookup.lat?.toFixed(2)}°, \${lookup.lng?.toFixed(2)}°)\`;`,

  astro: `// ☀️ Astronomical Seasons & Solstices Demo (@magmacomputing/tempo-plugin-astro)
const sydney = new Tempo('2026-07-01', { sphere: 'south' });
const london = new Tempo('2026-07-01', { sphere: 'north' });

console.log('Sydney in July:', sydney.term.astro, '-> Season:', sydney.term.szn);
console.log('London in July:', london.term.astro, '-> Season:', london.term.szn);

const equinox = new Tempo('2026-03-20', { sphere: 'north' });
console.log('March 20 Equinox:', equinox.term.equinox);

return \`Sydney: \${sydney.term.szn} | London: \${london.term.szn}\`;`,

  celestial: `// 🌙 Celestial Solar & Lunar Ephemeris Demo (@magmacomputing/tempo-plugin-celestial)
const now = new Tempo();
console.log('Moon Phase:', now.term.lunar.phase);
console.log('Illumination:', (now.term.lunar.illumination * 100).toFixed(1) + '%');
console.log('Is King Tide?', now.term.tides.isKingTide);

return \`Phase: \${now.term.lunar.phase} (\${(now.term.lunar.illumination * 100).toFixed(0)}% illuminated)\`;`,

  dialects: `// 🌐 Dialects Formatting & Parsing Demo (@magmacomputing/tempo-plugin-dialects)
const { DialectsPlugin, DIALECT } = await import('@magmacomputing/tempo-plugin-dialects');
Tempo.use(DialectsPlugin);

const t = new Tempo('2026-10-24T15:30:45');
console.log('Luxon drop-in .toFormat():', t.toFormat('dd LLL yyyy, HH:mm'));
console.log('POSIX strftime:', t.dialects.strftime('%Y-%m-%d %H:%M:%S'));

const parsed = Tempo.fromFormat('24/10/2026 15:30', 'dd/MM/yyyy HH:mm');
console.log('Parsed ISO:', parsed.iso);

return t.toFormat('dd LLL yyyy (HH:mm:ss)');`,

  batch: `// ⚡ Parallel Bulk Mutation Demo (@magmacomputing/tempo-plugin-batch)
const { BatchPlugin } = await import('@magmacomputing/tempo-plugin-batch');
Tempo.use(BatchPlugin);

const timestamps = [1700000000000, 1700086400000, 1700172800000];
console.log('Original timestamps count:', timestamps.length);

const mutated = await Tempo.batch(timestamps, { weeks: 1 });
console.log('Mutated +1 week timestamps:', mutated);

return \`Batch processed \${mutated.length} timestamps successfully!\`;`,

  finance: `// 💼 Fiscal & Financial Math Demo (@magmacomputing/tempo-plugin-finance)
const { FinanceNamespace } = await import('@magmacomputing/tempo-plugin-finance');
Tempo.use(FinanceNamespace);

const t = new Tempo('2026-07-15');
console.log('Fiscal Quarter:', t.finance.fiscalQuarter);
console.log('Tax Year:', t.finance.taxYear);
console.log('Is Fiscal Year Start?', t.finance.isFiscalYearStart());

return \`Fiscal Q\${t.finance.fiscalQuarter} (Tax Year \${t.finance.taxYear})\`;`,

  snap: `// ⏱️ Time Snapping & Quantization Demo (@magmacomputing/tempo-plugin-snap)
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

  sync: `// 🔄 Cross-Thread Time Sync Demo (@magmacomputing/tempo-plugin-sync)
const { SyncPlugin } = await import('@magmacomputing/tempo-plugin-sync');
Tempo.use(SyncPlugin);

const clock = Tempo.sync.startClock({ updateIntervalMs: 1 });
console.log('Sync clock active:', clock.running);
console.log('Clock buffer byte length:', clock.buffer.byteLength);

const nowMs = clock.now();
console.log('High-precision current epoch ms:', nowMs);

return \`Clock running: \${clock.running} (Epoch: \${nowMs})\`;`,

  ticker: `// ⏰ Continuous Temporal Ticker Demo (@magmacomputing/tempo-plugin-ticker)
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

  ai: `// 🤖 AI Semantic Parsing & Scheduling (@magmacomputing/tempo-plugin-ai)
const { AiPlugin } = await import('@magmacomputing/tempo-plugin-ai');
Tempo.use(AiPlugin);

await Tempo.ai.init({
  providers: [
    { id: 'ollama', endpoint: 'http://localhost:11434/v1', model: 'llama3' }
  ],
  remoteConfigUrl: false
});

console.log('Tempo.ai initialized with local provider support');
console.log('Ready to parse: "Next Tuesday around 2:30pm"');

return 'Tempo.ai sandbox ready (provide provider key or local Ollama)';`
};

const activeSnippet = computed(() => {
  if (props.snippet && props.snippet.trim().length > 0) return props.snippet.trim();
  return DEFAULT_SNIPPETS[props.plugin] ?? `// ⚡ Interactive Demo for ${props.plugin}\nconst t = new Tempo();\nconsole.log(t.format());\nreturn t.iso;`;
});

const iframeSrc = computed(() => {
  const base = '/magma/repl/index.html';
  const codeParam = activeSnippet.value ? `#code=${btoa(encodeURIComponent(activeSnippet.value))}` : '';
  return `${base}?embed=true&plugin=${encodeURIComponent(props.plugin)}${codeParam}`;
});

const fullReplLink = computed(() => {
  const base = '/magma/repl/index.html';
  const codeParam = activeSnippet.value ? `#code=${btoa(encodeURIComponent(activeSnippet.value))}` : '';
  return `${base}?plugin=${encodeURIComponent(props.plugin)}${codeParam}`;
});

function launchRepl() {
  isActive.value = true;
}
</script>

<template>
  <div class="plugin-repl-container" :style="{ minHeight: height }">
    <!-- 1. Interactive Sandbox (Active Mode) -->
    <div v-if="isActive" class="plugin-repl-active">
      <iframe
        :src="iframeSrc"
        sandbox="allow-scripts allow-modals allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        :style="{ width: '100%', height: height, border: 'none', borderRadius: '8px' }"
        :title="title || `Interactive ${plugin} demo`"
      ></iframe>
    </div>

    <!-- 2. Static Facade Preview (Default Zero-Cost Mode) -->
    <div v-else class="plugin-repl-facade" :style="{ height: height }">
      <div class="facade-header">
        <div class="facade-title">
          <svg class="plugin-icon" viewBox="0 0 285 235.319" fill="#38bdf8" style="width: 20px; height: 16px; filter: drop-shadow(0 0 5px rgba(56, 189, 248, 0.45));">
            <g transform="translate(-32, 10) scale(0.6, 0.85)">
              <path fill="#38bdf8" d="M183,102V88h10V58h-23V16.5c0-6.351-5.149-11.5-11.5-11.5h0c-6.351,0-11.5,5.149-11.5,11.5V58h-39V16.5 C108,10.149,102.851,5,96.5,5h0C90.149,5,85,10.149,85,16.5V58H62v30h10v14c0,26.958,20.828,49.9,47,53v49c0,25.957,21.043,47,47,47 h27v-17h-27c-16.5,0-30-13.5-30-30v-49C162.256,152.008,183,129.039,183,102z"></path>
            </g>
            <g transform="translate(50, 0)">
              <path fill="#38bdf8" d="m201.094,29.997c2.649-0.623 4.623-2.996 4.623-5.835v-18.162c0-3.313-2.687-6-6-6h-164.114c-3.313,0-6,2.687-6,6v18.163c0,2.839 1.974,5.212 4.623,5.835 1.812,32.314 18.594,61.928 45.682,80.076l11.324,7.586-11.324,7.586c-27.089,18.147-43.871,47.762-45.682,80.076-2.649,0.623-4.623,2.996-4.623,5.835v18.163c0,3.313 2.687,6 6,6h164.114c3.313,0 6-2.687 6-6v-18.163c0-2.839-1.974-5.212-4.623-5.835-1.812-32.314-18.594-61.928-45.683-80.076l-11.324-7.586 11.324-7.586c27.089-18.148 43.871-47.763 45.683-80.077zm-159.491-17.997h152.114v6.163h-152.114v-6.163zm152.114,211.319h-152.114v-6.163h152.114v6.163zm-63.749-110.644c-1.663,1.114-2.661,2.983-2.661,4.985s0.998,3.871 2.661,4.985l18.765,12.571c23.71,15.883 38.49,41.705 40.333,69.941h-142.812c1.843-28.235 16.623-54.057 40.333-69.941l18.765-12.571c1.663-1.114 2.661-2.983 2.661-4.985s-0.998-3.871-2.661-4.985l-18.765-12.571c-23.71-15.884-38.49-41.706-40.333-69.941h142.812c-1.843,28.236-16.623,54.057-40.333,69.941l-18.765,12.571z"/>
              <path fill="#38bdf8" d="m133.307,82.66h-31.295c-2.487,0-4.717,1.535-5.605,3.858-0.888,2.324-0.25,4.955 1.604,6.613l15.647,14c1.139,1.019 2.57,1.528 4,1.528s2.862-0.509 4-1.528l15.647-14c1.854-1.659 2.492-4.29 1.604-6.613-0.885-2.323-3.115-3.858-5.602-3.858z"/>
              <path fill="#38bdf8" d="m117.414,140.581l-15.218,9.775c-13.306,8.914-21.292,23.876-21.292,39.892h76.511c0-16.016-7.986-30.978-21.292-39.892l-15.218-9.775c-1.074-0.644-2.416-0.644-3.491,0z"/>
            </g>
          </svg>
          <span>{{ title || `Interactive Demo (@magmacomputing/tempo-plugin-${plugin})` }}</span>
        </div>
        <a
          :href="fullReplLink"
          target="_blank"
          rel="noopener noreferrer"
          class="facade-link"
          title="Open in Full-Screen REPL"
        >
          <span>Open in Full REPL</span>
          <span>↗</span>
        </a>
      </div>

      <div class="facade-body">
        <pre class="facade-code"><code>{{ activeSnippet }}</code></pre>

        <!-- Overlay CTA -->
        <div class="facade-overlay">
          <button @click="launchRepl" class="btn-launch" title="Launch Interactive REPL in this window">
            <span class="icon">▶</span>
            <span>Run Live Interactive Demo</span>
          </button>
          <span class="facade-hint">Executes 100% in browser via native ESM sandbox</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plugin-repl-container {
  margin: 20px 0 28px 0;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  background-color: #0b0f19;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.plugin-repl-active {
  width: 100%;
  height: 100%;
}

.plugin-repl-facade {
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  background-color: #0b0f19;
  color: #f8fafc;
  font-family: 'Fira Code', monospace;
}

.facade-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: rgba(17, 24, 39, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.8rem;
  font-family: var(--vp-font-family-base);
}

.facade-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #94a3b8;
}

.facade-title .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
}

.facade-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #38bdf8;
  font-size: 0.78rem;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.15s ease;
}

.facade-link:hover {
  color: #7dd3fc;
  text-decoration: underline;
}

.facade-body {
  position: relative;
  flex: 1;
  overflow: hidden;
}

.facade-code {
  margin: 0;
  padding: 16px;
  font-size: 0.85rem;
  line-height: 1.55;
  color: #cbd5e1;
  background: transparent;
  filter: blur(0.3px);
  user-select: none;
}

.facade-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(11, 15, 25, 0.65);
  backdrop-filter: blur(2px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.btn-launch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 8px;
  background: linear-gradient(135deg, #0284c7, #2563eb);
  color: #ffffff;
  font-family: var(--vp-font-family-base);
  font-size: 0.92rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(56, 189, 248, 0.35);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-launch:hover {
  transform: translateY(-1px);
  background: linear-gradient(135deg, #0369a1, #1d4ed8);
  box-shadow: 0 6px 20px rgba(56, 189, 248, 0.5);
}

.btn-launch .icon {
  font-size: 0.85rem;
}

.facade-hint {
  font-size: 0.75rem;
  color: #94a3b8;
  font-family: var(--vp-font-family-base);
}
</style>
