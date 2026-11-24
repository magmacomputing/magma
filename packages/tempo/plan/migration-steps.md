Ran count @magmacomputing file references per workspace

Good thing you asked—checking the repo shows `@magmacomputing` appears in **~729 non-dist files** (`library`: 5, `functions`: 46, `tempo`: 389, `plugins`: 284, `.github`: 5), so doing it in one PR would blow past CodeRabbit's 100-file limit.

### 1. Do doc links still contain `magma`?
**Yes**—as long as your GitHub repo is `magmacomputing/magma` and VitePress uses `base: '/magma/'`, GitHub Pages links (`magmacomputing.github.io/magma/...`) and `repository.url` keep `magma` (unless you later add a custom domain or rename the repo). Also **leave `packages/tempo/public/v4/` untouched**, since v4.7.0 docs legitimately refer to `@magmacomputing/tempo`.

---

### 2. Recommended Cutover Order (Under ~80 Files per PR)

1. **PR 1 — `tempo-lib` & `tempo-fns`** *(~55 files)*:
   - Rename `packages/library/package.json` → `tempo-lib` and `packages/functions/package.json` → `tempo-fns` (plus `packages/functions` source/test/doc refs and `packages/plugins/geo` importing `tempo-fns`).
   - Run `npm run lock:sync`.
2. **PR 2 — `tempo-kit` Core + CI/Publish** *(~40–60 files)*:
   - Rename `packages/tempo/package.json` → `tempo-kit`, update `packages/plugins/.terms`, root `package.json` / `package-lock.json`, `tempo-cli`, and `.github/workflows/publish.yml` (OIDC + `tempo-kit` / `@tempo-kit/*`).
3. **PR 3 & PR 4 — `@tempo-kit/plugin-*` in 2 batches** *(~70–85 files each)*:
   - **Batch A**: `dialects`, `ticker`, `ntp`, `signals`, `sync`, `snap` (`package.json`, `src/`, `test/`, `doc/`).
   - **Batch B**: `ai`, `batch`, `celestial`, `geo`, `holidays`, `roman`, `spatial` + `.setup/catalog.json`.
4. **PR 5 & PR 6 — `packages/tempo/test/` & `packages/tempo/doc/`** *(batched <90 files each)*:
   - Update `packages/tempo/test/` imports/assertions, then `packages/tempo/doc/`, `README.md` (with the `@formkit/tempo` distinction), `llms.txt`, and `npm run docs:build`.

*(Note: When `packages/tempo` renames to `tempo-kit` i-n PR 2, any plugin/test importing `'@magmacomputing/tempo'` needs to either switch to `'tempo-kit'` or be updated in PR 2–3—so we should run `npm run build:all && npm test` at each step.)*
