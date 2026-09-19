# Interactive REPL & Feature Showcase

Tempo offers two dedicated, zero-install in-browser environments running 100% client-side via native ECMAScript Modules (`esm.sh`):

1. [**🎨 Feature Showcase & Workbench**](#interactive-feature-showcase): A dynamic, visual sandbox to test format tokens, chained mutations, relative durations, world geolocation, and astronomical ephemeris in real time with auto-generated TypeScript code.
2. [**⚡ Freeform Code REPL**](#freeform-code-repl): A freeform JavaScript/TypeScript code editor with real-time evaluation, console streaming, official plugin preloading, and snippet URL sharing.

---

## 🎨 Interactive Feature Showcase {#interactive-feature-showcase}

Explore live formatting, chained mutations, hemisphere-aware astronomical seasons, and celestial mechanics without writing boilerplate:

<iframe
  src="/magma/repl/showcase.html"
  sandbox="allow-scripts allow-modals allow-same-origin"
  style="width: 100%; height: 1180px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; background: #0b0f19; margin-top: 16px; margin-bottom: 20px;"
  title="Tempo Interactive Showcase"
  loading="lazy"
></iframe>

<div style="margin: 0 0 36px 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
  <span style="color: var(--vp-c-text-2); font-size: 0.9rem;">Runs 100% in your browser. Generates ready-to-use TypeScript code.</span>
  <a href="/magma/repl/showcase.html" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; background: linear-gradient(135deg, #0284c7, #9333ea); color: #fff; font-weight: 600; text-decoration: none; font-size: 0.9rem; box-shadow: 0 4px 14px rgba(56, 189, 248, 0.3);">
    <span>🚀 Open Full-Screen Showcase</span>
    <span>↗</span>
  </a>
</div>

---

## ⚡ Freeform Code REPL {#freeform-code-repl}

An instant scratchpad for testing custom algorithms, experimental plugin imports, and sharing reproducible snippet links:

<iframe
  src="/magma/repl/index.html"
  sandbox="allow-scripts allow-modals allow-same-origin"
  style="width: 100%; height: 860px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; background: #0b0f19; margin-top: 16px; margin-bottom: 20px;"
  title="Tempo Interactive REPL"
  loading="lazy"
></iframe>

<div style="margin: 0 0 32px 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
  <span style="color: var(--vp-c-text-2); font-size: 0.9rem;">Pre-configured with <code>Tempo</code>, <code>Temporal</code>, and official plugins.</span>
  <a href="/magma/repl/index.html" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; font-weight: 600; text-decoration: none; font-size: 0.9rem; box-shadow: 0 4px 14px rgba(56, 189, 248, 0.3);">
    <span>🚀 Open Full-Screen Code REPL</span>
    <span>↗</span>
  </a>
</div>

---

## Key Capabilities

### 1. Preloaded Official Plugins
Both environments pre-register the core Tempo instance along with official plugins:
- `@magmacomputing/tempo-plugin-geo`
- `@magmacomputing/tempo-plugin-astro`
- `@magmacomputing/tempo-plugin-celestial`

You can immediately access Terms, seasons, and celestial data without import boilerplate:
```javascript
const t = new Tempo('today', { geo: { lat: -33.86, lng: 151.2 } });
console.log(t.term.szn);            // "Spring"
console.log(t.term.lunar.phase);    // "First Quarter"
```

### 2. Dynamic Plugin Loading via ESM
Need an additional plugin like `@magmacomputing/tempo-plugin-ticker` or custom third-party modules? Use standard dynamic imports in the Code REPL:

```javascript
const { TickerPlugin } = await import('@magmacomputing/tempo-plugin-ticker');
Tempo.use(TickerPlugin);

console.log('Ticker plugin active!');
```

### 3. AI Semantic Parsing & Natural Language Scheduling
Explore generative date parsing, conversational recurrence, and multi-point event scheduling powered by [`@magmacomputing/tempo-plugin-ai`](/doc/9-plugins/ai.index):
- Select the **Preset: AI Semantic Parsing & Scheduling** from the preset dropdown.
- **Supported Provider Configuration (BYOK)**: Provide an API key or local endpoint in `Tempo.ai.init({ providers: [...] })` before calling `Tempo.ai.parse` or `Tempo.ai.schedule`.
- **External Resources & Free Keys**:
  - **[Groq Console](https://console.groq.com/keys)**: Ultra-fast inference with a generous free tier (recommended for quick testing).
  - **[Google AI Studio (Gemini)](https://aistudio.google.com/app/apikey)**: Free API key for Gemini models.
  - **[OpenAI Platform](https://platform.openai.com/api-keys)**: Standard GPT-4o / GPT-4o-mini keys.
  - **[Ollama](https://ollama.com)**: 100% free, private local LLMs. *Note: When running locally for browser access, start Ollama with CORS enabled: `OLLAMA_ORIGINS="*" ollama serve`.*

> [!WARNING]
> **API Key Safety in Share Links**:
> When you click **📋 Share**, the editor content is encoded into the URL hash (`#code=...`). **Never paste production or sensitive API keys into shared snippets**. For live testing, use ephemeral personal sandbox keys or local Ollama.

### 4. Shareable Snippets & Presets
- **Share**: Click the **📋 Share** button in the REPL header to encode your code directly into a shareable URL hash (`#code=...`).
- **Copy Code**: Click **📋 Copy Code** in the Showcase to grab production-ready TypeScript code for your current visual setup.

### 5. Keyboard Shortcuts
- **`Ctrl + Enter`** (Windows/Linux) or **`Cmd + Enter`** (macOS): Immediately re-evaluate the current editor code.
- **`Tab`**: Inserts 2-space indentation.
