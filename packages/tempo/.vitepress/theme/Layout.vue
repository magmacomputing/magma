<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import { useData, withBase } from 'vitepress';
import { computed } from 'vue';

const { Layout } = DefaultTheme;
const { page } = useData();

const isSetupPage = computed(() => {
	const path = page.value.relativePath || '';
	return path.includes('_setup');
});

// Detect if current page is a harvested plugin doc (/doc/9-plugins/...), the plugin ecosystem catalog, or within a plugin section
const isPluginPage = computed(() => {
	const path = page.value.relativePath || '';
	return path.includes('9-plugins') || path.includes('plugins/') || path.includes('ecosystem');
});

const logoUrl = computed(() => {
	if (isSetupPage.value) return withBase('/registry-logo.svg');
	if (isPluginPage.value) return withBase('/plugin-logo.svg');
	return withBase('/tempo-logo.svg');
});
</script>

<template>
  <Layout>
    <template #nav-bar-title-before>
      <img :src="logoUrl" alt="Tempo Logo" class="custom-navbar-logo" />
    </template>
  </Layout>
</template>

<style scoped>
.custom-navbar-logo {
  height: 24px;
  margin-right: 8px;
  vertical-align: middle;
  display: inline-block;
}
</style>
