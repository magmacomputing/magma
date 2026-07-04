<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

interface Plugin {
  id: string;
  name: string;
  description: string;
  packageName: string;
  price: number;
  status: string;
}

const plugins = ref<Plugin[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('https://firestore.googleapis.com/v1/projects/tempo-registry/databases/(default)/documents/catalog');
    const data = await res.json();
    
    if (data.documents) {
      plugins.value = data.documents.map((doc: any) => {
        const id = doc.name.split('/').pop();
        const fields = doc.fields;
        return {
          id,
          name: fields.name?.stringValue || '',
          description: fields.description?.stringValue || '',
          packageName: fields.packageName?.stringValue || '',
          price: parseInt(fields.price?.integerValue || '0'),
          status: fields.status?.stringValue || 'active'
        }
      })
    }
  } catch (e) {
    console.error('Failed to fetch catalog', e);
  } finally {
    loading.value = false;
  }
})

const communityPlugins = computed(() => plugins.value.filter(p => p.price === 0 && p.status === 'active'));
const premiumPlugins = computed(() => plugins.value.filter(p => p.price > 0 && p.status === 'active'));
const comingSoonPlugins = computed(() => plugins.value.filter(p => p.status === 'coming_soon'));

const copyInstall = (pkgName: string) => {
  navigator.clipboard.writeText(`npm install ${pkgName}`);
  alert(`Copied: npm install ${pkgName}`);
}
</script>

<template>
  <div class="catalog-container">
    <div v-if="loading" class="loading">Loading catalog...</div>
    
    <div v-else>
      <h2 id="community">Community Plugins</h2>
      <p>These plugins are free, open-source extensions that do not require a license token.</p>
      <div class="grid">
        <div v-for="plugin in communityPlugins" :key="plugin.id" class="card">
          <h3>{{ plugin.name }}</h3>
          <p>{{ plugin.description }}</p>
          <div class="actions" style="display: flex; gap: 0.5rem; align-items: center;">
            <code>npm install {{ plugin.packageName }}</code>
            <button @click="copyInstall(plugin.packageName)" class="btn icon-btn" title="Copy install command">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <a :href="`https://www.npmjs.com/package/${plugin.packageName}`" target="_blank" class="btn btn-secondary icon-btn" title="View Documentation">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </div>
        </div>
      </div>
      
      <h2 id="premium">Premium Plugins</h2>
      <p>Enterprise-grade extensions. A cryptographic license token is required.</p>
      <div class="grid">
        <div v-for="plugin in premiumPlugins" :key="plugin.id" class="card premium-card">
          <div class="badge">Premium</div>
          <h3>{{ plugin.name }}</h3>
          <p>{{ plugin.description }}</p>
          <div class="actions" style="display: flex; gap: 0.5rem; align-items: center;">
            <a href="https://registry.magmacomputing.com.au" target="_blank" class="btn primary" style="flex: 1;">Get a License</a>
            <a :href="`https://www.npmjs.com/package/${plugin.packageName}`" target="_blank" class="btn btn-secondary icon-btn" title="View Documentation">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </div>
        </div>
      </div>
      
      <h2 id="coming-soon" v-if="comingSoonPlugins.length > 0">Coming Soon</h2>
      <div class="grid">
        <div v-for="plugin in comingSoonPlugins" :key="plugin.id" class="card disabled">
          <h3>{{ plugin.name }}</h3>
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
.card h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
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
  background: var(--vp-c-brand);
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
</style>
