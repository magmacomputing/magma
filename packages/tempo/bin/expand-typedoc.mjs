import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const tempoDir = path.dirname(path.dirname(__filename));
const libraryDir = path.resolve(tempoDir, '../library');

console.log('🔍 Running TypeDoc Compiler API Type Expansion Post-Processor...');

const targets = [
	{
		name: '@magmacomputing/library',
		dir: libraryDir,
		entryPoints: [
			path.resolve(libraryDir, 'src/common.index.ts'),
			path.resolve(libraryDir, 'src/browser.index.ts'),
			path.resolve(libraryDir, 'src/server.index.ts')
		],
		tsconfigPath: path.resolve(libraryDir, 'tsconfig.json'),
		htmlOutputDir: path.resolve(tempoDir, 'public/api/library/types')
	},
	{
		name: '@magmacomputing/tempo',
		dir: tempoDir,
		entryPoints: [
			path.resolve(tempoDir, 'src/tempo.index.ts')
		],
		tsconfigPath: path.resolve(tempoDir, 'tsconfig.build.json'),
		htmlOutputDir: path.resolve(tempoDir, 'public/api/types')
	}
];

for (const target of targets) {
	if (!fs.existsSync(target.htmlOutputDir)) {
		console.warn(`⚠️ Skipping ${target.name}: HTML output directory does not exist yet (${target.htmlOutputDir})`);
		continue;
	}

	const configFile = ts.readConfigFile(target.tsconfigPath, ts.sys.readFile);
	const parsedCmd = ts.parseJsonConfigFileContent(configFile.config, ts.sys, target.dir);

	const program = ts.createProgram(target.entryPoints, parsedCmd.options);
	const checker = program.getTypeChecker();
	const typeMap = new Map();

	function visit(node, currentNamespace = '') {
		if (ts.isTypeAliasDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
			const typeName = node.name.text;
			const fullKey = currentNamespace ? `${currentNamespace}.${typeName}` : typeName;
			const rhsNode = node.type;
			const rhsType = checker.getTypeAtLocation(rhsNode);

			let expanded = checker.typeToString(
				rhsType,
				rhsNode,
				ts.TypeFormatFlags.NoTruncation |
				ts.TypeFormatFlags.InTypeAlias |
				ts.TypeFormatFlags.AllowUniqueESSymbolType
			);

			if (expanded === typeName || expanded.startsWith(`${typeName}<`)) {
				expanded = rhsNode.getText();
			}

			const typeParams = node.typeParameters?.map(tp => tp.name.text).join(', ');
			const fullSignature = typeParams ? `${typeName}<${typeParams}> = ${expanded}` : `${typeName} = ${expanded}`;

			typeMap.set(typeName, fullSignature);
			typeMap.set(fullKey, fullSignature);
		} else if (ts.isModuleDeclaration(node) && node.body) {
			const nsName = node.name.text;
			const nextNs = currentNamespace ? `${currentNamespace}.${nsName}` : nsName;
			ts.forEachChild(node.body, child => visit(child, nextNs));
		}
	}

	for (const sourceFile of program.getSourceFiles()) {
		if (sourceFile.isDeclarationFile) continue;
		ts.forEachChild(sourceFile, node => visit(node));
	}

	console.log(`Found ${typeMap.size} type alias mappings for ${target.name}.`);

	const htmlFiles = fs.readdirSync(target.htmlOutputDir).filter(f => f.endsWith('.html'));
	let processedCount = 0;

	for (const file of htmlFiles) {
		const filePath = path.join(target.htmlOutputDir, file);
		let html = fs.readFileSync(filePath, 'utf-8');

		// Extract type identifier from filename e.g.:
		// - common.index.CountOf.html -> CountOf
		// - Tempo.DateTime.html -> Tempo.DateTime or DateTime
		// - Tempo.WEEKDAY-1.html -> Tempo.WEEKDAY or WEEKDAY
		const cleanName = file.replace(/\.html$/, '').replace(/-\d+$/, '');
		const parts = cleanName.split('.');
		const typeName = parts[parts.length - 1];

		const expandedSig = typeMap.get(cleanName) || typeMap.get(typeName);

		if (expandedSig && !html.includes('expanded-type-details')) {
			const injectionHtml = `
<details class="tsd-accordion expanded-type-details" style="margin-top: 12px; margin-bottom: 16px; border: 1px solid var(--color-accent, #3b82f6); border-radius: 6px; padding: 8px 12px; background: rgba(59, 130, 246, 0.05);" open>
  <summary class="tsd-accordion-summary" style="cursor: pointer; font-weight: 600; color: var(--color-accent, #3b82f6); font-size: 0.9em; display: flex; align-items: center; gap: 6px;">
    <span>🔍 Expanded Type Evaluation (Compiler API)</span>
  </summary>
  <div class="tsd-accordion-details" style="margin-top: 8px;">
    <pre style="margin: 0; padding: 8px; background: rgba(0,0,0,0.15); border-radius: 4px; font-family: monospace; font-size: 0.85em; overflow-x: auto;"><code>type ${escapeHtml(expandedSig)}</code></pre>
  </div>
</details>
`;

			const signatureEndIdx = html.indexOf('</div>', html.indexOf('class="tsd-signature"'));
			if (signatureEndIdx !== -1) {
				const insertPos = signatureEndIdx + 6;
				html = html.slice(0, insertPos) + injectionHtml + html.slice(insertPos);
				fs.writeFileSync(filePath, html, 'utf-8');
				processedCount++;
			}
		}
	}

	console.log(`✅ Injected expanded type definitions into ${processedCount} HTML pages in ${path.relative(tempoDir, target.htmlOutputDir)}`);
}

function escapeHtml(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
