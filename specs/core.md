# Grammar Check — Core Spec

## 1. Overview

A fast, minimal grammar-checking web app. The user pastes text, optionally adds
context, presses **Check**, and sees corrections inline with per-error inspection.

- **Stack**: Next.js (App Router, TypeScript) · shadcn/ui · Tailwind CSS
- **LLM**: Google Gemini free tier (`gemini-2.5-flash-lite`) via server-side API route
- **Deploy**: Vercel (env var `GEMINI_API_KEY`)
- **Design goal**: fast and simple — one screen, no auth, no persistence

## 2. User Flow

1. (Optional) Enter **Context** — e.g. "formal email to a client", "casual tweet".
2. Enter **Content** — the text to check (required, max ~5,000 chars).
3. Press **Check** (or `Cmd/Ctrl+Enter`).
4. Results appear below without page navigation:
   - If the text has errors → annotated view + corrected version.
   - If the text is already correct → a "Looks good" state + 1–3 improved
     variants (clearer / more concise / tone-matched to context).

## 3. UI Layout (single page)

```
┌──────────────────────────────────────┐
│  Header: app name + short tagline    │
│  Context (optional)  [textarea, 2r]  │
│  Content             [textarea, 8r]  │
│  [Check]  char count   ⌘↵ hint       │
│  ── Results ──                       │
│  Annotated text | Corrected | Diff   │
└──────────────────────────────────────┘
```

### Components (shadcn/ui)

- `Textarea` ×2, `Button` (Check), `Card` (results), `Badge` (error type),
  `Popover` (error inspection), `Skeleton` (loading), `Tabs` (result views).

### Error inspection

- Each error is rendered as an underlined/highlighted span in the annotated text.
- Color by category: red = grammar, amber = spelling, blue = punctuation,
  violet = style/word choice.
- Clicking (or focusing — keyboard accessible) a span opens a `Popover` showing:
  - original → suggested replacement
  - category badge + one-line explanation
  - **Apply** button (applies just this fix to the corrected output)
- "Apply all" and "Copy corrected" actions on the results card.

## 4. API

### `POST /api/check`

Request:

```json
{ "context": "string (optional)", "content": "string (required)" }
```

Response:

```json
{
  "status": "has_errors" | "correct",
  "corrected": "full corrected text",
  "errors": [
    {
      "original": "their",
      "suggestion": "there",
      "category": "grammar" | "spelling" | "punctuation" | "style",
      "explanation": "one short sentence",
      "start": 12,
      "end": 17
    }
  ],
  "improvements": ["variant 1", "variant 2"]   // only when status = "correct"
}
```

- Gemini is called server-side only; the key never reaches the client.
- Prompt asks for strict JSON (`responseMimeType: application/json` +
  `responseSchema`). Offsets (`start`/`end`) index into the original content;
  the server validates offsets and drops errors that don't match the text.
- Errors: `400` empty/oversized content, `429` rate limit passthrough with a
  friendly retry message, `500` malformed model output after one retry.

## 5. Non-Functional

- **Fast**: single round trip per check; streaming not required for v1.
  Show skeleton immediately; target < 3s perceived response.
- **Simple**: no database, no accounts, no history. Stateless API route.
- **Accessible**: error spans are focusable buttons; popovers keyboard-navigable;
  WCAG AA color contrast; respects `prefers-reduced-motion`.
- **Responsive**: mobile-first single column; comfortable on desktop (max-w-3xl).
- **Safe**: input length capped client- and server-side; no logging of user text.

## 6. Out of Scope (v1)

- Auth, saved history, multiple languages UI, streaming responses,
  browser extension, rewrite tone presets beyond context field.

## 7. File Map (planned)

```
src/app/page.tsx            — main screen (client component)
src/app/api/check/route.ts  — Gemini call + validation
src/components/annotated-text.tsx — highlight + popover rendering
src/lib/gemini.ts           — prompt, schema, response parsing
src/lib/types.ts            — shared request/response types
specs/core.md               — this document
```
