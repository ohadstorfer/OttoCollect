/**
 * Builds the "new" extended pick number format from the base pick and the
 * extended pick. Format: `p` + base + (variant ? "." + variant : "").
 *
 * The variant is whatever the extended pick has beyond the base pick.
 * Examples (extended / base -> result):
 *   25a1  / 25       -> p25.a1
 *   55b1  / 55b      -> p55b.1
 *   109b  / 109      -> p109.b
 *   38    / 38       -> p38
 *   35A   / 35A      -> p35A
 *   39A   / Unlisted -> p.39A
 *
 * Edge cases:
 *   - Empty/Unlisted base -> the whole extended is treated as variant: `p.<ext>`.
 *   - Base is not a prefix of the extended (editorial exception, e.g. 194a2/194b)
 *     -> best-effort `p<ext>`; the admin can override it manually.
 */
export function buildNewExtendedPickNumber(
  extendedPick?: string | null,
  basePick?: string | null,
): string {
  const ext = (extendedPick ?? '').trim();
  if (!ext) return '';

  const base = (basePick ?? '').trim();
  if (!base || base.toLowerCase() === 'unlisted') {
    return `p.${ext}`;
  }

  if (ext.startsWith(base)) {
    const variant = ext.slice(base.length);
    return variant ? `p${base}.${variant}` : `p${base}`;
  }

  // Editorial exception: base pick is not contained in the extended pick.
  return `p${ext}`;
}
