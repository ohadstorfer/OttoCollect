# Fix: profile pages 404 for UUID links and for humans

**Date:** 2026-06-05
**Author:** Ohad Storfer (with Claude)
**Status:** Approved — ready for implementation

## Problem

Since commit `ce4ae86e` (Jun 1, "feat(seo): SSR-aware /profile/:username route with
404 noindex"), real users intermittently land on a server-rendered **404 — Page not
found** page when visiting a profile. The reported example showed a UUID-shaped URL
(`/profile/3f1ca54e-7951-4219-af60-8dccb00d5255`) on iPhone Safari — i.e. a human, not
a crawler.

### Root cause

Two independent flaws combine:

**Flaw A — server validates the `username` column only.**
The client accepts *either* a UUID or a username in `/profile/:param`.
`getUserProfile` (`src/services/profileService.ts:53-69`) UUID-regex-matches the param
and queries by `id`, otherwise by `username`. Many in-app links pass the user's UUID:

- `src/components/messages/MessageList.tsx:97` → `conversation.otherUserId`
- `src/components/layout/Footer.tsx:63` ("my profile") → `user?.id`
- `src/pages/MarketplaceItemDetail.tsx:447/457` and `MarketplaceItemDetailUnlisted.tsx` → `seller.id`
- `src/pages/ForumPost.tsx`, `src/pages/BlogPost.tsx`, `src/pages/ForumPostAnnouncements.tsx`, `src/pages/CountryDetailCollection.tsx` → `userId` / `selectedUserId`

The new server handler (`server.js:275`, `:281`) calls
`dbHas('profiles', 'username', param)`. A UUID never matches a `username`, so
`dbHas` returns false → `send404Html`.

**Flaw B — the hard 404 is served to humans.**
In `serveEntityPage` (`server.js:77-79`) only the *static-file* branch is gated on
`isCrawler`; the `dbHas` → 404 step is unconditional. So any server-served load of a
UUID-based profile URL (refresh, new tab, pasted/deep link, hard navigation) hands a
real user a dead 404 instead of the React app. In-app SPA clicks never hit `server.js`,
which is why it presents as intermittent.

## Solution

Two changes, both in `server.js`. No client changes; the mixed UUID/username links stay.

### Change A — UUID-or-username lookup (profile handlers only)

In the two `/profile/:username` handlers, mirror the client's resolution:

```js
const p = decodeURIComponent(req.params.username);
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p);
// serveEntityPage opts: dbColumn: isUuid ? 'id' : 'username', dbValue: p
```

A valid UUID profile is recognized and falls through to the React shell; a genuinely
bogus param still 404s for crawlers.

### Change B — humans never get a hard 404 (all entity pages)

Gate the `dbHas` → `send404Html` step in `serveEntityPage` on `isCrawler`:

```js
if (isCrawler && !(await dbHas(opts.dbTable, opts.dbColumn, opts.dbValue))) {
  return send404Html(res, opts.missingMessage);
}
res.sendFile(path.join(__dirname, 'dist', 'index.html'));
```

Crawlers keep getting `noindex` 404s for bogus entities (SEO intent preserved); humans
always get the React shell, which renders its own client-side not-found. Applies
consistently across profiles, forum/blog posts, marketplace items, banknotes, catalog —
chosen deliberately (approved) for consistent SPA behavior.

### Out of scope

The separate static-file-as-indexability-gate handler (`server.js:~169-174`, commit
`ca900bae`) is not touched; it has its own crawler logic. Change B only affects the
`dbHas` branch inside `serveEntityPage`.

## Verification

- `/profile/<valid-uuid>` as a human → React shell (200), not 404.
- `/profile/<valid-username>` as a human → React shell (200).
- `/profile/<bogus>` as a crawler (UA contains `bot`) → `noindex` 404.
- `/profile/<valid-uuid>` as a crawler → falls through (id matches).
- `/marketplace-item/<deleted-id>`: human → shell, crawler → 404 (Change B spot-check).
