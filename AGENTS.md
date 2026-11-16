# Magma Monorepo Agent Guidelines

When working anywhere inside `/home/michael/Project/magma`, follow the workspace rules in `.agents/rules/`:

- **[styleGuide.md](./.agents/rules/styleGuide.md)**: Follow all TypeScript style conventions — omit braces on single-line `if` branches, prefer `#library/assertion.library.js` helpers (`isNumber`, `isString`, `isFunction`, `isPlainObject`, `isObject`, `isReference`, `isUndefined`, `isText`) over raw `typeof`/`null` checks, use top-level `import type`, mark internal cross-module exports with `/** @internal */`, include trailing commas in multi-line structures, hoist static regexes as module-level `RE_*` constants, use ternaries for dual terminal returns, avoid internal re-exports, and minimize `export` surface.
- **[git-workflow.md](./.agents/rules/git-workflow.md)**: Never run `git commit` or `git push`. Leave changes uncommitted in the working tree.
- **[tempo.md](./.agents/rules/tempo.md)**: Consult `packages/tempo/public/llms.txt` (and `llms-full.txt` when needed) before proposing or refactoring Tempo APIs; prefer `Temporal` over legacy `Date`.
- **[documentation.md](./.agents/rules/documentation.md)**: Never edit harvested docs in `packages/tempo/doc/9-plugins/` directly; edit plugin docs in `packages/plugins/<name>/doc/`.
- **[coderabbit.md](./.agents/rules/coderabbit.md)** & **[plan-execution.md](./.agents/rules/plan-execution.md)**: Use native file editing tools during interactive sessions and only run local CodeRabbit reviews when explicitly requested or via `/review`.
