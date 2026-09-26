# Community Plugin Publishing Template

This template outlines the standard operating procedure for preparing and publishing a Community plugin in the Tempo ecosystem.

## 1. `package.json` Configuration

Ensure the plugin's `package.json` contains the correct community configuration:

- **Version**: Set to `"0.1.0"` for the initial bootstrap release (allowing the official `1.0.0` GA release to be published via CI with full Sigstore provenance).
- **License**: Must strictly be `"MIT"`.
- **Type**: Set `"type": "module"`.
- **Files**: Include the published files array (omit `"src"` as `"dist"` contains all compiled JavaScript bundles and TypeScript `.d.ts` type definitions):
  ```json
  "files": [
    "dist",
    "README.md",
    "CHANGELOG.md",
    "LICENSE"
  ]
  ```
  > [!NOTE]
  > **Do not include `"src"` in `"files"`**. The build step (`tsup && tsc`) generates all production artifacts, source maps, and declaration types into `dist/`. Publishing `"src"` adds unnecessary weight to the npm package tarball without providing runtime or typing benefits.
- **Dependencies (`peerDependencies` vs `devDependencies`)**:
  - `peerDependencies`: Always declare `@magmacomputing/tempo` as a peer dependency (e.g. `"^4.4.0"`). This informs package managers that the host application provides the core Tempo runtime, guaranteeing a single shared singleton instance across the application.
  - `devDependencies`: Include `@magmacomputing/tempo` under `devDependencies` so the plugin can resolve imports, compile TypeScript types, and execute local unit tests without bundling Tempo into production dependencies.
  - `dependencies`: Community plugins should keep production `dependencies` as lean as possible (or empty) to minimize supply-chain surface area.
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
- **Exports & Subpaths**: Define exports with types, main entrypoint, and the standardized **`/install`** side-effect entrypoint:
  ```json
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./install": {
      "types": "./dist/install.d.ts",
      "import": "./dist/install.js"
    }
  }
  ```
- **SideEffects**: Mark only the `/install` subpath as side-effecting so root imports remain 100% tree-shakeable:
  ```json
  "sideEffects": [
    "./dist/install.js"
  ]
  ```
- **Scripts**: 
  - Ensure `"build": "tsup && tsc"` is present.
  - Include the prepublish safeguard: `"prepublishOnly": "tempo-cli prepublish"`.
  - Include the correct test script: `"test": "vitest run -c ../vitest.shared.ts"`.
- **Keywords**: Ensure relevant keywords are present (`tempo`, `tempo-plugin`, `magmacomputing`, `temporal`, `plugin`, etc.).
- **tempo**: Set `"plan": "community"`.

## 2. Standard `/install` Subpath (`src/install.ts`)

Every Tempo plugin must provide a dedicated `src/install.ts` entrypoint. This enables zero-boilerplate side-effect imports (`import '@magmacomputing/tempo-plugin-[name]/install'`) in scripts, REPLs, and rapid applications while keeping root imports 100% pure and tree-shakeable:

```typescript
import { autoInstall } from '@magmacomputing/tempo/plugin/sdk';
import { MyPlugin } from './index.js';

// Auto-register plugin onto Tempo upon side-effect import
autoInstall(MyPlugin);

export * from './index.js';
export { MyPlugin, default } from './index.js';
```

## 3. Build Configuration (`tsup.config.ts` & `tsconfig.json`)

To ensure standard monorepo builds, include a `tsup.config.ts` that extends the workspace's shared configuration and compiles both `src/index.ts` and `src/install.ts`:

```typescript
import { defineConfig } from 'tsup';
import { sharedConfig } from '../tsup.shared.ts';

export default defineConfig({
	...sharedConfig,
	entry: ['src/index.ts', 'src/install.ts'],
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

> [!IMPORTANT]
> **Do not import test primitives from `'vitest'` in test scripts.**
> In the Tempo workspace and plugin ecosystem, Vitest runs with `globals: true` (configured in `vitest.shared.ts` / `vitest.config.ts`). Standard testing utilities (`describe`, `it`, `test`, `expect`, `beforeEach`, `afterEach`, `beforeAll`, `afterAll`, `vi`) are globally injected into the test runtime environment. Do not write `import { describe, it, expect } from 'vitest';`.

## 4. Documentation (`README.md` & `doc/index.md`)

Community plugins must follow a uniform documentation standard.

### Structure
- **Logo**: `![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)` (for README) or `![Tempo Plugin](/plugin-logo.svg)` (for docs).
- **Header**: `# @magmacomputing/tempo-plugin-[name]`
- **Badges**: Standard visual indicators placed immediately below the Header. Badges must be aligned horizontally in a **single centered row** using `<p align="center">` with `style="display: inline-block; margin: 0 4px;"`:
  - **`README.md` (5 Badges)**: NPM Version, Peer Dependency, License, TypeScript Ready, and Docs VitePress:
    ```html
    <p align="center">
      <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-[name]"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-[name]?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-[name]/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-[name]"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-[name]?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/[name].index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
    </p>
    ```
  - **`doc/index.md` (4 Badges)**: NPM Version, Peer Dependency, License, and TypeScript Ready:
    ```html
    <p align="center">
      <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-[name]"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-[name]?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-[name]/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-[name]"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-[name]?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
    </p>
    ```
- **Description**: A short, concise summary.
- **Installation**: Code block with `npm install @magmacomputing/tempo-plugin-[name]`. Do not use hard-coded peer-dependency text warnings.
- **Usage & Live Interactive REPL**:
  - In `doc/index.md` (Web Documentation): Insert the `<PluginRepl plugin="[name]" />` component under `## Usage Examples`. This renders a zero-overhead static code preview with an on-demand "Run Live Interactive Demo" button that mounts the in-browser ESM sandbox.
  - In `README.md` (GitHub / NPM): Insert an in-context callout link immediately below the primary usage code example:
    `> ⚡ **[Try this live in the interactive Tempo Sandbox ↗](https://magmacomputing.github.io/magma/repl/index.html?plugin=[name])**`
- **Documentation Link** (README only): Link to full docs at `https://magmacomputing.github.io/magma/doc/9-plugins/[name].index.html`.
- **Licensing**: Must state: "This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required."

### Standard Icons & UI Actions

To maintain complete visual and design consistency across READMEs, documentation pages, and `ecosystem.md`:

- **Documentation Links (Open-Book SVG)**:
  Any buttons or table links pointing to documentation pages must use the Lucide/Feather **open-book** SVG (`M2 3h6a4 4 0 0 1 4 4v14...`), matching `ecosystem.md` (`CatalogList.vue`). In markdown prose/paragraphs, prefix documentation links with the open-book emoji (`📖 **[Read the Official [Name] Plugin Documentation](...)**`):
  ```html
  <a href="./doc/[feature].md" class="btn btn-secondary icon-btn" title="View Documentation">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="View Documentation">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
    </svg>
  </a>
  ```

- **Copy Install Command (Two Sheets SVG / Two Folded Pages)**:
  Any interactive buttons or shortcuts for copying the package install command must use the Two Sheets SVG icon (two pages with folded top-right corners, foreground sheet in bottom-left) matching `ecosystem.md` (`CatalogList.vue`):
  ```html
  <button class="action-btn copy-icon-btn" title="Copy Install Command">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 6V4a2 2 0 0 1 2-2h6l4 4v11a2 2 0 0 1-2 2h-3"></path>
      <path d="M16 2v4h4"></path>
      <path d="M10 6H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V11l-5-5z"></path>
      <path d="M10 6v5h5"></path>
    </svg>
  </button>
  ```

> [!IMPORTANT]
> **Never manually modify documents in `packages/tempo/doc/9-plugins/*` directly.** All plugin documentation must be authored strictly within each plugin's own `packages/plugins/[name]/doc/*` directory. The monorepo's automated harvester copies and indexes them into `packages/tempo/doc/9-plugins/` during `npm run docs:build`.
>
> **No `file://` Reference Links**: Never use absolute local `file://` links in `README.md`, `doc/index.md`, or notes. These links break when VitePress compiles documentation for GitHub Pages and will not resolve for users on npm or GitHub. Always use standard relative links (e.g., `../[section]/[file].md` or `/doc/9-plugins/[name].index`) or public HTTPS URLs.

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

1. **Add Checkbox Input**: Add `plugin_[name]` under `inputs:` with `type: boolean` (default: `false`) and description `'@magmacomputing/tempo-plugin-[name]'`.
2. **Add to Input Resolution**: Add `[ "$INPUT_PLUGIN_[NAME]" = "true" ] && PKGS+=("@magmacomputing/tempo-plugin-[name]")` in the workflow bash script.
3. *(Optional)* Even without adding a dedicated checkbox, any new plugin can be immediately published via the workflow's **Custom packages** text box by typing `[name]` or `@magmacomputing/tempo-plugin-[name]`.

### C. REPL Playground & Interactive Documentation Integration (`packages/tempo/public/repl/`)

When introducing or retiring a plugin, register it across the browser REPL playground, the interactive documentation components, and the plugin ecosystem catalog:

1. **Catalog Registration & Synchronization**:
   - Ensure the plugin's `package.json` contains valid metadata (`name`, `version`, `description`, `"tempo": { "plan": "community" }`).
   - Run the catalog sync CLI command from the repository root:
     ```bash
     node packages/tempo-cli/index.js catalog-sync
     ```
     This automatically:
     - Updates the source catalog at `packages/plugins/.setup/catalog.json`.
     - Regenerates the dynamic ESM browser loader manifest at `packages/tempo/public/repl/plugins.manifest.js`.
     - Syncs local versions to `packages/tempo/.vitepress/theme/data/catalog.json`.

2. **Browser Import Map Registration (`public/repl/`)**:
   - Add the plugin's CDN mapping to the `<script type="importmap">` in both `packages/tempo/public/repl/index.html` (pinned to major version `@^1`) and `packages/tempo/public/repl/showcase.html` (`@latest`):
     ```json
     "@magmacomputing/tempo-plugin-[name]": "https://esm.sh/@magmacomputing/tempo-plugin-[name]@^1"
     ```
     > [!NOTE]
     > Even though a new plugin is initially published at `v0.1.0` solely to register it on npmjs and configure Trusted Publishers (OIDC), the plugin is immediately bumped to `v1.0.0` for regular CI publishing via `publish.yml`. Therefore, always target `@^1` (or `@latest`) in the REPL import maps.

3. **Dedicated Playground Preset (`DEFAULT_PRESETS` in `public/repl/index.html`)**:
   - Add a domain-specific, runnable demonstration snippet under `DEFAULT_PRESETS` in `packages/tempo/public/repl/index.html` using the plugin's key name (e.g. `holidays`, `celestial`, `geo`):
     ```javascript
     [name]: `// 🚀 [Plugin Name] Demo (@magmacomputing/tempo-plugin-[name])
     const { [PluginExport] } = await import('@magmacomputing/tempo-plugin-[name]');
     Tempo.use([PluginExport]);

     // Runnable domain-specific example code...
     const t = new Tempo();
     console.log(t.[name]...);
     return t.format(...);`,
     ```
     > [!IMPORTANT]
     > Without this entry, navigating to `https://magmacomputing.github.io/magma/repl/index.html?plugin=[name]` cannot find a matching preset and will silently fall back to displaying the generic `quickstart` template.

4. **VitePress Ecosystem & Documentation Component**:
   - **`CatalogList.vue` (`packages/tempo/.vitepress/theme/components/CatalogList.vue`)**: Ensure the plugin's ID is assigned to an appropriate functional category in `DOMAIN_GROUPS` (e.g., `geo`, `celestial`, `business`, `system`, `ai`, `dialects`) so it is listed under the proper section on the `ecosystem.md` page.
   - **`PluginRepl.vue` (`packages/tempo/.vitepress/theme/components/PluginRepl.vue`)**: Add a matching static preview code snippet to `DEFAULT_SNIPPETS` so `<PluginRepl plugin="[name]" />` embeds a clean static code box with an instant "Run Live Interactive Demo" action.

5. **Retirement Checklist**:
   - When deprecating or retiring a plugin, remove its package directory from `packages/plugins/`.
   - Rerun `node packages/tempo-cli/index.js catalog-sync` to prune `plugins.manifest.js`.
   - Remove its entries from import maps in `index.html` and `showcase.html`.
   - Prune preset references from `CatalogList.vue`, `PluginRepl.vue`, and `index.html`.

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
