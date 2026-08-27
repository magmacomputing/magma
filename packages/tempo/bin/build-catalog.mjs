import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceCatalogPath = path.resolve(__dirname, '../../../packages/plugins/.setup/catalog.json');
const targetDir = path.resolve(__dirname, '../.vitepress/theme/data');
const targetCatalogPath = path.join(targetDir, 'catalog.json');

const pluginsDir = path.resolve(__dirname, '../../../packages/plugins');
const nodeModulesDir = path.resolve(__dirname, '../../../node_modules');

if (!fs.existsSync(sourceCatalogPath)) {
	console.error('build-catalog: source catalog.json not found!');
	process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(sourceCatalogPath, 'utf8'));

for (const entry of catalog) {
	let version = '';

	// 1. Try resolving from local monorepo source (Community Plugins)
	// Note: Local plugins use the original un-mangled folder name, but our entry.id has leading dots replaced with underscores.
	// We can just check the dir directly if we kept the original name, but let's just search the dirs.
	// Actually, wait, community plugins match `entry.id`.
	// Local plugin folder name may have a leading dot if entry.id starts with '_'
	const folderName = entry.id.startsWith('_') ? '.' + entry.id.slice(1) : entry.id;
	const localPkgPath = path.join(pluginsDir, folderName, 'package.json');

	if (fs.existsSync(localPkgPath)) {
		const pkg = JSON.parse(fs.readFileSync(localPkgPath, 'utf8'));
		version = pkg.version;
		if (pkg.private || pkg.tempo?.hidden !== undefined || pkg.tempo?.catalog !== undefined) {
			entry.hidden = Boolean(pkg.private || pkg.tempo?.hidden || pkg.tempo?.catalog === false);
		}
	} else {
		// 2. Try resolving from node_modules (Premium Plugins installed by Dependabot)
		const externalPkgPath = path.join(nodeModulesDir, entry.packageName, 'package.json');
		if (fs.existsSync(externalPkgPath)) {
			const pkg = JSON.parse(fs.readFileSync(externalPkgPath, 'utf8'));
			version = pkg.version;
			if (pkg.private || pkg.tempo?.hidden !== undefined || pkg.tempo?.catalog !== undefined) {
				entry.hidden = Boolean(pkg.private || pkg.tempo?.hidden || pkg.tempo?.catalog === false);
			}
		}
	}

	if (!version) {
		console.warn(`build-catalog: Could not resolve installed version for plugin ${entry.id}`);
	}

	entry.version = version;
}

if (!fs.existsSync(targetDir)) {
	fs.mkdirSync(targetDir, { recursive: true });
}

fs.writeFileSync(targetCatalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(`Successfully generated VitePress catalog JSON with live local versions (${catalog.length} plugins).`);
