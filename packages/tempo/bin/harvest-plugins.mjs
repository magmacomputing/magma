import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pluginsDir = path.resolve(__dirname, '../../../packages/plugins');
const targetDir = path.resolve(__dirname, '../doc/9-plugins');

if (!fs.existsSync(targetDir))
  fs.mkdirSync(targetDir, { recursive: true });

const plugins = fs.readdirSync(pluginsDir);
for (const plugin of plugins) {
  const docPath = path.join(pluginsDir, plugin, 'doc', 'index.md');
  if (fs.existsSync(docPath)) {
    let content = fs.readFileSync(docPath, 'utf8');
    fs.writeFileSync(path.join(targetDir, `${plugin}.md`), content);
    console.log(`Harvested docs for plugin: ${plugin}`);
  }
}
