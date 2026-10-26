-- Kintree: schema đầu tiên (change bootstrap-core, design D4–D5).
-- Ràng buộc ở đây khớp với packages/core/src/integrity.ts và dates.ts; sửa một bên thì sửa cả bên kia.

-- Ngày không đầy đủ: chỉ năm, năm–tháng hoặc đầy đủ; âm hoặc dương.
-- Ngày dương được kiểm có tồn tại; ngày âm chỉ kiểm khoảng (1–30) vì cần lịch âm (kiểm ở core).
create function public.is_partial_date_ok(y int, m int, d int, lunar boolean, leap boolean)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when y is null then m is null and d is null and not leap
    else y between 1800 and 2199
      and (m is null or m between 1 and 12)
      and (d is null or (m is not null and d between 1 and 31))
      and (not leap or (lunar and m is not null))
      and (
        d is null
        or (lunar and d <= 30)
        -- least/greatest giữ make_date không lỗi khi tháng sai; tháng sai đã bị loại ở trên.
        or (not lunar and d <= extract(day from make_date(y, least(greatest(m, 1), 12), 1) + interval '1 month - 1 day'))
      )
  end
$$;

create table public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table public.trees (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  region text not null default 'north' check (region in ('north', 'central', 'south')),
  created_at timestamptz not null default now()
);

create table public.persons (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees on delete cascade,
  full_name text not null check (length(trim(full_name)) > 0),
  gender text not null default 'unknown' check (gender in ('male', 'female', 'unknown')),
  is_outsider boolean not null default false,
  birth_year int,
  birth_month smallint,
  birth_day smallint,
  birth_lunar boolean not null default false,
  birth_leap boolean not null default false,
  death_year int,
  death_month smallint,
  death_day smallint,
  death_lunar boolean not null default false,
  death_leap boolean not null default false,
  birth_place text,
  burial_place text,
  biography text,
  note text,
  sibling_order int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint birth_date_ok check (public.is_partial_date_ok(birth_year, birth_month, birth_day, birth_lunar, birth_leap)),
  constraint death_date_ok check (public.is_partial_date_ok(death_year, death_month, death_day, death_lunar, death_leap))
);
create index on public.persons (tree_id);

-- Mỗi người tối đa một cha và một mẹ cho mỗi loại (ruột / nuôi / riêng).
create table public.parent_child (
  parent_id uuid not null references public.persons on delete cascade,
  child_id uuid not null references public.persons on delete cascade,
  role text not null check (role in ('father', 'mother')),
  kind text not null check (kind in ('biological', 'adopted', 'step')),
  primary key (parent_id, child_id),
  unique (child_id, role, kind)
);
create index on public.parent_child (child_id);

create table public.marriages (
  id uuid primary key default gen_random_uuid(),
  husband_id uuid not null references public.persons on delete cascade,
  wife_id uuid not null references public.persons on delete cascade,
  wife_order int not null default 1,
  unique (husband_id, wife_id),
  check (husband_id <> wife_id)
);
create index on public.marriages (wife_id);

-- Vai trò ở cấp dòng họ hoặc cấp một cuốn gia phả (đúng một trong hai).
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  clan_id uuid references public.clans on delete cascade,
  tree_id uuid references public.trees on delete cascade,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  check (num_nonnulls(clan_id, tree_id) = 1),
  unique nulls not distinct (user_id, clan_id, tree_id)
);

-- Tư liệu: ghi âm, ảnh phả cũ / bia mộ, lời kể, văn bản.
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans on delete cascade,
  kind text not null check (kind in ('audio', 'image', 'oral', 'document')),
  title text,
  storage_path text,
  provided_by text,
  consent_at timestamptz,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

-- Đề xuất do AI sinh ra; chỉ được ghi vào cây sau khi người có quyền duyệt (ADR 0003).
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees on delete cascade,
  source_id uuid references public.sources on delete set null,
  op text not null check (op in ('add_person', 'update_field', 'add_relation')),
  payload jsonb not null,
  anchor jsonb,
  provider text,
  model text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  reviewed_by uuid references auth.users on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);
create index on public.proposals (tree_id, status);

-- Nguồn của từng trường đã nhận vào hồ sơ một người.
create table public.field_sources (
  person_id uuid not null references public.persons on delete cascade,
  field text not null,
  source_id uuid not null references public.sources on delete cascade,
  proposal_id uuid references public.proposals on delete set null,
  primary key (person_id, field, source_id)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old jsonb,
  new jsonb,
  actor uuid default auth.uid(),
  at timestamptz not null default now()
);
create index on public.audit_log (table_name, row_id);

-- Kiểm quan hệ cha/mẹ–con: cùng cuốn, không cả hai ngoại tộc, vai trò khớp giới tính, không tạo vòng.
create function public.check_parent_child()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  p public.persons;
  c public.persons;
  expected text := 'female';
begin
  -- Không dùng biểu thức case trong thân hàm: Supabase CLI tách câu lệnh sai khi gặp case … end.
  if new.role = 'father' then
    expected := 'male';
  end if;
  select * into p from public.persons where id = new.parent_id;
  select * into c from public.persons where id = new.child_id;
  if p.tree_id <> c.tree_id then
    raise exception 'DIFFERENT_TREE' using errcode = '23514';
  end if;
  if p.is_outsider and c.is_outsider then
    raise exception 'BOTH_OUTSIDERS' using errcode = '23514';
  end if;
  if p.gender <> 'unknown' and p.gender <> expected then
    raise exception 'ROLE_GENDER_MISMATCH' using errcode = '23514';
  end if;
  if new.parent_id = new.child_id or exists (
    with recursive ancestors(id) as (
      select pc.parent_id from public.parent_child pc where pc.child_id = new.parent_id
      union
      select pc.parent_id from public.parent_child pc join ancestors a on pc.child_id = a.id
    )
    select 1 from ancestors where id = new.child_id
  ) then
    raise exception 'CYCLE' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger parent_child_integrity
before insert or update on public.parent_child
for each row execute function public.check_parent_child();

create function public.check_marriage()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  h public.persons;
  w public.persons;
begin
  select * into h from public.persons where id = new.husband_id;
  select * into w from public.persons where id = new.wife_id;
  if h.tree_id <> w.tree_id then
    raise exception 'DIFFERENT_TREE' using errcode = '23514';
  end if;
  if h.is_outsider and w.is_outsider then
    raise exception 'BOTH_OUTSIDERS' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger marriage_integrity
before insert or update on public.marriages
for each row execute function public.check_marriage();

-- Nhật ký thay đổi: ai, lúc nào, giá trị cũ và mới.
create function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  o jsonb;
  n jsonb;
  r jsonb;
begin
  if tg_op <> 'INSERT' then
    o := to_jsonb(old);
  end if;
  if tg_op <> 'DELETE' then
    n := to_jsonb(new);
  end if;
  r := coalesce(n, o);
  insert into public.audit_log (table_name, row_id, action, old, new)
  values (tg_table_name, coalesce(r ->> 'id', (r ->> 'parent_id') || ':' || (r ->> 'child_id')), tg_op, o, n);
  return null;
end
$$;

create trigger persons_audit after insert or update or delete on public.persons
for each row execute function public.audit_row();
create trigger parent_child_audit after insert or update or delete on public.parent_child
for each row execute function public.audit_row();
create trigger marriages_audit after insert or update or delete on public.marriages
for each row execute function public.audit_row();

-- RLS bật trên mọi bảng, chưa có policy: client bị từ chối cho tới change auth-invite-roles.
alter table public.clans enable row level security;
alter table public.trees enable row level security;
alter table public.persons enable row level security;
alter table public.parent_child enable row level security;
alter table public.marriages enable row level security;
alter table public.memberships enable row level security;
alter table public.sources enable row level security;
alter table public.proposals enable row level security;
alter table public.field_sources enable row level security;
alter table public.audit_log enable row level security;
