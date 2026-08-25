# Zero-Config AI Sandbox, Cloud Proxy & Onboarding Plan (`@magmacomputing/tempo-plugin-ai`)

## Executive Summary
This feature plan outlines the design and implementation of an out-of-the-box, zero-configuration trial experience for `@magmacomputing/tempo-plugin-ai`, a dedicated **Fast-Track Onboarding Guide**, browser-context sandbox execution, and a live interactive StackBlitz playground.

Currently, developers evaluating the AI plugin must obtain external API keys (Groq, OpenAI, Anthropic, Gemini), set up `.env` files, and configure provider pools before executing their first query. This introduces onboarding friction.

With this feature, executing `initAI()` without explicit options (or executing `parseAI()` directly) automatically connects to a secure, rate-limited **Magma Cloud Sandbox Proxy** (`https://tempo.magmacomputing.com.au/api/ai/demo`), enabling instant 10-second trials of `parseAI()`, `formatAI()`, `extractAI()`, `diffAI()`, `recurrenceAI()`, and `scheduleAI()` in both **Node.js** and **Browser (`localhost`)** environments.

---

## 1. Architectural Overview

```
┌────────────────────────────────────────────────────────┐
│     Developer Environment (Node.js or Browser)         │
│  - Localhost (http://localhost:3000)                   │
│  - StackBlitz / CodeSandbox                            │
│  - Node.js CLI / REPL                                  │
│                                                        │
│  import { parseAI } from '@magmacomputing/tempo-ai';   │
│  await parseAI("next Tuesday");                        │
└───────────────────────────┬────────────────────────────┘
                            │ (No API keys or initAI options)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Client: DemoSandboxProvider                │
│       Defaults to Magma Cloud Sandbox Endpoint         │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS POST /api/ai/demo (CORS enabled)
                            ▼
┌────────────────────────────────────────────────────────┐
│              Magma Cloud Proxy Server                  │
│       (Cloudflare Worker / GCP Cloud Function)         │
│  - IP-based rate limiting (20 req/hr)                  │
│  - Origin validation (localhost, stackblitz, etc)      │
│  - Zero payload logging/retention                      │
└───────────────────────────┬────────────────────────────┘
                            │ Server-Side Secret Key
                            ▼
┌────────────────────────────────────────────────────────┐
│             Ultra-Fast Inference Provider              │
│        (Groq Llama-3.3-70b / Gemini Flash)             │
└────────────────────────────────────────────────────────┘
```

---

## 2. Client-Side & Browser-Context Sandbox Execution

### A. Zero-Config Sandbox in Node.js & Browser (`localhost`)
Because client-side browser apps (React, Vue, Svelte, vanilla JS) cannot safely embed private API keys without exposing them in client bundles, the zero-config Magma Cloud Proxy is ideal for frontend development:

```typescript
import { initAI, parseAI } from '@magmacomputing/tempo-plugin-ai';

// Works out-of-the-box on localhost, StackBlitz, or Node CLI:
await initAI(); 

const date = await parseAI("next Tuesday around 3pm");
console.log(date.format('{yyyy}-{mm}-{dd}'));
```

### B. Actionable Error Normalization (`TempoAiError`)
If the cloud proxy returns HTTP `429 Too Many Requests` (quota reached) or HTTP `403 Forbidden` (invalid origin), intercept the response and throw a developer-friendly error:

```typescript
if (response.status === 429) {
  throw new TempoAiError(
    `[Tempo AI Sandbox] Trial quota exceeded for your IP address (20 requests/hr).\n` +
    `To continue with unlimited queries, configure your own provider via initAI():\n\n` +
    `await initAI({\n` +
    `  providers: [{ id: 'groq', key: process.env.GROQ_API_KEY }]\n` +
    `});`,
    { status: 429, provider: 'demo-sandbox' }
  );
}
```

---

## 3. Serverless Cloud Proxy Architecture (`/api/ai/demo`)

### A. Hosting & Infrastructure
* **Platform**: Cloudflare Worker or GCP Cloud Function at `https://tempo.magmacomputing.com.au/api/ai/demo`.
* **Upstream LLM Provider**: **Groq (Llama-3.3-70b-versatile)** for sub-150ms execution speed and ultra-low operating cost.

### B. Security, CORS & Rate-Limiting Controls
1. **CORS & Allowed Origins**:
   * Preflight `OPTIONS` response allowing headers `Content-Type`, `X-Tempo-Version`.
   * Allowed Origins: `http://localhost:*`, `http://127.0.0.1:*`, `https://tempo.magmacomputing.com.au`, `https://*.stackblitz.io`, `https://*.codesandbox.io`, `https://*.stackblitz.com`.
2. **IP Rate Limiting**: 20 requests per IP address per rolling 1-hour window (tracked in KV storage).
3. **Payload Sanitization**: Maximum request payload capped at 2KB to prevent token exhaustion attacks.
4. **Privacy Guarantee**: Zero disk storage, zero logging of prompt text or AI completions.

---

## 4. Fast-Track Onboarding Guide (`doc/onboarding.md`)

Create a dedicated, step-by-step **Fast-Track Onboarding Guide** for developers ready to configure their own LLM providers:

### A. Provider API Key Acquisition
* **Groq**: Direct link (`https://console.groq.com/keys`), zero-cost free tier, ultra-fast latency (~150ms).
* **Google Gemini**: Direct link (`https://aistudio.google.com/app/apikey`), generous free tier.
* **OpenAI**: Direct link (`https://platform.openai.com/api-keys`), standard industry baseline.
* **Anthropic**: Direct link (`https://console.anthropic.com/`), high-reasoning accuracy.

### B. Environment Variable Setup (`.env`)
```env
# Copy to .env or .env.local
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIzaSy...
```

### C. Cost vs. Latency Balancing Strategy
* **Recommended Default**: Groq `llama-3.3-70b` ($0.59 / 1M tokens, ~150ms).
* **High Accuracy**: OpenAI `gpt-4o` or Anthropic `claude-3-5-sonnet`.
* **Cost-Efficient Multi-Provider Setup**:
  ```typescript
  await initAI({
    mode: AiMode.Fallback,
    providers: [
      { id: 'groq', key: process.env.GROQ_API_KEY },      // Tier 1: Fast & cheap
      { id: 'openai', key: process.env.OPENAI_API_KEY }    // Tier 2: High-capacity fallback
    ]
  });
  ```

---

## 5. StackBlitz Interactive Playground & README Integration

1. **StackBlitz One-Click Badge**:
   Add an interactive **"Open in StackBlitz"** badge to `README.md` and VitePress sidebar pointing to a live playground repository pre-configured with zero-config `initAI()` and `parseAI()`.
   ```markdown
   [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/magmacomputing/tempo-plugin-ai-demo)
   ```

2. **Interactive VitePress Playground**:
   Embed a live, interactive Vue component on `index.md` calling the zero-config demo endpoint directly from the documentation site.

---

## 6. Implementation Checklist

- [ ] Create `DemoSandboxProvider` in `packages/plugins/ai/src/providers/demo.ts`.
- [ ] Add fallback logic in `initAI()` when no explicit providers or env keys exist.
- [ ] Implement HTTP 429 quota exception casting in `TempoAiError`.
- [ ] Create Fast-Track Onboarding guide in `packages/plugins/ai/doc/onboarding.md`.
- [ ] Deploy Serverless Cloud Function handler (`bin/sandbox-proxy-worker.js`) with CORS for `localhost` and `StackBlitz`.
- [ ] Add unit tests for demo provider fallback and 429 rate-limit error handling in `packages/plugins/ai/test/discovery.test.ts`.
- [ ] Add StackBlitz playground link and badge to `@magmacomputing/tempo-plugin-ai` `README.md` and `doc/index.md`.
