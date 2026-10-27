-- Quyền theo dòng họ/cuốn, quản trị nền tảng, ghi nguyên tử (change cloud-auth-storage).
-- Chạy: pnpm db:test. Mọi thay đổi bị rollback cuối file.
-- Mỗi khối `reset role; do act(...)` đổi sang người dùng; DO để không in dòng nào vào luồng TAP.
begin;
create extension if not exists pgtap with schema extensions;
select plan(45);

create function pg_temp.act(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

-- Đếm số dòng một câu UPDATE tác động (RLS chặn thì 0 dòng, không báo lỗi); security invoker nên RLS áp dụng.
create function public.zz_rowcount(q text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.zz_rowcount(text) to authenticated;

-- Người dùng: pa quản trị nền tảng; ca quản trị dòng họ C; ta quản trị riêng cuốn T1; v người xem dòng họ C;
-- tv người xem riêng cuốn T1; st người lạ; da quản trị dòng họ D.
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a0', 'pa@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a1', 'ca@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'ta@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a3', 'v@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a4', 'tv@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a5', 'st@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a6', 'da@example.com', 'authenticated', 'authenticated');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000a0');

insert into public.clans (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000c1', 'Họ C', 'ho-c'),
  ('00000000-0000-0000-0000-0000000000c2', 'Họ D', 'ho-d');
insert into public.trees (id, clan_id, name) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'T1'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', 'T2'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c2', 'T3');
insert into public.memberships (user_id, clan_id, tree_id, role) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', null, 'admin'),
  ('00000000-0000-0000-0000-0000000000a2', null, '00000000-0000-0000-0000-0000000000b1', 'admin'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', null, 'viewer'),
  ('00000000-0000-0000-0000-0000000000a4', null, '00000000-0000-0000-0000-0000000000b1', 'viewer'),
  ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000c2', null, 'admin');
insert into public.persons (id, tree_id, full_name, gender) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'Ông', 'male'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'Cha', 'male'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b3', 'Khách', 'male');

insert into public.parent_child (parent_id, child_id, role, kind) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'father', 'biological');

-- Vai trò
select throws_ok(
  $$insert into public.memberships (user_id, clan_id, role) values ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000c1', 'editor')$$,
  '23514', null, 'Gán vai trò biên tập: bị từ chối');

-- Người xem sửa
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a3'); end $$;
select throws_ok(
  $$insert into public.persons (tree_id, full_name) values ('00000000-0000-0000-0000-0000000000b1', 'Mới')$$,
  '42501', null, 'Người xem sửa: không thêm được người');
select is(
  public.zz_rowcount($q$update public.persons set full_name = 'Đổi' where id = '00000000-0000-0000-0000-000000000001'$q$),
  0::bigint, 'Người xem sửa: không đổi được người');
select throws_ok(
  $$select public.create_tree('00000000-0000-0000-0000-0000000000c1', 'Cuốn mới', 'north')$$,
  '42501', null, 'Người xem: không tạo được cuốn');
select is(
  public.zz_rowcount($q$update public.trees set removed_at = now() where id = '00000000-0000-0000-0000-0000000000b2'$q$),
  0::bigint, 'Người xem muốn xoá: không đánh dấu xoá được');
select is((select count(*) from public.clans), 1::bigint, 'Thấy đúng dòng họ của mình: chỉ dòng họ C');
select is((select count(*) from public.memberships), 1::bigint, 'Thành viên: người xem chỉ thấy vai trò của chính mình');
select throws_ok(
  $$insert into public.memberships (user_id, clan_id, role) values ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c2', 'admin')$$,
  '42501', null, 'Tự nâng quyền: không tự thêm vai trò quản trị');
select is(
  public.zz_rowcount($q$update public.memberships set role = 'admin' where user_id = '00000000-0000-0000-0000-0000000000a3'$q$),
  0::bigint, 'Tự nâng quyền: không sửa vai trò của mình');
select throws_ok($$select public.platform_create_clan('X', 'x@example.com')$$, '42501', 'NOT_PLATFORM_ADMIN',
  'Người dùng thường gọi lệnh tạo dòng họ: bị từ chối');
select throws_ok($$select * from public.platform_list_clans()$$, '42501', 'NOT_PLATFORM_ADMIN',
  'Người dùng thường xem danh sách vận hành: bị từ chối');
select throws_ok($$insert into public.clans (name, slug) values ('Tự tạo', 'tu-tao')$$, '42501', null,
  'Tự tạo dòng họ: bị từ chối');
select throws_ok($$insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000a3')$$, '42501', null,
  'Tự cấp quyền quản trị nền tảng: bị từ chối');

-- Quản trị của đúng cuốn (ta): ghi được ở T1, không ở T2, không tạo cuốn
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a2'); end $$;
select lives_ok(
  $$insert into public.persons (tree_id, full_name) values ('00000000-0000-0000-0000-0000000000b1', 'Thêm bởi quản trị cuốn')$$,
  'Quản trị của đúng cuốn: thêm được người');
select throws_ok(
  $$insert into public.persons (tree_id, full_name) values ('00000000-0000-0000-0000-0000000000b2', 'Sai cuốn')$$,
  '42501', null, 'Quản trị của đúng cuốn: không thêm được ở cuốn khác');
select throws_ok(
  $$select public.create_tree('00000000-0000-0000-0000-0000000000c1', 'Cuốn mới', 'north')$$,
  '42501', null, 'Quản trị của một cuốn tạo cuốn mới: bị từ chối');
select throws_ok(
  $$insert into public.trees (clan_id, name) values ('00000000-0000-0000-0000-0000000000c1', 'Chèn trực tiếp')$$,
  '42501', null, 'Chèn thẳng vào bảng cuốn: bị từ chối (chỉ qua create_tree)');
select is(
  public.zz_rowcount($q$update public.trees set name = 'T1 đổi tên' where id = '00000000-0000-0000-0000-0000000000b1'$q$),
  1::bigint, 'Sửa tên cuốn: quản trị cuốn đổi được');
select is((select count(*) from public.trees), 1::bigint, 'Người chỉ có quyền một cuốn: chỉ thấy cuốn của mình');

-- Quản trị dòng họ (ca)
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a1'); end $$;
select lives_ok(
  $$insert into public.persons (tree_id, full_name) values ('00000000-0000-0000-0000-0000000000b2', 'Thêm bởi quản trị dòng họ')$$,
  'Quản trị ở tầng dòng họ: thêm được người ở mọi cuốn');
select is(
  (select name from public.create_tree('00000000-0000-0000-0000-0000000000c1', 'Cuốn mới', 'south', 'Mô tả')),
  'Cuốn mới', 'Quản trị dòng họ tạo được cuốn');
select is((select count(*) from public.memberships), 4::bigint, 'Quản trị dòng họ thấy mọi thành viên của dòng họ');
select throws_ok($$delete from public.persons where id = '00000000-0000-0000-0000-000000000001'$$, '42501', null,
  'Không xoá hẳn người: bị từ chối (gỡ = đánh dấu)');
select lives_ok(
  $$update public.trees set removed_at = now() where id = '00000000-0000-0000-0000-0000000000b2'$$,
  'Xoá cuốn: quản trị đánh dấu được');
select is((select count(*) from public.trees where id = '00000000-0000-0000-0000-0000000000b2'), 0::bigint,
  'Xoá cuốn: biến khỏi danh sách');
select is((select count(*) from public.persons where tree_id = '00000000-0000-0000-0000-0000000000b2'), 0::bigint,
  'Xoá cuốn: người trong cuốn không còn đọc được');
select is((select count(*) from public.persons where tree_id = '00000000-0000-0000-0000-0000000000b3'), 0::bigint,
  'Đoán mã của dòng họ khác: không nhận được dòng nào');

-- Người xem riêng cuốn, người lạ, chưa đăng nhập
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a5'); end $$;
select is((select count(*) from public.clans) + (select count(*) from public.trees) + (select count(*) from public.persons),
  0::bigint, 'Người chưa được cấp quyền không thấy gì');
reset role; set local role anon;
select throws_ok($$select * from public.clans$$, '42501', null, 'Người chưa đăng nhập: bị từ chối');

-- Quản trị nền tảng
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a0'); end $$;
select is((select count(*) from public.persons), 0::bigint, 'Truy vấn cuốn của khách: quản trị nền tảng không đọc được người');
select lives_ok($$select public.platform_create_clan('Họ Nguyễn', 'CA@example.com')$$, 'Email đã có tài khoản: tạo được');
select lives_ok($$select public.platform_create_clan('Họ Nguyễn', 'new@example.com')$$, 'Trùng tên: tạo lần hai được');
select is((select count(distinct slug) from public.platform_list_clans() where name = 'Họ Nguyễn'), 2::bigint,
  'Trùng tên: mỗi dòng họ có địa chỉ ngắn riêng');
select throws_ok($$select public.platform_create_clan('  ', 'a@example.com')$$, '23514', 'NAME_REQUIRED', 'Thiếu tên: bị từ chối');
select throws_ok($$select public.platform_create_clan('Họ Lê', 'khong-phai-email')$$, '23514', 'EMAIL_INVALID', 'Email sai: bị từ chối');
select ok((select 'new@example.com' = any(admin_emails) from public.platform_list_clans() where name = 'Họ Nguyễn' and 'new@example.com' = any(admin_emails)),
  'Danh sách vận hành: có email quản trị chờ đăng ký');

-- Email đã có tài khoản thấy dòng họ; email mới nhận quyền khi đăng ký lần đầu
reset role;
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a7', 'New@Example.com', 'authenticated', 'authenticated');
do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a7'); end $$;
select is((select count(*) from public.clans), 1::bigint, 'Email chưa có tài khoản: đăng nhập lần đầu thấy dòng họ');
select is((select public.clan_role(id) from public.clans), 'admin', 'Email chưa có tài khoản: vai trò quản trị');

-- apply_tree_changes
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a1'); end $$;
select lives_ok($$select public.apply_tree_changes(null,
  '[{"id":"00000000-0000-0000-0000-000000000010","tree_id":"00000000-0000-0000-0000-0000000000b1","full_name":"Con","gender":"male"}]',
  '[{"parent_id":"00000000-0000-0000-0000-000000000002","child_id":"00000000-0000-0000-0000-000000000010","role":"father","kind":"biological"}]',
  null)$$, 'Thêm con kèm quan hệ: một lời gọi');
select is((select count(*) from public.parent_child where child_id = '00000000-0000-0000-0000-000000000010'), 1::bigint,
  'Thêm con kèm quan hệ: đủ người và quan hệ');
select throws_ok($$select public.apply_tree_changes(null,
  '[{"id":"00000000-0000-0000-0000-000000000011","tree_id":"00000000-0000-0000-0000-0000000000b1","full_name":"Hỏng","gender":"male"}]',
  '[{"parent_id":"00000000-0000-0000-0000-000000000010","child_id":"00000000-0000-0000-0000-000000000001","role":"father","kind":"biological"}]',
  null)$$, '23514', 'CYCLE', 'Một dòng vi phạm trigger: cả lời gọi bị từ chối');
select is((select count(*) from public.persons where id = '00000000-0000-0000-0000-000000000011'), 0::bigint,
  'Một dòng vi phạm trigger: không dòng nào được ghi');
select lives_ok($$select public.apply_tree_changes(null,
  '[{"id":"00000000-0000-0000-0000-000000000001","tree_id":"00000000-0000-0000-0000-0000000000b1","full_name":"Ông đổi","gender":"male"}]', null, null)$$,
  'Sửa một người: chỉ gửi dòng của người ấy');
select is((select full_name from public.persons where id = '00000000-0000-0000-0000-000000000002'), 'Cha',
  'Sửa một người: người khác không bị ghi đè');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a3'); end $$;
select throws_ok($$select public.apply_tree_changes(null,
  '[{"id":"00000000-0000-0000-0000-000000000012","tree_id":"00000000-0000-0000-0000-0000000000b1","full_name":"Xem","gender":"male"}]', null, null)$$,
  '42501', null, 'Người xem gọi ghi nguyên tử: bị từ chối');

select * from finish();
rollback;
