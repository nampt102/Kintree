-- Kintree: tư liệu ảnh, đề xuất do AI sinh, nguồn từng trường, kho ảnh riêng tư (change ai-image-proposals, design D1–D2).
-- AI không ghi thẳng vào cây (ADR 0003): Edge Function chỉ chèn đề xuất (bằng service_role); quản trị cuốn duyệt qua review_proposal.

-- Tư liệu: thuộc một cuốn, có trạng thái xử lý.
alter table public.sources
  add column tree_id uuid references public.trees on delete cascade,
  add column image_kind text check (image_kind in ('grave', 'page', 'altar', 'other')),
  add column status text not null default 'queued' check (status in ('queued', 'processing', 'done', 'failed')),
  add column status_at timestamptz not null default now(),
  add column error text,
  add column proposal_count int not null default 0;
create index on public.sources (tree_id, created_at desc);

-- Đề xuất: thêm trạng thái bị thay khi đọc lại, đánh dấu nhận có sửa, mã tạm trong lô, câu AI đọc được, người kết quả.
alter table public.proposals drop constraint proposals_status_check;
alter table public.proposals add constraint proposals_status_check check (status in ('pending', 'accepted', 'rejected', 'superseded'));
alter table public.proposals
  add column edited boolean not null default false,
  add column ref text,
  add column quote text,
  add column result_person_id uuid references public.persons on delete set null;

-- Nguồn của từng trường: ghi cả khi bỏ một đề xuất sửa trường (accepted = false) để còn thấy nguồn mâu thuẫn.
alter table public.field_sources drop constraint field_sources_pkey;
alter table public.field_sources
  add column id uuid primary key default gen_random_uuid(),
  add column value jsonb,
  add column anchor jsonb,
  add column accepted boolean not null default true,
  add column note text,
  add column reviewed_by uuid references auth.users on delete set null,
  add column reviewed_at timestamptz not null default now();
create unique index field_sources_one_per_proposal on public.field_sources (person_id, field, proposal_id) where proposal_id is not null;
create index on public.field_sources (person_id);

-- Chính sách.
create policy sources_select on public.sources for select to authenticated
  using (tree_id is not null and public.tree_role(tree_id) is not null);
create policy sources_insert on public.sources for insert to authenticated
  with check (
    tree_id is not null and public.tree_role(tree_id) = 'admin' and created_by = auth.uid()
    and clan_id = (select t.clan_id from public.trees t where t.id = tree_id)
  );
alter table public.sources enable row level security;

-- Người xem không thấy hàng chờ: chỉ quản trị của cuốn đọc và đổi trạng thái đề xuất.
create policy proposals_select on public.proposals for select to authenticated
  using (public.tree_role(tree_id) = 'admin');
create policy proposals_update on public.proposals for update to authenticated
  using (public.tree_role(tree_id) = 'admin') with check (public.tree_role(tree_id) = 'admin');
-- Quản trị chèn được đề xuất chờ (review_proposal sinh đề xuất sửa trường khi gộp); đề xuất của AI vẫn chỉ vào qua ingest_proposals.
create policy proposals_insert on public.proposals for insert to authenticated
  with check (public.tree_role(tree_id) = 'admin' and status = 'pending');
alter table public.proposals enable row level security;

-- Mọi người có vai trò ở cuốn của người đó xem được nguồn (value, anchor, note nằm ngay ở đây, không cần đọc proposals).
create policy field_sources_select on public.field_sources for select to authenticated
  using (exists (select 1 from public.persons p where p.id = person_id));
create policy field_sources_insert on public.field_sources for insert to authenticated
  with check (exists (select 1 from public.persons p where p.id = person_id and public.tree_role(p.tree_id) = 'admin'));
alter table public.field_sources enable row level security;

grant select, insert on public.sources to authenticated;
grant select, insert on public.proposals to authenticated;
grant update (status, edited, review_note, reviewed_by, reviewed_at, result_person_id, payload) on public.proposals to authenticated;
grant select, insert on public.field_sources to authenticated;

-- Kho ảnh riêng tư. Đường dẫn <clan_id>/<tree_id>/<source_id>.jpg; quyền theo cuốn ở thư mục thứ hai.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sources', 'sources', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

-- Cuốn trong đường dẫn ảnh; null khi sai dạng (chính sách từ chối thay vì báo lỗi ép kiểu).
create function public.source_path_tree(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select ((regexp_match(p_name, '^[0-9a-f-]{36}/([0-9a-f-]{36})/[0-9a-f-]{36}\.jpg$'))[1])::uuid
$$;
grant execute on function public.source_path_tree(text) to authenticated;

create policy sources_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'sources' and public.tree_role(public.source_path_tree(name)) is not null);
create policy sources_obj_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'sources' and public.tree_role(public.source_path_tree(name)) = 'admin'
    -- objects.name: trong truy vấn con, `name` trần sẽ thành tên cuốn (trees.name).
    and (storage.foldername(objects.name))[1] = (select t.clan_id::text from public.trees t where t.id = public.source_path_tree(objects.name))
  );

-- Máy chủ ghi đề xuất của một lần đọc trong một giao dịch: bỏ các đề xuất chờ cũ của tư liệu (thay thế), chèn mới, đánh dấu đã đọc.
create function public.ingest_proposals(p_source uuid, p_items jsonb, p_provider text, p_model text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tree uuid;
  v_count int;
begin
  select tree_id into v_tree from public.sources where id = p_source;
  if v_tree is null then
    raise exception 'SOURCE_NOT_FOUND' using errcode = '23503';
  end if;
  update public.proposals set status = 'superseded' where source_id = p_source and status = 'pending';
  -- clock_timestamp(): mỗi đề xuất một thời điểm riêng, hàng chờ giữ đúng thứ tự AI trả về.
  insert into public.proposals (tree_id, source_id, op, payload, anchor, ref, quote, provider, model, created_at)
  select v_tree, p_source, x.op, x.payload, x.anchor, x.ref, x.quote, p_provider, p_model, clock_timestamp()
  from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as x(op text, payload jsonb, anchor jsonb, ref text, quote text);
  get diagnostics v_count = row_count;
  update public.sources set status = 'done', status_at = now(), error = null, proposal_count = v_count where id = p_source;
  return v_count;
end
$$;
revoke all on function public.ingest_proposals(uuid, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.ingest_proposals(uuid, jsonb, text, text) to service_role;

-- Duyệt một đề xuất: security invoker nên RLS và trigger toàn vẹn của cây áp dụng nguyên (như apply_tree_changes).
-- p_changes = {tree, persons, parents, marriages, also} cho apply_tree_changes (null khi bỏ);
-- p_fields = [{person_id, field, value, anchor, accepted, note}] ghi vào field_sources;
-- p_children = [{op, payload, anchor, quote}] đề xuất sửa trường mới sinh khi gộp (các trường đã có mà khác giá trị).
create function public.review_proposal(
  p_proposal uuid, p_decision text, p_edited boolean, p_note text, p_result_person uuid,
  p_changes jsonb, p_fields jsonb, p_children jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v public.proposals;
begin
  if p_decision not in ('accept', 'reject') then
    raise exception 'DECISION_INVALID' using errcode = '23514';
  end if;
  select * into v from public.proposals where id = p_proposal for update;
  if not found then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v.status <> 'pending' then
    raise exception 'NOT_PENDING' using errcode = '23514';
  end if;

  if p_decision = 'accept' and p_changes is not null then
    -- nullif: app gửi "tree": null (JSON null), apply_tree_changes chỉ bỏ qua khi là NULL của SQL.
    perform public.apply_tree_changes(nullif(p_changes -> 'tree', 'null'::jsonb), p_changes -> 'persons', p_changes -> 'parents', p_changes -> 'marriages');
  end if;

  update public.proposals
  set status = p_decision || 'ed',  -- accept → accepted, reject → rejected (không dùng case: Supabase CLI tách câu lệnh sai)
      edited = coalesce(p_edited, false), review_note = nullif(trim(coalesce(p_note, '')), ''),
      reviewed_by = auth.uid(), reviewed_at = now(), result_person_id = p_result_person
  where id = p_proposal;

  insert into public.field_sources (person_id, field, source_id, proposal_id, value, anchor, accepted, note, reviewed_by)
  select (x.person_id)::uuid, x.field, v.source_id, p_proposal, x.value, x.anchor, coalesce(x.accepted, true), nullif(trim(coalesce(x.note, '')), ''), auth.uid()
  from jsonb_to_recordset(coalesce(p_fields, '[]'::jsonb)) as x(person_id text, field text, value jsonb, anchor jsonb, accepted boolean, note text);

  insert into public.proposals (tree_id, source_id, op, payload, anchor, quote, provider, model)
  select v.tree_id, v.source_id, x.op, x.payload, x.anchor, x.quote, v.provider, v.model
  from jsonb_to_recordset(coalesce(p_children, '[]'::jsonb)) as x(op text, payload jsonb, anchor jsonb, quote text);

  -- Nhận người kèm quan hệ gắn nó vào cây trong cùng một lần: p_changes.also = id các đề xuất quan hệ đã áp dụng chung.
  if p_decision = 'accept' and p_changes is not null and jsonb_typeof(p_changes -> 'also') = 'array' then
    update public.proposals
    set status = 'accepted', reviewed_by = auth.uid(), reviewed_at = now()
    where status = 'pending' and tree_id = v.tree_id
      and id in (select e::uuid from jsonb_array_elements_text(p_changes -> 'also') as e);
  end if;

  -- Quan hệ chờ trỏ tới người trong đề xuất này (theo mã tạm trong lô): nhận thì trỏ đúng người trong cây, bỏ thì bỏ theo.
  if v.op = 'add_person' and v.ref is not null then
    if p_decision = 'accept' and p_result_person is not null then
      update public.proposals
      set payload = jsonb_set(payload, '{from}', jsonb_build_object('personId', p_result_person))
      where source_id = v.source_id and status = 'pending' and op = 'add_relation' and payload -> 'from' ->> 'ref' = v.ref;
      update public.proposals
      set payload = jsonb_set(payload, '{to}', jsonb_build_object('personId', p_result_person))
      where source_id = v.source_id and status = 'pending' and op = 'add_relation' and payload -> 'to' ->> 'ref' = v.ref;
    else
      update public.proposals
      set status = 'rejected', review_note = 'Người liên quan đã bị bỏ', reviewed_by = auth.uid(), reviewed_at = now()
      where source_id = v.source_id and status = 'pending' and op = 'add_relation'
        and (payload -> 'from' ->> 'ref' = v.ref or payload -> 'to' ->> 'ref' = v.ref);
    end if;
  end if;
end
$$;
grant execute on function public.review_proposal(uuid, text, boolean, text, uuid, jsonb, jsonb, jsonb) to authenticated;
