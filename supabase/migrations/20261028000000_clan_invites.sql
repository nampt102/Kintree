-- Kintree: mời thành viên bằng email và link, quản lý thành viên, giữ quản trị cuối (change clan-invites, design D1–D5).
-- Mọi việc đi qua RPC security definer có kiểm quyền; bảng lời mời và link không có policy cho client.

-- D1. Lời mời bằng email chung cho mọi vai trò và phạm vi; thay clan_admin_invites (chỉ quản trị dòng họ).
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  clan_id uuid references public.clans on delete cascade,
  tree_id uuid references public.trees on delete cascade,
  role text not null check (role in ('admin', 'viewer')),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(clan_id, tree_id) = 1),
  unique nulls not distinct (email, clan_id, tree_id)
);
alter table public.invites enable row level security;

insert into public.invites (email, clan_id, role, created_at)
select email, clan_id, 'admin', created_at from public.clan_admin_invites;
drop table public.clan_admin_invites;

-- Người đăng ký lần đầu nhận mọi lời mời đang chờ theo email, đúng vai trò và phạm vi.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.memberships (user_id, clan_id, tree_id, role)
  select new.id, i.clan_id, i.tree_id, i.role from public.invites i where i.email = lower(new.email)
  on conflict do nothing;
  delete from public.invites where email = lower(new.email);
  return new;
end
$$;

-- D4. Mỗi dòng họ còn ít nhất một quản trị cấp dòng họ đã có tài khoản.
-- Cho qua khi chính dòng họ hoặc tài khoản đang bị xoá (cascade): lúc ấy dòng cha không còn thấy.
create function public.keep_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin' and old.clan_id is not null
    and (tg_op = 'DELETE' or new.role <> 'admin' or new.clan_id is distinct from old.clan_id)
    and exists (select 1 from public.clans where id = old.clan_id)
    and exists (select 1 from auth.users where id = old.user_id)
    and not exists (
      select 1 from public.memberships m
      where m.clan_id = old.clan_id and m.role = 'admin' and m.id <> old.id
    )
  then
    raise exception 'LAST_ADMIN' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;
create trigger memberships_keep_last_admin before update or delete on public.memberships
for each row execute function public.keep_last_admin();

-- Cấp quyền theo email: có tài khoản thì thành viên ngay, chưa có thì lời mời chờ. Trùng phạm vi thì đổi vai trò.
-- Hàm nội bộ: không cấp execute cho client, chỉ gọi từ các hàm đã kiểm quyền.
create function public._grant_by_email(p_clan uuid, p_tree uuid, p_email text, p_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_clan uuid := p_clan;
  v_user uuid;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'EMAIL_INVALID' using errcode = '23514';
  end if;
  if p_role is null or p_role not in ('admin', 'viewer') then
    raise exception 'ROLE_INVALID' using errcode = '23514';
  end if;
  if p_tree is not null then
    if not exists (select 1 from public.trees where id = p_tree and clan_id = p_clan and removed_at is null) then
      raise exception 'TREE_NOT_FOUND' using errcode = '23503';
    end if;
    v_clan := null;
  end if;
  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is null then
    insert into public.invites (email, clan_id, tree_id, role, created_by)
    values (v_email, v_clan, p_tree, p_role, auth.uid())
    on conflict (email, clan_id, tree_id) do update set role = excluded.role;
    return 'pending';
  end if;
  insert into public.memberships (user_id, clan_id, tree_id, role)
  values (v_user, v_clan, p_tree, p_role)
  on conflict (user_id, clan_id, tree_id) do update set role = excluded.role;
  return 'added';
end
$$;

-- Tạo dòng họ: quản trị đầu tiên đi qua cùng cơ chế lời mời.
create or replace function public.platform_create_clan(p_name text, p_admin_email text)
returns public.clans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_slug text;
  v_clan public.clans;
begin
  if not public.is_platform_admin() then
    raise exception 'NOT_PLATFORM_ADMIN' using errcode = '42501';
  end if;
  if v_name = '' then
    raise exception 'NAME_REQUIRED' using errcode = '23514';
  end if;
  if lower(trim(coalesce(p_admin_email, ''))) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'EMAIL_INVALID' using errcode = '23514';
  end if;
  v_slug := trim(both '-' from regexp_replace(lower(extensions.unaccent(replace(replace(v_name, 'đ', 'd'), 'Đ', 'D'))), '[^a-z0-9]+', '-', 'g'));
  v_slug := v_slug || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
  insert into public.clans (name, slug, created_by) values (v_name, v_slug, auth.uid()) returning * into v_clan;
  perform public._grant_by_email(v_clan.id, null, p_admin_email, 'admin');
  return v_clan;
end
$$;

create or replace function public.platform_list_clans()
returns table (id uuid, name text, slug text, created_at timestamptz, admin_emails text[])
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'NOT_PLATFORM_ADMIN' using errcode = '42501';
  end if;
  return query
    select c.id, c.name, c.slug, c.created_at,
      coalesce((
        select array_agg(e order by e) from (
          select u.email::text as e from public.memberships m join auth.users u on u.id = m.user_id
            where m.clan_id = c.id and m.role = 'admin'
          union
          select i.email from public.invites i where i.clan_id = c.id and i.role = 'admin'
        ) s
      ), '{}')
    from public.clans c
    order by c.created_at desc;
end
$$;

-- D2. Quản trị dòng họ quản lý thành viên (kể cả thành viên chỉ thuộc một cuốn của dòng họ).
create function public.require_clan_admin(p_clan uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_clan is null or public.clan_role(p_clan) is distinct from 'admin' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
end
$$;

create function public.member_invite(p_clan uuid, p_tree uuid, p_email text, p_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_clan_admin(p_clan);
  return public._grant_by_email(p_clan, p_tree, p_email, p_role);
end
$$;

create function public.member_list(p_clan uuid)
returns table (kind text, id uuid, email text, role text, tree_id uuid, tree_name text, is_me boolean, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.require_clan_admin(p_clan);
  return query
    select 'member'::text, m.id, u.email::text, m.role, m.tree_id, t.name, m.user_id = auth.uid(), m.created_at
    from public.memberships m
    join auth.users u on u.id = m.user_id
    left join public.trees t on t.id = m.tree_id
    where m.clan_id = p_clan or (t.clan_id = p_clan and t.removed_at is null)
    union all
    select 'invite'::text, i.id, i.email, i.role, i.tree_id, t.name, false, i.created_at
    from public.invites i
    left join public.trees t on t.id = i.tree_id
    where i.clan_id = p_clan or (t.clan_id = p_clan and t.removed_at is null)
    order by 1 desc, 6 nulls first, 3;
end
$$;

create function public.member_set_role(p_member uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_role is null or p_role not in ('admin', 'viewer') then
    raise exception 'ROLE_INVALID' using errcode = '23514';
  end if;
  perform public.require_clan_admin((select public.membership_clan(clan_id, tree_id) from public.memberships where id = p_member));
  update public.memberships set role = p_role where id = p_member;
end
$$;

create function public.member_remove(p_member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_clan_admin((select public.membership_clan(clan_id, tree_id) from public.memberships where id = p_member));
  delete from public.memberships where id = p_member;
end
$$;

create function public.invite_cancel(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_clan_admin((select public.membership_clan(clan_id, tree_id) from public.invites where id = p_invite));
  delete from public.invites where id = p_invite;
end
$$;

-- D3. Quản trị nền tảng chỉ thấy và đổi quản trị cấp dòng họ; không thấy người xem, không đọc cây.
create function public.platform_list_clan_admins(p_clan uuid)
returns table (kind text, id uuid, email text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_platform_admin() then
    raise exception 'NOT_PLATFORM_ADMIN' using errcode = '42501';
  end if;
  return query
    select 'member'::text, m.id, u.email::text, m.created_at
    from public.memberships m join auth.users u on u.id = m.user_id
    where m.clan_id = p_clan and m.role = 'admin'
    union all
    select 'invite'::text, i.id, i.email, i.created_at
    from public.invites i
    where i.clan_id = p_clan and i.role = 'admin'
    order by 1 desc, 3;
end
$$;

create function public.platform_add_clan_admin(p_clan uuid, p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'NOT_PLATFORM_ADMIN' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clans where id = p_clan) then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;
  return public._grant_by_email(p_clan, null, p_email, 'admin');
end
$$;

create function public.platform_remove_clan_admin(p_kind text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'NOT_PLATFORM_ADMIN' using errcode = '42501';
  end if;
  if p_kind = 'member' then
    delete from public.memberships where id = p_id and clan_id is not null and role = 'admin';
  elsif p_kind = 'invite' then
    delete from public.invites where id = p_id and clan_id is not null and role = 'admin';
  end if;
  if not found then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;
end
$$;

-- D5. Link mời: chỉ cấp vai trò xem. Chỉ lưu băm của mã link; mã mời (tuỳ chọn) băm bằng bcrypt.
create table public.invite_links (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans on delete cascade,
  tree_id uuid references public.trees on delete cascade,
  token_hash bytea not null unique,
  code_hash text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  accepted_count int not null default 0,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(clan_id, tree_id) = 1)
);
alter table public.invite_links enable row level security;

create function public.link_create(p_clan uuid, p_tree uuid, p_days int, p_code text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := nullif(trim(coalesce(p_code, '')), '');
  v_token text := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');
begin
  perform public.require_clan_admin(p_clan);
  if p_days is null or p_days not in (1, 7, 30) then
    raise exception 'DAYS_INVALID' using errcode = '23514';
  end if;
  if v_code is not null and length(v_code) < 4 then
    raise exception 'CODE_TOO_SHORT' using errcode = '23514';
  end if;
  if p_tree is not null and not exists (select 1 from public.trees where id = p_tree and clan_id = p_clan and removed_at is null) then
    raise exception 'TREE_NOT_FOUND' using errcode = '23503';
  end if;
  insert into public.invite_links (clan_id, tree_id, token_hash, code_hash, expires_at, created_by)
  values (
    case when p_tree is null then p_clan end, p_tree,
    extensions.digest(v_token, 'sha256'),
    case when v_code is not null then extensions.crypt(v_code, extensions.gen_salt('bf')) end,
    now() + make_interval(days => p_days), auth.uid());
  return v_token;
end
$$;

-- Chỉ link còn hiệu lực (chưa thu hồi, chưa hết hạn) của dòng họ và các cuốn chưa xoá.
create function public.link_list(p_clan uuid)
returns table (id uuid, tree_id uuid, tree_name text, expires_at timestamptz, has_code boolean,
  accepted_count int, locked_until timestamptz, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.require_clan_admin(p_clan);
  return query
    select l.id, l.tree_id, t.name, l.expires_at, l.code_hash is not null, l.accepted_count, l.locked_until, l.created_at
    from public.invite_links l
    left join public.trees t on t.id = l.tree_id
    where (l.clan_id = p_clan or (t.clan_id = p_clan and t.removed_at is null))
      and l.revoked_at is null and l.expires_at > now()
    order by l.created_at desc;
end
$$;

create function public.link_revoke(p_link uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_clan_admin((select public.membership_clan(clan_id, tree_id) from public.invite_links where id = p_link));
  update public.invite_links set revoked_at = now() where id = p_link and revoked_at is null;
end
$$;

-- Xem trước link cho người đã đăng nhập. Không tồn tại hoặc cuốn đã xoá: 'invalid', không lộ dòng họ.
create function public.link_peek(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.invite_links;
  v_clan uuid;
  v_tree_name text;
begin
  select * into v from public.invite_links where token_hash = extensions.digest(coalesce(p_token, ''), 'sha256');
  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;
  if v.tree_id is not null then
    select clan_id, name into v_clan, v_tree_name from public.trees where id = v.tree_id and removed_at is null;
    if v_clan is null then
      return jsonb_build_object('status', 'invalid');
    end if;
  else
    v_clan := v.clan_id;
  end if;
  return jsonb_build_object(
    'status', case
      when v.revoked_at is not null then 'revoked'
      when v.expires_at <= now() then 'expired'
      when v.locked_until > now() then 'locked'
      else 'ok' end,
    'clan_id', v_clan,
    'clan_name', (select name from public.clans where id = v_clan),
    'tree_name', v_tree_name,
    'has_code', v.code_hash is not null);
end
$$;

-- Nhận link. Trả mã trạng thái thay vì raise: raise sẽ rollback cả phép đếm lần sai, khoá không bao giờ bật.
create function public.link_accept(p_token text, p_code text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.invite_links;
  v_clan uuid;
  v_added int;
begin
  if auth.uid() is null then
    raise exception 'NOT_SIGNED_IN' using errcode = '42501';
  end if;
  select * into v from public.invite_links where token_hash = extensions.digest(coalesce(p_token, ''), 'sha256') for update;
  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;
  if v.tree_id is not null then
    select clan_id into v_clan from public.trees where id = v.tree_id and removed_at is null;
    if v_clan is null then
      return jsonb_build_object('status', 'invalid');
    end if;
  else
    v_clan := v.clan_id;
  end if;
  if v.revoked_at is not null then
    return jsonb_build_object('status', 'revoked');
  end if;
  if v.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;
  if v.locked_until > now() then
    return jsonb_build_object('status', 'locked');
  end if;
  if v.code_hash is not null and extensions.crypt(coalesce(p_code, ''), v.code_hash) <> v.code_hash then
    if v.failed_attempts + 1 >= 5 then
      update public.invite_links set failed_attempts = 0, locked_until = now() + interval '15 minutes' where id = v.id;
      return jsonb_build_object('status', 'locked');
    end if;
    update public.invite_links set failed_attempts = v.failed_attempts + 1 where id = v.id;
    return jsonb_build_object('status', 'wrong_code');
  end if;
  insert into public.memberships (user_id, clan_id, tree_id, role)
  values (auth.uid(), v.clan_id, v.tree_id, 'viewer')
  on conflict do nothing;
  get diagnostics v_added = row_count;
  update public.invite_links set failed_attempts = 0, accepted_count = accepted_count + v_added where id = v.id;
  -- tree_id: người chỉ có quyền ở một cuốn không đọc được dòng họ, app mở thẳng cuốn ấy.
  return jsonb_build_object('status', 'ok', 'clan_id', v_clan, 'tree_id', v.tree_id);
end
$$;

-- Quyền thấp nhất cho đối tượng mới: client không đụng bảng; chỉ execute đúng các RPC công khai.
revoke all on public.invites, public.invite_links from anon, authenticated, public;
revoke all on all functions in schema public from public, anon;
-- Supabase cấp sẵn execute cho authenticated trên hàm mới; hàm nội bộ cấp quyền không kiểm người gọi nên phải thu hồi.
revoke all on function public._grant_by_email(uuid, uuid, text, text), public.keep_last_admin() from authenticated;
grant execute on function
  public.member_invite(uuid, uuid, text, text), public.member_list(uuid), public.member_set_role(uuid, text),
  public.member_remove(uuid), public.invite_cancel(uuid),
  public.platform_list_clan_admins(uuid), public.platform_add_clan_admin(uuid, text), public.platform_remove_clan_admin(text, uuid),
  public.link_create(uuid, uuid, int, text), public.link_list(uuid), public.link_revoke(uuid),
  public.link_peek(text), public.link_accept(text, text)
  to authenticated;
