<script setup lang="ts">
import { ref, computed } from 'vue';
import { withBase } from 'vitepress';
import { data as entries, type GlossaryCategory, type GlossaryEntry } from '../../../doc/glossary.data';

const CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  'temporal-math': 'Temporal Math',
  'formatting': 'Formatting & Parsing',
  'reactivity': 'Reactivity & Signals',
  'architecture': 'Core Architecture',
  'plugins': 'Plugins & Extensions',
  'standards': 'Standards',
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as GlossaryCategory[];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const selectedCategory = ref<GlossaryCategory | 'all'>('all');
const query = ref('');

const filteredEntries = computed<GlossaryEntry[]>(() => {
  const q = query.value.trim().toLowerCase();
  return entries.filter((entry) => {
    if (selectedCategory.value !== 'all' && entry.category !== selectedCategory.value)
      return false;
    if (!q)
      return true;
    const hay = [
      entry.term,
      entry.summary,
      entry.details ?? '',
      ...(entry.aliases ?? []),
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });
});

const groupedEntries = computed(() => {
  const groups = new Map<string, GlossaryEntry[]>();
  for (const entry of filteredEntries.value) {
    const letter = entry.term[0]?.toUpperCase() || '#';
    const list = groups.get(letter) ?? [];
    list.push(entry);
    groups.set(letter, list);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
});

const activeLetters = computed(() => new Set(groupedEntries.value.map(([letter]) => letter)));
</script>

<template>
  <div class="glossary-root">
    <div class="glossary-controls">
      <input
        v-model="query"
        type="search"
        class="glossary-search"
        placeholder="Filter glossary terms, aliases, or definitions..."
        aria-label="Filter glossary terms"
      />
      <div class="glossary-chips" role="group" aria-label="Filter by category">
        <button
          type="button"
          class="glossary-chip"
          :class="{ active: selectedCategory === 'all' }"
          :aria-pressed="selectedCategory === 'all'"
          @click="selectedCategory = 'all'"
        >
          All ({{ entries.length }})
        </button>
        <button
          v-for="cat in CATEGORIES"
          :key="cat"
          type="button"
          class="glossary-chip"
          :class="{ active: selectedCategory === cat }"
          :aria-pressed="selectedCategory === cat"
          @click="selectedCategory = cat"
        >
          {{ CATEGORY_LABELS[cat] }}
        </button>
      </div>
    </div>

    <nav class="glossary-alpha" aria-label="Alphabetical index">
      <template v-for="letter in ALPHABET" :key="letter">
        <a
          v-if="activeLetters.has(letter)"
          :href="`#letter-${letter}`"
          class="alpha-link active"
        >{{ letter }}</a>
        <span v-else class="alpha-link disabled">{{ letter }}</span>
      </template>
    </nav>

    <p v-if="filteredEntries.length === 0" class="glossary-empty">
      No glossary terms match "{{ query }}".
    </p>

    <section
      v-for="[letter, list] in groupedEntries"
      :key="letter"
      :id="`letter-${letter}`"
      class="glossary-group"
    >
      <h2 class="glossary-letter">{{ letter }}</h2>
      <div class="glossary-cards">
        <article
          v-for="entry in list"
          :key="entry.slug"
          :id="entry.slug"
          class="glossary-card"
        >
          <header class="card-header">
            <h3 class="card-title">
              <a :href="`#${entry.slug}`" class="card-anchor">#</a>
              {{ entry.term }}
            </h3>
            <span class="card-badge">{{ CATEGORY_LABELS[entry.category] }}</span>
          </header>

          <p class="card-summary">{{ entry.summary }}</p>
          <p v-if="entry.details" class="card-details">{{ entry.details }}</p>

          <div v-if="entry.aliases?.length" class="card-meta">
            <span class="meta-label">Aliases:</span>
            <code>{{ entry.aliases.join(', ') }}</code>
          </div>

          <div v-if="entry.standards?.length || entry.seeAlso?.length" class="card-links">
            <template v-for="std in entry.standards ?? []" :key="std.name">
              <a
                v-if="std.url"
                :href="std.url"
                target="_blank"
                rel="noopener noreferrer"
                class="meta-pill standard"
              >{{ std.name }} ↗</a>
              <span v-else class="meta-pill standard">{{ std.name }}</span>
            </template>
            <a
              v-for="ref in entry.seeAlso ?? []"
              :key="ref.link"
              :href="withBase(ref.link)"
              class="meta-pill guide"
            >{{ ref.label }} →</a>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.glossary-root {
  margin-top: 16px;
}

.glossary-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.glossary-search {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
}

.glossary-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.glossary-chip {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
  cursor: pointer;
}

.glossary-chip.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.glossary-alpha {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px;
  margin-bottom: 20px;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.alpha-link {
  min-width: 24px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
}

.alpha-link.active {
  color: var(--vp-c-brand-1);
}

.alpha-link.disabled {
  color: var(--vp-c-text-3);
  opacity: 0.45;
}

.glossary-letter {
  margin-top: 24px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.glossary-cards {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.glossary-card {
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-title {
  margin: 0;
  font-size: 1.05rem;
}

.card-anchor {
  opacity: 0.45;
  text-decoration: none;
  margin-right: 4px;
}

.card-card:hover .card-anchor {
  opacity: 1;
}

.card-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

.card-summary {
  margin: 8px 0 0;
  color: var(--vp-c-text-1);
}

.card-details {
  margin: 6px 0 0;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

.card-meta {
  margin-top: 8px;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.meta-label {
  margin-right: 6px;
  font-weight: 600;
}

.card-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.meta-pill {
  font-size: 0.8rem;
  padding: 2px 10px;
  border-radius: 6px;
  text-decoration: none;
  border: 1px solid var(--vp-c-divider);
}

.meta-pill.standard {
  color: var(--vp-c-text-2);
}

.meta-pill.guide {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-soft);
}

.glossary-empty {
  color: var(--vp-c-text-2);
  font-style: italic;
}
</style>
