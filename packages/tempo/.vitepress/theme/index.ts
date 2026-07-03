import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import CatalogList from './components/CatalogList.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CatalogList', CatalogList)
  }
} satisfies Theme
