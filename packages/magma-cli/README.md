# @magmacomputing/magma-cli

`magma-cli` is a lightweight, internal command-line tool built to unify build scripts across the Magma Computing monorepo.

## Why does this exist?

Many npm scripts traditionally rely on OS-specific shell commands (like `rm -rf`). This creates a fragile build environment that can break across different operating systems (such as Windows). Instead of pulling in external dependencies like `rimraf` or `del-cli`, `magma-cli` provides native, zero-dependency, cross-platform implementations specifically tailored for our build pipeline.

## Usage

This package registers the `magma-cli` binary. Because it is part of the npm workspace, npm automatically links it to the root `node_modules/.bin/magma-cli`. 

You can use it directly in any `package.json` script within the monorepo:

```json
"scripts": {
  "postbuild": "magma-cli rm dist/src"
}
```

Or you can run it manually via `npx` from anywhere in the project:

```bash
npx magma-cli rm dist/src
```

## Available Commands

### `rm <path...>`
Recursively and forcefully removes the specified files or directories using Node's built-in `fs.rmSync`.
- **Example:** `magma-cli rm dist/src build/ temp/`

## Adding New Commands

To extend `magma-cli` with new capabilities (e.g., cross-platform file copying), simply edit `index.js`. The CLI uses a lightweight argument router:

```javascript
const [command, ...args] = process.argv.slice(2);

if (command === 'rm') {
	// ...
} else if (command === 'cp') {
	// Add your new command implementation here
} else {
	console.error(`Unknown command: ${command}`);
	process.exit(1);
}
```
