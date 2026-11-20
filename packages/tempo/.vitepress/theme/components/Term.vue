<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { withBase } from 'vitepress';
import { data as entries, type GlossaryEntry } from '../../../doc/glossary.data';

const props = defineProps<{
  name: string;
}>();

const termIndex = new Map<string, GlossaryEntry>();
for (const entry of entries) {
  termIndex.set(entry.slug.toLowerCase(), entry);
  termIndex.set(entry.term.toLowerCase(), entry);
  for (const alias of entry.aliases ?? [])
    termIndex.set(alias.toLowerCase(), entry);
}

const entry = computed(() => termIndex.get(props.name.trim().toLowerCase()));
const hovered = ref(false);
const focused = ref(false);
const dismissed = ref(false);
const open = computed(() => !dismissed.value && (hovered.value || focused.value));
const tooltipId = useId();
const tooltipRef = ref<HTMLElement | null>(null);
const shiftPx = ref(0);
const placeBelow = ref(false);

const updateTooltipPosition = async () => {
  shiftPx.value = 0;
  placeBelow.value = false;
  await nextTick();
  if (typeof window === 'undefined' || !tooltipRef.value)
    return;
  const rect = tooltipRef.value.getBoundingClientRect();
  const pad = 8;
  if (rect.top < pad)
    placeBelow.value = true;
  if (rect.left < pad)
    shiftPx.value = pad - rect.left;
  else if (rect.right > window.innerWidth - pad)
    shiftPx.value = (window.innerWidth - pad) - rect.right;
};

const onMouseEnter = () => {
  hovered.value = true;
  dismissed.value = false;
};

const onMouseLeave = () => {
  hovered.value = false;
  if (!focused.value)
    dismissed.value = false;
};

const onFocusIn = () => {
  focused.value = true;
  dismissed.value = false;
};

const onFocusOut = () => {
  focused.value = false;
  if (!hovered.value)
    dismissed.value = false;
};

const onEscape = () => {
  dismissed.value = true;
};

const onDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape')
    onEscape();
};

watch(open, (isOpen) => {
  if (typeof document === 'undefined')
    return;
  if (isOpen) {
    document.addEventListener('keydown', onDocumentKeydown);
    void updateTooltipPosition();
  } else {
    document.removeEventListener('keydown', onDocumentKeydown);
    shiftPx.value = 0;
    placeBelow.value = false;
  }
});

onBeforeUnmount(() => {
  if (typeof document !== 'undefined')
    document.removeEventListener('keydown', onDocumentKeydown);
});

const href = computed(() =>
  entry.value ? withBase(`/doc/4-advanced-reference/glossary#${entry.value.slug}`) : undefined
);
</script>

<template>
  <span
    v-if="entry"
    class="glossary-term-wrap"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    @keydown.escape="onEscape"
  >
    <a
      :href="href"
      class="glossary-term"
      :aria-describedby="open ? tooltipId : undefined"
    >
      <slot>{{ entry.term }}</slot>
    </a>
    <span
      v-show="open"
      ref="tooltipRef"
      :id="tooltipId"
      role="tooltip"
      class="glossary-tooltip"
      :class="{ 'glossary-tooltip--below': placeBelow }"
      :style="shiftPx ? { transform: `translateX(calc(-50% + ${shiftPx}px))` } : undefined"
    >
      <strong class="tooltip-title">{{ entry.term }}</strong>
      <span class="tooltip-summary">{{ entry.summary }}</span>
    </span>
  </span>
  <span v-else class="glossary-term-missing">
    <slot>{{ name }}</slot>
  </span>
</template>

<style scoped>
.glossary-term-wrap {
  position: relative;
  display: inline-block;
}

.glossary-term {
  color: inherit;
  text-decoration: underline dotted var(--vp-c-brand-1);
  text-underline-offset: 3px;
  cursor: help;
}

.glossary-term:hover,
.glossary-term:focus-visible {
  color: var(--vp-c-brand-1);
}

.glossary-tooltip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  z-index: 40;
  width: max-content;
  max-width: 280px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-3);
  color: var(--vp-c-text-1);
  font-size: 0.8rem;
  line-height: 1.4;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.glossary-tooltip--below {
  bottom: auto;
  top: calc(100% + 8px);
}

.glossary-tooltip--below::after {
  top: auto;
  bottom: 100%;
}

.glossary-tooltip::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 10px;
}

.tooltip-title {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.tooltip-summary {
  color: var(--vp-c-text-2);
  font-weight: 400;
}
</style>
