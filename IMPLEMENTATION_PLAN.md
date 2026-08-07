# History — Implementation Plan

Implements `specs/core.md` §5: opt-in, browser-local history of past checks.
Branch `feat/history` off `main`.

Stage 1 exists because `CLAUDE.md` caps files at 120 lines and `page.tsx` is
currently 531. History has to edit that file, so it gets split first — as its
own step, with no behaviour change, so the split and the feature never have to
be reviewed as one diff.

## Stage 1: Split the main screen

**Goal**: `src/app/page.tsx` under 120 lines, holding composition and check
state only. The composer form, the two results cards, and the small
presentational helpers (`CountRing`, `Kbd`, `StaleNotice`, `ResultsSkeleton`)
each move to their own file under `src/components/`.

**Success Criteria**:
- `page.tsx` ≤ 120 lines; every extracted file ≤ 120 lines
- The existing 98 tests pass **unmodified** — that is what proves the split
  changed nothing. A test that needs editing means behaviour moved.
- `npm run typecheck`, `npm run lint` clean

**Tests**: none added. The current suite is the safety net; `page.test.tsx`
drives the real screen and would catch a broken wire-up.

**Status**: Not Started

## Stage 2: Storage core

**Goal**: the data layer, with no UI attached.
- `src/lib/history.ts` — `HistoryEntry`, the versioned file envelope,
  `MAX_ENTRIES`, and pure `parse` / `add` / `serialize`. No `localStorage`.
- `src/lib/history-store.ts` — the only module that touches `localStorage`.
  Module-level store with `subscribe` / `getSnapshot` / `getServerSnapshot`,
  the enabled flag, and record / update / remove / clear.

`corrected` is not stored: `applyFixes(content, errors, accepted)` rebuilds it
exactly, so keeping it would only add bulk and a way for the two to disagree.

**Success Criteria**:
- Every storage access wrapped; unavailable storage reports "off", never throws
- `getSnapshot` returns a cached reference (an unstable one loops React forever)
- `getServerSnapshot` returns empty, so nothing reads storage during render
- Both files ≤ 120 lines

**Tests** (`history.test.ts`, `history-store.test.ts`):
- `parse` of `null`, of non-JSON, and of an unknown `version` → empty
- A file mixing sound and malformed entries keeps the sound ones
- `add` prepends; at `MAX_ENTRIES` the oldest falls off
- `add` with `content` + `context` matching the newest entry replaces it
- `record` while disabled writes nothing
- Enabling persists the flag; disabling purges every entry
- `QuotaExceededError` sheds the oldest entries and retries once
- A `localStorage` getter that throws leaves the store disabled, not crashed
- A `storage` event from another tab updates the snapshot

**Status**: Not Started

## Stage 3: The panel, and the switch that is off

**Goal**: `npx shadcn@latest add sheet switch`, then the history panel and its
header trigger. Off state explains what would be saved and offers the switch; on
state shows an empty list and a clear-all. Turning the switch off confirms, then
deletes. No check is recorded yet.

Ends as a usable increment: the feature can be discovered, read about, switched
on, and switched back off.

**Success Criteria**:
- Trigger present in the header whether history is on or off
- Nothing is written to storage until the switch is turned on
- No hydration mismatch — the count renders empty on the server
- Panel file(s) ≤ 120 lines each

**Tests** (`history-panel.test.tsx`):
- Trigger opens the panel; the switch reads off on first visit
- Opening and closing the panel while off writes nothing to storage
- Turning it on persists the flag
- Turning it off asks first, and purges once confirmed
- Enabled with no entries shows the empty state

**Status**: Not Started

## Stage 4: Recording and restore

**Goal**: record a completed check when history is on; keep `accepted` current
as the writer applies and reverts fixes (debounced, so a click does not
re-serialize the file); list entries with date and issue count; select one to
load it back into the main view; delete one; and make the "Nothing you type is
stored." copy conditional on the switch.

**Success Criteria**:
- A successful check records exactly one entry when on, none when off
- A failed check records nothing in either state
- Restoring an entry repopulates context, content, and the results card
- Touched files stay ≤ 120 lines

**Tests** (`history-panel.test.tsx`, additions to `page.test.tsx`):
- Check with history on → one entry; with it off → none
- A 500 response records nothing
- Reverting a fix, then reopening the entry, shows that fix still reverted
- Selecting an entry repopulates the composer and results
- Deleting an entry removes only that one
- Empty-state copy differs between switch states

**Status**: Not Started

## Notes

**Pre-existing 120-line violations.** Nine files are over today. Stage 1 handles
`page.tsx` because history must edit it. The rest are untouched by this feature
and are left alone rather than smuggled into this branch:

```
317  src/app/api/check/route.test.ts    198  src/lib/errors.ts
242  src/app/page.test.tsx              197  src/lib/errors.test.ts
204  src/lib/gemini.ts                  184  src/components/annotated-text.tsx
147  src/app/api/check/route.ts         145  src/components/annotated-text.test.tsx
```

Four are test files. Whether the cap is meant to bind tests as tightly as
application code is worth deciding before anyone splits those.

**`feat/visual-refresh` will conflict.** That branch rewrites `page.tsx` into a
642-line file — also over the cap. Whichever branch merges second resolves by
re-applying its changes onto the other's markup. Stage 1 shrinks the surface
this branch contributes to that conflict, but does not remove it.
