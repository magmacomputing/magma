#!/usr/bin/env node

/**
 * ## sync-providers.mjs
 * Automated CLI utility to query AI providers for available models,
 * generate/sync public manifest files (providers.v1.jsonc / .json),
 * and keep DEFAULT_PROVIDERS in packages/plugins/ai in lockstep.
 *
 * Usage:
 *   node bin/sync-providers.mjs [--dry-run] [--deploy] [--help]
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');

const MANIFEST_JSONC_PATH = resolve(ROOT_DIR, 'packages/tempo/public/providers.v1.jsonc');
const MANIFEST_JSON_PATH = resolve(ROOT_DIR, 'packages/tempo/public/providers.v1.json');
const REGISTRY_UI_PUBLIC_PATH = resolve(ROOT_DIR, '../tempo-workspace/apps/registry-ui/public');
const AI_CONFIG_PATH = resolve(ROOT_DIR, 'packages/plugins/ai/src/core/config.ts');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isDeploy = args.includes('--deploy');

if (args.includes('--help') || args.includes('-h')) {
	console.log(`
Tempo AI Provider Sync Utility

Options:
  --dry-run   Query providers and preview changes without writing to disk
  --deploy    Deploy updated manifests to Firebase Hosting after sync
  --help      Show this help menu
`);
	process.exit(0);
}

// Load local .env if present
const envPath = resolve(ROOT_DIR, '.env');
if (existsSync(envPath)) {
	const envLines = readFileSync(envPath, 'utf8').split('\n');
	for (const line of envLines) {
		const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
		if (match) {
			const key = match[1];
			let value = match[2] || '';
			if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
			if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
			if (!process.env[key]) process.env[key] = value;
		}
	}
}

/**
 * Zero-dependency JSONC parser
 */
function parseJsonc(text) {
	let inString = false;
	let stringChar = '';
	let escaped = false;
	let result = '';
	const len = text.length;

	for (let i = 0; i < len; i++) {
		const char = text[i];
		const next = text[i + 1];

		if (inString) {
			result += char;
			if (escaped) {
				escaped = false;
			} else if (char === '\\') {
				escaped = true;
			} else if (char === stringChar) {
				inString = false;
			}
			continue;
		}

		if (char === '"' || char === "'") {
			inString = true;
			stringChar = char;
			result += char;
			continue;
		}

		if (char === '/' && next === '/') {
			i += 2;
			while (i < len && text[i] !== '\n' && text[i] !== '\r') i++;
			if (i < len) result += text[i];
			continue;
		}

		if (char === '/' && next === '*') {
			i += 2;
			while (i < len && !(text[i] === '*' && text[i + 1] === '/')) i++;
			i++;
			continue;
		}

		result += char;
	}

	return JSON.parse(result.replace(/,(\s*[}\]])/g, '$1'));
}

const PROVIDER_REGISTRY = {
	groq: {
		name: 'Groq',
		env: 'GROQ_API_KEY',
		url: 'https://api.groq.com/openai/v1/models',
		extract: data => (data.data || []).map(m => m.id),
		selectRecommended: (models, current) =>
			models.find(m => m === 'openai/gpt-oss-120b')
			?? models.find(m => m.includes('qwen3.6-27b'))
			?? models.find(m => m.includes('llama-3.3-70b-versatile'))
			?? current
	},
	gemini: {
		name: 'Google Gemini',
		env: 'GEMINI_API_KEY',
		envAlt: 'GOOGLE_API_KEY',
		url: 'https://generativelanguage.googleapis.com/v1beta/models',
		headerType: 'goog',
		extract: data => (data.models || []).map(m => (m.name || '').replace(/^models\//, '')),
		selectRecommended: (models, current) =>
			models.find(m => m === 'gemini-3.7-flash')
			?? models.find(m => m === 'gemini-3.6-flash')
			?? models.find(m => m === 'gemini-2.5-flash')
			?? current
	},
	openai: {
		name: 'OpenAI',
		env: 'OPENAI_API_KEY',
		url: 'https://api.openai.com/v1/models',
		extract: data => (data.data || []).map(m => m.id),
		selectRecommended: (models, current) =>
			models.find(m => m === 'gpt-5.4-mini')
			?? models.find(m => m === 'gpt-5.4')
			?? current
	},
	mistral: {
		name: 'Mistral',
		env: 'MISTRAL_API_KEY',
		url: 'https://api.mistral.ai/v1/models',
		extract: data => (data.data || []).map(m => m.id),
		selectRecommended: (models, current) =>
			models.find(m => m === 'mistral-small-latest')
			?? current
	}
};

/**
 * Unified helper to query model discovery endpoints with error & expiration detection.
 */
async function fetchProviderModels(def, apiKey) {
	const headers = def.headerType === 'goog'
		? { 'x-goog-api-key': apiKey, Accept: 'application/json' }
		: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' };

	const res = await fetch(def.url, { headers });

	if (res.status === 401 || res.status === 403 || (def.headerType === 'goog' && res.status === 400)) {
		const msg = `${def.env} appears invalid, revoked or expired (HTTP ${res.status})`;
		if (process.env.GITHUB_ACTIONS) console.log(`::warning title=${def.name} API Key Issue::${msg}`);
		throw new Error(msg);
	}

	if (!res.ok) throw new Error(`${def.name} models query returned ${res.status}: ${res.statusText}`);

	const data = await res.json();
	return def.extract(data);
}

async function main() {
	console.log('🔄 Starting Tempo AI Provider Model Sync...\n');

	const existingManifest = existsSync(MANIFEST_JSONC_PATH)
		? parseJsonc(readFileSync(MANIFEST_JSONC_PATH, 'utf8'))
		: existsSync(MANIFEST_JSON_PATH)
			? JSON.parse(readFileSync(MANIFEST_JSON_PATH, 'utf8'))
			: { version: '1.1', providers: {} };

	const providers = existingManifest.providers || {};
	let changesDetected = false;

	// Scan all configured providers in table
	for (const [id, def] of Object.entries(PROVIDER_REGISTRY)) {
		const key = process.env[def.env] || (def.envAlt ? process.env[def.envAlt] : undefined);
		if (!key) {
			console.log(`ℹ️  ${def.env} not set - keeping existing ${def.name} defaults.`);
			continue;
		}

		try {
			console.log(`📡 Querying ${def.name} models endpoint...`);
			const models = await fetchProviderModels(def, key);
			console.log(`   Found ${models.length} active models on ${def.name}.`);

			if (!providers[id]) providers[id] = {};
			if (!providers[id].models) providers[id].models = {};

			const current = providers[id].models.default || providers[id].model;
			const recommended = def.selectRecommended(models, current);

			// Clean up retired root model field
			if ('model' in providers[id]) delete providers[id].model;

			if (recommended && current !== recommended) {
				console.log(`   ✨ ${def.name} model change: ${current} -> ${recommended}`);
				providers[id].models.default = recommended;
				if (id === 'gemini') providers[id].models.fast = recommended;
				changesDetected = true;
			} else if (!providers[id].models.default && recommended) {
				providers[id].models.default = recommended;
			}
		} catch (err) {
			console.warn(`   ⚠️  ${def.name} query skipped: ${err.message}`);
		}
	}

	// Clean up any remaining legacy root model fields across all providers
	for (const prov of Object.values(providers)) {
		if ('model' in prov) delete prov.model;
	}

	console.log('\n📊 Summary of Current Provider Defaults:');
	for (const [id, prov] of Object.entries(providers)) {
		const defaultModel = prov.models?.default || '(none)';
		console.log(`   • ${id.padEnd(8)}: default=${defaultModel} (tokenParam=${prov.tokenParam || 'max_tokens'})`);
	}

	const updatedManifest = {
		version: '1.1',
		updatedAt: new Date().toISOString().split('T')[0] + 'T00:00:00Z',
		providers
	};

	if (isDryRun) {
		console.log(`\n[Dry Run] Changes detected: ${changesDetected ? 'YES (would update manifests on disk)' : 'NO (manifests are currently up-to-date)'}`);
		console.log('[Dry Run] No files modified.');
		return;
	}

	if (changesDetected) {
		console.log('\n✨ Model updates detected: New provider recommendations were discovered and applied.');
	} else {
		console.log('\n✨ All provider defaults are already up-to-date (no model changes detected).');
	}

	// Write clean JSON manifest
	const jsonContent = JSON.stringify(updatedManifest, null, 2) + '\n';
	writeFileSync(MANIFEST_JSON_PATH, jsonContent, 'utf8');
	console.log(`\n💾 Saved: ${MANIFEST_JSON_PATH}`);

	// Write commented JSONC manifest
	const jsoncContent = `{\n  // Tempo AI Plugin - Dynamic Remote Provider Manifest v1.1\n  // Hosted at: https://tempo.magmacomputing.com.au/providers.v1.jsonc (and .json)\n  // Consumed automatically by @magmacomputing/tempo-plugin-ai during initAI()\n  "version": "1.1",\n  "updatedAt": "${updatedManifest.updatedAt}",\n  "providers": {\n    // Groq: High-speed open weights inference\n    "groq": ${JSON.stringify(providers.groq, null, 6).replace(/^/gm, '    ').trim()},\n    // OpenAI: Modern GPT series\n    "openai": ${JSON.stringify(providers.openai, null, 6).replace(/^/gm, '    ').trim()},\n    // Google Gemini: Multimodal flash & reasoning\n    "gemini": ${JSON.stringify(providers.gemini, null, 6).replace(/^/gm, '    ').trim()},\n    // Mistral AI: European low-latency models\n    "mistral": ${JSON.stringify(providers.mistral, null, 6).replace(/^/gm, '    ').trim()}\n  }\n}\n`;

	writeFileSync(MANIFEST_JSONC_PATH, jsoncContent, 'utf8');
	console.log(`💾 Saved: ${MANIFEST_JSONC_PATH}`);

	// Also copy to tempo-workspace/apps/registry-ui/public if workspace exists
	if (existsSync(REGISTRY_UI_PUBLIC_PATH)) {
		const targetJson = resolve(REGISTRY_UI_PUBLIC_PATH, 'providers.v1.json');
		const targetJsonc = resolve(REGISTRY_UI_PUBLIC_PATH, 'providers.v1.jsonc');
		writeFileSync(targetJson, jsonContent, 'utf8');
		writeFileSync(targetJsonc, jsoncContent, 'utf8');
		console.log(`💾 Synced to Registry UI: ${targetJson}`);
		console.log(`💾 Synced to Registry UI: ${targetJsonc}`);
	}

	// Synchronize DEFAULT_PROVIDERS in packages/plugins/ai/src/core/config.ts
	if (existsSync(AI_CONFIG_PATH)) {
		let configSrc = readFileSync(AI_CONFIG_PATH, 'utf8');
		const groqModel = providers.groq?.models?.default || 'openai/gpt-oss-120b';
		const openAiModel = providers.openai?.models?.default || 'gpt-5.4-mini';
		const geminiModel = providers.gemini?.models?.default || 'gemini-3.7-flash';
		const mistralModel = providers.mistral?.models?.default || 'mistral-small-latest';

		configSrc = configSrc
			.replace(/(groq:\s*\{[\s\S]*?default:\s*')[^']+(')/, `$1${groqModel}$2`)
			.replace(/(openai:\s*\{[\s\S]*?default:\s*')[^']+(')/, `$1${openAiModel}$2`)
			.replace(/(gemini:\s*\{[\s\S]*?default:\s*')[^']+(')/, `$1${geminiModel}$2`)
			.replace(/(mistral:\s*\{[\s\S]*?default:\s*')[^']+(')/, `$1${mistralModel}$2`);

		writeFileSync(AI_CONFIG_PATH, configSrc, 'utf8');
		console.log(`💾 Synchronized: ${AI_CONFIG_PATH}`);
	}

	if (isDeploy) {
		console.log('\n🚀 Triggering deployment to Firebase Hosting...');
		try {
			const workspaceRegistryPath = resolve(ROOT_DIR, '../tempo-workspace');
			if (existsSync(workspaceRegistryPath)) {
				execSync('npm --prefix apps/registry-ui run build && firebase deploy --only hosting', {
					cwd: workspaceRegistryPath,
					stdio: 'inherit'
				});
				console.log('\n✅ Deployment successful!');
				console.log('🌐 Verify CDN via: curl -sI https://tempo.magmacomputing.com.au/providers.v1.json');
			} else {
				console.warn('⚠️ tempo-workspace not found at expected sibling directory.');
			}
		} catch (err) {
			console.error(`❌ Deployment failed: ${err.message}`);
		}
	}

	console.log('\n✅ Provider sync completed successfully!');
}

main().catch(err => {
	console.error('\n❌ Fatal error in sync-providers:', err);
	process.exit(1);
});
