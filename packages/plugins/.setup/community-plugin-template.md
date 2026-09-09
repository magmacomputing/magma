# Community Plugin Publishing Template

This template outlines the standard operating procedure for preparing and publishing a Community plugin in the Tempo ecosystem.

## 1. `package.json` Configuration

Ensure the plugin's `package.json` contains the correct community configuration:

- **Version**: Set to `"0.1.0"` for the initial bootstrap release (allowing the official `1.0.0` GA release to be published via CI with full Sigstore provenance).
- **License**: Must strictly be `"MIT"`.
- **Type**: Set `"type": "module"`.
- **Files**: Include the published files array:
  ```json
  "files": [
    "dist",
    "src",
    "README.md",
    "CHANGELOG.md",
    "LICENSE"
  ]
  ```
- **PublishConfig**: Configure public npm publishing:
  ```json
  "publishConfig": {
    "registry": "https://registry.npmjs.org/",
    "access": "public"
  }
  ```
- **Repository**: Required for npm provenance and source linking. Must include the exact sub-directory path:
  ```json
  "repository": {
    "type": "git",
    "url": "git+https://github.com/magmacomputing/magma.git",
    "directory": "packages/plugins/[name]"
  }
  ```
- **Exports**: Define exports with types and import entrypoints:
  ```json
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
  ```
- **Scripts**: 
  - Ensure `"build": "tsup && tsc"` is present.
  - Include the prepublish safeguard: `"prepublishOnly": "tempo-cli prepublish"`.
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

> [!CAUTION]
> **Never manually override the `format` property** in your `tsup.config.ts` (e.g., `format: ['esm', 'cjs']`). The monorepo's `sharedConfig` is specifically tailored to generate strict ES Modules (`.js`) and Browser IIFE bundles (`.global.min.js`). Adding `'cjs'` will cause the build pipeline to silently overwrite your ESM bundle, breaking Node.js module resolution for users!

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

- Rely strictly on open core extensions (`definePlugin`, `defineTerm`, `defineNamespace`).
- While optional, it is highly recommended to provide a short `description` when using `defineTerm` (e.g., `description: 'My custom term'`) so it appears in the `Tempo.terms` registry.

> [!IMPORTANT]
> **Guideline for Future Agents & Developers: Base Class Lockdown & Immutability**
>
> 1. **Zero Flat Pollution on `Tempo`**: Never dump multiple loose methods or properties directly onto the `Tempo` root class. Group related static utilities under a dedicated, cohesive namespace (e.g., `Tempo.geo.*`, `Tempo.sync.*`).
> 2. **Static Namespace Immutability**: Any static object or namespace attached to the `Tempo` base class **must be strictly immutable/frozen**:
>    - The namespace object itself (including any nested objects or child namespaces) must be recursively frozen using `deepFreeze()` (available directly from `@magmacomputing/tempo/plugin/sdk` or `#library/utility.library.js`).
>    - The property must be mounted onto `TempoClass` using `Object.defineProperty` with `writable: false`, `configurable: false`, and `enumerable: false` (or via the SDK's `attachStatics` utility).
>    ```typescript
>    import { deepFreeze } from '@magmacomputing/tempo/plugin/sdk';
>
>    Object.defineProperty(TempoClass, 'myNamespace', {
>        value: deepFreeze(myNamespaceObject),
>        writable: false,
>        configurable: false,
>        enumerable: false,
>    });
>    ```
>    *Rationale*: This protects the host class from monkey-patching, accidental mutation, and tampering, while ensuring compatibility with Tempo's internal `@Immutable` and `@Securable` engines.
> 3. **Fluent Immutable Instance Methods**: Instance methods attached to `Tempo.prototype` must adhere to Tempo's immutable design principles. Methods should return a **new** enriched or transformed `Tempo` instance (e.g., `return new TempoClass(this, { ... })`) rather than mutating `this` in place.

## 6. TypeScript Documentation (TSDoc)

All exported components (functions, interfaces, classes, and types) must be properly documented using the standard Magma TSDoc format. This ensures rich intellisense tooltips for developers utilizing the plugin.

### Format Rules
- Start the block with `/**`
- Provide a markdown header containing the component name (e.g., `* ## MyComponent`)
- Include a descriptive summary
- Document all parameters using `@param` and return types using `@returns`

**Example:**
```typescript
/**
 * ## myExportedFunction
 * A brief description of what this function does.
 * 
 * @param input - The input value to process
 * @returns The successfully processed result
 */
export function myExportedFunction(input: string): string { ... }
```

## 7. Monorepo & CI Configuration

### A. Update Monorepo Lockfile (`package-lock.json`)

When adding a new workspace package, you **must** update the root monorepo lockfile so that `npm ci` in CI workflows recognizes the new workspace symlink:
```bash
npm install --package-lock-only
```

### B. Release Workflow Configuration (`.github/workflows/publish.yml`)

Update `.github/workflows/publish.yml` to enable manual `workflow_dispatch` provenance releases:

1. **Add to Package Selector**: Add `@magmacomputing/tempo-plugin-[name]` to the `options` array under `inputs.target`.
2. **Add to Target Validation**: Add `@magmacomputing/tempo-plugin-[name]` to the `case "$TARGET" in` validation pattern.
3. **Add to Bulk Publish**: Add `publish_pkg "@magmacomputing/tempo-plugin-[name]"` to the `if [ "$TARGET" = "all" ]` block.

## 8. Initial Release & Trusted Publisher Configuration (OIDC & Provenance)

NPM Trusted Publishing (OIDC) requires that a package **already exists** on the npm registry before its access settings can be configured. Therefore, introducing a new plugin involves a one-time bootstrap step followed by configuring automated CI releases:

### Step 1: Manual Initial Publish (Bootstrap)
Because npm cannot configure Trusted Publishers for non-existent packages, the initial bootstrap release (`v0.1.0`) must be published manually by an authenticated maintainer:
1. Build the plugin and navigate to its workspace directory:
   ```bash
   npm run build --workspace=@magmacomputing/tempo-plugin-[name]
   cd packages/plugins/[name]
   ```
2. Authenticate and publish the initial public version:
   ```bash
   npm login
   npm publish --access public
   ```

### Step 2: Configure NPM Trusted Publisher
Once the package exists on `npmjs.com`, configure GitHub Actions OIDC for all future releases:
1. **Navigate to Package Access**: Go to `https://www.npmjs.com/package/@magmacomputing/tempo-plugin-[name]/access`.
2. **Add Publisher**: Under **Publishing Access** $\rightarrow$ **Trusted Publishers**, click **Add GitHub Actions Publisher**.
3. **Configure Settings**:
   - **Organization / Owner**: `magmacomputing`
   - **Repository**: `magma`
   - **Workflow filename**: `publish.yml`
   - **Environment**: *(leave blank unless using environment-gated deployments)*

### Step 3: Subsequent Releases via CI (`1.0.0`+)
Once configured, bump the package version to `1.0.0` (or subsequent versions) and trigger `.github/workflows/publish.yml` (`workflow_dispatch` or batch release). The release will be cryptographically signed and published with Sigstore provenance (`--provenance`) without requiring long-lived npm tokens.
