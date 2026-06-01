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
 * Option A normalization for pick-number matching.
 *
 * Both the typed search term and the stored pick value are reduced to the same
 * canonical form before comparison, so neither the optional `p`/`P` prefix nor
 * the position of the dot matters:
 *   - drop a leading `p`/`P`
 *   - drop ALL dots
 *   - lowercase
 *
 * Examples: `p24.a` -> `24a`, `p.24A` -> `24a`, `p19a.1` -> `19a1`.
 * As a result, searching `p24a` (or `24a`, `P24A`, ...) matches both `p24.a`
 * and `p.24A` regardless of where the dot sits in the stored value.
 */
export function normalizePickNumber(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^p/, '') // strip the leading pick prefix
    .replace(/\./g, ''); // strip every dot
}

/**
 * Returns true if the haystack pick number matches the search term once both
 * are normalized (see {@link normalizePickNumber}). Dot placement and the `p`
 * prefix are ignored on both sides.
 */
export function matchesPickSearch(haystack: string | null | undefined, search: string): boolean {
  const needle = normalizePickNumber(search);
  if (!needle) return false;
  return normalizePickNumber(haystack).includes(needle);
}

/**
 * Client-side text search for catalog/collection banknote lists. Matches across
 * denomination, description and sultan name (plain case-insensitive substring),
 * plus the two pick-number fields (dot-insensitive via {@link matchesPickSearch}).
 * An empty term matches everything.
 */
export function banknoteMatchesSearch(
  b: {
    denomination?: string | null;
    description?: string | null;
    sultanName?: string | null;
    extendedPickNumber?: string | null;
    newExtendedPickNumber?: string | null;
  },
  search: string
): boolean {
  const term = (search ?? '').trim().toLowerCase();
  if (!term) return true;
  return (
    (b.denomination ?? '').toLowerCase().includes(term) ||
    (b.description ?? '').toLowerCase().includes(term) ||
    (b.sultanName ?? '').toLowerCase().includes(term) ||
    matchesPickSearch(b.extendedPickNumber, term) ||
    matchesPickSearch(b.newExtendedPickNumber, term)
  );
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
