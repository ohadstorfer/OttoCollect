# Guide (Q&A) Editor Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two bugs in the User Guide editor — rich-text edits not appearing after re-publish (Bug 1), and HTML re-saves getting stuck on "Saving…" (Bug 2).

**Architecture:** Both bugs live in `src/services/qaService.ts`. Bug 1: the render prefers per-language columns (`_en`) that `updateQaEntry` never refreshes — fix by nulling all six translation columns on update (so reads fall back to fresh base text) and rebuilding the original-language cache via a shared helper. Bug 2: the save `await`s a slow full-HTML translation — fix by running it in the background with a per-call timeout so it can't block or hang.

**Tech Stack:** TypeScript, Vitest, Supabase JS client, Google Translate edge function.

---

## File structure

- **Create:** `src/lib/withTimeout.ts` — a tiny promise-timeout util (one responsibility: resolve a fallback if a promise stalls past `ms`).
- **Create:** `src/lib/withTimeout.test.ts` — unit tests for the util.
- **Create:** `src/services/qaService.test.ts` — unit tests for the create/update paths (supabase + translation mocked).
- **Modify:** `src/services/qaService.ts` — the two fixes.

---

## Task 1: `withTimeout` utility

**Files:**
- Create: `src/lib/withTimeout.ts`
- Test: `src/lib/withTimeout.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/withTimeout.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { withTimeout } from './withTimeout';

describe('withTimeout', () => {
  it('resolves the real value when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve('OK'), 1000, 'FB')).resolves.toBe('OK');
  });

  it('resolves the fallback when the promise stalls past ms', async () => {
    vi.useFakeTimers();
    const p = withTimeout(new Promise<string>(() => {}), 1000, 'FB');
    vi.advanceTimersByTime(1000);
    await expect(p).resolves.toBe('FB');
    vi.useRealTimers();
  });

  it('resolves the fallback when the promise rejects', async () => {
    await expect(withTimeout(Promise.reject(new Error('x')), 1000, 'FB')).resolves.toBe('FB');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/withTimeout.test.ts`
Expected: FAIL — "Cannot find module './withTimeout'".

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/withTimeout.ts`:

```ts
/**
 * Resolve `fallback` if `promise` does not settle within `ms`. Never rejects:
 * a rejection from `promise` also resolves to `fallback`. Used so a slow/stalled
 * translation call can't hang a background task indefinitely.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const done = (value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => done(fallback), ms);
    promise.then((v) => done(v), () => done(fallback));
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/withTimeout.test.ts`
Expected: PASS (3 passing).

- [ ] **Step 5: Commit**

```bash
git add src/lib/withTimeout.ts src/lib/withTimeout.test.ts
git commit -m "feat(lib): add withTimeout promise util"
```

---

## Task 2: qaService test scaffolding + Bug 1 null-out test (RED)

This task adds the test harness (mocks) and the first failing test for Bug 1. The implementation that makes it pass is Task 3.

**Files:**
- Create: `src/services/qaService.test.ts`

- [ ] **Step 1: Write the test file with mocks and the Bug 1 null-out test**

Create `src/services/qaService.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock state, hoisted so the vi.mock factories below can read it.
const mocks = vi.hoisted(() => {
  const updateCalls: any[] = [];
  const insertCalls: any[] = [];
  const ctrl = { result: { data: { id: 'e1' }, error: null } as { data: any; error: any } };
  const makeBuilder = () => {
    const b: any = {
      insert: (rows: any) => { insertCalls.push(rows); return b; },
      update: (payload: any) => { updateCalls.push(payload); return b; },
      eq: () => b,
      select: () => b,
      single: () => b,
      order: () => b,
      // Awaiting any terminal in the chain resolves to ctrl.result.
      then: (resolve: any) => resolve(ctrl.result),
    };
    return b;
  };
  return {
    updateCalls,
    insertCalls,
    ctrl,
    fromMock: () => makeBuilder(),
    detectLanguage: vi.fn(async () => 'en' as 'en' | 'ar' | 'tr'),
    translateText: vi.fn(async (text: string) => text),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.fromMock, functions: { invoke: vi.fn() } },
}));

vi.mock('./translationService', () => ({
  translationService: {
    detectLanguage: mocks.detectLanguage,
    translateText: mocks.translateText,
  },
}));

vi.mock('./databaseTranslationService', () => ({
  databaseTranslationService: { getLocalizedRecords: vi.fn(), getLocalizedRecord: vi.fn() },
  createNameTranslationConfig: vi.fn(() => ({})),
}));

import { updateQaEntry } from './qaService';

beforeEach(() => {
  mocks.updateCalls.length = 0;
  mocks.insertCalls.length = 0;
  mocks.ctrl.result = { data: { id: 'e1' }, error: null };
  mocks.detectLanguage.mockClear();
  mocks.detectLanguage.mockResolvedValue('en');
  mocks.translateText.mockClear();
  mocks.translateText.mockImplementation(async (t: string) => t);
});

const richInput = {
  categoryId: 'c1', headline: 'new H', shortDescription: 'new S', content: 'new C',
  contentIsRaw: false,
};

describe('updateQaEntry — Bug 1: stale translation columns', () => {
  it('nulls all six _en/_ar/_tr columns so the render falls back to fresh base text', async () => {
    await updateQaEntry('e1', richInput);
    const main = mocks.updateCalls[0];
    expect(main.headline_en).toBeNull();
    expect(main.short_description_en).toBeNull();
    expect(main.content_en).toBeNull();
    expect(main.headline_ar).toBeNull();
    expect(main.short_description_tr).toBeNull();
    expect(main.content_tr).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/services/qaService.test.ts`
Expected: FAIL — `main.content_en` is `undefined` (the current payload only nulls `_ar`/`_tr`), so `toBeNull()` fails.

- [ ] **Step 3: Commit the RED test**

```bash
git add src/services/qaService.test.ts
git commit -m "test(qa): failing test for stale _en columns on update"
```

---

## Task 3: Bug 1 fix — null all six translation columns (GREEN)

**Files:**
- Modify: `src/services/qaService.ts:329-334` (the null-out block in `updateQaEntry`)

- [ ] **Step 1: Extend the null-out payload**

In `updateQaEntry`, replace this block:

```ts
    // Invalidate the cached ar/tr translations: the base text just changed, so
    // the old translated columns are stale. Nulling them makes the next ar/tr
    // view re-translate from the new base (otherwise the published page keeps
    // showing the pre-edit translation).
    headline_ar: null,
    headline_tr: null,
    short_description_ar: null,
    short_description_tr: null,
    content_ar: null,
    content_tr: null,
```

with:

```ts
    // Invalidate ALL cached per-language columns (_en included): the base text
    // just changed, so every cached column is stale. getLocalizedEntry prefers
    // the per-language column even for 'en', so leaving _en stale was Bug 1 —
    // edits never appeared because the render kept reading the old _en value.
    // Nulling all six makes the render fall back to the fresh base columns
    // immediately; the original-language cache is rebuilt below.
    headline_en: null,
    headline_ar: null,
    headline_tr: null,
    short_description_en: null,
    short_description_ar: null,
    short_description_tr: null,
    content_en: null,
    content_ar: null,
    content_tr: null,
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npm test -- src/services/qaService.test.ts`
Expected: PASS (the null-out test now passes).

- [ ] **Step 3: Commit**

```bash
git add src/services/qaService.ts
git commit -m "fix(qa): null _en columns on update so rich-text edits appear (Bug 1)"
```

---

## Task 4: Bug 1 fix — rebuild the original-language cache via shared helper

**Files:**
- Modify: `src/services/qaService.ts` — add `persistRichEntryOriginalLanguage`, wire into `createQaEntry` and `updateQaEntry`
- Test: `src/services/qaService.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/services/qaService.test.ts` inside the `describe('updateQaEntry — Bug 1 ...')` block:

```ts
  it('repopulates the original-language column for a rich entry after update', async () => {
    mocks.detectLanguage.mockResolvedValue('en');
    await updateQaEntry('e1', richInput);
    // updateCalls[0] = main update (nulls); updateCalls[1] = original-language rebuild.
    const repopulate = mocks.updateCalls[1];
    expect(repopulate).toBeDefined();
    expect(repopulate.original_language).toBe('en');
    expect(repopulate.headline_en).toBe('new H');
    expect(repopulate.short_description_en).toBe('new S');
    expect(repopulate.content_en).toBe('new C');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/services/qaService.test.ts -t "repopulates the original-language"`
Expected: FAIL — `mocks.updateCalls[1]` is `undefined` (update never rebuilds the cache today).

- [ ] **Step 3: Add the shared helper**

In `src/services/qaService.ts`, add this function immediately after `persistRawEntryTranslations` (after line 264):

```ts
/**
 * Detect a rich-text entry's language and write the original-language columns
 * (headline_<lang>/short_description_<lang>/content_<lang>). The other two
 * languages translate lazily on first view. Shared by create and update so the
 * cache is rebuilt the same way after an edit. Best-effort: on failure the base
 * columns still hold the current text (and the render falls back to them).
 */
async function persistRichEntryOriginalLanguage(entryId: string, input: QaEntryInput): Promise<void> {
  try {
    const lang = await translationService.detectLanguage(input.content || input.headline);
    const suffix = langSuffix(lang);
    await supabase.from('qa_entries').update({
      original_language: lang,
      [`headline${suffix}`]: input.headline,
      [`short_description${suffix}`]: input.shortDescription,
      [`content${suffix}`]: input.content,
    }).eq('id', entryId);
  } catch (e) {
    console.error('Error persisting qa original-language columns:', e);
  }
}
```

- [ ] **Step 4: Use the helper in `createQaEntry`**

In `createQaEntry`, replace the rich-text branch (the current `else { try { ... } catch ... }` at lines 294-309):

```ts
  } else {
    // Rich text: detect + store the original-language columns (best-effort);
    // the other languages translate lazily on first view.
    try {
      const lang = await translationService.detectLanguage(input.content || input.headline);
      const suffix = langSuffix(lang);
      await supabase.from('qa_entries').update({
        original_language: lang,
        [`headline${suffix}`]: input.headline,
        [`short_description${suffix}`]: input.shortDescription,
        [`content${suffix}`]: input.content,
      }).eq('id', data.id);
    } catch (e) {
      console.error('Error detecting qa entry language:', e);
    }
  }
```

with:

```ts
  } else {
    // Rich text: store the original-language columns; the other two languages
    // translate lazily on first view.
    await persistRichEntryOriginalLanguage(data.id, input);
  }
```

- [ ] **Step 5: Use the helper in `updateQaEntry`**

In `updateQaEntry`, replace the post-update raw-only block (lines 351-355):

```ts
  // Raw HTML: the base text just changed and the _ar/_tr columns were nulled
  // above, so re-translate the whole document eagerly into both languages.
  if (input.contentIsRaw) {
    await persistRawEntryTranslations(id, input);
  }
```

with:

```ts
  // The per-language columns were nulled above, so rebuild them from the new
  // base text. Rich entries: rebuild the original-language column (fast, awaited
  // so the cache is consistent). Raw HTML: re-translate the whole document into
  // both languages in the background (see Bug 2 — never block the save on it).
  if (input.contentIsRaw) {
    void persistRawEntryTranslations(id, input).catch((e) =>
      console.error('qa raw: background translation failed:', e));
  } else {
    await persistRichEntryOriginalLanguage(id, input);
  }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- src/services/qaService.test.ts -t "repopulates the original-language"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/services/qaService.ts src/services/qaService.test.ts
git commit -m "fix(qa): rebuild original-language cache on update via shared helper (Bug 1)"
```

---

## Task 5: Bug 2 fix — background raw-HTML translation on create + timeout

Task 4 already switched `updateQaEntry`'s raw branch to background. This task does the same for `createQaEntry` and adds the per-call timeout so a stalled edge function can't leave a hung background task.

**Files:**
- Modify: `src/services/qaService.ts` — `createQaEntry` raw branch + `persistRawEntryTranslations` translate calls
- Test: `src/services/qaService.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/services/qaService.test.ts` (import `createQaEntry` by extending the existing import line to `import { updateQaEntry, createQaEntry } from './qaService';`), then add:

```ts
describe('createQaEntry — Bug 2: raw-HTML save must not block on translation', () => {
  it('returns before the background translation settles', async () => {
    let release: (v: string) => void = () => {};
    const gate = new Promise<string>((r) => { release = r; });
    mocks.translateText.mockReturnValue(gate); // stays pending

    const result = await createQaEntry(
      { categoryId: 'c1', headline: 'H', shortDescription: 'S', content: '<html>raw</html>', contentIsRaw: true },
      'author-1'
    );

    // Save resolved even though translation is still pending in the background.
    expect(result).not.toBeNull();
    release('done'); // settle the pending promise so no work dangles
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/services/qaService.test.ts -t "returns before the background translation"`
Expected: FAIL — the test times out, because `createQaEntry` currently `await`s `persistRawEntryTranslations`, which awaits the never-resolving `translateText`.

- [ ] **Step 3: Background the raw branch in `createQaEntry`**

In `createQaEntry`, replace:

```ts
  if (input.contentIsRaw) {
    // Raw HTML: eagerly translate the whole document to the other two languages.
    await persistRawEntryTranslations(data.id, input);
  } else {
```

with:

```ts
  if (input.contentIsRaw) {
    // Raw HTML: translate the whole document to the other two languages in the
    // background so the save returns immediately (Bug 2 — never block the save).
    void persistRawEntryTranslations(data.id, input).catch((e) =>
      console.error('qa raw: background translation failed:', e));
  } else {
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/services/qaService.test.ts -t "returns before the background translation"`
Expected: PASS.

- [ ] **Step 5: Add the per-call timeout in `persistRawEntryTranslations`**

At the top of `src/services/qaService.ts`, add the import after the existing imports (near line 13):

```ts
import { withTimeout } from '@/lib/withTimeout';
```

Add this constant just above `persistRawEntryTranslations` (above line 234):

```ts
// Hard ceiling for a single translation call inside a background task, so a
// stalled edge function can't leave the task pending forever.
const QA_TRANSLATE_TIMEOUT_MS = 20000;
```

In `persistRawEntryTranslations`, replace the `Promise.all([...])` block (lines 252-256):

```ts
    const [h, s, c] = await Promise.all([
      translationService.translateText(input.headline, lang, original, 'text').catch(() => input.headline),
      translationService.translateText(input.shortDescription, lang, original, 'text').catch(() => input.shortDescription),
      translationService.translateText(input.content, lang, original, 'html').catch(() => input.content),
    ]);
```

with:

```ts
    const [h, s, c] = await Promise.all([
      withTimeout(translationService.translateText(input.headline, lang, original, 'text'), QA_TRANSLATE_TIMEOUT_MS, input.headline),
      withTimeout(translationService.translateText(input.shortDescription, lang, original, 'text'), QA_TRANSLATE_TIMEOUT_MS, input.shortDescription),
      withTimeout(translationService.translateText(input.content, lang, original, 'html'), QA_TRANSLATE_TIMEOUT_MS, input.content),
    ]);
```

- [ ] **Step 6: Run the full qaService suite to verify nothing regressed**

Run: `npm test -- src/services/qaService.test.ts`
Expected: PASS (all tests).

- [ ] **Step 7: Commit**

```bash
git add src/services/qaService.ts src/services/qaService.test.ts
git commit -m "fix(qa): background raw-HTML translation + per-call timeout (Bug 2)"
```

---

## Task 6: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the entire test suite**

Run: `npm test`
Expected: PASS (all suites, including the existing `src/types/qa.test.ts`).

- [ ] **Step 2: Lint the changed files**

Run: `npm run lint`
Expected: no new errors in `src/services/qaService.ts`, `src/lib/withTimeout.ts`, or the test files.

- [ ] **Step 3: Manual smoke test (requires running the app)**

1. As an admin, create a rich-text Guide entry → Publish → confirm it shows on `/guide`.
2. Edit it (change short answer + body) → Publish → confirm BOTH the list short answer and the `/guide-post/:id` body show the new text (Bug 1 fixed).
3. Create/override a large raw-HTML entry → confirm the Publish button returns immediately, no stuck "Saving…" spinner (Bug 2 fixed); switch to Arabic/Turkish after a few seconds → confirm the translated HTML appears.

---

## Self-review notes

- **Spec coverage:** Bug 1 null-out (Task 3), Bug 1 cache rebuild (Task 4), Bug 2 background on update (Task 4) + create (Task 5), Bug 2 timeout (Task 5). Accepted tradeoff (brief original-language HTML right after save) is covered by the read-path fallback (unchanged). RTL/SEO explicitly out of scope per spec.
- **Type consistency:** `persistRichEntryOriginalLanguage(entryId: string, input: QaEntryInput)` and `withTimeout<T>(promise, ms, fallback)` are referenced consistently across tasks. `langSuffix` (qaService.ts:225) and `QaEntryInput` (qaService.ts:213) already exist.
- **No placeholders:** every code step shows complete code.
