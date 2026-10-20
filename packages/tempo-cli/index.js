#!/usr/bin/env node
import { rm } from './commands/rm.js';
import { buildPlugins } from './commands/build-plugins.js';
import { versionBump } from './commands/version-bump.js';
import { versionSync } from './commands/version-sync.js';
import { catalogSync } from './commands/catalog-sync.js';
import { syncProviders } from './commands/sync-providers.js';
import { prepublish } from './commands/prepublish.js';
import { reviewPr } from './commands/review-pr.js';

const [command, ...args] = process.argv.slice(2);

switch (command) {
	case 'rm':
		await rm(args);
		break;
	case 'build-plugins':
		await buildPlugins(args);
		break;
	case 'version-bump':
		await versionBump(args);
		break;
	case 'version-sync':
		await versionSync(args);
		break;
	case 'catalog-sync':
		await catalogSync(args);
		break;
	case 'sync-providers':
		await syncProviders(args);
		break;
	case 'prepublish':
		await prepublish(args);
		break;
	case 'review-pr':
	case 'review:pr':
		await reviewPr(args);
		break;
	case '-h':
	case '--help':
	case 'help':
		console.log(`
Tempo CLI Tool (tempo-cli)

Usage:
  tempo-cli <command> [options]

Available Commands:
  rm <paths...>      Cross-platform file/directory removal (fs.rmSync)
  build-plugins      Build all plugin workspace packages
  version-bump       Bump monorepo version (patch|minor|major)
  version-sync       Sync root package version to workspace packages
  catalog-sync       Sync plugin catalog metadata
  sync-providers     Sync AI provider models and remote manifests
  prepublish         Verify git main branch and run build prior to publish
  review-pr          Fetch unresolved CodeRabbit review findings from the open PR
`);
		break;
	default:
		if (!command) {
			console.log('Tempo CLI Tool (tempo-cli). Run "tempo-cli --help" for available commands.');
		} else {
			console.error(`Unknown command: ${command}. Run "tempo-cli --help" for available commands.`);
			process.exit(1);
		}
}
