import fs from 'node:fs';
import { execSync } from 'node:child_process';

const pluginsDir = new URL('../packages/plugins', import.meta.url);
const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });

const workspaceArgs = entries
	.filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.bin') && !dirent.name.startsWith('.setup'))
	.map(dirent => `--workspace=packages/plugins/${dirent.name}`)
	.join(' ');

if (workspaceArgs) {
	execSync(`npm run build ${workspaceArgs}`, { stdio: 'inherit' });
}
