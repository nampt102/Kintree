-- Kintree: "Tôi là ai" theo từng cuốn (change kinship-terms, design D3). Chỉ ảnh hưởng hiển thị xưng hô của chính người dùng.
create table public.tree_self (
  user_id uuid not null references auth.users on delete cascade,
  tree_id uuid not null references public.trees on delete cascade,
  person_id uuid not null references public.persons on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (user_id, tree_id)
);
alter table public.tree_self enable row level security;

-- Chỉ dòng của mình; ghi được khi có quyền xem cuốn và người thuộc đúng cuốn, chưa bị gỡ.
create policy tree_self_select on public.tree_self for select to authenticated using (user_id = auth.uid());
create policy tree_self_insert on public.tree_self for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.tree_role(tree_self.tree_id) is not null
    and exists (select 1 from public.persons p where p.id = tree_self.person_id and p.tree_id = tree_self.tree_id and p.removed_at is null)
  );
create policy tree_self_update on public.tree_self for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.tree_role(tree_self.tree_id) is not null
    and exists (select 1 from public.persons p where p.id = tree_self.person_id and p.tree_id = tree_self.tree_id and p.removed_at is null)
  );
create policy tree_self_delete on public.tree_self for delete to authenticated using (user_id = auth.uid());
revoke all on public.tree_self from anon, authenticated;
grant select, insert, update, delete on public.tree_self to authenticated;
