import type { CollectionItem } from '@/types';

// Per-user "version" counter, bumped on any mutation. Acts as a safety-net
// signal so a kept-alive collection page can silently re-fetch if it ever
// drifts from the patches below (e.g. a partial mutation we didn't capture).
const versions = new Map<string, number>();

export function bumpCollectionVersion(userId: string): void {
  if (!userId) return;
  versions.set(userId, (versions.get(userId) ?? 0) + 1);
}

export function getCollectionVersion(userId: string): number {
  return versions.get(userId) ?? 0;
}

// Pending optimistic patches that a kept-alive collection page should apply
// in place when it next becomes active. Lets edits/deletes from a detail page
// appear instantly on the cached collection without waiting for a refetch.
export type CollectionPatch =
  | { kind: 'update'; item: CollectionItem }
  | { kind: 'delete'; itemId: string };

const pendingPatches = new Map<string, CollectionPatch[]>();

export function pushCollectionPatch(userId: string, patch: CollectionPatch): void {
  if (!userId) return;
  const list = pendingPatches.get(userId) ?? [];
  list.push(patch);
  pendingPatches.set(userId, list);
  bumpCollectionVersion(userId);
}

export function drainCollectionPatches(userId: string): CollectionPatch[] {
  if (!userId) return [];
  const list = pendingPatches.get(userId);
  if (!list || list.length === 0) return [];
  pendingPatches.delete(userId);
  return list;
}

// Back-compat alias for the rare mutation we don't have the full item for
// (just signal a refresh, no patch).
export const markCollectionDirty = bumpCollectionVersion;
