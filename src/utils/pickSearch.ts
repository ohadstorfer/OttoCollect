/**
 * Returns the set of search variants to try against the pick number fields.
 * Rule:
 *   When the user types `p<something>` (without a dot right after the `p`),
 *   also match `p.<something>` so that Unlisted variants like `p.24A` show up
 *   for a search of `p24`. The reverse direction is intentionally NOT applied
 *   (typing `p.24` should only match Unlisted, not `p24.a`).
 *
 * Used by the catalog and collection search bars (client-side filters and
 * PostgREST `.or(...)` queries).
 */
export function buildPickSearchVariants(input: string): string[] {
  const term = (input ?? '').trim().toLowerCase();
  if (!term) return [];

  const variants = new Set<string>([term]);

  // p<X>  -->  also p.<X>   (catches Unlisted `p.24A` when user typed `p24`)
  if (/^p[^.]/i.test(term)) {
    variants.add('p.' + term.slice(1));
  }

  return [...variants];
}

/**
 * Returns true if the haystack matches the search term considering pick
 * variants (case-insensitive `includes`).
 */
export function matchesPickSearch(haystack: string | null | undefined, search: string): boolean {
  if (!haystack) return false;
  const h = haystack.toLowerCase();
  return buildPickSearchVariants(search).some(v => h.includes(v));
}

/**
 * Builds a PostgREST `.or(...)` partial — comma-separated `column.ilike.%value%`
 * filters covering all pick search variants across the given columns.
 *
 *   pickSearchOrFilters(['extended_pick_number','new_extended_pick_number'], 'p24')
 *   ->  "extended_pick_number.ilike.%p24%,extended_pick_number.ilike.%p.24%,
 *        new_extended_pick_number.ilike.%p24%,new_extended_pick_number.ilike.%p.24%"
 *
 * The result has NO leading/trailing comma, so callers can splice it into a
 * larger `.or(...)` string.
 */
export function pickSearchOrFilters(columns: string[], search: string): string {
  const variants = buildPickSearchVariants(search);
  const parts: string[] = [];
  for (const col of columns) {
    for (const v of variants) {
      parts.push(`${col}.ilike.%${v}%`);
    }
  }
  return parts.join(',');
}
