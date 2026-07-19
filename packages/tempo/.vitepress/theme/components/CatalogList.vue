<script setup lang="ts">
import { ref, computed } from 'vue';

interface Plugin {
  id: string;
  name: string;
  description: string;
  packageName: string;
  price: number;
  status: string;
  plan: string;
  version: string;
}

import catalogData from '../data/catalog.json';

const plugins = ref<Plugin[]>(catalogData as unknown as Plugin[]);

const communityPlugins = computed(() => plugins.value.filter(p => p.plan === 'community' && p.status === 'active'));
const premiumPlugins = computed(() => plugins.value.filter(p => p.plan !== 'community' && p.status === 'active'));
const comingSoonPlugins = computed(() => plugins.value.filter(p => p.status === 'coming_soon'));

const copiedPkg = ref<string | null>(null);

const copyInstall = (pkgName: string) => {
  navigator.clipboard.writeText(`npm install ${pkgName}`);
  copiedPkg.value = pkgName;
  setTimeout(() => {
    if (copiedPkg.value === pkgName) {
      copiedPkg.value = null;
    }
  }, 2000);
}
</script>

<template>
  <div class="catalog-container">
    <div>
      <h2 id="community">Community Plugins</h2>
      <p>These plugins are free, open-source extensions that do not require a license token.</p>
      <div class="grid">
        <div v-for="plugin in communityPlugins" :key="plugin.id" class="card">
          <div class="card-title">
            <h3>{{ plugin.name }}</h3>
            <span v-if="plugin.version" class="card-version">v{{ plugin.version }}</span>
          </div>
          <p>{{ plugin.description }}</p>
          <div class="actions" style="display: flex; gap: 0.5rem; align-items: center;">
            <code>npm install {{ plugin.packageName }}</code>
            <div style="position: relative; display: flex;">
              <button @click="copyInstall(plugin.packageName)" class="btn icon-btn" title="Copy install command">
                <svg v-if="copiedPkg === plugin.packageName" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              <span v-if="copiedPkg === plugin.packageName" class="copy-tooltip">Copied!</span>
            </div>
            <a :href="`../9-plugins/${plugin.id}.index`" class="btn btn-secondary icon-btn" title="View Documentation">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </div>
        </div>
      </div>
      
      <h2 id="premium">Premium Plugins</h2>
      <p>Enterprise-grade extensions. A cryptographic license token is required.</p>
      
      <div style="display: flex; align-items: center; gap: 16px; margin: 16px 0; padding: 16px; background-color: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-brand); border-radius: 8px;">
        <a href="https://registry.magmacomputing.com.au" target="_blank" rel="noopener noreferrer" style="display: flex; flex-shrink: 0;">
          <img src="https://registry.magmacomputing.com.au/registry-logo.svg" width="48" height="48" alt="Tempo License Registry" style="margin: 0;" />
        </a>
        <div>
          <strong><a href="https://registry.magmacomputing.com.au" target="_blank" rel="noopener noreferrer">👉 Go to the Tempo License Registry 👈</a></strong><br>
          Manage your subscriptions and retrieve your license key.
        </div> 
      </div>

      <div class="grid">
        <div v-for="plugin in premiumPlugins" :key="plugin.id" class="card premium-card">
          <div class="badge">Premium</div>
          <div class="card-title">
            <h3>{{ plugin.name }}</h3>
            <span v-if="plugin.version" class="card-version">v{{ plugin.version }}</span>
          </div>
          <p>{{ plugin.description }}</p>
          <div class="actions" style="display: flex; gap: 0.5rem; align-items: center;">
            <code>npm install {{ plugin.packageName }}</code>
            <div style="position: relative; display: flex;">
              <button @click="copyInstall(plugin.packageName)" class="btn icon-btn" title="Copy install command">
                <svg v-if="copiedPkg === plugin.packageName" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              <span v-if="copiedPkg === plugin.packageName" class="copy-tooltip">Copied!</span>
            </div>
            <a :href="`../9-plugins/${plugin.id}.index`" class="btn btn-secondary icon-btn" title="View Documentation">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </div>
        </div>
      </div>
      
      <h2 id="coming-soon" v-if="comingSoonPlugins.length > 0">Coming Soon</h2>
      <div class="grid">
        <div v-for="plugin in comingSoonPlugins" :key="plugin.id" class="card disabled">
          <div class="card-title">
            <h3>{{ plugin.name }}</h3>
            <span v-if="plugin.version" class="card-version">v{{ plugin.version }}</span>
          </div>
          <p>{{ plugin.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.catalog-container {
  margin-top: 2rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}
.card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1.5rem;
  background-color: var(--vp-c-bg-soft);
  position: relative;
  display: flex;
  flex-direction: column;
}
.card-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.card h3 {
  margin-top: 0;
  margin-bottom: 0;
  font-size: 1.25rem;
}
.card-version {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--vp-c-text-3);
  white-space: nowrap;
  flex-shrink: 0;
}
.card p {
  flex-grow: 1;
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  margin-bottom: 1.5rem;
}
.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.actions code {
  flex-grow: 1;
  font-size: 0.85em;
  padding: 0.4rem 0.6rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.btn {
  background-color: var(--vp-c-brand);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
  text-align: center;
}
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem;
}
.btn:hover {
  background-color: var(--vp-c-brand-dark);
}
.btn.primary {
  width: 100%;
}
.premium-card {
  border-color: var(--vp-c-brand);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.badge {
  position: absolute;
  top: -10px;
  right: 15px;
  background: var(--vp-c-danger-1, #ef4444);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
}
.btn-secondary {
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}
.btn-secondary:hover {
  background-color: var(--vp-c-bg-mute);
}
.disabled {
  opacity: 0.6;
}
.loading {
  text-align: center;
  padding: 3rem;
  font-size: 1.2rem;
  color: var(--vp-c-text-2);
}
.copy-tooltip {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
  white-space: nowrap;
  pointer-events: none;
  animation: tooltipFadeIn 0.15s ease-out;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
}
.copy-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 4px;
  border-style: solid;
  border-color: var(--vp-c-text-1) transparent transparent transparent;
}
@keyframes tooltipFadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(4px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
