#!/usr/bin/env node
/**
 * bin/update-version.mjs
 *
 * Reads the version from package.json and rewrites src/tempo.version.ts
 * so that Tempo.version always reflects the current published version.
 *
 * Usage: node bin/update-version.mjs
 * Called automatically by `npm run prebuild`.
 */
import pkg from '../package.json' with { type: 'json' };
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { version } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const versionFile = resolve(__dirname, '../src/tempo.version.ts');
const content = `/**
 * @internal
 * Canonical version of the Tempo library.
 *
 * ⚠️ This file is auto-updated by \`npm run build:version\` (see \`bin/update-version.mjs\`).
 * Do NOT edit manually — your changes will be overwritten on the next build.
 */
export const TEMPO_VERSION = '${version}';
`;

writeFileSync(versionFile, content, 'utf-8');
console.log(`✅ Tempo version stamped: ${version}`);

