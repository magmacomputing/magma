import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');

export async function catalogSync(_args) {
	const catalogPath = path.resolve(ROOT_DIR, 'packages/plugins/.setup/catalog.json');
	const pluginsDir = path.resolve(ROOT_DIR, 'packages/plugins');
	const nodeModulesDir = path.resolve(ROOT_DIR, 'node_modules/@magmacomputing');

	let catalog = [];
	if (fs.existsSync(catalogPath)) {
		try {
			catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
		} catch (e) {
			console.error(`Failed to parse catalog.json at ${catalogPath}`, e);
			throw e;
		}
	}

	const catalogMap = new Map();
	catalog.forEach(p => catalogMap.set(p.id, p));

	function processPlugin(pluginDir, isExternal) {
		const pkgPath = path.join(pluginDir, 'package.json');
		if (!fs.existsSync(pkgPath)) return;

		const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

		let id = path.basename(pluginDir).replace(/^\./, '_');
		if (isExternal) {
			id = id.replace('tempo-plugin-', '');
		}

		const humanName = id.charAt(0).toUpperCase() + id.slice(1) + ' Plugin';
		const entry = catalogMap.get(id) || { id };

		entry.name = entry.name || humanName;
		entry.description = pkg.description || entry.description || '';
		entry.packageName = pkg.name;
		entry.version = pkg.version || entry.version || '';
		entry.plan = pkg.tempo?.plan || entry.plan || 'community';
		entry.status = entry.status || 'active';
		if (pkg.private || pkg.tempo?.hidden !== undefined || pkg.tempo?.catalog !== undefined) {
			entry.hidden = Boolean(pkg.private || pkg.tempo?.hidden || pkg.tempo?.catalog === false);
		}

		catalogMap.set(id, entry);
		console.log(`Synced plugin metadata for: ${id} (${isExternal ? 'external' : 'local'})`);
	}

	// 1. Process Local Plugins
	if (fs.existsSync(pluginsDir)) {
		const plugins = fs.readdirSync(pluginsDir);
		for (const plugin of plugins) {
			const fullPath = path.join(pluginsDir, plugin);
			if (fs.statSync(fullPath).isDirectory()) {
				processPlugin(fullPath, false);
			}
		}
	}

	// 2. Process Node Modules Plugins
	if (fs.existsSync(nodeModulesDir)) {
		const modules = fs.readdirSync(nodeModulesDir);
		for (const mod of modules) {
			if (mod.startsWith('tempo-plugin-')) {
				const fullPath = path.join(nodeModulesDir, mod);
				if (fs.statSync(fullPath).isDirectory()) {
					processPlugin(fullPath, true);
				}
			}
		}
	}

	fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
	fs.writeFileSync(catalogPath, JSON.stringify(Array.from(catalogMap.values()), null, 2) + '\n');
	console.log(`\nSuccessfully updated ${catalogPath}`);
}
