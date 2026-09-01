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
  hidden?: boolean;
}

interface DomainGroup {
  id: string;
  title: string;
  description: string;
  pluginIds: string[];
}

import catalogData from '../data/catalog.json';

const plugins = ref<Plugin[]>(catalogData as unknown as Plugin[]);

const communityPlugins = computed(() => plugins.value.filter(p => !p.hidden && p.plan === 'community' && (p.status === 'active' || p.status === 'experimental')));
const premiumPlugins = computed(() => plugins.value.filter(p => !p.hidden && p.plan !== 'community' && (p.status === 'active' || p.status === 'experimental')));
const comingSoonPlugins = computed(() => plugins.value.filter(p => !p.hidden && p.status === 'coming_soon'));

const DOMAIN_GROUPS: DomainGroup[] = [
  {
    id: 'celestial',
    title: '☀️ Celestial & Astronomical Science',
    description: 'Hemisphere-aware solar events, lunar phase tracking, solstices, and twilight boundaries.',
    pluginIds: ['astro', 'celestial']
  },
  {
    id: 'ai',
    title: '🤖 AI & Natural Language',
    description: 'LLM-powered natural language date parsing, narrative formatting, and recurrence rules.',
    pluginIds: ['ai']
  },
  {
    id: 'business',
    title: '💼 Business, Finance & UI Utilities',
    description: 'Fiscal calendars, financial namespaces, and precision block-snapping for UI controls.',
    pluginIds: ['finance', 'snap']
  },
  {
    id: 'system',
    title: '⚡ High Performance & System Execution',
    description: 'Lock-free thread synchronization, continuous execution loops, and SAB multi-threading.',
    pluginIds: ['batch', 'sync', 'ticker']
  }
];

const categorizedCommunityPlugins = computed(() => {
  const activeCommunity = communityPlugins.value;
  const groups = DOMAIN_GROUPS.map(group => ({
    ...group,
    plugins: activeCommunity.filter(p => group.pluginIds.includes(p.id))
  })).filter(g => g.plugins.length > 0);

  const assignedIds = new Set(DOMAIN_GROUPS.flatMap(g => g.pluginIds));
  const uncategorized = activeCommunity.filter(p => !assignedIds.has(p.id));

  if (uncategorized.length > 0) {
    groups.push({
      id: 'other',
      title: '🧩 Other Extensions',
      description: 'General-purpose community plugins for Tempo.',
      pluginIds: uncategorized.map(p => p.id),
      plugins: uncategorized
    });
  }

  return groups;
});

const copiedPkg = ref<string | null>(null);

const copyInstall = (pkgName: string) => {
  navigator.clipboard.writeText(`npm install ${pkgName}`);
  copiedPkg.value = pkgName;
  setTimeout(() => {
    if (copiedPkg.value === pkgName) {
      copiedPkg.value = null;
    }
  }, 2000);
};
</script>

<template>
  <div class="catalog-container">
    <!-- Community Plugins by Domain Group -->
    <section>
      <h2 id="community" class="section-title">Community Plugins</h2>
      <p class="section-subtitle">Free, open-source extensions under the MIT license organized by functional domain.</p>

      <div v-for="group in categorizedCommunityPlugins" :key="group.id" class="domain-group">
        <div class="domain-header">
          <h3 :id="group.id" class="domain-title">{{ group.title }}</h3>
          <p class="domain-desc">{{ group.description }}</p>
        </div>

        <div class="row-list">
          <div 
            v-for="plugin in group.plugins" 
            :key="plugin.id" 
            class="plugin-row"
            :class="{'experimental-row': plugin.status === 'experimental'}"
          >
            <div class="plugin-info">
              <div class="title-line">
                <span class="plugin-name">{{ plugin.name }}</span>
                <span v-if="plugin.version" class="version-tag">v{{ plugin.version }}</span>
                <span v-if="plugin.status === 'experimental'" class="badge experimental-badge">Experimental</span>
              </div>
              <p class="plugin-desc">{{ plugin.description }}</p>
            </div>

            <div class="plugin-actions">
              <div class="copy-wrapper">
                <button 
                  @click="copyInstall(plugin.packageName)" 
                  class="action-btn copy-icon-btn" 
                  :class="{'copied': copiedPkg === plugin.packageName}"
                  title="Copy Install Command"
                >
                  <svg v-if="copiedPkg === plugin.packageName" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
                <span v-if="copiedPkg === plugin.packageName" class="copy-tooltip">Copied!</span>
              </div>

              <a :href="`../9-plugins/${plugin.id}.index`" class="action-btn docs-icon-btn" title="View Documentation">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Premium Plugins -->
    <section v-if="premiumPlugins.length > 0" class="premium-section">
      <h2 id="premium" class="section-title">Premium Plugins</h2>
      <p class="section-subtitle">Enterprise-grade extensions requiring a license token.</p>
      
      <div class="registry-banner">
        <a href="https://registry.magmacomputing.com.au" target="_blank" rel="noopener noreferrer">
          <img src="https://registry.magmacomputing.com.au/registry-logo.svg" width="40" height="40" alt="Tempo License Registry" />
        </a>
        <div>
          <strong><a href="https://registry.magmacomputing.com.au" target="_blank" rel="noopener noreferrer">👉 Go to the Tempo License Registry 👈</a></strong><br>
          Manage your subscriptions and retrieve your license key.
        </div> 
      </div>

      <div class="row-list">
        <div 
          v-for="plugin in premiumPlugins" 
          :key="plugin.id" 
          class="plugin-row premium-row"
          :class="{'experimental-row': plugin.status === 'experimental'}"
        >
          <div class="plugin-info">
            <div class="title-line">
              <span class="plugin-name">{{ plugin.name }}</span>
              <span v-if="plugin.version" class="version-tag">v{{ plugin.version }}</span>
              <span class="badge premium-badge">Premium</span>
              <span v-if="plugin.status === 'experimental'" class="badge experimental-badge">Experimental</span>
            </div>
            <p class="plugin-desc">{{ plugin.description }}</p>
          </div>

          <div class="plugin-actions">
            <div class="copy-wrapper">
              <button 
                @click="copyInstall(plugin.packageName)" 
                class="action-btn copy-icon-btn" 
                :class="{'copied': copiedPkg === plugin.packageName}"
                title="Copy Install Command"
              >
                <svg v-if="copiedPkg === plugin.packageName" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              <span v-if="copiedPkg === plugin.packageName" class="copy-tooltip">Copied!</span>
            </div>

            <a :href="`../9-plugins/${plugin.id}.index`" class="action-btn docs-icon-btn" title="View Documentation">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Coming Soon -->
    <section v-if="comingSoonPlugins.length > 0" class="coming-soon-section">
      <h2 id="coming-soon" class="section-title">Coming Soon</h2>
      <div class="row-list">
        <div v-for="plugin in comingSoonPlugins" :key="plugin.id" class="plugin-row disabled">
          <div class="plugin-info">
            <div class="title-line">
              <span class="plugin-name">{{ plugin.name }}</span>
              <span v-if="plugin.version" class="version-tag">v{{ plugin.version }}</span>
            </div>
            <p class="plugin-desc">{{ plugin.description }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.catalog-container {
  margin-top: 1.5rem;
}
.section-title {
  margin-top: 2rem;
  margin-bottom: 0.25rem;
}
.section-subtitle {
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  margin-bottom: 1.5rem;
}

/* Domain Category Styling */
.domain-group {
  margin-bottom: 2.25rem;
}
.domain-header {
  margin-bottom: 0.75rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.domain-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.domain-desc {
  margin: 0.2rem 0 0 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

/* Row-List Layout */
.row-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.plugin-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.85rem 1.15rem;
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}
.plugin-row:hover {
  border-color: var(--vp-c-brand);
  background-color: var(--vp-c-bg-mute);
}

.plugin-info {
  flex: 1 1 auto;
  min-width: 0;
}
.title-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.plugin-name {
  font-weight: 600;
  font-size: 1.05rem;
  color: var(--vp-c-text-1);
}
.version-tag {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--vp-c-text-3);
  background-color: var(--vp-c-bg-mute);
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
}
.plugin-desc {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  line-height: 1.45;
}

/* Actions Section */
.plugin-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.copy-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

/* Common Action Button Base */
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--vp-c-bg-alt, var(--vp-c-bg));
  border: 1px solid var(--vp-c-divider);
  padding: 0.4rem 0.55rem;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

/* Icon-Only Copy Button */
.copy-icon-btn {
  color: var(--vp-c-text-2);
}
.copy-icon-btn:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
  background-color: var(--vp-c-bg-mute);
}
.copy-icon-btn.copied {
  border-color: #10b981;
  color: #10b981;
  background-color: rgba(16, 185, 129, 0.08);
}

/* Icon-Only Docs Link Button */
.docs-icon-btn {
  color: var(--vp-c-brand);
  text-decoration: none;
}
.docs-icon-btn:hover {
  border-color: var(--vp-c-brand);
  background-color: var(--vp-c-brand-soft, var(--vp-c-bg-mute));
}

/* Badges */
.badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.experimental-badge {
  background-color: var(--vp-c-warning-1, #f59e0b);
}
.premium-badge {
  background-color: var(--vp-c-brand, #3b82f6);
}

/* Registry Banner */
.registry-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 1rem 0 1.5rem 0;
  padding: 1rem 1.25rem;
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-brand);
  border-radius: 8px;
  font-size: 0.9rem;
}

/* Tooltip */
.copy-tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.72rem;
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

.disabled {
  opacity: 0.55;
}

/* Responsive breakpoint for mobile */
@media (max-width: 680px) {
  .plugin-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.85rem;
  }
  .plugin-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
