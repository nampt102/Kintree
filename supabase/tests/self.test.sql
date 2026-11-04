-- "Tôi là ai" theo cuốn (change kinship-terms). Chạy: pnpm db:test. Mọi thay đổi bị rollback cuối file.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

create function pg_temp.act(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

create function pg_temp.del_self() returns int language plpgsql as $$
declare n int;
begin
  delete from public.tree_self;
  get diagnostics n = row_count;
  return n;
end $$;

-- v: người xem dòng họ C (cuốn T1); st: người lạ; T2 thuộc dòng họ D mà v không có vai trò.
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'v@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'st@example.com', 'authenticated', 'authenticated');
insert into public.clans (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000c1', 'Họ C', 'ho-c'),
  ('00000000-0000-0000-0000-0000000000c2', 'Họ D', 'ho-d');
insert into public.trees (id, clan_id, name) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'T1'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c2', 'T2');
insert into public.memberships (user_id, clan_id, role) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'viewer');
insert into public.persons (id, tree_id, full_name, removed_at) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Người 1', null),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', 'Người 2', null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000b1', 'Người đã gỡ', now()),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000b2', 'Người cuốn khác', null);

select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ insert into public.tree_self (user_id, tree_id, person_id) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1') $$, 'người xem chọn mình trong cuốn');
select is((select person_id::text from public.tree_self), '00000000-0000-0000-0000-0000000000d1', 'đọc lại được lựa chọn của mình');
select lives_ok($$ update public.tree_self set person_id = '00000000-0000-0000-0000-0000000000d2' where tree_id = '00000000-0000-0000-0000-0000000000b1' $$, 'đổi sang người khác trong cuốn');
select throws_ok($$ update public.tree_self set person_id = '00000000-0000-0000-0000-0000000000d4' where tree_id = '00000000-0000-0000-0000-0000000000b1' $$, '42501', null, 'không chọn người của cuốn khác');
select throws_ok($$ update public.tree_self set person_id = '00000000-0000-0000-0000-0000000000d3' where tree_id = '00000000-0000-0000-0000-0000000000b1' $$, '42501', null, 'không chọn người đã gỡ');
select throws_ok($$ insert into public.tree_self (user_id, tree_id, person_id) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000d4') $$, '42501', null, 'không chọn trong cuốn không có quyền xem');
select throws_ok($$ insert into public.tree_self (user_id, tree_id, person_id) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1') $$, '23505', null, 'mỗi cuốn tối đa một người');
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.tree_self), 0, 'người khác không thấy lựa chọn');
select is(pg_temp.del_self(), 0, 'người khác không xoá được');
select throws_ok($$ insert into public.tree_self (user_id, tree_id, person_id) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d2') $$, '42501', null, 'không ghi hộ người khác');
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select is(pg_temp.del_self(), 1, 'bỏ lựa chọn của mình');
reset role;

select * from finish();
rollback;
