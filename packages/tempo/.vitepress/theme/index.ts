import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import CatalogList from './components/CatalogList.vue'
import Layout from './Layout.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('CatalogList', CatalogList)
  }
} satisfies Theme
