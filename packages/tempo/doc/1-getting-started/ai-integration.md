# 🤖 AI & IDE Integration (`llms.txt`)

To ensure modern AI coding assistants—such as **Cursor**, **VS Code (GitHub Copilot)**, **Antigravity**, **ChatGPT**, and **Claude**—generate accurate, idiomatically aligned Tempo code and minimize hallucinations, Tempo publishes an official, standardized [`llms.txt`](https://tempo.magmacomputing.com.au/llms.txt) rulebook.

By providing these rules to your AI assistant, your IDE will respect Tempo's strict immutability, zero-cost getters, native `Temporal` runtime expectations, and layout token syntax out-of-the-box.

---

## 🚀 Quick Setup by IDE / Tool

### 1. Cursor IDE
Add Tempo to Cursor's native documentation index:
1. Open **Cursor Settings** (`Cmd + ,` or `Ctrl + ,`).
2. Navigate to **Features** ➔ **Docs**.
3. Click **+ Add new doc** and enter:
   - **Name**: `Tempo`
   - **URL**: `https://tempo.magmacomputing.com.au/llms.txt`

> [!TIP]
> Once added, type `@Tempo` in any Cursor chat or prompt window to inject exact API syntax rules into your conversation.

---

### 2. VS Code & GitHub Copilot
In VS Code, configure GitHub Copilot Chat by adding a `.github/copilot-instructions.md` file to the root of your workspace:

```markdown
# Tempo AI Rules
- Always use `Tempo` from `@magmacomputing/tempo`.
- Never instantiate legacy JavaScript `Date`. Tempo expects native `Temporal` or polyfill.
- All mutating methods (`.add()`, `.subtract()`, `.set()`) return a brand-new, frozen `Tempo` instance.
- Refer to https://tempo.magmacomputing.com.au/llms.txt for full layout token grammar.
```

When prompting Copilot Chat in VS Code:
```text
"Using https://tempo.magmacomputing.com.au/llms.txt, write a custom layout parser..."
```

---

### 3. Antigravity AI Assistant
In Antigravity, you can reference the live endpoint directly in your chat prompt or store it as a localized Knowledge Item (KI):
- Reference `@https://tempo.magmacomputing.com.au/llms.txt` in your prompt for instant context ingestion.

---

### 4. ChatGPT & Claude Projects
For web-based LLM interfaces, reference or copy-paste the full, un-truncated documentation context file:
👉 **[Full RAG Documentation Bundle (`llms-full.txt`)](https://tempo.magmacomputing.com.au/llms-full.txt)**

---

## 🛠️ Prompting AI for Custom Layout Extensions

When asking AI assistants to generate custom layout patterns for parsing unique date-time formats, instruct the model to use Tempo's configuration syntax (`Tempo.init({ registry: { layouts: { ... } } })`) and named capture tokens (`{yy}`, `{mm}`, `{dd}`, `{hh}`, `{mi}`, `{ss}`, `{tzd}`).

### Sample Prompt:
> *"Using the rules from https://tempo.magmacomputing.com.au/llms.txt, register a custom Tempo layout for fiscal quarters (e.g., 'Q3 2026') using `Tempo.init({ registry: { layouts: { ... } } })` and instantiate a date with the layout option."*

### Generated Code (Actual Tempo Syntax):
```typescript
import { Tempo } from '@magmacomputing/tempo';

// 1. Register custom layout pattern using snippet tokens
Tempo.init({
  registry: {
    layouts: {
      fiscal_quarter: 'Q{nbr} {yy}'
    }
  }
});

// 2. Parse date string using the registered layout
const date = new Tempo('Q3 2026', { layout: 'fiscal_quarter' });
```
