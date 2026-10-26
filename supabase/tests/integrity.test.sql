-- Chạy: pnpm db:test (supabase test db). Mọi thay đổi bị rollback cuối file.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into public.clans (id, name, slug) values ('00000000-0000-0000-0000-00000000000c', 'Họ Nguyễn', 'ho-nguyen');
insert into public.trees (id, clan_id, name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000c', 'Chi trưởng'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000c', 'Chi hai');

-- ong → cha → chau; dau và re là ngoại tộc; khac ở cuốn khác.
insert into public.persons (id, tree_id, full_name, gender, is_outsider) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Ông', 'male', false),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 'Cha', 'male', false),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1', 'Cháu', 'male', false),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a1', 'Chú', 'male', false),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000a1', 'Bà', 'female', false),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a1', 'Chưa rõ', 'unknown', false),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000a1', 'Dâu', 'female', true),
  ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000a1', 'Rể', 'male', true),
  ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000a2', 'Người chi khác', 'male', false);

insert into public.parent_child (parent_id, child_id, role, kind) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'father', 'biological'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'father', 'biological');

-- Cha mẹ
select throws_ok(
  $$insert into public.parent_child values ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'father', 'biological')$$,
  '23505', null, 'cha ruột thứ hai bị từ chối');
select lives_ok(
  $$insert into public.parent_child values ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'father', 'adopted')$$,
  'cha nuôi bên cạnh cha ruột được phép');
select throws_ok(
  $$insert into public.parent_child values ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'father', 'biological')$$,
  '23514', 'CYCLE', 'ông thành con của cháu: tạo vòng');
select throws_ok(
  $$insert into public.parent_child values ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 'father', 'biological')$$,
  '23514', 'ROLE_GENDER_MISMATCH', 'nữ làm cha bị từ chối');
select lives_ok(
  $$insert into public.parent_child values ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000004', 'father', 'biological')$$,
  'giới tính chưa rõ làm cha được');
select throws_ok(
  $$insert into public.parent_child (parent_id, child_id, role) values ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'mother')$$,
  '23502', null, 'thiếu loại quan hệ');
select throws_ok(
  $$insert into public.parent_child values ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000008', 'mother', 'step')$$,
  '23514', 'BOTH_OUTSIDERS', 'quan hệ cha mẹ giữa hai ngoại tộc');
select throws_ok(
  $$insert into public.parent_child values ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000004', 'father', 'adopted')$$,
  '23514', 'DIFFERENT_TREE', 'nối sang cuốn khác');

-- Vợ chồng
select throws_ok(
  $$insert into public.marriages (husband_id, wife_id) values ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000007')$$,
  '23514', 'BOTH_OUTSIDERS', 'vợ chồng đều ngoại tộc');
select lives_ok(
  $$insert into public.marriages (husband_id, wife_id) values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000007')$$,
  'vợ chồng hợp lệ');

-- Ngày tháng không đầy đủ
select lives_ok(
  $$update public.persons set birth_year = 1890 where id = '00000000-0000-0000-0000-000000000001'$$,
  'chỉ biết năm sinh');
select is(
  (select row(birth_year, birth_month, birth_day)::text from public.persons where id = '00000000-0000-0000-0000-000000000001'),
  '(1890,,)', 'đọc ra vẫn chỉ có năm');
select throws_ok(
  $$update public.persons set death_year = 1950, death_day = 12 where id = '00000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'có ngày thiếu tháng');
select throws_ok(
  $$update public.persons set birth_year = 1960, birth_month = 2, birth_day = 30 where id = '00000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'ngày dương 30/02 không tồn tại');
select lives_ok(
  $$update public.persons set birth_year = 1960, birth_month = 2, birth_day = 29 where id = '00000000-0000-0000-0000-000000000002'$$,
  'ngày dương 29/02/1960 tồn tại');
select throws_ok(
  $$update public.persons set birth_year = 1960, birth_month = 13 where id = '00000000-0000-0000-0000-000000000003'$$,
  '23514', null, 'tháng 13');
select throws_ok(
  $$update public.persons set birth_year = 1960, birth_month = 6, birth_leap = true where id = '00000000-0000-0000-0000-000000000003'$$,
  '23514', null, 'dương lịch không có tháng nhuận');

-- Nhật ký thay đổi
select ok(
  (select count(*) from public.audit_log where table_name = 'persons' and action = 'UPDATE'
     and row_id = '00000000-0000-0000-0000-000000000001' and new ->> 'birth_year' = '1890' and old ->> 'birth_year' is null) = 1,
  'sửa người có dòng nhật ký với giá trị cũ và mới');
select ok(
  (select count(*) from public.audit_log where table_name = 'parent_child' and action = 'INSERT') >= 3,
  'thêm quan hệ có dòng nhật ký');

select * from finish();
rollback;
