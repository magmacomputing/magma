# Provider Architecture & Security

The `@magmacomputing/tempo-plugin-ai` plugin is designed to be highly flexible, supporting both direct Bring Your Own Key (BYOK) integrations for backend systems, and Proxied integrations for frontend clients.

## Bring Your Own Key (BYOK)

For Node.js backends and Edge Workers, the simplest approach is to supply your raw API keys directly to the `initAI` function. 

```typescript
import { initAI } from '@magmacomputing/tempo-plugin-ai';

initAI({
  providers: [
    ...(process.env.GROQ_API_KEY ? [{ id: 'groq', key: process.env.GROQ_API_KEY }] : []),
    ...(process.env.GEMINI_API_KEY ? [{ id: 'gemini', key: process.env.GEMINI_API_KEY }] : []),
    ...(process.env.OPENAI_API_KEY ? [{ id: 'openai', key: process.env.OPENAI_API_KEY }] : [])
  ]
});
```

### Advanced Configuration (Custom Models & LLM Options)
By default, standard providers automatically map to their optimal APIs and default models. 
However, you can explicitly override URLs, models, and inject arbitrary LLM parameters (like `temperature`) for power-user control!

```typescript
initAI({
  providers: [
    // 1. Enterprise Azure OpenAI (via Entra ID Bearer token or backend proxy wrapper)
    // Note: BYOK requests send 'Authorization: Bearer <key>'. When connecting to Azure OpenAI,
    // supply an Entra ID bearer token as provider.key or route through an Azure API gateway.
    ...(process.env.AZURE_ENTRA_BEARER_TOKEN ? [{ 
      id: 'openai', 
      key: process.env.AZURE_ENTRA_BEARER_TOKEN,
      url: 'https://my-enterprise.openai.azure.com/v1/chat/completions',
      model: 'your-enterprise-model',
      options: { temperature: 0.2, seed: 42 }
    }] : []),
    // 2. Local Open-Source Models (e.g. Ollama)
    { 
      id: 'local', 
      key: 'no-key-needed',
      url: 'http://localhost:11434/v1/chat/completions',
      model: 'your-local-model',
      options: { timeout: 5000 } // Custom provider-level timeout (5s)
    }
  ]
});
```

### Dynamic Provider Manifests & Air-Gapped Fallback

By default, `@magmacomputing/tempo-plugin-ai` lazily fetches provider defaults (model IDs, endpoints, token parameter keys) from `https://tempo.magmacomputing.com.au/providers.v1.json` once per application lifecycle.

- **Fail-Open & Air-Gapped Fallback**: If the network request fails, times out (1500ms limit), or the application is running offline or in an air-gapped environment, `initAI()` automatically and silently falls back to compiled local defaults (`DEFAULT_PROVIDERS`).
- **Disabling Remote Manifest**: Pass `remoteConfigUrl: false` to disable remote manifest fetching entirely:
  ```typescript
  initAI({
    providers: [{ id: 'groq', key: process.env.GROQ_API_KEY! }],
    remoteConfigUrl: false // Disable remote manifest fetching
  });
  ```

### Frontend Security Warning
> [!CAUTION]
> **Never** expose a raw LLM API key in a client-side browser bundle (like React or Vue) or store it in browser storage (`localStorage`, `sessionStorage`, `IndexedDB`, or browser cache). Any Cross-Site Scripting (XSS) vulnerability, compromised NPM package, or malicious browser extension can easily inspect client-side storage and steal secret keys, leading to quota exhaustion, billing fraud, or permanent provider bans. BYOK keys are *only* safe on backend servers or edge workers.

## The Proxy Architecture

If you need to execute AI functions directly on a public frontend application, you must route requests through a secure backend proxy. 

A standard proxy architecture (e.g. using Cloudflare Workers or a custom Node/Express backend) involves:
1. **Frontend Request**: The browser sends the prompt or temporal data to your own backend API (e.g., `/api/parse-date`).
2. **Backend Authentication**: Your API validates the user's session or API token to prevent abuse.
3. **LLM Inference**: Your backend runs the Tempo AI function (such as `parseAI`) using your securely stored BYOK keys.
4. **Response**: Your backend returns the resulting ISO 8601 string to the frontend, where it can be instantiated into a native `Tempo` object.

Because LLM API calls typically take ~300-800ms, the ~20ms overhead of routing the request through your own backend proxy is negligible.

## Fallback Loops & Execution Modes

Because third-party APIs can experience downtime or aggressive rate limiting, the plugin supports flexible multi-provider execution strategies:

### 1. Fallback Mode (Default)
When configured with multiple providers in `initAI()`, AI functions execute requests sequentially. If the primary provider hits a timeout or a `429 Too Many Requests` limit, the plugin instantly and silently fails over to the next provider in the array. Rate limit headers are updated based on the successful provider response or error resolution.

### 2. Race Mode (`mode: 'race'`)
Dispatches requests to all available providers simultaneously using `Promise.allSettled`. Returns the fastest resolving provider response to minimize user-perceived latency.

```typescript
const result = await parseAI("Thanksgiving 2026", { mode: 'race' });
```

### 3. Consensus Mode (`mode: 'consensus'`)
Executes all providers concurrently. If multiple providers agree on the resolved ISO timestamp, confidence score is boosted (to `1.0`) and the consensus result is returned. Rate limits are applied from the consensus provider.

```typescript
const result = await parseAI("The penultimate Tuesday before Thanksgiving", {
  mode: 'consensus',
  minConfidence: 0.85
});
```

### Provider ID Canonicalization
Provider IDs are normalized case-insensitively during `initAI` lookup (e.g. `'Gemini'`, `'gemini'`, `'OpenAI'`), automatically applying default endpoints and models while preserving the caller's registered identifier for logging and metadata.
