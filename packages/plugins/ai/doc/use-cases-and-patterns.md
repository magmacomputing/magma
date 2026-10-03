<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-ai</a>
</div>

<br>

# Production Use Cases & Architectural Patterns

Integrating Large Language Models (LLMs) with date-time logic presents severe reliability hazards in production:
1. **Hallucinated Dates**: Models routinely miscalculate weekday-to-date mappings (e.g. claiming "next Friday" is the 14th when it is actually the 15th).
2. **Missing Reference Anchors**: Without an explicit reference anchor, relative expressions (*"in 3 days"*, *"tomorrow afternoon"*) resolve against arbitrary training cutoff dates.
3. **PII Leakage**: Sending full user prompts to third-party LLMs exposes sensitive user identities and private calendar details.

The `@magmacomputing/tempo-plugin-ai` plugin bridges LLM intelligence with Tempo's deterministic temporal engine, enforcing strict PII protection, anchor grounding, and schema validation.

---

## 1. Natural Language Booking: Ambiguous Input to Validated `Tempo`

In conversational scheduling bots (such as appointment booking agents or support chatbots), users describe meeting times in informal natural language:
- *"Can we meet next Wednesday at 2:30pm for 45 minutes?"*
- *"Schedule a review session on the second Friday of next month at 10am"*

`Tempo.ai.parse` grounds the prompt against an absolute server reference anchor (`anchor`) and user timezone, resolving a strongly typed `Tempo` instance:

```typescript
import '@magmacomputing/tempo-plugin-ai/install';
import { Tempo } from '@magmacomputing/tempo';

export async function parseAppointmentPrompt(
  userInput: string,
  userTimeZone: string
): Promise<{ scheduledStart: Tempo; durationMinutes: number }> {
  // Ground the prompt against current time and user timezone
  const anchorTime = new Tempo('now', { timeZone: userTimeZone });

  const appointment = await Tempo.ai.parse(userInput, {
    anchor: anchorTime,
    timeZone: userTimeZone
  });

  return {
    scheduledStart: appointment,
    durationMinutes: 45
  };
}
```

---

## 2. Converting Natural Language Recurrence to RFC 5545 RRULE

Calendar applications (Google Calendar, Outlook, Apple Calendar) require standard RFC 5545 iCalendar **RRULE** strings to synchronize recurring events. Parsing human recurrence patterns into valid RRULEs with deterministic end dates is error-prone.

`Tempo.ai.recurrence` converts natural language patterns directly into validated RRULE strings:

```typescript
import '@magmacomputing/tempo-plugin-ai/install';
import { Tempo } from '@magmacomputing/tempo';

export async function generateCalendarRule(recurrencePrompt: string): Promise<string> {
  const result = await Tempo.ai.recurrence(recurrencePrompt, {
    anchor: new Tempo('now')
  });

  // Returns standard iCalendar RRULE format:
  // e.g. "FREQ=WEEKLY;INTERVAL=2;BYDAY=TU;COUNT=10"
  return result.rrule;
}

// Example prompts:
// "every other Tuesday for 10 sessions" -> FREQ=WEEKLY;INTERVAL=2;BYDAY=TU;COUNT=10
// "first Monday of every month"         -> FREQ=MONTHLY;BYDAY=1MO
```

---

## 3. Conflict-Free Slot Scheduling Around Busy Calendar Events

When building scheduling platforms (such as Calendly or Cal.com workflows), booking engines must calculate the first open slot that fits between existing busy event bounds.

`Tempo.ai.schedule` inspects an array of existing busy bounds and finds non-overlapping appointment slots within working hours:

```typescript
import '@magmacomputing/tempo-plugin-ai/install';
import { Tempo } from '@magmacomputing/tempo';

interface BusyBlock {
  start: string;
  end: string;
}

export async function findNextAvailableSlot(
  busyCalendar: BusyBlock[],
  requestedDurationMinutes: number
): Promise<{ slotStart: Tempo; slotEnd: Tempo }> {
  const scheduleResult = await Tempo.ai.schedule({
    busy: busyCalendar,
    durationMinutes: requestedDurationMinutes,
    workingHours: { start: '09:00', end: '17:00' },
    anchor: new Tempo('now')
  });

  return {
    slotStart: scheduleResult.start,
    slotEnd: scheduleResult.end
  };
}
```

---

## 4. Contextual Narrative Summaries for Customer Notifications

Raw ISO-8601 strings (`2026-10-05T14:30:00Z`) or mechanical countdowns (*"in 48 hours"*) feel impersonal in user-facing delivery updates or customer notifications.

`Tempo.ai.format` generates human-friendly, contextual narrative summaries with reasoning metadata:

```typescript
import '@magmacomputing/tempo-plugin-ai/install';
import { Tempo } from '@magmacomputing/tempo';

export async function createDeliveryNotification(deliveryDateIso: string): Promise<string> {
  const delivery = new Tempo(deliveryDateIso);

  const narrative = await Tempo.ai.format(delivery, {
    style: 'concise',
    context: 'e-commerce package arrival'
  });

  // Generates contextual prose:
  // "Arriving this Monday afternoon (in about 2 days)"
  return narrative.formatted;
}
```

---

## 5. Enterprise PII Masking & Air-Gapped Fallback

In regulated enterprise environments (healthcare, finance, government), sending raw customer text to external LLMs breaches data privacy mandates (HIPAA, GDPR).

`tempo-plugin-ai` provides built-in PII redaction and multi-provider race/fallback modes. You can configure sensitive queries to route through an on-premise local model (e.g. Ollama) while falling back to cloud providers:

```typescript
import '@magmacomputing/tempo-plugin-ai/install';
import { Tempo } from '@magmacomputing/tempo';

// Initialize with local on-premise provider and cloud fallback
await Tempo.ai.init({
  mode: 'fallback',
  providers: [
    {
      id: 'ollama',
      endpoint: 'http://localhost:11434/api/generate',
      models: { default: 'llama3:8b' }
    },
    {
      id: 'groq',
      key: process.env.GROQ_API_KEY
    }
  ]
});
```
