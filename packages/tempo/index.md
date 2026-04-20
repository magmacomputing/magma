---
layout: home
---

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { withBase } from 'vitepress'

const logoUrl = withBase('/logo.svg')
const getStartedUrl = withBase('/README')

// --- Clock State ---
const hDeg = ref(0)
const mDeg = ref(0)
const sDeg = ref(0)
const timeStr = ref('Loading...')
const tzStr = ref('')
const tickerActive = ref(true)
const isResuming = ref(false)

// --- Carousel State ---
const activeIndex = ref(0)
const isPaused = ref(false)
const transitionEnabled = ref(true)

const features = [
  { title: 'Zero-Cost', details: 'Lazy evaluation and smart matching ensure instantiation overhead is near-zero.', icon: '⚡' },
  { title: '#friday.last', details: 'Natural language parsing for business cycles. Resolve complex terms with zero configuration.', icon: '🎯' },
  { title: 'Cycle Persistence', details: 'Shift by semantic terms while preserving your relative day-of-period offset.', icon: '🔄' },
  { title: 'Tempo.ticker()', details: 'State-of-the-art timing engine with AsyncGenerator support and auto-adjusting TimeZones.', icon: '⏱️' },
  { title: 'Temporal Inside', details: 'Built on the ECMAScript Temporal API. Inherit the reliability of the future standard.', icon: '🏗️' },
  { title: 'Monorepo Resilient', details: 'Built for stability in complex environments with proxy-protected registries.', icon: '🛡️' },
  { title: 'Tree-Shakable', details: 'Keep your bundle light. Only import the modules you need—from Fiscal calendars to Tickers.', icon: '📦' },
  { title: 'Business Aware', details: 'Native support for fiscal quarters, years, and seasons. Perfect for financial applications.', icon: '📈' }
]

// 8 features + 3 clones for a seamless 3-card viewport
const displayFeatures = [...features, ...features.slice(0, 3)]

let isMounted = false
let ticker = null
let carouselTimer = null
let fallbackIntervalId = null
let initFailed = false
let resumeTimer = null

function updateHands(h24, m, s) {
  const h = h24 % 12
  hDeg.value = (h / 12) * 360 + (m / 60) * 30
  mDeg.value = (m / 60) * 360 + (s / 60) * 6
  sDeg.value = (s / 60) * 360
}

// One-time library setup
let initPromise = (async () => {
  try {
    // HMR Safeguard for development only (stripped in production)
    let registry, originalHas
    if (import.meta.env.DEV) {
      const registryKey = Symbol.for('$LibrarySerializerRegistry')
      registry = globalThis[registryKey] ??= new Map()
      // HMR Workaround: Temporarily bypass registry presence checks to allow class re-hydration
      originalHas = registry.has.bind(registry)
      registry.has = () => false
    }

    const [{ Tempo }, { TickerModule }] = await Promise.all([
      import('@magmacomputing/tempo'),
      import('@magmacomputing/tempo/ticker'),
    ])

    if (import.meta.env.DEV) registry.has = originalHas
    
    if (!Tempo.ticker) Tempo.extend(TickerModule)
    Tempo.init()
    
    return Tempo
  } catch (e) {
    console.error('Tempo failed to initialize:', e)
    initFailed = true
    initPromise = undefined
    throw e
  }
})()

async function startTicker() {
  if (initFailed) return
  try {
    if (!initPromise) return
    const Tempo = await initPromise
    if (!isMounted) return
    
    ticker?.stop()
    if (fallbackIntervalId) clearInterval(fallbackIntervalId)
    
    const sync = (t) => {
      const dt = t.toDateTime()
      updateHands(dt.hour, dt.minute, dt.second)
      timeStr.value = t.format('{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}')
      tzStr.value = t.tz
    }

    sync(new Tempo())
    ticker = Tempo.ticker({ seconds: 1 }, sync)
  } catch (e) {
    timeStr.value = `Error: ${e.message || 'Unknown'}`
    const fallback = () => {
      const d = new Date()
      updateHands(d.getHours(), d.getMinutes(), d.getSeconds())
      timeStr.value = `Fallback: ${d.toLocaleTimeString()} (${e.message})`
      tzStr.value = Intl.DateTimeFormat().resolvedOptions().timeZone
    }
    fallback()
    if (fallbackIntervalId) clearInterval(fallbackIntervalId)
    fallbackIntervalId = setInterval(fallback, 1000)
  }
}

function startCarousel() {
  if (carouselTimer) clearInterval(carouselTimer)
  carouselTimer = setInterval(() => {
    if (!isPaused.value) {
      activeIndex.value++
      // Seamless loop: if we hit the start of the clones, wait for slide then snap
      if (activeIndex.value >= features.length) {
        setTimeout(() => {
          if (!isMounted) return
          transitionEnabled.value = false
          activeIndex.value = 0
          setTimeout(() => { transitionEnabled.value = true }, 50)
        }, 850)
      }
    }
  }, 4000)
}

function handleVisibility() {
  if (resumeTimer) clearTimeout(resumeTimer)
  
  if (document.visibilityState === 'visible') {
    isResuming.value = true
    console.info('%c[Tempo]%c ⏳ Waking Ticker...', 'color: #f59e0b; font-weight: bold', 'color: inherit')
    
    resumeTimer = setTimeout(() => {
      if (document.visibilityState !== 'visible') return
      isResuming.value = false
      tickerActive.value = true
      console.info('%c[Tempo]%c ⚡ Ticker Resumed', 'color: #2563eb; font-weight: bold', 'color: inherit')
      startTicker()
      startCarousel()
    }, 1200)
  } else {
    isResuming.value = false
    tickerActive.value = false
    console.info('%c[Tempo]%c 💤 Ticker Paused (Standby)', 'color: #71717a; font-weight: bold', 'color: inherit')
    ticker?.stop()
    if (fallbackIntervalId) clearInterval(fallbackIntervalId)
    clearInterval(carouselTimer)
    carouselTimer = null
  }
}

onMounted(() => {
  isMounted = true
  startTicker()
  startCarousel()
  document.addEventListener('visibilitychange', handleVisibility)
})

onUnmounted(() => {
  isMounted = false
  ticker?.stop()
  if (fallbackIntervalId) clearInterval(fallbackIntervalId)
  clearInterval(carouselTimer)
  document.removeEventListener('visibilitychange', handleVisibility)
})

// --- A11y & Keyboard Controls ---
const featureRefs = ref([])

function handleKeydown(e) {
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    if (activeIndex.value > 0) activeIndex.value--
    focusActiveCard()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    if (activeIndex.value < features.length - 1) activeIndex.value++
    focusActiveCard()
  }
}

function focusActiveCard() {
  setTimeout(() => {
    const el = featureRefs.value[activeIndex.value]
    if (el) el.focus()
  }, 100)
}
</script>

<div class="tempo-hero">
  <div class="tempo-hero-content">
    <div class="tempo-hero-left">
      <div class="tempo-title-row">
        <img :src="logoUrl" class="tempo-hero-logo" alt="Tempo Logo">
        <h1 class="tempo-hero-name">Tempo</h1>
      </div>
      <div class="tempo-tagline-row">
        <p class="tempo-hero-tagline">The Professional Date-Time Library for the Temporal API</p>
        <div class="tempo-hero-actions">
          <a :href="getStartedUrl" class="tempo-btn tempo-btn-brand">Get Started</a>
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
          <div class="tempo-status-row">
            <p class="tempo-iso-time">{{ timeStr }}</p>
            <span :class="['tempo-ticker-status', tickerActive ? 'is-active' : 'is-standby', isResuming ? 'is-resuming' : '']">
              {{ tickerActive ? 'Live' : (isResuming ? 'Waking...' : 'Standby') }}
            </span>
          </div>
          <p class="tempo-tz-time">{{ tzStr }}</p>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="tempo-carousel-container" 
     role="region" 
     aria-label="Tempo features"
     @mouseenter="isPaused = true" 
     @mouseleave="isPaused = false"
     @keydown="handleKeydown">
  
  <div class="tempo-carousel-controls">
    <button class="tempo-carousel-toggle" @click="isPaused = !isPaused" :aria-label="isPaused ? 'Play carousel' : 'Pause carousel'">
      <span v-if="isPaused">▶️</span>
      <span v-else>⏸️</span>
    </button>
  </div>

  <div class="tempo-carousel-track" 
       role="list"
       :aria-live="isPaused ? 'off' : 'polite'"
       :style="{ 
         transform: `translateX(-${activeIndex * (100 / displayFeatures.length)}%)`,
         transition: transitionEnabled ? 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
       }">
    <div v-for="(feat, i) in displayFeatures" 
         :key="i" 
         :ref="el => featureRefs[i] = el"
         class="tempo-feature-card"
         role="listitem"
         tabindex="0">
      <div class="tempo-feature-content">
        <div class="tempo-feature-icon">{{ feat.icon }}</div>
        <h3 class="tempo-feature-title">{{ feat.title }}</h3>
        <p class="tempo-feature-details">{{ feat.details }}</p>
      </div>
    </div>
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

.tempo-carousel-container {
  overflow: hidden;
  padding: 60px 24px;
  max-width: 1152px;
  margin: 0 auto;
  position: relative;
}

.tempo-carousel-controls {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 10;
}

.tempo-carousel-toggle {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
}

.tempo-carousel-toggle:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-mute);
}

.tempo-carousel-track {
  display: flex;
  width: 366.66%; /* (8 + 3) / 3 * 100% */
}

.tempo-feature-card {
  flex: 0 0 calc(100% / 11);
  padding: 12px;
  box-sizing: border-box;
}

.tempo-feature-content {
  padding: 24px;
  height: 100%;
  background-color: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-border);
  transition: all 0.3s ease;
  cursor: default;
  position: relative;
}

.tempo-feature-content:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-4px);
  background-color: var(--vp-c-bg-mute);
}

.tempo-feature-icon { font-size: 2rem; margin-bottom: 12px; }
.tempo-feature-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 8px; color: var(--vp-c-brand-1); font-family: ui-monospace, monospace; }
.tempo-feature-details { font-size: 0.9rem; line-height: 1.5; color: var(--vp-c-text-2); }

@media (max-width: 768px) {
  .tempo-carousel-track { width: 1100%; }
  .tempo-feature-card { flex: 0 0 calc(100% / 11); }
}
.tempo-status-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
}

.tempo-ticker-status {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 700;
  transition: all 0.3s ease;
}

.tempo-ticker-status.is-active {
  background: rgba(37, 99, 235, 0.1);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.2);
  animation: tempo-pulse 2s infinite;
}

.tempo-ticker-status.is-resuming {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.tempo-ticker-status.is-standby {
  background: rgba(113, 113, 122, 0.1);
  color: #71717a;
  border: 1px solid rgba(113, 113, 122, 0.2);
}

@keyframes tempo-pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

.tempo-clock-mini {
  transition: opacity 0.5s ease;
}

.tempo-clock-mini:has(.is-standby) {
  opacity: 0.7;
}
</style>
