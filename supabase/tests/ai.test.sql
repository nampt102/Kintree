-- Tư liệu ảnh, đề xuất, nguồn từng trường, kho ảnh (change ai-image-proposals). Chạy: pnpm db:test; mọi thay đổi bị rollback.
begin;
create extension if not exists pgtap with schema extensions;
select plan(48);

create function pg_temp.act(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

-- pa quản trị nền tảng; ca quản trị dòng họ C; v người xem; st người lạ.
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a0', 'pa@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a1', 'ca@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a3', 'v@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a5', 'st@example.com', 'authenticated', 'authenticated');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000a0');
insert into public.clans (id, name, slug) values ('00000000-0000-0000-0000-0000000000c1', 'Họ C', 'ho-c');
insert into public.trees (id, clan_id, name) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'T1');
insert into public.memberships (user_id, clan_id, role) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'admin'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', 'viewer');
insert into public.persons (id, tree_id, full_name, gender, is_root, birth_year) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'Ông', 'male', true, 1890),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'Cha', 'male', false, 1920);
insert into public.parent_child (parent_id, child_id, role, kind) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'father', 'biological');

-- Tư liệu: chỉ quản trị đưa vào
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a3'); end $$;
select throws_ok(
  $$insert into public.sources (id, clan_id, tree_id, kind, image_kind, created_by) values ('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'image', 'grave', '00000000-0000-0000-0000-0000000000a3')$$,
  '42501', null, 'Người xem đưa tư liệu vào: bị từ chối');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a5'); end $$;
select throws_ok(
  $$insert into public.sources (id, clan_id, tree_id, kind, image_kind, created_by) values ('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'image', 'grave', '00000000-0000-0000-0000-0000000000a5')$$,
  '42501', null, 'Người lạ đưa tư liệu vào: bị từ chối');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a1'); end $$;
select throws_ok(
  $$insert into public.sources (id, clan_id, tree_id, kind, image_kind, created_by) values ('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'image', 'grave', '00000000-0000-0000-0000-0000000000a5')$$,
  '42501', null, 'Ghi người tạo là người khác: bị từ chối');
select lives_ok(
  $$insert into public.sources (id, clan_id, tree_id, kind, image_kind, title, created_by) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'image', 'grave', 'Bia cụ Cả', '00000000-0000-0000-0000-0000000000a1')$$,
  'Quản trị đưa tư liệu vào');
select is((select status from public.sources where id = '00000000-0000-0000-0000-0000000000d1'), 'queued', 'Tư liệu mới ở trạng thái chờ đọc');
select throws_ok($$update public.sources set status = 'done' where id = '00000000-0000-0000-0000-0000000000d1'$$, '42501', null, 'Quản trị không tự đổi trạng thái tư liệu (chỉ máy chủ)');

-- Ai thấy tư liệu
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a3'); end $$;
select is((select count(*) from public.sources), 1::bigint, 'Người xem thấy tư liệu của cuốn');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a5'); end $$;
select is((select count(*) from public.sources), 0::bigint, 'Người lạ không thấy tư liệu');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a0'); end $$;
select is((select count(*) from public.sources), 0::bigint, 'Quản trị nền tảng không thấy tư liệu');

-- Máy chủ ghi đề xuất; client không gọi được
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a1'); end $$;
select throws_ok($$select public.ingest_proposals('00000000-0000-0000-0000-0000000000d1', '[]', 'mock', 'm')$$, '42501', null, 'Quản trị không gọi được ingest_proposals');
select lives_ok($$insert into public.proposals (tree_id, op, payload) values ('00000000-0000-0000-0000-0000000000b1', 'update_field', '{}')$$, 'Quản trị chèn đề xuất chờ (dùng khi gộp)');
select throws_ok($$insert into public.proposals (tree_id, op, payload, status) values ('00000000-0000-0000-0000-0000000000b1', 'update_field', '{}', 'accepted')$$, '42501', null, 'Không chèn đề xuất đã nhận sẵn');

reset role;
select is(public.ingest_proposals('00000000-0000-0000-0000-0000000000d1', $j$[
  {"op":"add_person","ref":"p1","payload":{"ref":"p1","fullName":"Con Thử","gender":"male"},"anchor":{"x":0.1,"y":0.1,"w":0.3,"h":0.1},"quote":"Con Thử"},
  {"op":"add_relation","payload":{"type":"parent","from":{"personId":"00000000-0000-0000-0000-000000000001"},"to":{"ref":"p1"},"role":"father"},"anchor":{"x":0.1,"y":0.3,"w":0.3,"h":0.1},"quote":"con của Ông"},
  {"op":"update_field","payload":{"personId":"00000000-0000-0000-0000-000000000001","field":"birthPlace","value":"Làng Cổ"},"anchor":{"x":0.5,"y":0.1,"w":0.3,"h":0.1},"quote":"quê Làng Cổ"},
  {"op":"update_field","payload":{"personId":"00000000-0000-0000-0000-000000000002","field":"birth","value":{"year":1921,"lunar":false}},"anchor":{"x":0.5,"y":0.3,"w":0.3,"h":0.1},"quote":"sinh 1921"}
]$j$, 'mock', 'mock-1'), 4, 'ingest_proposals: bốn đề xuất');
select is((select status || ':' || proposal_count from public.sources where id = '00000000-0000-0000-0000-0000000000d1'), 'done:4', 'Tư liệu đã đọc, ghi số đề xuất');

-- Ai thấy hàng chờ
do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a3'); end $$;
select is((select count(*) from public.proposals), 0::bigint, 'Người xem không thấy hàng chờ');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a1'); end $$;
select is((select count(*) from public.proposals where status = 'pending' and source_id is not null), 4::bigint, 'Quản trị thấy 4 đề xuất chờ');
do $$ begin
  perform set_config('kt.p_add', (select id::text from public.proposals where op = 'add_person'), false);
  perform set_config('kt.p_rel', (select id::text from public.proposals where op = 'add_relation'), false);
  perform set_config('kt.p_place', (select id::text from public.proposals where payload ->> 'field' = 'birthPlace'), false);
  perform set_config('kt.p_birth', (select id::text from public.proposals where payload ->> 'field' = 'birth'), false);
end $$;

-- Nhận đề xuất thêm người: nguyên tử và nguồn
select throws_ok(
  format($f$select public.review_proposal(%L, 'accept', false, null, '00000000-0000-0000-0000-000000000011',
    '{"parents":[{"parent_id":"00000000-0000-0000-0000-000000000002","child_id":"00000000-0000-0000-0000-000000000001","role":"father","kind":"biological"}]}',
    '[]', '[]')$f$, current_setting('kt.p_add')),
  '23514', 'CYCLE', 'Nhận đề xuất làm vòng tổ tiên: bị từ chối');
select is((select status from public.proposals where id = current_setting('kt.p_add')::uuid), 'pending', 'Lỗi thì đề xuất vẫn chờ');
select is((select count(*) from public.persons where id = '00000000-0000-0000-0000-000000000011'), 0::bigint, 'Lỗi thì không người nào được ghi');
select lives_ok(
  format($f$select public.review_proposal(%L, 'accept', false, null, '00000000-0000-0000-0000-000000000012',
    '{"tree":null,"persons":[{"id":"00000000-0000-0000-0000-000000000012","tree_id":"00000000-0000-0000-0000-0000000000b1","full_name":"Con Thử","gender":"male"}]}',
    '[{"person_id":"00000000-0000-0000-0000-000000000012","field":"fullName","value":"Con Thử","anchor":{"x":0.1,"y":0.1,"w":0.3,"h":0.1}}]', '[]')$f$, current_setting('kt.p_add')),
  'Nhận đề xuất thêm người');
select is((select count(*) from public.persons where id = '00000000-0000-0000-0000-000000000012'), 1::bigint, 'Người mới có trong cây');
select is((select status || ':' || result_person_id from public.proposals where id = current_setting('kt.p_add')::uuid), 'accepted:00000000-0000-0000-0000-000000000012', 'Đề xuất đã nhận, trỏ tới người kết quả');
select is((select payload -> 'to' ->> 'personId' from public.proposals where id = current_setting('kt.p_rel')::uuid), '00000000-0000-0000-0000-000000000012', 'Quan hệ chờ trỏ đúng người vừa nhận');
select throws_ok(
  format($f$select public.review_proposal(%L, 'reject', false, null, null, null, '[]', '[]')$f$, current_setting('kt.p_add')),
  '23514', 'NOT_PENDING', 'Đề xuất đã nhận không duyệt lại được');

-- Nhận quan hệ, sửa rồi nhận
select lives_ok(
  format($f$select public.review_proposal(%L, 'accept', false, null, null,
    '{"parents":[{"parent_id":"00000000-0000-0000-0000-000000000001","child_id":"00000000-0000-0000-0000-000000000012","role":"father","kind":"biological"}]}', '[]', '[]')$f$, current_setting('kt.p_rel')),
  'Nhận quan hệ');
select lives_ok(
  format($f$select public.review_proposal(%L, 'accept', true, 'chỉnh năm', null,
    '{"persons":[{"id":"00000000-0000-0000-0000-000000000002","tree_id":"00000000-0000-0000-0000-0000000000b1","full_name":"Cha","gender":"male","birth_year":1922}]}',
    '[{"person_id":"00000000-0000-0000-0000-000000000002","field":"birth","value":{"year":1922},"anchor":{"x":0.5,"y":0.3,"w":0.3,"h":0.1}}]', '[]')$f$, current_setting('kt.p_birth')),
  'Sửa rồi nhận');
select is((select edited from public.proposals where id = current_setting('kt.p_birth')::uuid), true, 'Đánh dấu nhận có sửa');
select is((select birth_year from public.persons where id = '00000000-0000-0000-0000-000000000002'), 1922, 'Cây ghi giá trị đã sửa');

-- Bỏ đề xuất sửa trường: vẫn lưu nguồn không chọn
select lives_ok(
  format($f$select public.review_proposal(%L, 'reject', false, 'bia mộ khắc rõ hơn', null, null,
    '[{"person_id":"00000000-0000-0000-0000-000000000001","field":"birthPlace","value":"Làng Cổ","anchor":{"x":0.5,"y":0.1,"w":0.3,"h":0.1},"accepted":false,"note":"bia mộ khắc rõ hơn"}]', '[]')$f$, current_setting('kt.p_place')),
  'Bỏ đề xuất sửa trường');
select is((select birth_year from public.persons where id = '00000000-0000-0000-0000-000000000001'), 1890, 'Bỏ thì cây không đổi');

-- Người xem đọc được nguồn từng trường, kể cả nguồn không chọn
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a3'); end $$;
select is((select count(*) from public.field_sources), 3::bigint, 'Người xem thấy nguồn từng trường');
select is((select note from public.field_sources where accepted = false), 'bia mộ khắc rõ hơn', 'Người xem thấy ghi chú của nguồn không chọn');
select throws_ok(
  format($f$select public.review_proposal(%L, 'reject', false, null, null, null, '[]', '[]')$f$, current_setting('kt.p_place')),
  '42501', null, 'Người xem duyệt đề xuất: bị từ chối');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a5'); end $$;
select is((select count(*) from public.field_sources), 0::bigint, 'Người lạ không thấy nguồn');

-- Bỏ người thì quan hệ phụ thuộc bỏ theo; đọc lại thay đề xuất chờ cũ
reset role;
select is(public.ingest_proposals('00000000-0000-0000-0000-0000000000d1', $j$[
  {"op":"add_person","ref":"q1","payload":{"ref":"q1","fullName":"Người Khác","gender":"female"},"anchor":{"x":0,"y":0,"w":0.2,"h":0.1}},
  {"op":"add_relation","payload":{"type":"parent","from":{"personId":"00000000-0000-0000-0000-000000000001"},"to":{"ref":"q1"},"role":"father"},"anchor":{"x":0,"y":0.2,"w":0.2,"h":0.1}}
]$j$, 'mock', 'mock-1'), 2, 'Đọc lại: hai đề xuất mới');
select is((select count(*) from public.proposals where status = 'superseded'), 0::bigint, 'Đề xuất đã duyệt không bị thay');
do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a1'); end $$;
do $$ begin perform set_config('kt.q_add', (select id::text from public.proposals where ref = 'q1' and status = 'pending'), false); end $$;
select lives_ok(format($f$select public.review_proposal(%L, 'reject', false, null, null, null, '[]', '[]')$f$, current_setting('kt.q_add')), 'Bỏ người trong đề xuất');
select is((select review_note from public.proposals where op = 'add_relation' and status = 'rejected' and payload -> 'to' ->> 'ref' = 'q1'), 'Người liên quan đã bị bỏ', 'Quan hệ phụ thuộc bỏ theo');
reset role;
select is(public.ingest_proposals('00000000-0000-0000-0000-0000000000d1', '[{"op":"add_person","ref":"z","payload":{"ref":"z","fullName":"Z","gender":"male"},"anchor":{"x":0,"y":0,"w":0.1,"h":0.1}}]', 'mock', 'm'), 1, 'Đọc lại lần nữa');

-- Nhận người kèm quan hệ gắn nó vào cây trong một lần (p_changes.also)
select is(public.ingest_proposals('00000000-0000-0000-0000-0000000000d1', $j$[
  {"op":"add_person","ref":"w1","payload":{"ref":"w1","fullName":"Cháu Kèm","gender":"male"},"anchor":{"x":0,"y":0,"w":0.1,"h":0.1}},
  {"op":"add_relation","payload":{"type":"parent","from":{"personId":"00000000-0000-0000-0000-000000000002"},"to":{"ref":"w1"},"role":"father"},"anchor":{"x":0,"y":0.2,"w":0.1,"h":0.1}}
]$j$, 'mock', 'm'), 2, 'Đọc lại: người kèm quan hệ');
do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a1'); end $$;
do $$ begin
  perform set_config('kt.w_add', (select id::text from public.proposals where ref = 'w1' and status = 'pending'), false);
  perform set_config('kt.w_rel', (select id::text from public.proposals where op = 'add_relation' and status = 'pending' and payload -> 'to' ->> 'ref' = 'w1'), false);
end $$;
select lives_ok(
  format($f$select public.review_proposal(%L, 'accept', false, null, '00000000-0000-0000-0000-000000000013',
    '{"persons":[{"id":"00000000-0000-0000-0000-000000000013","tree_id":"00000000-0000-0000-0000-0000000000b1","full_name":"Cháu Kèm","gender":"male"}],
      "parents":[{"parent_id":"00000000-0000-0000-0000-000000000002","child_id":"00000000-0000-0000-0000-000000000013","role":"father","kind":"biological"}],
      "also":["%s"]}', '[]', '[]')$f$, current_setting('kt.w_add'), current_setting('kt.w_rel')),
  'Nhận người kèm quan hệ trong một lần');
select is((select status from public.proposals where id = current_setting('kt.w_rel')::uuid), 'accepted', 'Quan hệ đi kèm được nhận chung');
reset role;

-- Kho ảnh
do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a3'); end $$;
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('sources', '00000000-0000-0000-0000-0000000000c1/00000000-0000-0000-0000-0000000000b1/00000000-0000-0000-0000-0000000000d1.jpg')$$,
  '42501', null, 'Người xem tải ảnh lên: bị từ chối');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a1'); end $$;
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('sources', '00000000-0000-0000-0000-0000000000ee/00000000-0000-0000-0000-0000000000b1/00000000-0000-0000-0000-0000000000d1.jpg')$$,
  '42501', null, 'Quản trị tải ảnh vào thư mục dòng họ khác: bị từ chối');
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('sources', '00000000-0000-0000-0000-0000000000c1/00000000-0000-0000-0000-0000000000b1/00000000-0000-0000-0000-0000000000d1.jpg')$$,
  'Quản trị tải ảnh đúng chỗ');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a3'); end $$;
select is((select count(*) from storage.objects where bucket_id = 'sources'), 1::bigint, 'Người xem xem được ảnh');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a5'); end $$;
select is((select count(*) from storage.objects where bucket_id = 'sources'), 0::bigint, 'Người lạ không thấy ảnh');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a0'); end $$;
select is((select count(*) from storage.objects where bucket_id = 'sources'), 0::bigint, 'Quản trị nền tảng không thấy ảnh');

select * from finish();
rollback;
