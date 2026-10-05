# [Magma Computing](https://github.com/magmacomputing/magma)

Professional open-source software and architectural consulting for modern web and server-side applications.

## 🚀 Projects

This monorepo contains the following core projects:

- **[Tempo](packages/tempo/README.md)**: A premium, high-performance wrapper around the native JavaScript `Temporal` API.
- **[Tempo-Fns](packages/functions/README.md)**: A tree-shakeable utility library for standalone functional operations.
- **[Tempo-Plugins](packages/plugins/)**: An ecosystem of optional plugins that extend the core Tempo engine.
- **[Library](packages/library/README.md)**: A collection of shared, tree-shakable utilities used across Magma projects.

## 📚 Resources

All technical documentation has been moved into the respective package directories to streamline publication and maintenance.

- **Tempo Docs**: [packages/tempo/doc/](./packages/tempo/doc/)
- **Visual Assets**: [packages/tempo/img/](./packages/tempo/img/)
## ⚙️ Environment & Prerequisites

- **Node.js**: Requires `node >= 20.0.0` (Recommended: **Node.js 24 LTS** or **Node.js >= 26.10.0**).
  - An [`.nvmrc`](./.nvmrc) and [`.node-version`](./.node-version) are provided to pin to `26.10.0`.
  - *Note*: If evaluating Node 26, ensure you are running `v26.10.0+` (earlier development builds such as `<= 26.4.0` contain an incomplete V8 `Temporal` implementation).

## 💖 Community & Support

For commercial support, architectural consulting, or custom plugin development, please visit our [Commercial Services](./packages/tempo/doc/8-project-and-support/commercial.md) guide or contact us at `tempo@magmacomputing.com.au`.

---

© 2026 Magma Computing. Distributed under the MIT License.
