# Provider Architecture & Security

The parseAI Plugin is designed to be highly flexible, supporting both direct Bring Your Own Key (BYOK) integrations for backend systems, and Proxied integrations for frontend clients.

## Bring Your Own Key (BYOK)

For Node.js backends and Edge Workers, the simplest approach is to supply your raw API keys directly to the `initAI` function. 

```typescript
import { initAI } from '@magmacomputing/tempo-plugin-ai';

initAI({
  providers: [
    { id: 'groq', key: process.env.GROQ_API_KEY },
    { id: 'gemini', key: process.env.GEMINI_API_KEY },
    { id: 'openai', key: process.env.OPENAI_API_KEY }
  ]
});
```

### Advanced Configuration (Custom Models & LLM Options)
By default, standard providers automatically map to their optimal APIs and models (e.g., `'gemini'` maps to `gemini-1.5-flash`). 
However, you can explicitly override URLs, models, and inject arbitrary LLM parameters (like `temperature`) for power-user control!

```typescript
initAI({
  providers: [
    // 1. Enterprise Azure OpenAI
    { 
      id: 'openai', 
      key: process.env.AZURE_API_KEY,
      url: 'https://my-enterprise.openai.azure.com/v1/chat/completions',
      model: 'gpt-4o',
      options: { temperature: 0.2, seed: 42 }
    },
    // 2. Local Open-Source Models (e.g. Ollama)
    { 
      id: 'local', 
      key: 'no-key-needed',
      url: 'http://localhost:11434/v1/chat/completions',
      model: 'llama3.1:8b'
    }
  ]
});
```

### Frontend Security Warning
> [!CAUTION]
> **Never** expose a raw LLM API key in a client-side browser bundle (like React or Vue). If a developer hardcodes a BYOK key into a public website, anyone can extract it, spam it, and exhaust the developer's quota or get the account permanently banned. BYOK keys are *only* safe on backend servers.

## The Proxy Architecture

If you need to parse natural language directly on a public frontend application, you must route requests through a secure backend proxy. 

A standard proxy architecture (e.g. using Cloudflare Workers or a custom Node/Express backend) involves:
1. **Frontend Request**: The browser sends the natural language string to your own backend API (e.g., `/api/parse-date`).
2. **Backend Authentication**: Your API validates the user's session or API token to prevent abuse.
3. **LLM Inference**: Your backend runs the `parseAI` command using your securely stored BYOK keys.
4. **Response**: Your backend returns the resulting ISO 8601 string to the frontend, where it can be instantiated into a native `Tempo` object.

Because LLM API calls typically take ~300-800ms, the ~20ms overhead of routing the request through your own backend proxy is negligible.

## Fallback Loops

Because third-party APIs can experience downtime or aggressive rate limiting, the plugin supports seamless fallback loops.

When configuring `initAI()`, provide an array of providers. If the primary provider hits a timeout or a `429 Too Many Requests` limit, the plugin instantly and silently fails over to the next provider in the list. This ensures maximum uptime for your users without complex retry logic in your application.
