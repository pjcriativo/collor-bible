-- Restringir LISTING do bucket: apenas admins podem listar.
-- O acesso direto por URL continua público porque o bucket é public=true.
DROP POLICY IF EXISTS "Public can view branding files" ON storage.objects;

CREATE POLICY "Admins can list branding files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));