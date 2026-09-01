import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pluginsDir = path.resolve(__dirname, '../../../packages/plugins');
const targetDir = path.resolve(__dirname, '../doc/9-plugins');
const sidebarOutputFile = path.resolve(__dirname, '../.vitepress/theme/data/plugins-sidebar.json');

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });

// Track normalised plugin IDs to detect collisions early (e.g. both '.setup/' and 'setup/' present)
const usedPluginIds = new Map(); // pluginId -> original directory name
const harvestedByPlugin = new Map(); // pluginId -> Array<{ basename: string, title: string, link: string }>

const KNOWN_TITLES = {
  'ai.index': 'Overview',
  'ai.init': 'Initialization (initAI)',
  'ai.parse': 'Smart Parsing (parseAI)',
  'ai.format': 'Narrative Formatting (formatAI)',
  'ai.extract': 'Entity Extraction (extractAI)',
  'ai.recurrence': 'Recurrence Rules (recurrenceAI)',
  'ai.schedule': 'Conflict Scheduling (scheduleAI)',
  'ai.diff': 'Time Differences (diffAI)',
  'ai.context': 'Regional Context (contextAI)',
  'ai.modes': 'Execution Modes',
  'ai.security': 'Security & PII Protection',
  'ai.grounding': 'Grounding & Normalization',
  'ai.rate-limits': 'Rate Limits & Caching',
  'ai.architecture': 'Provider Architecture',
  'astro.index': 'Astro (Seasons & Solstices)',
  'batch.index': 'Batch (Multi-Threaded SAB)',
  'celestial.index': 'Celestial (Solar & Lunar Ephemeris)',
  'finance.index': 'Finance (Fiscal & Business)',
  'snap.index': 'Snap (Block Rounding)',
  'sync.index': 'Sync (Thread Synchronization)',
  'ticker.index': 'Ticker (Execution Loop)'
};

const PREFERRED_AI_ORDER = [
  'index',
  'init',
  'parse',
  'format',
  'extract',
  'recurrence',
  'schedule',
  'diff',
  'context',
  'modes',
  'security',
  'grounding',
  'rate-limits',
  'architecture'
];

function extractTitle(content, pluginId, basename) {
  const key = `${pluginId}.${basename}`;
  if (KNOWN_TITLES[key]) return KNOWN_TITLES[key];

  const match = content.match(/^#\s+(.+)$/m);
  if (match) {
    return match[1]
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();
  }

  return basename
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const nodeModulesDir = path.resolve(__dirname, '../../../node_modules/@magmacomputing');

function harvest(dir, pluginDirName, pluginId, isExternal = false) {
  const docDir = path.join(dir, pluginDirName, 'doc');
  if (!fs.existsSync(docDir)) return;

  const files = fs.readdirSync(docDir).filter(f => f.endsWith('.md'));
  if (files.length === 0) return;

  if (usedPluginIds.has(pluginId)) {
    if (isExternal) {
      // Local plugin takes precedence over node_modules, just skip.
      return;
    }
    const conflict = usedPluginIds.get(pluginId);
    throw new Error(
      `harvest-plugins: name collision detected!\n` +
      `  Both '${conflict}' and '${pluginDirName}' normalise to pluginId '${pluginId}'.\n` +
      `  Rename one of the plugin directories to resolve the conflict.`
    );
  }
  usedPluginIds.set(pluginId, pluginDirName);

  if (!harvestedByPlugin.has(pluginId))
    harvestedByPlugin.set(pluginId, []);

  for (const file of files) {
    let content = fs.readFileSync(path.join(docDir, file), 'utf8');

    // Rewrite internal sibling links within the same plugin's doc/ folder
    // Maps: ./other.md -> ./[pluginId].other.md
    content = content.replace(/\]\(\.\/([^/]+)\.md(?:([#?][^)]*))?\)/g, `](./${pluginId}.$1.md$2)`);

    // Rewrite cross-plugin relative links so they work in VitePress
    // Maps: ../../[plugin-dir]/doc/[filename].md -> ./[normalised-pluginId].[filename].md
    content = content.replace(/\]\(\.\.\/\.\.\/([^/]+)\/doc\/([^/]+)\.md(?:([#?][^)]*))?\)/g, (_m, p, f, q) => `](./${p.replace(/^\./, '_')}.${f}.md${q || ''})`);

    const basename = path.basename(file, '.md');
    const outName = `${pluginId}.${basename}.md`;
    fs.writeFileSync(path.join(targetDir, outName), content);

    const title = extractTitle(content, pluginId, basename);
    const link = `/doc/9-plugins/${pluginId}.${basename}`;
    harvestedByPlugin.get(pluginId).push({ basename, title, link });

    console.log(`Harvested docs for plugin: ${pluginId} (${file} -> ${outName})`);
  }
}

// 1. Harvest from local mono-repo plugins
if (fs.existsSync(pluginsDir)) {
  const plugins = fs.readdirSync(pluginsDir);
  for (const plugin of plugins) {
    const pluginId = plugin.replace(/^\./, '_');
    harvest(pluginsDir, plugin, pluginId);
  }
}

// 2. Harvest from node_modules/@magmacomputing (Dependabot NPM packages)
if (fs.existsSync(nodeModulesDir)) {
  const modules = fs.readdirSync(nodeModulesDir);
  for (const mod of modules) {
    if (mod.startsWith('tempo-plugin-')) {
      const pluginId = mod.replace('tempo-plugin-', '');
      harvest(nodeModulesDir, mod, pluginId, true);
    }
  }
}

// 3. Generate dynamic multi-sidebar structure for /doc/9-plugins/
const sidebar = [
  {
    text: 'Plugin Ecosystem',
    items: [
      { text: '← Back to Catalog', link: '/doc/3-extending-tempo/ecosystem' },
      { text: 'Plugin Setup Guide', link: '/doc/9-plugins/_setup.index' }
    ]
  }
];

// Group AI plugin items
if (harvestedByPlugin.has('ai')) {
  const aiItems = harvestedByPlugin.get('ai');
  aiItems.sort((a, b) => {
    const indexA = PREFERRED_AI_ORDER.indexOf(a.basename);
    const indexB = PREFERRED_AI_ORDER.indexOf(b.basename);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.basename.localeCompare(b.basename);
  });

  sidebar.push({
    text: 'AI Plugin (@magmacomputing/tempo-plugin-ai)',
    collapsed: false,
    items: aiItems.map(item => ({ text: item.title, link: item.link }))
  });
}

// Group other community & pro plugins
const otherPlugins = [];
for (const [pluginId, items] of harvestedByPlugin.entries()) {
  if (pluginId === 'ai' || pluginId === '_setup') continue;
  for (const item of items) {
    otherPlugins.push({ text: item.title, link: item.link });
  }
}

otherPlugins.sort((a, b) => a.text.localeCompare(b.text));

if (otherPlugins.length > 0) {
  sidebar.push({
    text: 'Community & Pro Plugins',
    collapsed: false,
    items: otherPlugins
  });
}

fs.mkdirSync(path.dirname(sidebarOutputFile), { recursive: true });
fs.writeFileSync(sidebarOutputFile, JSON.stringify(sidebar, null, 2), 'utf8');
console.log(`Generated dynamic plugins sidebar -> ${sidebarOutputFile}`);
