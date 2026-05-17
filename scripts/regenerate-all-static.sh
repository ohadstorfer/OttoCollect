#!/usr/bin/env bash
# Trigger a FULL regeneration of every static HTML page in the static-pages
# Supabase Storage bucket: homepage, catalog/, country pages, banknote pages,
# forum/blog/marketplace listing pages, and individual forum/blog/marketplace
# item pages.
#
# When to use this:
#   * After deploying changes to supabase/functions/generate-catalog-pages/
#     index.ts (new HTML markup, CSS, narrative, related links, etc.).
#   * To force a full rebuild not tied to a country becoming visible (the SQL
#     trigger) or to a banknote's updated_at (the weekly incremental cron).
#
# This calls the edge function without a body, which puts it in "full mode".
# The same function called with {"since": "..."} would only regenerate
# recently-changed banknotes plus their country pages.
#
# Usage:
#   SUPABASE_SERVICE_ROLE_KEY=eyJ... ./scripts/regenerate-all-static.sh
# or:
#   ./scripts/regenerate-all-static.sh eyJ...
#
# The service-role key lives in:
#   https://supabase.com/dashboard/project/psnzolounfwgvkupepxb/settings/api
#
# Expect this to take 2-5 minutes. If the edge function times out before
# finishing, just run the script again — uploads use upsert:true so it's
# idempotent and incomplete runs eventually fill in over a few re-runs.

set -eu

KEY="${SUPABASE_SERVICE_ROLE_KEY:-${1:-}}"
if [ -z "$KEY" ]; then
  echo "Error: SUPABASE_SERVICE_ROLE_KEY not set and no key passed as argument." >&2
  echo "Set it as an env var or pass it as the first argument." >&2
  exit 1
fi

URL="https://psnzolounfwgvkupepxb.supabase.co/functions/v1/generate-catalog-pages"

echo "Triggering FULL regeneration..."
echo "URL: $URL"
echo "This may take 2-5 minutes (regenerates ~700+ HTML files)."
echo ""

START=$(date +%s)
RESPONSE=$(curl -sS -X POST \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  --max-time 600 \
  "$URL")
END=$(date +%s)

echo "Done in $((END - START))s. Response:"
if command -v python3 >/dev/null 2>&1; then
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
else
  echo "$RESPONSE"
fi
