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

const plugins = fs.readdirSync(pluginsDir);
for (const plugin of plugins) {
  const docDir = path.join(pluginsDir, plugin, 'doc');
  if (!fs.existsSync(docDir)) continue;

  const files = fs.readdirSync(docDir).filter(f => f.endsWith('.md'));
  if (files.length === 0) continue;

  // Normalise plugin directory name for use as a VitePress-safe filename segment:
  // Leading dots are replaced with underscores to avoid router issues and prevent
  // silent collision between e.g. '.setup/' and 'setup/' (would both strip to 'setup').
  const pluginId = plugin.replace(/^\./, '_');

  if (usedPluginIds.has(pluginId)) {
    const conflict = usedPluginIds.get(pluginId);
    throw new Error(
      `harvest-plugins: name collision detected!\n` +
      `  Both '${conflict}' and '${plugin}' normalise to pluginId '${pluginId}'.\n` +
      `  Rename one of the plugin directories to resolve the conflict.`
    );
  }
  usedPluginIds.set(pluginId, plugin);

  for (const file of files) {
    let content = fs.readFileSync(path.join(docDir, file), 'utf8');

    // Rewrite internal sibling links within the same plugin's doc/ folder
    // Maps: ./other.md -> ./[pluginId].other.md
    content = content.replace(/\]\(\.\/([^/]+)\.md\)/g, `](./${pluginId}.$1.md)`);

    // Rewrite cross-plugin relative links so they work in VitePress
    // Maps: ../../[plugin-dir]/doc/[filename].md -> ./[normalised-pluginId].[filename].md
    content = content.replace(/\]\(\.\.\/\.\.\/([^/]+)\/doc\/([^/]+)\.md\)/g, (_m, p, f) => `](./${p.replace(/^\./, '_')}.${f}.md)`);

    const basename = path.basename(file, '.md');
    const outName = `${pluginId}.${basename}.md`;
    fs.writeFileSync(path.join(targetDir, outName), content);
    console.log(`Harvested docs for plugin: ${plugin} (${file} -> ${outName})`);
  }
}
