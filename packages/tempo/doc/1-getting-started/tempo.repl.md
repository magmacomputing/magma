# Interactive REPL

Welcome to the **Tempo Interactive REPL** — an instant, zero-install in-browser scratchpad for testing date-time logic, layout tokens, and plugins directly in your browser.

<iframe
  src="/magma/repl/index.html"
  sandbox="allow-scripts allow-modals"
  style="width: 100%; height: 680px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; background: #0b0f19; margin-top: 16px; margin-bottom: 20px;"
  title="Tempo Interactive REPL"
  loading="lazy"
></iframe>

<div style="margin: 0 0 32px 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
  <span style="color: var(--vp-c-text-2); font-size: 0.9rem;">Runs 100% client-side with native ECMAScript Modules (`esm.sh`). Zero install or local build tools required.</span>
  <a href="/magma/repl/index.html" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; font-weight: 600; text-decoration: none; font-size: 0.9rem; box-shadow: 0 4px 14px rgba(56, 189, 248, 0.3);">
    <span>🚀 Open Full-Screen REPL</span>
    <span>↗</span>
  </a>
</div>

---

## Key Features

### 1. Preloaded Official Plugins
The REPL sandbox pre-registers the core Tempo instance along with official plugins:
- `@magmacomputing/tempo-plugin-geo`
- `@magmacomputing/tempo-plugin-astro`
- `@magmacomputing/tempo-plugin-celestial`

You can immediately access Terms, seasons, and celestial data without import boilerplate:
```javascript
const t = new Tempo('today', { geo: { lat: -33.86, lon: 151.2 } });
console.log(t.term.szn);            // "Spring"
console.log(t.term.lunar.phase);    // "First Quarter"
```

### 2. Dynamic Plugin Loading via ESM
Need an additional plugin like `@magmacomputing/tempo-plugin-ticker` or custom third-party modules? Use standard dynamic imports:

```javascript
const { TickerPlugin } = await import('@magmacomputing/tempo-plugin-ticker');
Tempo.use(TickerPlugin);

console.log('Ticker plugin active!');
```

### 3. Shareable Snippets
Click the **📋 Share** button in the REPL header to encode your code directly into a shareable URL hash (`#code=...`). Anyone opening the link will see your snippet preloaded and ready to run.

### 4. Keyboard Shortcuts
- **`Ctrl + Enter`** (Windows/Linux) or **`Cmd + Enter`** (macOS): Immediately re-evaluate the current editor code.
- **`Tab`**: Inserts 2-space indentation.

---

> [!TIP]
> **Coming Soon: Custom Setup Templates**  
> Future releases will introduce a **Setup** configuration drawer (similar to the TypeScript Playground compiler options), allowing you to pre-define custom `Tempo.init()` configs and `tempo.config.ts` templates right from the REPL UI.
