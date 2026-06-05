CREATE POLICY "bot_events_no_user_access"
ON public.bot_events
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);