type SortOption = { id: string; field_name: string | null };

export function sortIdsToFieldNames(ids: string[], options: SortOption[]): string[] {
  return ids
    .map((id) => options.find((o) => o.id === id)?.field_name ?? null)
    .filter((f): f is string => !!f);
}

export function sortFieldNamesToIds(fields: string[], options: SortOption[]): string[] {
  return fields
    .map((f) => options.find((o) => o.field_name === f)?.id ?? null)
    .filter((id): id is string => !!id);
}

/**
 * Spec §3prime. Keep the valid subset of `saved`. If that is empty, fall back to
 * the valid subset of `adminDefault`. If that is also empty, fall back to `all`.
 */
export function reconcileSelection(
  saved: string[],
  validIds: Set<string>,
  adminDefault: string[],
  all: string[],
): string[] {
  const validSaved = saved.filter((id) => validIds.has(id));
  if (validSaved.length > 0) return validSaved;
  const validDefault = adminDefault.filter((id) => validIds.has(id));
  if (validDefault.length > 0) return validDefault;
  return all;
}
