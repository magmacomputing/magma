import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const catalogPath = path.resolve(__dirname, '../.setup/catalog.json');
const pluginsDir = path.resolve(__dirname, '../../plugins');
const nodeModulesDir = path.resolve(__dirname, '../../../node_modules/@magmacomputing');

let catalog = [];
if (fs.existsSync(catalogPath)) {
	try {
		catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
	} catch (e) {
		console.error('Failed to parse catalog.json, starting fresh.', e);
	}
}

const catalogMap = new Map();
catalog.forEach(p => catalogMap.set(p.id, p));

function processPlugin(pluginDir, isExternal) {
	const pkgPath = path.join(pluginDir, 'package.json');
	if (!fs.existsSync(pkgPath)) return;

	const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

	// Extract id from directory name, replacing leading dots for VitePress safety
	let id = path.basename(pluginDir).replace(/^\./, '_');
	if (isExternal) {
		id = id.replace('tempo-plugin-', '');
	}

	// Use the human-readable displayName if we have one, otherwise create a titleized version of the ID
	const humanName = id.charAt(0).toUpperCase() + id.slice(1) + ' Plugin';

	const entry = catalogMap.get(id) || { id };

	// Update fields from package.json
	entry.name = entry.name || humanName; // allow manual override of human name
	entry.description = pkg.description || entry.description || '';
	entry.packageName = pkg.name;
	entry.plan = pkg.tempo?.plan || entry.plan || 'community';
	entry.status = entry.status || 'active';
	// Note: we do NOT store version here, as build-catalog.mjs injects it dynamically!

	catalogMap.set(id, entry);
	console.log(`Synced plugin metadata for: ${id} (${isExternal ? 'external' : 'local'})`);
}

// 1. Process Local Plugins
if (fs.existsSync(pluginsDir)) {
	const plugins = fs.readdirSync(pluginsDir);
	for (const plugin of plugins) {
		// Skip hidden files/dirs like .setup or .bin unless we want to document them
		// But we know .setup isn't a plugin, so let's skip it if it doesn't have a package.json
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

// Write back to catalog.json
fs.writeFileSync(catalogPath, JSON.stringify(Array.from(catalogMap.values()), null, 2) + '\n');
console.log(`\nSuccessfully updated ${catalogPath}`);
