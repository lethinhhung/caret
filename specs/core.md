# Grammar Check — Core Spec

## 1. Overview

A fast, minimal grammar-checking web app. The user pastes text, optionally adds
context, presses **Check**, and sees corrections inline with per-error inspection.

- **Stack**: Next.js (App Router, TypeScript) · shadcn/ui · Tailwind CSS
- **LLM**: Google Gemini free tier (`gemini-2.5-flash-lite`) via server-side API route
- **Deploy**: Vercel (env var `GEMINI_API_KEY`)
- **Design goal**: fast and simple — one screen, no auth, no server-side storage.
  The only persistence is an opt-in, browser-local history (§5), off by default.

## 2. User Flow

1. (Optional) Enter **Context** — e.g. "formal email to a client", "casual tweet".
2. Enter **Content** — the text to check (required, max ~5,000 chars).
3. Press **Check** (or `Cmd/Ctrl+Enter`).
4. Results appear below without page navigation:
   - If the text has errors → annotated view + corrected version.
   - If the text is already correct → a "Looks good" state + 1–3 improved
     variants (clearer / more concise / tone-matched to context).
5. (Optional) Open **History** from the header. Until the user turns history on
   it holds nothing — the panel explains what would be saved and offers the
   switch. Once on, each completed check is recorded and can be reopened.

## 3. UI Layout (single page)

```
┌──────────────────────────────────────┐
│  Header: app name   [History] [☾]    │
│  Context (optional)  [textarea, 2r]  │
│  Content             [textarea, 8r]  │
│  [Check]  char count   ⌘↵ hint       │
│  ── Results ──                       │
│  Annotated text | Corrected | Diff   │
└──────────────────────────────────────┘
```

History opens as a slide-over panel rather than its own route, so an in-progress
draft in the composer is never unmounted to look something up.

### Components (shadcn/ui)

- `Textarea` ×2, `Button` (Check), `Card` (results), `Badge` (error type),
  `Popover` (error inspection), `Skeleton` (loading), `Tabs` (result views),
  `Sheet` (history panel), `Switch` (history opt-in). `Sheet` and `Switch` build
  on Radix primitives already vendored via the `radix-ui` package.

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

## 5. History (opt-in, browser-local)

Past checks, kept in `localStorage` so a writer can look back at what they were
corrected on. **Off by default** — nothing is written until the user turns it on.
Entirely client-side: the API route stays stateless and the server never sees a
stored check.

- **The switch** lives in the history panel, making the panel the one place that
  both explains the feature and controls it. The panel is reachable from the
  header whether history is on or off — that is how it gets discovered.
- **Turning it off deletes what was stored**, behind a confirm. Opting out
  should not leave the user's prose sitting in storage.
- **An entry** holds the text as checked, its context, the errors found, and
  which fixes the writer kept. Fixes arrive pre-applied, so a reverted one is an
  active disagreement — worth recording as more than a count.
- **Bounded and forgiving**: newest first, capped at 50 entries; re-checking
  unchanged text replaces its entry rather than adding another. Storage that is
  full, unreadable, or unavailable degrades to the feature being off, never to
  an error.
- **The panel** lists each check with its date and issue count. Selecting one
  loads it back into the main view; entries can be removed one at a time or all
  at once.

## 6. Non-Functional

- **Fast**: single round trip per check; streaming not required for v1.
  Show skeleton immediately; target < 3s perceived response.
- **Simple**: no database, no accounts. Stateless API route; history never
  leaves the browser.
- **Accessible**: error spans are focusable buttons; popovers keyboard-navigable;
  WCAG AA color contrast; respects `prefers-reduced-motion`.
- **Responsive**: mobile-first single column; comfortable on desktop (max-w-3xl).
- **Safe**: input length capped client- and server-side; no logging of user text.
  History is opt-in, stored only on the user's device, and deleted when the
  switch is turned off.

## 7. Out of Scope (v1)

- Auth, syncing history across devices, multiple languages UI, streaming
  responses, browser extension, rewrite tone presets beyond context field.
- **AI analysis of history.** Coaching a writer on their recurring mistakes is
  the reason `accepted` is recorded per entry (§5), but no such feature ships
  here: no aggregation, no insights UI, and no history data sent to any model.
  Should it be built later, the intent is to send a locally computed summary
  rather than the stored text.

## 8. File Map (planned)

```
src/app/page.tsx            — main screen (client component)
src/app/api/check/route.ts  — Gemini call + validation
src/components/annotated-text.tsx — highlight + popover rendering
src/components/history-panel.tsx  — history sheet, switch, entry list
src/lib/gemini.ts           — prompt, schema, response parsing
src/lib/history.ts          — history types + pure parse/cap/serialize
src/lib/history-storage.ts  — the only module that touches localStorage
src/lib/history-store.ts    — subscribable history snapshot for the panel
src/lib/types.ts            — shared request/response types
specs/core.md               — this document
```
