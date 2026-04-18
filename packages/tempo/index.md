---
layout: home
---

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const hDeg = ref(0)
const mDeg = ref(0)
const sDeg = ref(0)
const timeStr = ref('')
const tzStr = ref('')

let ticker = null

function updateHands(h24, m, s) {
  const h = h24 % 12
  hDeg.value = (h / 12) * 360 + (m / 60) * 30
  mDeg.value = (m / 60) * 360 + (s / 60) * 6
  sDeg.value = (s / 60) * 360
}

onMounted(async () => {
  // Dynamically import Tempo + TickerModule
  const [{ Tempo }, { TickerModule }] = await Promise.all([
    import('@magmacomputing/tempo'),
    import('@magmacomputing/tempo/ticker'),
  ])

  Tempo.extend(TickerModule)

  // Initial update
  const now = new Tempo()
  updateHands(now.hh, now.mi, now.ss)
  timeStr.value = now.format('{yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}')
  tzStr.value = now.tz

  // Continuous ticker
  ticker = Tempo.ticker({ seconds: 1 }, (t) => {
    updateHands(t.hh, t.mi, t.ss)
    timeStr.value = t.format('{yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}')
    tzStr.value = t.tz
  })
})

onUnmounted(() => {
  ticker?.stop()
  ticker = null
})
</script>

<div class="tempo-hero">
  <div class="tempo-hero-content">
    <div class="tempo-hero-left">
      <div class="tempo-title-row">
        <img src="/logo.svg" class="tempo-hero-logo" alt="Tempo Logo">
        <h1 class="tempo-hero-name">Tempo</h1>
      </div>
      <div class="tempo-tagline-row">
        <p class="tempo-hero-tagline">The Professional Date-Time Library for the Temporal API</p>
        <div class="tempo-hero-actions">
          <a href="/README" class="tempo-btn tempo-btn-brand">Get Started</a>
          <a href="https://github.com/magmacomputing/magma/tree/main/packages/tempo" class="tempo-btn tempo-btn-alt">View on GitHub</a>
        </div>
      </div>
    </div>
    <div class="tempo-hero-right">
      <div class="tempo-clock-mini">
        <svg class="tempo-clock-svg" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="94" class="tempo-clock-face" />
          <g v-for="n in 60" :key="n">
            <line
              x1="100"
              :y1="(n - 1) % 5 === 0 ? 8 : 13"
              x2="100"
              y2="22"
              :transform="`rotate(${(n - 1) * 6}, 100, 100)`"
              :class="(n - 1) % 5 === 0 ? 'tempo-tick-major' : 'tempo-tick-minor'"
            />
          </g>
          <line x1="100" y1="100" x2="100" y2="50" :transform="`rotate(${hDeg}, 100, 100)`" class="tempo-hand-hour" />
          <line x1="100" y1="100" x2="100" y2="32" :transform="`rotate(${mDeg}, 100, 100)`" class="tempo-hand-minute" />
          <line x1="100" y1="114" x2="100" y2="24" :transform="`rotate(${sDeg}, 100, 100)`" class="tempo-hand-second" />
          <circle cx="100" cy="100" r="6" class="tempo-hub" />
          <circle cx="100" cy="100" r="2.5" class="tempo-hub-inner" />
        </svg>
        <div class="tempo-time-display">
          <p class="tempo-iso-time">{{ timeStr }}</p>
          <p class="tempo-tz-time">{{ tzStr }}</p>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="tempo-features">
  <div class="tempo-feature-card">
    <h3 class="tempo-feature-title">Zero-Cost Constructor</h3>
    <p class="tempo-feature-details">Lazy evaluation and smart matching ensure instantiation overhead is near-zero, even with massive plugin lists.</p>
  </div>
  <div class="tempo-feature-card">
    <h3 class="tempo-feature-title">Relational Math</h3>
    <p class="tempo-feature-details">Shift by semantic terms (Quarters, Seasons, Periods) while preserving your relative cycle offset.</p>
  </div>
  <div class="tempo-feature-card">
    <h3 class="tempo-feature-title">Hardened & Modular</h3>
    <p class="tempo-feature-details">Built for resilience in complex monorepos with proxy-protected registries and decoupled diagnostics.</p>
  </div>
</div>

<style scoped>
.tempo-hero {
  padding: 80px 24px 64px;
  max-width: 1152px;
  margin: 0 auto;
}

.tempo-hero-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 64px;
}

@media (max-width: 960px) {
  .tempo-hero-content {
    flex-direction: column;
    text-align: center;
  }
}

.tempo-hero-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.tempo-title-row {
  display: flex;
  align-items: center;
  gap: 24px;
}

@media (max-width: 960px) {
  .tempo-title-row {
    flex-direction: column;
    gap: 16px;
  }
}

.tempo-hero-logo {
  width: 140px;
  height: 140px;
}

.tempo-hero-name {
  font-size: 5rem;
  font-weight: 800;
  color: #3498db;
  margin: 0;
  line-height: 1;
}

.tempo-hero-tagline {
  font-size: 1.6rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0;
  line-height: 1.3;
}

.tempo-hero-actions {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

@media (max-width: 960px) {
  .tempo-hero-actions {
    justify-content: center;
  }
}

.tempo-btn {
  padding: 0 24px;
  line-height: 44px;
  border-radius: 22px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}

.tempo-btn-brand {
  background-color: var(--vp-c-brand-1);
  color: white;
}
.tempo-btn-brand:hover {
  background-color: var(--vp-c-brand-2);
}

.tempo-btn-alt {
  background-color: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}
.tempo-btn-alt:hover {
  background-color: var(--vp-c-bg-soft);
}

.tempo-hero-right {
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 320px;
}

.tempo-clock-mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.tempo-clock-svg {
  width: 200px;
  height: 200px;
  filter: drop-shadow(0 8px 30px rgba(0, 0, 0, 0.12));
}

.tempo-clock-face {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-border);
  stroke-width: 2;
}

.tempo-tick-major { stroke: var(--vp-c-text-1); stroke-width: 2.5; stroke-linecap: round; }
.tempo-tick-minor { stroke: var(--vp-c-text-2); stroke-width: 1; stroke-linecap: round; }
.tempo-hand-hour { stroke: var(--vp-c-text-1); stroke-width: 6; stroke-linecap: round; }
.tempo-hand-minute { stroke: var(--vp-c-text-1); stroke-width: 3.5; stroke-linecap: round; }
.tempo-hand-second { stroke: var(--vp-c-brand-1); stroke-width: 1.5; stroke-linecap: round; }
.tempo-hub { fill: var(--vp-c-text-1); }
.tempo-hub-inner { fill: var(--vp-c-brand-1); }

.tempo-time-display {
  text-align: center;
}

.tempo-iso-time {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0;
  white-space: nowrap;
}

.tempo-tz-time {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  margin: 4px 0 0;
  white-space: nowrap;
}

.tempo-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  padding: 64px 24px;
  max-width: 1152px;
  margin: 0 auto;
}

.tempo-feature-card {
  background-color: var(--vp-c-bg-soft);
  padding: 24px;
  border-radius: 12px;
  border: 1px solid var(--vp-c-border);
  transition: border-color 0.25s, background-color 0.25s;
}

.tempo-feature-card:hover {
  border-color: var(--vp-c-brand-1);
}

.tempo-feature-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--vp-c-text-1);
}

.tempo-feature-details {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin: 0;
}
</style>
