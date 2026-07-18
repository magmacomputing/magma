# Community Plugin Publishing Template

This template outlines the standard operating procedure for preparing and publishing a Community plugin in the Tempo ecosystem.

## 1. `package.json` Configuration

Ensure the plugin's `package.json` contains the correct community configuration:

- **Version**: Set to a fresh semantic version (e.g., `"1.0.0"` for the first release).
- **License**: Must strictly be `"MIT"`.
- **Scripts**: 
  - Ensure `"build": "tsup && tsc"` and `"postbuild": "rm -rf dist/src"` are present.
  - Include the prepublish safeguard: `"prepublishOnly": "if [ $(git rev-parse --abbrev-ref HEAD) != main ]; then echo 'ERROR: Must be on main branch to publish.'; exit 1; fi && npm run build"`.
  - Include the correct test script: `"test": "vitest run -c ../vitest.shared.ts"`.
- **Keywords**: Ensure relevant keywords are present (`tempo`, `tempo-plugin`, `magmacomputing`, `temporal`, `plugin`, etc.).
- **tempo**: Set `"plan": "community"`.

## 2. Build Configuration (`tsup.config.ts` & `tsconfig.json`)

To ensure standard monorepo builds, include a `tsup.config.ts` that extends the workspace's shared configuration:

```typescript
import { defineConfig } from 'tsup';
import { sharedConfig } from '../tsup.shared.ts';

export default defineConfig({
	...sharedConfig,
	entry: ['src/index.ts'],
});
```

And a root `tsconfig.json` that outputs type declarations:

```json
{
  "extends": "../tsconfig.shared.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "emitDeclarationOnly": true
  },
  "include": [
    "src"
  ]
}
```

## 3. Test Configuration (`test/tsconfig.json`)

To ensure your tests are properly type-checked in isolation, create a `test/tsconfig.json` file that extends the root test configuration:

```json
{
	"extends": "../../tsconfig.test.json",
	"include": [
		"**/*.ts"
	]
}
```

## 4. Documentation (`README.md` & `doc/index.md`)

Community plugins must follow a uniform documentation standard.

### Structure
- **Logo**: `![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)` (for README) or `![Tempo Plugin](/plugin-logo.svg)` (for docs).
- **Header**: `# @magmacomputing/tempo-plugin-[name]`
- **Badges**: Standard visual indicators placed immediately below the Header. Must include NPM Version, Peer Dependency, and License badges from Shields.io:
  ```markdown
  [![npm version](https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-[name]?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-[name])
  [![npm peer dependency version](https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-[name]/peer/@magmacomputing/tempo?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo)
  [![License](https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-[name]?style=flat-square)](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-[name])
  ```
- **Description**: A short, concise summary.
- **Installation**: Code block with `npm install @magmacomputing/tempo-plugin-[name]`. Do not use hard-coded peer-dependency text warnings.
- **Usage**: TypeScript snippet showing `Tempo.init({ plugins: [...] })` and basic functionality.
- **Documentation Link** (README only): Link to full docs at `https://magmacomputing.github.io/magma/doc/9-plugins/[name].index.html`.
- **Licensing**: Must state: "This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required."

## 5. Source Code (`src/index.ts`)

- Rely strictly on open core extensions (`definePlugin`, `defineTerm`).
- While optional, it is highly recommended to provide a short `description` when using `defineTerm` (e.g., `description: 'My custom term'`) so it appears in the `Tempo.terms` registry.
