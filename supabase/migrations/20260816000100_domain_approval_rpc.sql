-- supabase/migrations/20260816000100_domain_approval_rpc.sql
-- Server-side domain approval (spec §6.2). Fixes two prod issues:
--  1. approved_domains writes / pending_domain_requests deletes were USING (true)
--     — any authenticated user could approve or reject domains via the API.
--  2. The client-side "attach links after approval" batch update on
--     marketplace_items was silently blocked by the seller-only UPDATE policy.
-- All approval side effects now run inside security-definer RPCs gated on
-- Super Admin.

-- approved_domains needs a unique domain for idempotent approval (0 dups in prod).
create unique index if not exists approved_domains_domain_key
  on public.approved_domains (domain);

-- Host extraction: "https://www.ebay.com/itm/1" -> "www.ebay.com"
create or replace function public.url_hostname(p_url text)
returns text language sql immutable as $$
  select lower(split_part(split_part(coalesce(p_url, ''), '//', 2), '/', 1));
$$;

create or replace function public.approve_domain(p_domain text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_rec record;
begin
  if not exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'Super Admin') then
    raise exception 'Super Admin only';
  end if;

  -- 1. Approve + clear any rejection record.
  insert into public.approved_domains (domain) values (p_domain)
  on conflict (domain) do nothing;
  delete from public.rejected_domains where domain = p_domain;

  -- 2. Attach links by host suffix (NOT ilike '%domain%', which over-matches).
  update public.marketplace_items set is_url_approved = true
   where external_listing_url is not null and (
     public.url_hostname(external_listing_url) = p_domain
     or public.url_hostname(external_listing_url) like '%.' || p_domain);

  update public.profiles set is_url_approved = true
   where personal_website_url is not null and (
     public.url_hostname(personal_website_url) = p_domain
     or public.url_hostname(personal_website_url) like '%.' || p_domain);

  -- 3. Promote auctions held for this domain (spec §5.3 step 4).
  for v_rec in
    select id, collection_item_id, listing_type, reference_code
    from public.marketplace_items
    where status = 'PendingUrl' and pending_url_domain = p_domain
  loop
    update public.marketplace_items
       set status = 'Available',
           is_url_approved = true,
           published_at = now(),
           pending_url_domain = null,
           reference_code = coalesce(v_rec.reference_code,
                                     public.next_marketplace_reference(v_rec.listing_type)),
           updated_at = now()
     where id = v_rec.id;

    update public.collection_items set is_for_sale = true
     where id = v_rec.collection_item_id;
  end loop;

  -- 4. Clean up the pending queue.
  delete from public.pending_domain_requests where domain = p_domain;
end;
$$;

create or replace function public.reject_domain(p_domain text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'Super Admin') then
    raise exception 'Super Admin only';
  end if;

  insert into public.rejected_domains (domain, requested_url, requested_by, listing_type, rejected_by)
  select domain, requested_url, requested_by, listing_type, auth.uid()
  from public.pending_domain_requests where domain = p_domain;

  if not found then
    -- No pending rows (legacy path) — still log the rejection.
    insert into public.rejected_domains (domain, rejected_by) values (p_domain, auth.uid());
  end if;

  delete from public.pending_domain_requests where domain = p_domain;
end;
$$;

create or replace function public.restore_rejected_domain(p_domain text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'Super Admin') then
    raise exception 'Super Admin only';
  end if;

  -- pending_domain_requests.requested_url is NOT NULL; synthesize when missing.
  insert into public.pending_domain_requests (domain, requested_by, requested_url, listing_type)
  select domain, requested_by, coalesce(requested_url, 'https://' || domain), listing_type
  from public.rejected_domains where domain = p_domain;

  delete from public.rejected_domains where domain = p_domain;
end;
$$;

grant execute on function public.approve_domain(text) to authenticated;
grant execute on function public.reject_domain(text) to authenticated;
grant execute on function public.restore_rejected_domain(text) to authenticated;

-- Tighten table policies -----------------------------------------------------
drop policy if exists "Admins can manage approved_domains" on public.approved_domains;
drop policy if exists "approved_domains super admin write" on public.approved_domains;
create policy "approved_domains super admin write" on public.approved_domains
  for all using (exists (select 1 from public.profiles
                         where id = auth.uid() and role = 'Super Admin'))
  with check   (exists (select 1 from public.profiles
                         where id = auth.uid() and role = 'Super Admin'));
-- ("Anyone can read approved_domains" SELECT policy is kept.)

drop policy if exists "Admins can delete requests" on public.pending_domain_requests;
drop policy if exists "pending_requests super admin delete" on public.pending_domain_requests;
create policy "pending_requests super admin delete" on public.pending_domain_requests
  for delete using (exists (select 1 from public.profiles
                            where id = auth.uid() and role = 'Super Admin'));
-- (public read + own-insert policies are kept.)
