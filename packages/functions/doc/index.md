---
layout: home
---

<script setup>
import { withBase } from 'vitepress'

const logoUrl = withBase('/img/functions-logo.svg')
const getStartedUrl = withBase('/functions/')
</script>

<div class="tempo-hero">
  <div class="tempo-hero-content">
    <div class="tempo-hero-left">
      <div class="tempo-title-row">
        <img :src="logoUrl" class="tempo-hero-logo" alt="functions Logo">
        <h1 class="tempo-hero-name">tempo-fns</h1>
      </div>
      <div class="tempo-tagline-row">
        <p class="tempo-hero-tagline">Pure, modern, and tree-shakable date-time utilities.</p>
        <div class="tempo-hero-actions">
          <a :href="getStartedUrl" class="tempo-btn tempo-btn-brand">Get Started</a>
          <a href="https://github.com/magmacomputing/magma" class="tempo-btn tempo-btn-alt">View on GitHub</a>
        </div>
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
  justify-content: flex-start;
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
  align-items: flex-start;
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

.tempo-tagline-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.tempo-hero-tagline {
  font-size: 1.6rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0;
  line-height: 1.3;
  text-align: left;
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
  color: var(--vp-c-white);
}
.tempo-btn-brand:hover {
  background-color: #2980b9;
  color: white;
}

.tempo-btn-alt {
  background-color: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}
.tempo-btn-alt:hover {
  background-color: var(--vp-c-bg-soft);
}
</style>

<div style="max-width: 900px; margin: 64px auto 0; padding: 0 24px;">

## Designed for the ECMAScript Ecosystem

`tempo-fns` is a comprehensive suite of **pure, functional date-time utilities** built exclusively for the modern JavaScript and TypeScript ecosystem. 

Designed to seamlessly augment the new [ECMAScript Temporal API](https://tc39.es/proposal-temporal/docs/), this library delivers the advanced calendar, scheduling, and timezone logic that modern web applications demand—without polluting your bundles.

### Why `tempo-fns`?
- **100% Pure Functions:** Every utility is a pure, standalone function. No mutated state, no side effects.
- **Aggressively Tree-Shakable:** Keep your bundle footprint tiny. Only import exactly what you need. If you only need `isSameFiscalQuarter`, that's the only code that ships to your users.
- **Native Temporal Integration:** No legacy `Date` objects. `tempo-fns` is built from the ground up to consume, calculate, and return native `Temporal` instances.

Whether you're building complex financial SLA calculators, recurring cron-based scheduling systems, or simply need robust calendar math, `tempo-fns` provides the modern, professional tooling you need to ship with confidence.

</div>
