# Grammar Check

One screen. Paste text, get grammar, spelling, punctuation, and word-choice
fixes you can inspect and apply one at a time. No account, no history, nothing
stored.

Built to [`specs/core.md`](specs/core.md).

## Setup

```bash
npm install
cp .env.example .env.local   # then paste your key into it
npm run dev
```

`GEMINI_API_KEY` comes from [Google AI Studio](https://aistudio.google.com/apikey).
The free tier covers `gemini-2.5-flash-lite`, which is what this uses. The key is
read only in `src/app/api/check/route.ts` and never reaches the browser.

Without a key the UI still loads; every check returns
`500 The grammar service is not configured.`

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm test` | Vitest, once |
| `npm run test:watch` | Vitest, watching |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next 16 removed `next lint`) |

## Deploying

Push to Vercel and set `GEMINI_API_KEY` in the project's environment variables.
Nothing else is needed — the app is stateless and has no database.

## How it works

`POST /api/check` sends the text to Gemini once, with a response schema that
forces strict JSON back. The interesting part is what happens next.

Models are unreliable about character offsets: they will report a real mistake
and point at the wrong place in the string. So the server treats the reported
`original` text as the source of truth and re-derives every offset against the
submitted text (`src/lib/errors.ts`):

- Longest spans claim their position first, so a specific phrase beats a word
  inside it.
- A repeated word anchors to the unclaimed occurrence nearest the model's hint,
  which is what makes "the the" work.
- Anything that cannot be located verbatim is dropped.

The response's `corrected` string is then rebuilt from the surviving spans
rather than passed through from the model, so the annotated view, the corrected
text, and the diff can never disagree with each other. If every reported error
fails to verify, the response downgrades to `status: "correct"` and returns the
original text — the UI never claims there are issues it cannot show.

## Layout

```
src/
  app/
    page.tsx              the whole screen
    layout.tsx            fonts, metadata, no-flash theme script
    globals.css           design tokens (light + dark), all AA-verified
    api/check/route.ts    validation, Gemini call, offset reconciliation
  components/
    annotated-text.tsx    focusable error spans + per-error popovers
    diff-view.tsx         word-level diff
    theme-toggle.tsx
    ui/                   shadcn/ui
  lib/
    errors.ts             offset reconciliation, apply/revert, segmentation
    diff.ts               word-level LCS diff
    gemini.ts             prompt, response schema, transport
    categories.ts         per-category colour + underline style
    types.ts              the request/response contract
```

## Notes on the design

- **Fixes arrive applied.** The spec shows a per-error "Apply"; starting with
  none applied would make the Corrected tab identical to the input, which
  defeats the main use. Each popover offers Revert instead, and the card shows
  "n of m applied" so the state is never ambiguous.
- **Category is never carried by colour alone.** Each of the four categories has
  both a colour and a distinct underline style (wavy, dotted, dashed, double),
  and every span's accessible name states the category in words.
- **Every colour pair was measured, not assumed.** Body and UI pairs meet WCAG
  AA in both themes; the ratios are recorded next to each token in
  `globals.css`.
- **Error spans are inline text**, so they cannot be 44px tall. The annotated
  view uses a 36px line-height and padded spans to get as close as inline
  content allows; every other control is at least 44px.
