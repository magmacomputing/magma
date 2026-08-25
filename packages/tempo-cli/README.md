# @magmacomputing/tempo-cli

`tempo-cli` is the centralized, lightweight command-line tool built to orchestrate builds, versioning, metadata syncing, and cross-platform tasks across the Tempo monorepo.

## Why does this exist?

Internal monorepo workflows (building plugins, syncing version tags, syncing AI provider manifests, cross-platform directory removal) previously relied on scattered `.mjs` scripts or fragile OS-dependent shell commands. `tempo-cli` unifies these development workflows into a zero-dependency, cross-platform CLI tool automatically available in all workspaces.

## Usage

Because `packages/tempo-cli` is an npm workspace package registering a `bin` entry, `npm` automatically links it to `node_modules/.bin/tempo-cli`.

You can invoke it directly in any `package.json` script:

```json
"scripts": {
  "clean": "tempo-cli rm dist",
  "build:plugins": "tempo-cli build-plugins"
}
```

Or run it via `npx`:

```bash
npx tempo-cli --help
```

---

## Available Commands

### `rm <path...>`
Recursively and forcefully removes specified files or directories cross-platform using Node's `fs.rmSync`.
- **Example:** `tempo-cli rm dist/ build/ coverage/`

### `build-plugins`
Orchestrates building all active plugin packages located under `packages/plugins/*`.
- **Example:** `tempo-cli build-plugins`

### `version-bump [patch|minor|major]`
Bumps the root package version and triggers automatic synchronization across child workspace packages.
- **Example:** `tempo-cli version-bump minor`

### `version-sync`
Synchronizes the root package version down to workspace packages (`@magmacomputing/tempo`, `@magmacomputing/library`, `@magmacomputing/tempo-pro`).
- **Example:** `tempo-cli version-sync`

### `catalog-sync`
Synchronizes metadata for local and installed community plugins into `packages/plugins/.setup/catalog.json`.
- **Example:** `tempo-cli catalog-sync`

### `sync-providers [--dry-run] [--deploy]`
Queries active AI provider endpoints for available LLM models, updates `providers.v1.jsonc` and `DEFAULT_PROVIDERS` in `@magmacomputing/tempo-plugin-ai`.
- **Example:** `tempo-cli sync-providers --dry-run`

---

## Adding New Commands

To extend `tempo-cli` with new subcommands:
1. Add a new command module under `packages/tempo-cli/commands/your-command.js`.
2. Register the command handler in `packages/tempo-cli/index.js`.
