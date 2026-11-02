-- Kintree: nhắc giỗ qua Web Push (change anniversary-push, design D1).
-- Thiết bị của mình, bật nhắc theo dòng họ, nhật ký đã gửi (chống gửi trùng). Bộ gửi là Edge Function dùng service_role.

-- Thiết bị nhận push. Một endpoint thuộc về người đăng ký sau cùng (máy dùng chung): ghi qua register_push, không ghi trực tiếp.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_select on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy push_subscriptions_delete on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;

-- Bật nhắc theo (người, dòng họ); mặc định không có dòng = tắt. Chỉ bật được cho dòng họ mà mình có vai trò.
create table public.reminder_prefs (
  user_id uuid not null references auth.users on delete cascade,
  clan_id uuid not null references public.clans on delete cascade,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, clan_id)
);
alter table public.reminder_prefs enable row level security;
create policy reminder_prefs_select on public.reminder_prefs for select to authenticated using (user_id = auth.uid());
create policy reminder_prefs_insert on public.reminder_prefs for insert to authenticated
  with check (user_id = auth.uid() and public.clan_role(clan_id) is not null);
create policy reminder_prefs_update on public.reminder_prefs for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.clan_role(clan_id) is not null);
create policy reminder_prefs_delete on public.reminder_prefs for delete to authenticated using (user_id = auth.uid());
revoke all on public.reminder_prefs from anon, authenticated;
grant select, insert, update, delete on public.reminder_prefs to authenticated;

-- Nhật ký đã gửi: khoá chính chặn gửi trùng. Không mở cho người dùng (không có policy, thu hồi quyền).
create table public.reminder_log (
  user_id uuid not null references auth.users on delete cascade,
  person_id uuid not null references public.persons on delete cascade,
  event_date date not null,
  lead_days int not null check (lead_days in (0, 1, 7)),
  sent_at timestamptz not null default now(),
  primary key (user_id, person_id, event_date, lead_days)
);
alter table public.reminder_log enable row level security;
revoke all on public.reminder_log from anon, authenticated;

-- Đăng ký thiết bị của mình (đổi chủ nếu endpoint đã có của người khác).
create function public.register_push(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if coalesce(p_endpoint, '') = '' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'INVALID_SUBSCRIPTION' using errcode = '22023';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent, created_at = now()
  returning id into v_id;
  return v_id;
end
$$;
revoke all on function public.register_push(text, text, text, text) from public, anon;
grant execute on function public.register_push(text, text, text, text) to authenticated;

-- Người nhận hiện tại: đã bật nhắc, còn vai trò ở dòng họ, có ít nhất một thiết bị. Chỉ bộ gửi (service_role) gọi.
create function public.reminder_targets()
returns table (user_id uuid, clan_id uuid, subscription_id uuid, endpoint text, p256dh text, auth text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.clan_id, s.id, s.endpoint, s.p256dh, s.auth
  from public.reminder_prefs p
  join public.memberships m on m.user_id = p.user_id and m.clan_id = p.clan_id
  join public.push_subscriptions s on s.user_id = p.user_id
  where p.enabled
$$;
revoke all on function public.reminder_targets() from public, anon, authenticated;
grant execute on function public.reminder_targets() to service_role;
