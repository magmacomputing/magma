import { isFunction } from '#library/assertion.library.js';
import { parseJSONC } from '#library/serialize.library.js';
import type { Options } from '../tempo.type.js';

// Minimal declaration so TS doesn't complain in browser environments without @types/node
declare const process: any;

/**
 * Automatically discovers and loads a tempo.config.* file by traversing upwards
 * from the current working directory until a package.json is found.
 * 
 * Note: TypeScript config files require Bun, Deno, or Node.js with a TypeScript
 * loader such as tsx, since vanilla Node.js cannot dynamically import TypeScript
 * files without a loader.
 */
export async function resolveConfig(options?: { cwd?: string, configFile?: string }): Promise<Options | undefined> {
	// Skip discovery if not in a Node/Deno/Bun environment
	if (typeof process === 'undefined' || !isFunction(process?.cwd))
		return undefined;

	try {
		// Use variables for dynamic imports to prevent bundlers from statically analyzing and failing
		const modFs = 'node:fs';
		const modUrl = 'node:url';
		const modPath = 'node:path';

		const [fs, path] = await Promise.all([
			import(modFs),
			import(modPath),
		]);

		let currentDir = options?.cwd || process.cwd();

		const loadFile = async (configPath: string, ext: string) => {
			if (ext === '.json' || ext === '.jsonc') {
				const content = await fs.promises.readFile(configPath, 'utf8');
				return parseJSONC(content) as Options;
			} else {
				// Use pathToFileURL to safely load absolute paths on Windows
				const { pathToFileURL } = await import(modUrl);
				const imported = await import(pathToFileURL(configPath).href);
				return imported.default || imported;
			}
		};

		if (options?.configFile) {
			const explicitPath = path.resolve(currentDir, options.configFile);
			if (fs.existsSync(explicitPath)) {
				try {
					return await loadFile(explicitPath, path.extname(explicitPath));
				} catch (err) {
					console.warn(`[Tempo] Failed to load explicit config file at ${explicitPath}:`, err);
					return undefined;
				}
			} else {
				console.warn(`[Tempo] Explicit config file not found at ${explicitPath}`);
				return undefined;
			}
		}

		const rootPath = path.parse(currentDir).root;

		while (currentDir !== rootPath) {
			const pkgJson = path.join(currentDir, 'package.json');
			const exts = ['.ts', '.js', '.mjs', '.cjs', '.jsonc', '.json'];

			for (const ext of exts) {
				const configPath = path.join(currentDir, `tempo.config${ext}`);
				if (fs.existsSync(configPath)) {
					try {
						return await loadFile(configPath, ext);
					} catch (err) {
						console.warn(`[Tempo] Found config file at ${configPath} but failed to load it:`, err);
						continue;
					}
				}
			}

			if (fs.existsSync(pkgJson)) {
				// Reached project root, stop searching
				break;
			}

			currentDir = path.dirname(currentDir);
		}
	} catch (e) {
		// Environment doesn't support node 'fs' or 'path', skip discovery
	}

	return undefined;
}
