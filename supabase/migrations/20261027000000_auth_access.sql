-- Kintree: đăng nhập, quyền theo dòng họ/cuốn, quản trị nền tảng, ghi nguyên tử (change cloud-auth-storage, design D3–D4).
-- Hai vai trò (admin, viewer) ở hai tầng (dòng họ, cuốn). Chỉ admin ghi. Không policy delete: gỡ/xoá = đánh dấu (ADR 0006).

create extension if not exists unaccent with schema extensions;

-- Cột mới: thuỷ tổ, đánh dấu gỡ/xoá.
alter table public.persons
  add column is_root boolean not null default false,
  add column removed_at timestamptz,
  add column removal_id uuid;
alter table public.parent_child
  add column removed_at timestamptz,
  add column removal_id uuid;
alter table public.marriages
  add column removed_at timestamptz,
  add column removal_id uuid;
alter table public.trees
  add column removed_at timestamptz;

-- Mỗi cuốn tối đa một thuỷ tổ đang hiện.
create unique index persons_one_root on public.persons (tree_id) where is_root and removed_at is null;

-- Bỏ vai trò biên tập.
alter table public.memberships drop constraint memberships_role_check;
alter table public.memberships add constraint memberships_role_check check (role in ('admin', 'viewer'));

-- Quản trị nền tảng: chỉ nhà vận hành (service_role / chủ cơ sở dữ liệu) ghi; không policy cho client.
create table public.platform_admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;

-- Email được chỉ định quản trị dòng họ nhưng chưa có tài khoản; đổi thành membership khi đăng ký.
create table public.clan_admin_invites (
  email text not null,
  clan_id uuid not null references public.clans on delete cascade,
  created_at timestamptz not null default now(),
  primary key (email, clan_id),
  check (email = lower(email))
);
alter table public.clan_admin_invites enable row level security;

-- Hàm quyền (security definer để dùng trong RLS mà không đệ quy).
create function public.role_rank(r text)
returns int
language sql
immutable
set search_path = ''
as $$
  select (r = 'admin')::int * 2 + (r = 'viewer')::int
$$;

create function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;

create function public.clan_role(c uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.memberships where clan_id = c and user_id = auth.uid()
$$;

-- Mức cao nhất giữa vai trò ở dòng họ chứa cuốn và ở chính cuốn; null nếu không có hoặc cuốn đã xoá.
create function public.tree_role(t uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.trees tr
  join public.memberships m on m.tree_id = tr.id or m.clan_id = tr.clan_id
  where tr.id = t and tr.removed_at is null and m.user_id = auth.uid()
  order by public.role_rank(m.role) desc
  limit 1
$$;

-- Cuốn không đổi dòng họ sau khi tạo.
create function public.freeze_tree_clan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.clan_id <> old.clan_id then
    raise exception 'CLAN_FROZEN' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger trees_freeze_clan before update on public.trees
for each row execute function public.freeze_tree_clan();

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;
create trigger persons_touch before update on public.persons
for each row execute function public.touch_updated_at();

-- Chính sách.
create policy clans_select on public.clans for select to authenticated
  using (public.clan_role(id) is not null);

create policy trees_select on public.trees for select to authenticated
  using (public.tree_role(id) is not null);
-- with check (true): sau khi đặt removed_at, tree_role(id) trả null nên không dùng làm điều kiện ghi; dòng họ đã bị đóng băng bởi trigger.
create policy trees_update on public.trees for update to authenticated
  using (public.tree_role(id) = 'admin') with check (true);

create policy persons_select on public.persons for select to authenticated
  using (public.tree_role(tree_id) is not null);
create policy persons_insert on public.persons for insert to authenticated
  with check (public.tree_role(tree_id) = 'admin');
create policy persons_update on public.persons for update to authenticated
  using (public.tree_role(tree_id) = 'admin') with check (public.tree_role(tree_id) = 'admin');

create policy parent_child_select on public.parent_child for select to authenticated
  using (exists (select 1 from public.persons p where p.id = child_id));
create policy parent_child_insert on public.parent_child for insert to authenticated
  with check (exists (select 1 from public.persons p where p.id = child_id and public.tree_role(p.tree_id) = 'admin'));
create policy parent_child_update on public.parent_child for update to authenticated
  using (exists (select 1 from public.persons p where p.id = child_id and public.tree_role(p.tree_id) = 'admin'))
  with check (exists (select 1 from public.persons p where p.id = child_id and public.tree_role(p.tree_id) = 'admin'));

create policy marriages_select on public.marriages for select to authenticated
  using (exists (select 1 from public.persons p where p.id = husband_id));
create policy marriages_insert on public.marriages for insert to authenticated
  with check (exists (select 1 from public.persons p where p.id = husband_id and public.tree_role(p.tree_id) = 'admin'));
create policy marriages_update on public.marriages for update to authenticated
  using (exists (select 1 from public.persons p where p.id = husband_id and public.tree_role(p.tree_id) = 'admin'))
  with check (exists (select 1 from public.persons p where p.id = husband_id and public.tree_role(p.tree_id) = 'admin'));

-- Thành viên: mình thấy dòng của mình; admin dòng họ thấy và sửa mọi dòng của dòng họ (kể cả vai trò ở cấp cuốn).
create function public.membership_clan(m_clan uuid, m_tree uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(m_clan, (select clan_id from public.trees where id = m_tree))
$$;

create policy memberships_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.clan_role(public.membership_clan(clan_id, tree_id)) = 'admin');
create policy memberships_insert on public.memberships for insert to authenticated
  with check (public.clan_role(public.membership_clan(clan_id, tree_id)) = 'admin');
create policy memberships_update on public.memberships for update to authenticated
  using (public.clan_role(public.membership_clan(clan_id, tree_id)) = 'admin')
  with check (public.clan_role(public.membership_clan(clan_id, tree_id)) = 'admin');
create policy memberships_delete on public.memberships for delete to authenticated
  using (public.clan_role(public.membership_clan(clan_id, tree_id)) = 'admin');

-- Quyền thấp nhất: anon không có gì; authenticated chỉ đúng thao tác policy cho phép.
revoke all on all tables in schema public from anon, public;
revoke all on all tables in schema public from authenticated;
grant select on public.clans, public.trees, public.persons, public.parent_child, public.marriages, public.memberships to authenticated;
grant update on public.trees to authenticated;
grant insert, update on public.persons, public.parent_child, public.marriages to authenticated;
grant insert, update, delete on public.memberships to authenticated;
revoke all on all functions in schema public from public, anon;
grant execute on function public.role_rank(text), public.is_platform_admin(), public.clan_role(uuid),
  public.tree_role(uuid), public.membership_clan(uuid, uuid) to authenticated;

-- Tạo cuốn qua hàm (không insert trực tiếp): INSERT … RETURNING bị policy select chặn vì tree_role không thấy dòng vừa chèn trong cùng câu lệnh.
create function public.create_tree(p_clan uuid, p_name text, p_region text, p_description text default null)
returns public.trees
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tree public.trees;
begin
  if public.clan_role(p_clan) is distinct from 'admin' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  insert into public.trees (clan_id, name, region, description)
  values (p_clan, trim(coalesce(p_name, '')), coalesce(p_region, 'north'), nullif(trim(coalesce(p_description, '')), ''))
  returning * into v_tree;
  return v_tree;
end
$$;
grant execute on function public.create_tree(uuid, text, text, text) to authenticated;

-- Quản trị nền tảng tạo dòng họ và chỉ định quản trị đầu tiên.
create function public.platform_create_clan(p_name text, p_admin_email text)
returns public.clans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_admin_email, '')));
  v_name text := trim(coalesce(p_name, ''));
  v_slug text;
  v_clan public.clans;
  v_user uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'NOT_PLATFORM_ADMIN' using errcode = '42501';
  end if;
  if v_name = '' then
    raise exception 'NAME_REQUIRED' using errcode = '23514';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'EMAIL_INVALID' using errcode = '23514';
  end if;
  v_slug := trim(both '-' from regexp_replace(lower(extensions.unaccent(replace(replace(v_name, 'đ', 'd'), 'Đ', 'D'))), '[^a-z0-9]+', '-', 'g'));
  v_slug := v_slug || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
  insert into public.clans (name, slug, created_by) values (v_name, v_slug, auth.uid()) returning * into v_clan;
  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is null then
    insert into public.clan_admin_invites (email, clan_id) values (v_email, v_clan.id);
  else
    insert into public.memberships (user_id, clan_id, role) values (v_user, v_clan.id, 'admin');
  end if;
  return v_clan;
end
$$;

create function public.platform_list_clans()
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
          select i.email from public.clan_admin_invites i where i.clan_id = c.id
        ) s
      ), '{}')
    from public.clans c
    order by c.created_at desc;
end
$$;

-- Người đăng ký lần đầu nhận các lời chỉ định quản trị đang chờ theo email.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.memberships (user_id, clan_id, role)
  select new.id, i.clan_id, 'admin' from public.clan_admin_invites i where i.email = lower(new.email)
  on conflict do nothing;
  delete from public.clan_admin_invites where email = lower(new.email);
  return new;
end
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

grant execute on function public.platform_create_clan(text, text), public.platform_list_clans() to authenticated;

-- Ghi nguyên tử các dòng đã đổi; security invoker nên RLS và trigger toàn vẹn áp dụng nguyên.
-- Thứ tự theo khoá ngoại: cuốn, người, cha/mẹ–con, hôn nhân. Một lời gọi RPC = một giao dịch.
create function public.apply_tree_changes(p_tree jsonb, p_persons jsonb, p_parents jsonb, p_marriages jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_tree is not null then
    update public.trees
    set name = p_tree ->> 'name', description = p_tree ->> 'description', region = p_tree ->> 'region'
    where id = (p_tree ->> 'id')::uuid;
    if not found then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
  end if;

  insert into public.persons (
    id, tree_id, full_name, gender, is_outsider, is_root,
    birth_year, birth_month, birth_day, birth_lunar, birth_leap,
    death_year, death_month, death_day, death_lunar, death_leap,
    birth_place, burial_place, biography, note, sibling_order, removed_at, removal_id)
  select
    id, tree_id, full_name, coalesce(gender, 'unknown'), coalesce(is_outsider, false), coalesce(is_root, false),
    birth_year, birth_month, birth_day, coalesce(birth_lunar, false), coalesce(birth_leap, false),
    death_year, death_month, death_day, coalesce(death_lunar, false), coalesce(death_leap, false),
    birth_place, burial_place, biography, note, sibling_order, removed_at, removal_id
  from jsonb_to_recordset(coalesce(p_persons, '[]'::jsonb)) as x(
    id uuid, tree_id uuid, full_name text, gender text, is_outsider boolean, is_root boolean,
    birth_year int, birth_month smallint, birth_day smallint, birth_lunar boolean, birth_leap boolean,
    death_year int, death_month smallint, death_day smallint, death_lunar boolean, death_leap boolean,
    birth_place text, burial_place text, biography text, note text, sibling_order int,
    removed_at timestamptz, removal_id uuid)
  on conflict (id) do update set
    full_name = excluded.full_name, gender = excluded.gender, is_outsider = excluded.is_outsider, is_root = excluded.is_root,
    birth_year = excluded.birth_year, birth_month = excluded.birth_month, birth_day = excluded.birth_day,
    birth_lunar = excluded.birth_lunar, birth_leap = excluded.birth_leap,
    death_year = excluded.death_year, death_month = excluded.death_month, death_day = excluded.death_day,
    death_lunar = excluded.death_lunar, death_leap = excluded.death_leap,
    birth_place = excluded.birth_place, burial_place = excluded.burial_place,
    biography = excluded.biography, note = excluded.note, sibling_order = excluded.sibling_order,
    removed_at = excluded.removed_at, removal_id = excluded.removal_id;

  insert into public.parent_child (parent_id, child_id, role, kind, removed_at, removal_id)
  select parent_id, child_id, role, kind, removed_at, removal_id
  from jsonb_to_recordset(coalesce(p_parents, '[]'::jsonb)) as x(
    parent_id uuid, child_id uuid, role text, kind text, removed_at timestamptz, removal_id uuid)
  on conflict (parent_id, child_id) do update set
    role = excluded.role, kind = excluded.kind, removed_at = excluded.removed_at, removal_id = excluded.removal_id;

  insert into public.marriages (id, husband_id, wife_id, wife_order, removed_at, removal_id)
  select id, husband_id, wife_id, coalesce(wife_order, 1), removed_at, removal_id
  from jsonb_to_recordset(coalesce(p_marriages, '[]'::jsonb)) as x(
    id uuid, husband_id uuid, wife_id uuid, wife_order int, removed_at timestamptz, removal_id uuid)
  on conflict (id) do update set
    wife_order = excluded.wife_order, removed_at = excluded.removed_at, removal_id = excluded.removal_id;
end
$$;

grant execute on function public.apply_tree_changes(jsonb, jsonb, jsonb, jsonb) to authenticated;
