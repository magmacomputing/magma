import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import CatalogList from './components/CatalogList.vue'
import PluginRepl from './components/PluginRepl.vue'
import DialectTabs from './components/DialectTabs.vue'
import Glossary from './components/Glossary.vue'
import Layout from './Layout.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('CatalogList', CatalogList)
    app.component('PluginRepl', PluginRepl)
    app.component('DialectTabs', DialectTabs)
    app.component('Glossary', Glossary)
  }
} satisfies Theme

