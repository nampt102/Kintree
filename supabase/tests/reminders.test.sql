-- Nhắc giỗ qua Web Push: thiết bị, bật nhắc, nhật ký, người nhận (change anniversary-push).
-- Chạy: pnpm db:test. Mọi thay đổi bị rollback cuối file.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

create function pg_temp.act(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

create function pg_temp.del_subs() returns int language plpgsql as $$
declare n int;
begin
  delete from public.push_subscriptions;
  get diagnostics n = row_count;
  return n;
end $$;

-- v1, v2: người xem dòng họ C; ta: quản trị riêng cuốn T1 (không có vai trò dòng họ); st: người lạ; gone: từng xem C rồi bị gỡ.
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'v1@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'v2@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a3', 'ta@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a4', 'st@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a5', 'gone@example.com', 'authenticated', 'authenticated');
insert into public.clans (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000c1', 'Họ C', 'ho-c'),
  ('00000000-0000-0000-0000-0000000000c2', 'Họ D', 'ho-d');
insert into public.trees (id, clan_id, name) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'T1');
insert into public.memberships (user_id, clan_id, tree_id, role) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', null, 'viewer'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', null, 'viewer'),
  ('00000000-0000-0000-0000-0000000000a3', null, '00000000-0000-0000-0000-0000000000b1', 'admin'),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000c1', null, 'viewer');

-- Thiết bị
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ select public.register_push('https://push.test/a1', 'k1', 'a1', 'Chrome') $$, 'người xem đăng ký được thiết bị');
select is((select count(*)::int from public.push_subscriptions), 1, 'thấy thiết bị của mình');
select throws_ok($$ select public.register_push('', 'k', 'a') $$, '22023', null, 'endpoint rỗng bị từ chối');
select throws_ok($$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ('00000000-0000-0000-0000-0000000000a1', 'x', 'k', 'a') $$, '42501', null, 'không ghi thẳng vào bảng thiết bị');
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.push_subscriptions), 0, 'không thấy thiết bị của người khác');
select is(pg_temp.del_subs(), 0, 'không xoá được thiết bị của người khác');
select lives_ok($$ select public.register_push('https://push.test/a1', 'k2', 'a2', 'Firefox') $$, 'máy dùng chung: đăng ký lại endpoint');
select is((select count(*)::int from public.push_subscriptions), 1, 'endpoint đổi chủ sang người đăng ký sau');
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.push_subscriptions), 0, 'chủ cũ không còn thấy thiết bị đó');
reset role;

set local role anon;
select throws_ok($$ select public.register_push('https://push.test/x', 'k', 'a') $$, '42501', null, 'anon không đăng ký được');
reset role;

-- Bật nhắc
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
select lives_ok($$ insert into public.reminder_prefs (user_id, clan_id, enabled) values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', true) $$, 'người xem bật nhắc dòng họ của mình');
select throws_ok($$ insert into public.reminder_prefs (user_id, clan_id, enabled) values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c2', true) $$, '42501', null, 'không bật được cho dòng họ không có vai trò');
select throws_ok($$ insert into public.reminder_prefs (user_id, clan_id, enabled) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', true) $$, '42501', null, 'không bật hộ người khác');
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000a3');
select throws_ok($$ insert into public.reminder_prefs (user_id, clan_id, enabled) values ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', true) $$, '42501', null, 'quản trị riêng một cuốn (không có vai trò dòng họ) chưa bật được');
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.reminder_prefs), 0, 'không thấy tuỳ chọn của người khác');
reset role;

-- Nhật ký và hàm nội bộ không mở cho người dùng
select pg_temp.act('00000000-0000-0000-0000-0000000000a2');
select throws_ok($$ select * from public.reminder_log $$, '42501', null, 'người dùng không đọc được nhật ký');
select throws_ok($$ select * from public.reminder_targets() $$, '42501', null, 'người dùng không gọi được reminder_targets');
reset role;

-- Người nhận (service_role): v2 bật + có thiết bị; gone bật + có thiết bị nhưng bị gỡ; ta bật nhưng chỉ có vai trò cuốn.
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values
  ('00000000-0000-0000-0000-0000000000a5', 'https://push.test/gone', 'k', 'a'),
  ('00000000-0000-0000-0000-0000000000a3', 'https://push.test/ta', 'k', 'a');
insert into public.reminder_prefs (user_id, clan_id, enabled) values
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000c1', true),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', true);
delete from public.memberships where user_id = '00000000-0000-0000-0000-0000000000a5';
set local role service_role;
select is((select array_agg(distinct user_id::text) from public.reminder_targets() where clan_id = '00000000-0000-0000-0000-0000000000c1'), array['00000000-0000-0000-0000-0000000000a2'], 'chỉ người còn vai trò, đã bật và có thiết bị là người nhận');
reset role;
update public.reminder_prefs set enabled = false where user_id = '00000000-0000-0000-0000-0000000000a2';
set local role service_role;
select is((select count(*)::int from public.reminder_targets() where clan_id = '00000000-0000-0000-0000-0000000000c1'), 0, 'tắt nhắc thì không còn là người nhận');
reset role;

-- Chống gửi trùng
insert into public.persons (id, tree_id, full_name) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Cụ A');
insert into public.reminder_log (user_id, person_id, event_date, lead_days) values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000d1', '2026-04-22', 7);
select throws_ok($$ insert into public.reminder_log (user_id, person_id, event_date, lead_days) values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000d1', '2026-04-22', 7) $$, '23505', null, 'cùng người, giỗ, ngày, mốc chỉ gửi một lần');
select throws_ok($$ insert into public.reminder_log (user_id, person_id, event_date, lead_days) values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000d1', '2026-04-22', 3) $$, '23514', null, 'mốc ngoài 0, 1, 7 bị từ chối');

select * from finish();
rollback;
