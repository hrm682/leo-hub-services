revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.update_updated_at_column() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.is_staff(uuid) from anon, public;

create policy "client marks own service in renewal" on public.customer_services for update to authenticated
  using (auth.uid() = user_id and status = 'activo')
  with check (auth.uid() = user_id and status = 'en_renovacion');