# Plugin Support Binaries

This directory (`packages/plugins/bin/`) contains internal support scripts and utilities for developing and testing Tempo plugins within the monorepo. 

It includes:
- **REPL Environment (`repl.mts`)**: Scripts to initialize an interactive Node.js REPL session with Tempo and Temporal pre-loaded, making it easy to experiment with plugins from the CLI.
- **Polyfill Setup (`temporal-polyfill.mts`)**: Initialization scripts to ensure the `@js-temporal/polyfill` is correctly loaded into the global scope during testing or REPL sessions, allowing plugins to work with native `Temporal` APIs before they are officially adopted by all runtimes.
- **Catalog Synchronization (`catalog-sync.mjs`)**: A developer utility that scans all local and external plugin `package.json` files and extracts their metadata into a centralized `catalog.json` file. Run via `npm run catalog:sync`.
- **TypeScript Configuration (`tsconfig.json`)**: Specific compiler options for running these support scripts directly via tools like `tsx`.

These files are meant for local monorepo development and testing purposes only. They are not published or distributed with any NPM packages.
