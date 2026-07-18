import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pluginsDir = path.resolve(__dirname, '../../../packages/plugins');
const targetDir = path.resolve(__dirname, '../doc/9-plugins');

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });

// Track normalised plugin IDs to detect collisions early (e.g. both '.setup/' and 'setup/' present)
const usedPluginIds = new Map(); // pluginId -> original directory name

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
