-- Mời thành viên, quản lý thành viên, giữ quản trị cuối, link mời (change clan-invites).
-- Chạy: pnpm db:test. Mọi thay đổi bị rollback cuối file. Mã link giữ qua các lần đổi người bằng set_config('kt.*').
begin;
create extension if not exists pgtap with schema extensions;
select plan(56);

create function pg_temp.act(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

-- Người dùng: pa quản trị nền tảng; ca quản trị dòng họ C; ta quản trị riêng cuốn T1; v người xem dòng họ C;
-- tv người xem dòng họ D; st người lạ; da quản trị duy nhất dòng họ D; ex đã có tài khoản, chưa có vai trò; rv người xem cuốn đã xoá.
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a0', 'pa@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a1', 'ca@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'ta@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a3', 'v@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a4', 'tv@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a5', 'st@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a6', 'da@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a8', 'ex@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a9', 'rv@example.com', 'authenticated', 'authenticated');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000a0');

insert into public.clans (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000c1', 'Họ C', 'ho-c'),
  ('00000000-0000-0000-0000-0000000000c2', 'Họ D', 'ho-d');
insert into public.trees (id, clan_id, name, removed_at) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'T1', null),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', 'T2 đã xoá', now()),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c2', 'T3', null);
insert into public.memberships (user_id, clan_id, tree_id, role) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', null, 'admin'),
  ('00000000-0000-0000-0000-0000000000a2', null, '00000000-0000-0000-0000-0000000000b1', 'admin'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', null, 'viewer'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000c2', null, 'viewer'),
  ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000c2', null, 'admin'),
  ('00000000-0000-0000-0000-0000000000a9', null, '00000000-0000-0000-0000-0000000000b2', 'viewer');
do $$ begin
  perform set_config('kt.tv_member', (select id::text from public.memberships where user_id = '00000000-0000-0000-0000-0000000000a4'), false);
end $$;

-- Chỉ quản trị dòng họ quản lý thành viên
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a2'); end $$;
select throws_ok($$select public.member_invite('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'x@example.com', 'viewer')$$,
  '42501', 'FORBIDDEN', 'Quản trị của một cuốn mời người: bị từ chối');
select throws_ok($$select public.link_create('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 7)$$,
  '42501', 'FORBIDDEN', 'Quản trị của một cuốn tạo link: bị từ chối');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a3'); end $$;
select throws_ok($$select * from public.member_list('00000000-0000-0000-0000-0000000000c1')$$,
  '42501', 'FORBIDDEN', 'Người xem liệt kê thành viên: bị từ chối');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a6'); end $$;
select throws_ok($$select * from public.member_list('00000000-0000-0000-0000-0000000000c1')$$,
  '42501', 'FORBIDDEN', 'Quản trị dòng họ khác liệt kê thành viên: bị từ chối');
select throws_ok($$select public._grant_by_email('00000000-0000-0000-0000-0000000000c1', null, 'da@example.com', 'admin')$$,
  '42501', null, 'Gọi thẳng hàm cấp quyền nội bộ: bị từ chối');
select throws_ok($$select count(*) from public.invites$$, '42501', null, 'Đọc thẳng bảng lời mời: bị từ chối');

-- Mời bằng email (ca)
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a1'); end $$;
select is(public.member_invite('00000000-0000-0000-0000-0000000000c1', null, 'EX@example.com', 'viewer'), 'added',
  'Email đã có tài khoản: có quyền ngay');
select is(public.member_invite('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', ' Anh.Ba@Example.com ', 'admin'), 'pending',
  'Email chưa có tài khoản: lời mời chờ');
select throws_ok($$select public.member_invite('00000000-0000-0000-0000-0000000000c1', null, 'khong-phai-email', 'viewer')$$,
  '23514', 'EMAIL_INVALID', 'Email sai: bị từ chối');
select throws_ok($$select public.member_invite('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b3', 'y@example.com', 'viewer')$$,
  '23503', 'TREE_NOT_FOUND', 'Mời vào cuốn của dòng họ khác: bị từ chối');
select throws_ok($$select public.member_invite('00000000-0000-0000-0000-0000000000c1', null, 'y@example.com', 'editor')$$,
  '23514', 'ROLE_INVALID', 'Vai trò biên tập: bị từ chối');
select is(public.member_invite('00000000-0000-0000-0000-0000000000c1', null, 'ex@example.com', 'admin'), 'added',
  'Nâng người xem thành quản trị bằng lời mời');
select is((select array_agg(role) from public.memberships where user_id = '00000000-0000-0000-0000-0000000000a8'), array['admin'],
  'Mời lại: đúng một vai trò, là quản trị');
select is(public.member_invite('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'anh.ba@example.com', 'admin'), 'pending',
  'Mời lại email đang chờ: không lỗi');

-- Danh sách thành viên: ca, ta, v, ex + lời mời anh.ba; rv ở cuốn đã xoá không hiện
select is((select count(*) from public.member_list('00000000-0000-0000-0000-0000000000c1')), 5::bigint,
  'Danh sách có người đã vào và lời mời chờ, không có cuốn đã xoá');
select is((select count(*) from public.member_list('00000000-0000-0000-0000-0000000000c1') where kind = 'invite' and email = 'anh.ba@example.com' and tree_name = 'T1'),
  1::bigint, 'Lời mời chờ ghi đúng email và cuốn');
select is((select email from public.member_list('00000000-0000-0000-0000-0000000000c1') where is_me), 'ca@example.com',
  'Danh sách đánh dấu chính mình');

-- Email chưa có tài khoản đăng nhập lần đầu
reset role;
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000aa', 'anh.ba@example.com', 'authenticated', 'authenticated');
select is((select role from public.memberships where user_id = '00000000-0000-0000-0000-0000000000aa' and tree_id = '00000000-0000-0000-0000-0000000000b1'),
  'admin', 'Lời mời cấp cuốn thành quyền khi đăng nhập lần đầu');
select is((select count(*) from public.invites where email = 'anh.ba@example.com'), 0::bigint, 'Lời mời đã nhận biến khỏi danh sách chờ');

-- Huỷ lời mời
do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a1'); end $$;
select is(public.member_invite('00000000-0000-0000-0000-0000000000c1', null, 'gone@example.com', 'viewer'), 'pending', 'Mời gone: chờ');
select lives_ok($$select public.invite_cancel((select id from public.member_list('00000000-0000-0000-0000-0000000000c1') where email = 'gone@example.com'))$$,
  'Huỷ lời mời');
reset role;
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000ab', 'gone@example.com', 'authenticated', 'authenticated');
select is((select count(*) from public.memberships where user_id = '00000000-0000-0000-0000-0000000000ab'), 0::bigint,
  'Huỷ lời mời: đăng nhập lần đầu không có vai trò');

-- Gỡ người xem
do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a1'); end $$;
select lives_ok($$select public.member_remove((select id from public.member_list('00000000-0000-0000-0000-0000000000c1') where email = 'v@example.com'))$$,
  'Gỡ người xem');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a3'); end $$;
select is((select count(*) from public.clans) + (select count(*) from public.trees), 0::bigint, 'Gỡ người xem: không còn thấy dòng họ và cuốn');

-- Luôn còn quản trị dòng họ
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a6'); end $$;
select throws_ok($$select public.member_set_role((select id from public.memberships where user_id = auth.uid()), 'viewer')$$,
  '23514', 'LAST_ADMIN', 'Tự hạ quyền khi là quản trị duy nhất: bị từ chối');
select throws_ok($$delete from public.memberships where user_id = auth.uid()$$,
  '23514', 'LAST_ADMIN', 'Tự gỡ thẳng qua bảng khi là quản trị duy nhất: bị từ chối');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a1'); end $$;
select lives_ok($$select public.member_remove((select id from public.member_list('00000000-0000-0000-0000-0000000000c1') where email = 'ex@example.com'))$$,
  'Còn quản trị khác: gỡ được');
select throws_ok($$select public.member_set_role((select id from public.memberships where user_id = auth.uid()), 'viewer')$$,
  '23514', 'LAST_ADMIN', 'Quản trị cấp cuốn không tính là quản trị dòng họ còn lại');

-- Quản trị nền tảng
select throws_ok($$select * from public.platform_list_clan_admins('00000000-0000-0000-0000-0000000000c2')$$,
  '42501', 'NOT_PLATFORM_ADMIN', 'Người dùng thường xem quản trị của dòng họ: bị từ chối');
select throws_ok($$select public.platform_add_clan_admin('00000000-0000-0000-0000-0000000000c1', 'z@example.com')$$,
  '42501', 'NOT_PLATFORM_ADMIN', 'Người dùng thường gọi lệnh thêm quản trị: bị từ chối');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a0'); end $$;
select is(public.platform_add_clan_admin('00000000-0000-0000-0000-0000000000c2', 'New2@example.com'), 'pending', 'Thêm quản trị chưa có tài khoản');
select is((select count(*) from public.platform_list_clan_admins('00000000-0000-0000-0000-0000000000c2')), 2::bigint,
  'Chỉ thấy quản trị (1 đã vào, 1 chờ), không thấy người xem');
select throws_ok($$select public.platform_remove_clan_admin('member', (select id from public.platform_list_clan_admins('00000000-0000-0000-0000-0000000000c2') where kind = 'member'))$$,
  '23514', 'LAST_ADMIN', 'Gỡ quản trị cuối (lời mời chờ không tính): bị từ chối');
select lives_ok($$select public.platform_remove_clan_admin('invite', (select id from public.platform_list_clan_admins('00000000-0000-0000-0000-0000000000c2') where kind = 'invite'))$$,
  'Huỷ lời mời quản trị đang chờ');
select throws_ok($$select public.platform_remove_clan_admin('member', current_setting('kt.tv_member')::uuid)$$,
  '23503', 'NOT_FOUND', 'Không gỡ được người xem qua lệnh của quản trị nền tảng');
select is(public.platform_add_clan_admin('00000000-0000-0000-0000-0000000000c2', 'tv@example.com'), 'added', 'Thêm quản trị đã có tài khoản');

-- Link mời (ca, dòng họ C)
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a1'); end $$;
do $$ begin
  perform set_config('kt.tok1', public.link_create('00000000-0000-0000-0000-0000000000c1', null, 7), false);
  perform set_config('kt.tok2', public.link_create('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 1, '1945'), false);
end $$;
select throws_ok($$select public.link_create('00000000-0000-0000-0000-0000000000c1', null, 7, null, 'admin')$$,
  '42883', null, 'Cố tạo link quản trị: không có lệnh nào nhận vai trò');
select throws_ok($$select public.link_create('00000000-0000-0000-0000-0000000000c1', null, 5)$$,
  '23514', 'DAYS_INVALID', 'Hạn dùng ngoài 1/7/30: bị từ chối');
select is((select count(*) from public.link_list('00000000-0000-0000-0000-0000000000c1')), 2::bigint, 'Danh sách link đang hiệu lực');
select is((select has_code from public.link_list('00000000-0000-0000-0000-0000000000c1') where tree_name = 'T1'), true, 'Link có mã ghi "có mã mời"');

reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a5'); end $$;
select is(public.link_peek(current_setting('kt.tok1')) ->> 'clan_name', 'Họ C', 'Xem trước link: tên dòng họ');
select is(public.link_accept(current_setting('kt.tok1')) ->> 'status', 'ok', 'Nhận link không mã');
select is(public.clan_role('00000000-0000-0000-0000-0000000000c1'), 'viewer', 'Nhận link: vai trò xem');
select is(public.link_accept(current_setting('kt.tok1')) ->> 'status', 'ok', 'Nhận lại cùng link: không lỗi');
select is(public.link_peek('khong-co-link-nay') ->> 'status', 'invalid', 'Link không tồn tại: không hợp lệ, không lộ dòng họ');

reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a1'); end $$;
select is((select accepted_count from public.link_list('00000000-0000-0000-0000-0000000000c1') where tree_id is null), 1,
  'Số người đã nhận chỉ tăng khi có người mới');
select is(public.link_accept(current_setting('kt.tok1')) ->> 'status', 'ok', 'Quản trị mở link xem');
select is(public.clan_role('00000000-0000-0000-0000-0000000000c1'), 'admin', 'Quản trị mở link xem: vẫn là quản trị');

-- Sai mã mời 5 lần thì khoá
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a4'); end $$;
select is(array[
  public.link_accept(current_setting('kt.tok2'), '0000') ->> 'status',
  public.link_accept(current_setting('kt.tok2'), '0001') ->> 'status',
  public.link_accept(current_setting('kt.tok2'), '0002') ->> 'status',
  public.link_accept(current_setting('kt.tok2'), null) ->> 'status'],
  array['wrong_code', 'wrong_code', 'wrong_code', 'wrong_code'], 'Sai mã 4 lần: báo sai mã');
select is(public.link_accept(current_setting('kt.tok2'), '0003') ->> 'status', 'locked', 'Sai lần thứ 5: khoá link');
select is(public.link_accept(current_setting('kt.tok2'), '1945') ->> 'status', 'locked', 'Đang khoá: nhập đúng mã vẫn bị chặn');
reset role;
update public.invite_links set locked_until = now() - interval '1 second' where locked_until is not null;
do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a4'); end $$;
select is(public.link_accept(current_setting('kt.tok2'), '1945') ->> 'status', 'ok', 'Hết thời gian khoá: nhận được');

-- Hết hạn và thu hồi
reset role;
update public.invite_links set expires_at = now() - interval '1 second' where tree_id is null;
do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a1'); end $$;
select lives_ok($$select public.link_revoke((select id from public.link_list('00000000-0000-0000-0000-0000000000c1')))$$, 'Thu hồi link');
reset role; do $$ begin perform pg_temp.act('00000000-0000-0000-0000-0000000000a5'); end $$;
select is(public.link_accept(current_setting('kt.tok1')) ->> 'status', 'expired', 'Link hết hạn: không nhận được');
select is(public.link_peek(current_setting('kt.tok2')) ->> 'status', 'revoked', 'Link đã thu hồi: không nhận được');

-- Xoá cả dòng họ hoặc tài khoản (nhà vận hành): trigger cho qua
reset role;
select lives_ok($$delete from public.clans where id = '00000000-0000-0000-0000-0000000000c2'$$, 'Xoá dòng họ: không bị chặn bởi quản trị cuối');

select * from finish();
rollback;
