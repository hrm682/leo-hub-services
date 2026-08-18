CREATE POLICY "staff read all notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));