import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const tempoDir = path.dirname(path.dirname(__filename));
const libraryDir = path.resolve(tempoDir, '../library');
const htmlOutputDir = path.resolve(tempoDir, 'public/api/library/types');

console.log('🔍 Running Phase 3: TypeDoc Compiler API Type Expansion Post-Processor...');

// 1. Load TypeScript program for @magmacomputing/library
const entryPoints = [
	path.resolve(libraryDir, 'src/common.index.ts'),
	path.resolve(libraryDir, 'src/browser.index.ts'),
	path.resolve(libraryDir, 'src/server.index.ts')
];

const tsconfigPath = path.resolve(libraryDir, 'tsconfig.json');
const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
const parsedCmd = ts.parseJsonConfigFileContent(configFile.config, ts.sys, libraryDir);

const program = ts.createProgram(entryPoints, parsedCmd.options);
const checker = program.getTypeChecker();

// 2. Map of typeName -> expanded type declaration string
const typeMap = new Map();

for (const sourceFile of program.getSourceFiles()) {
	if (sourceFile.isDeclarationFile) continue;

	ts.forEachChild(sourceFile, (node) => {
		if (ts.isTypeAliasDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
			const typeName = node.name.text;
			const rhsNode = node.type;
			const rhsType = checker.getTypeAtLocation(rhsNode);

			let expanded = checker.typeToString(
				rhsType,
				rhsNode,
				ts.TypeFormatFlags.NoTruncation |
				ts.TypeFormatFlags.InTypeAlias |
				ts.TypeFormatFlags.AllowUniqueESSymbolType
			);

			// Fallback to node.type.getText() if typeToString returns the typeAlias identifier itself
			if (expanded === typeName || expanded.startsWith(`${typeName}<`)) {
				expanded = rhsNode.getText();
			}

			const typeParams = node.typeParameters?.map(tp => tp.name.text).join(', ');
			const fullSignature = typeParams ? `${typeName}<${typeParams}> = ${expanded}` : `${typeName} = ${expanded}`;

			typeMap.set(typeName, fullSignature);
		}
	});
}

console.log(`Found ${typeMap.size} exported type aliases from @magmacomputing/library source.`);

// 3. Scan generated HTML files in public/api/library/types/
if (!fs.existsSync(htmlOutputDir)) {
	console.error(`❌ Output directory ${htmlOutputDir} does not exist. Run TypeDoc first.`);
	process.exit(1);
}

const htmlFiles = fs.readdirSync(htmlOutputDir).filter(f => f.endsWith('.html'));
let processedCount = 0;

for (const file of htmlFiles) {
	const filePath = path.join(htmlOutputDir, file);
	let html = fs.readFileSync(filePath, 'utf-8');

	// Extract the type alias name from filename or page title (e.g. common.index.CountOf.html -> CountOf)
	const match = file.match(/common\.index\.([A-Za-z0-9_$]+)\.html$/);
	if (!match) continue;

	const typeName = match[1];
	const expandedSig = typeMap.get(typeName);

	if (expandedSig) {
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

		// Inject directly after <div class="tsd-signature">...</div>
		const signatureEndIdx = html.indexOf('</div>', html.indexOf('class="tsd-signature"'));
		if (signatureEndIdx !== -1) {
			const insertPos = signatureEndIdx + 6;
			html = html.slice(0, insertPos) + injectionHtml + html.slice(insertPos);
			fs.writeFileSync(filePath, html, 'utf-8');
			processedCount++;
		}
	}
}

console.log(`✅ Injected expanded type definitions into ${processedCount} HTML pages in public/api/library/types/`);

function escapeHtml(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
