-- marketplace_reference_counters is only touched by next_marketplace_reference(),
-- a SECURITY DEFINER function owned by postgres (bypasses RLS). Clients never
-- read or write it directly, so enable RLS with no policies and drop the
-- default API grants — otherwise anon could reset counters via PostgREST.
alter table public.marketplace_reference_counters enable row level security;

revoke all on table public.marketplace_reference_counters from anon, authenticated;
