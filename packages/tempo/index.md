---
layout: home

hero:
  name: "Tempo"
  text: "The Professional Date-Time Library"
  tagline: "Fluent, Immutable, and Zero-Cost wrapper for the Temporal API."
  image:
    src: /logo.svg
    alt: Tempo Logo
  actions:
    - theme: brand
      text: Get Started
      link: /README
    - theme: alt
      text: View on GitHub
      link: https://github.com/magmacomputing/magma/tree/main/packages/tempo

features:
  - title: "Zero-Cost Constructor"
    details: "Lazy evaluation and smart matching ensure instantiation overhead is near-zero, even with massive plugin lists."
  - title: "Relational Math"
    details: "Shift by semantic terms (Quarters, Seasons, Periods) while preserving your relative cycle offset."
  - title: "Hardened & Modular"
    details: "Built for resilience in complex monorepos with proxy-protected registries and decoupled diagnostics."
---

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const hDeg = ref(0)
const mDeg = ref(0)
const sDeg = ref(0)
const timeStr = ref('--:--:--')

let ticker = null

function updateHands(h24, m, s) {
  const h = h24 % 12
  hDeg.value = (h / 12) * 360 + (m / 60) * 30
  mDeg.value = (m / 60) * 360 + (s / 60) * 6
  sDeg.value = (s / 60) * 360
}

onMounted(async () => {
  // Snap hands to the correct position immediately (no flash while Tempo loads).
  const now = new Date()
  updateHands(now.getHours(), now.getMinutes(), now.getSeconds())
  timeStr.value = now.toTimeString().slice(0, 8)

  // Dynamically import Tempo + TickerModule so this code only ever runs
  // on the client — the imports are never evaluated during SSR.
  const [{ Tempo }, { TickerModule }] = await Promise.all([
    import('@magmacomputing/tempo'),
    import('@magmacomputing/tempo/ticker'),
  ])
  Tempo.extend(TickerModule)

  // One-second ticker drives the clock hands.
  ticker = Tempo.ticker({ seconds: 1 }, (t) => {
    updateHands(t.hh, t.mi, t.ss)
    timeStr.value = t.format('{HH}:{mi}:{ss}')
  })
})

onUnmounted(() => {
  // Automatically disposed when the viewer navigates away from the page.
  ticker?.stop()
  ticker = null
})
</script>

<div class="tempo-clock-section">
  <div class="tempo-clock-inner">
    <h2 class="tempo-clock-title">Live <code>Tempo.ticker</code> Demo</h2>
    <p class="tempo-clock-desc">
      This analog clock is driven by a single
      <code>Tempo.ticker({ seconds: 1 })</code> call.
      It starts the moment you land on this page and is automatically
      disposed when you navigate away — no zombie timers, no memory leaks.
    </p>
    <div class="tempo-clock-wrap">
      <svg class="tempo-clock-svg" viewBox="0 0 200 200" aria-label="Analog clock">
        <!-- Face -->
        <circle cx="100" cy="100" r="94" class="tempo-clock-face" />
        <!-- 60 tick marks: 12 long (hour) + 48 short (minute) -->
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
        <!-- Hour hand -->
        <line
          x1="100" y1="100" x2="100" y2="50"
          :transform="`rotate(${hDeg}, 100, 100)`"
          class="tempo-hand-hour"
        />
        <!-- Minute hand -->
        <line
          x1="100" y1="100" x2="100" y2="32"
          :transform="`rotate(${mDeg}, 100, 100)`"
          class="tempo-hand-minute"
        />
        <!-- Second hand with a short counterbalance tail -->
        <line
          x1="100" y1="114" x2="100" y2="24"
          :transform="`rotate(${sDeg}, 100, 100)`"
          class="tempo-hand-second"
        />
        <!-- Centre hub -->
        <circle cx="100" cy="100" r="6"   class="tempo-hub" />
        <circle cx="100" cy="100" r="2.5" class="tempo-hub-inner" />
      </svg>
      <p class="tempo-digital-time">{{ timeStr }}</p>
    </div>
  </div>
</div>

<style scoped>
.tempo-clock-section {
  padding: 56px 24px 72px;
  display: flex;
  justify-content: center;
}

.tempo-clock-inner {
  max-width: 520px;
  text-align: center;
}

.tempo-clock-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 12px;
  line-height: 1.3;
}

.tempo-clock-desc {
  color: var(--vp-c-text-2);
  font-size: 0.95rem;
  line-height: 1.7;
  margin-bottom: 32px;
}

.tempo-clock-wrap {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.tempo-clock-svg {
  width: 210px;
  height: 210px;
  filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.18));
}

.tempo-clock-face {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-border);
  stroke-width: 2;
}

.tempo-tick-major {
  stroke: var(--vp-c-text-1);
  stroke-width: 2.5;
  stroke-linecap: round;
}

.tempo-tick-minor {
  stroke: var(--vp-c-text-2);
  stroke-width: 1;
  stroke-linecap: round;
}

.tempo-hand-hour {
  stroke: var(--vp-c-text-1);
  stroke-width: 6;
  stroke-linecap: round;
}

.tempo-hand-minute {
  stroke: var(--vp-c-text-1);
  stroke-width: 3.5;
  stroke-linecap: round;
}

.tempo-hand-second {
  stroke: var(--vp-c-brand-1);
  stroke-width: 1.5;
  stroke-linecap: round;
}

.tempo-hub {
  fill: var(--vp-c-text-1);
}

.tempo-hub-inner {
  fill: var(--vp-c-brand-1);
}

.tempo-digital-time {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  font-size: 1.3rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--vp-c-text-1);
  margin: 0;
}
</style>
