import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');

export async function buildPlugins(_args) {
	const pluginsDir = path.resolve(ROOT_DIR, 'packages/plugins');
	if (!fs.existsSync(pluginsDir)) {
		console.error(`Plugins directory not found: ${pluginsDir}`);
		process.exit(1);
	}

	const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });

	const workspaceArgs = entries
		.filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
		.map(dirent => `--workspace=packages/plugins/${dirent.name}`)
		.join(' ');

	if (workspaceArgs) {
		console.log('🚀 Building all plugins across workspaces...');
		execSync(`npm run build ${workspaceArgs}`, { cwd: ROOT_DIR, stdio: 'inherit' });
	} else {
		console.log('ℹ️ No plugins found to build.');
	}
}
