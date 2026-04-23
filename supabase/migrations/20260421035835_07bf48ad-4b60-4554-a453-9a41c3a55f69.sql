CREATE POLICY "Anyone can view app settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (true);