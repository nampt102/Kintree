-- Dữ liệu mẫu cho máy phát triển (chạy tự động sau `pnpm db:reset`; chạy tay được vì ghi lặp lại không lỗi).
-- Toàn bộ là người và dòng họ hư cấu. Quản trị chỉ định bằng email nên người dùng đăng nhập lần đầu sẽ nhận quyền
-- (trigger handle_new_user); email đã có tài khoản thì có quyền ngay.
-- Quy ước: mã cố định (md5) để ghi lặp lại không nhân đôi. Dòng người: khoá|họ tên|giới|năm sinh|năm mất|o nếu dâu/rể|khoá cha|khoá mẹ.
-- Người đầu tiên của mỗi cuốn là thuỷ tổ; cha + mẹ cùng xuất hiện ở các con thì thành một cặp vợ chồng.

create function pg_temp.uid(s text) returns uuid language sql immutable as $$ select md5('kintree-seed:' || s)::uuid $$;

create function pg_temp.seed_rows(p_rows text)
returns table (k text, n text, g text, b int, d int, o boolean, f text, m text, ord bigint)
language sql immutable as $$
  select split_part(trim(l), '|', 1), split_part(trim(l), '|', 2), split_part(trim(l), '|', 3),
    nullif(split_part(trim(l), '|', 4), '')::int, nullif(split_part(trim(l), '|', 5), '')::int,
    split_part(trim(l), '|', 6) = 'o', nullif(split_part(trim(l), '|', 7), ''), nullif(split_part(trim(l), '|', 8), ''), row_number() over (order by ord)
  from regexp_split_to_table(p_rows, E'\n') with ordinality as t(l, ord)
  where trim(l) <> ''
$$;

create function pg_temp.seed_tree(p_clan uuid, p_code text, p_name text, p_region text, p_desc text, p_rows text)
returns void language plpgsql as $$
declare v_tree uuid := pg_temp.uid('tree:' || p_code);
begin
  insert into public.trees (id, clan_id, name, region, description) values (v_tree, p_clan, p_name, p_region, p_desc)
  on conflict (id) do nothing;

  insert into public.persons (id, tree_id, full_name, gender, is_outsider, is_root, birth_year, death_year, sibling_order)
  select pg_temp.uid(p_code || ':' || k), v_tree, n, g, o, ord = 1, b, d,
    case when f is not null or m is not null then row_number() over (partition by f, m order by ord)::int end
  from pg_temp.seed_rows(p_rows)
  on conflict (id) do nothing;

  insert into public.parent_child (parent_id, child_id, role, kind)
  select pg_temp.uid(p_code || ':' || f), pg_temp.uid(p_code || ':' || k), 'father', 'biological' from pg_temp.seed_rows(p_rows) where f is not null
  union all
  select pg_temp.uid(p_code || ':' || m), pg_temp.uid(p_code || ':' || k), 'mother', 'biological' from pg_temp.seed_rows(p_rows) where m is not null
  on conflict do nothing;

  insert into public.marriages (id, husband_id, wife_id, wife_order)
  select pg_temp.uid(p_code || ':' || f || '+' || m), pg_temp.uid(p_code || ':' || f), pg_temp.uid(p_code || ':' || m), 1
  from (select distinct f, m from pg_temp.seed_rows(p_rows) where f is not null and m is not null) s
  on conflict do nothing;
end $$;

-- Cho một email vai trò ở một dòng họ: có tài khoản thì thành viên ngay, chưa có thì lời mời chờ.
create function pg_temp.grant_role(p_clan uuid, p_email text, p_role text) returns void language plpgsql as $$
declare v_user uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(p_email);
  if v_user is null then
    insert into public.invites (email, clan_id, role) values (lower(p_email), p_clan, p_role) on conflict do nothing;
  else
    insert into public.memberships (user_id, clan_id, role) values (v_user, p_clan, p_role) on conflict do nothing;
  end if;
end $$;

-- ---------- Họ Nguyễn Văn (Nam Định): hai cuốn ----------
insert into public.clans (id, name, slug) values (pg_temp.uid('clan:nguyen'), 'Họ Nguyễn Văn', 'ho-nguyen-van-seed') on conflict (id) do nothing;
select pg_temp.seed_tree(pg_temp.uid('clan:nguyen'), 'nguyen-truong', 'Chi trưởng họ Nguyễn Văn', 'north', 'Làng Hành Thiện, Nam Định. Lập phả từ đời cụ Cả.', $r$
ca|Nguyễn Văn Cả|male|1890|1968
binh|Trần Thị Bình|female|1894|1975|o||
an|Nguyễn Văn An|male|1915|1990|-|ca|binh
hoa|Nguyễn Thị Hoa|female|1918|2001|-|ca|binh
bao|Nguyễn Văn Bảo|male|1921|1944|-|ca|binh
dau|Lê Thị Dâu|female|1920|2005|o||
cuong|Nguyễn Văn Cường|male|1945||-|an|dau
dung|Nguyễn Thị Dung|female|1948||-|an|dau
em|Nguyễn Văn Em|male|1952||-|an|dau
lan|Phạm Thị Lan|female|1950||o||
khoa|Nguyễn Văn Khoa|male|1975||-|cuong|lan
mai|Nguyễn Thị Mai|female|1978||-|cuong|lan
nga|Đỗ Thị Nga|female|1955||o||
phuc|Nguyễn Văn Phúc|male|1982||-|em|nga
$r$);
select pg_temp.seed_tree(pg_temp.uid('clan:nguyen'), 'nguyen-hai', 'Chi thứ hai', 'north', 'Nhánh của cụ Hai, dời ra Hà Nội năm 1954.', $r$
hai|Nguyễn Văn Hai|male|1895|1970
tu|Vũ Thị Tư|female|1899|1980|o||
sau|Nguyễn Văn Sáu|male|1922||-|hai|tu
bay|Nguyễn Thị Bảy|female|1925||-|hai|tu
tam|Hà Thị Tám|female|1927||o||
chin|Nguyễn Văn Chín|male|1950||-|sau|tam
muoi|Nguyễn Thị Mười|female|1953||-|sau|tam
$r$);
select pg_temp.grant_role(pg_temp.uid('clan:nguyen'), 'jamesphan102@gmail.com', 'admin');

-- ---------- Họ Trần (Huế): miền Trung ----------
insert into public.clans (id, name, slug) values (pg_temp.uid('clan:tran'), 'Họ Trần Phú Xuân', 'ho-tran-phu-xuan-seed') on conflict (id) do nothing;
select pg_temp.seed_tree(pg_temp.uid('clan:tran'), 'tran-hue', 'Phả họ Trần Phú Xuân', 'central', 'Họ Trần ở kinh thành Huế.', $r$
dat|Trần Văn Đạt|male|1880|1955
lua|Hoàng Thị Lụa|female|1884|1960|o||
binh|Trần Văn Bình|male|1905|1980|-|dat|lua
chau|Trần Văn Châu|male|1908|1985|-|dat|lua
dau|Trần Thị Dậu|female|1911|1990|-|dat|lua
huong|Nguyễn Thị Hương|female|1910|1992|o||
xuan|Lê Thị Xuân|female|1913|1996|o||
giang|Trần Văn Giang|male|1935||-|binh|huong
hanh|Trần Thị Hạnh|female|1938||-|binh|huong
khanh|Trần Văn Khánh|male|1940||-|chau|xuan
yen|Phan Thị Yến|female|1940||o||
long|Trần Văn Long|male|1965||-|giang|yen
my|Trần Thị My|female|1968||-|giang|yen
$r$);
select pg_temp.grant_role(pg_temp.uid('clan:tran'), 'jamesphan102@gmail.com', 'admin');

-- ---------- Họ Lê (Cần Thơ): miền Nam; jamesphan102 chỉ xem, quản trị là người khác ----------
insert into public.clans (id, name, slug) values (pg_temp.uid('clan:le'), 'Họ Lê Miền Tây', 'ho-le-mien-tay-seed') on conflict (id) do nothing;
select pg_temp.seed_tree(pg_temp.uid('clan:le'), 'le-tay', 'Gia phả họ Lê Miền Tây', 'south', 'Họ Lê ở Cần Thơ, sang vùng đất mới từ thế kỷ 19.', $r$
tai|Lê Văn Tài|male|1900|1978
sen|Nguyễn Thị Sen|female|1904|1990|o||
nghia|Lê Văn Nghĩa|male|1928|2010|-|tai|sen
thao|Lê Thị Thảo|female|1931||-|tai|sen
hong|Trương Thị Hồng|female|1932||o||
phuoc|Lê Văn Phước|male|1955||-|nghia|hong
loc|Lê Văn Lộc|male|1958||-|nghia|hong
kim|Lê Thị Kim|female|1961||-|nghia|hong
no|Châu Thị Nở|female|1958||o||
quang|Lê Văn Quang|male|1985||-|phuoc|no
$r$);
select pg_temp.grant_role(pg_temp.uid('clan:le'), 'quantri.le@example.com', 'admin');
select pg_temp.grant_role(pg_temp.uid('clan:le'), 'jamesphan102@gmail.com', 'viewer');

-- ---------- Họ Phạm: chưa có cuốn nào (thử trạng thái trống) ----------
insert into public.clans (id, name, slug) values (pg_temp.uid('clan:pham'), 'Họ Phạm (chưa có cuốn)', 'ho-pham-seed') on conflict (id) do nothing;
select pg_temp.grant_role(pg_temp.uid('clan:pham'), 'jamesphan102@gmail.com', 'admin');
