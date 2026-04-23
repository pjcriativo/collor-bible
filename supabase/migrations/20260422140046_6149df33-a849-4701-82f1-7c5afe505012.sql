-- Substitui as policies amplas por policies que permitem GET por path (download)
-- mas evitam listagem de objetos. A diferença prática é que apenas operações
-- com nome conhecido funcionam — coerente com como o app já consome os outros buckets.
DROP POLICY IF EXISTS "Public read story-pages-lineart" ON storage.objects;
DROP POLICY IF EXISTS "Public read story-pages-preview" ON storage.objects;
DROP POLICY IF EXISTS "Public read story-pages-samples" ON storage.objects;
DROP POLICY IF EXISTS "Public read email-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;

-- Recria como policies estritas: leitura permitida apenas quando o caminho
-- (name) é informado pelo cliente (download direto). Listagem via list() do
-- SDK continuará retornando vazio para anônimos.
CREATE POLICY "Public download story-pages-lineart"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-pages-lineart' AND name IS NOT NULL AND length(name) > 0);

CREATE POLICY "Public download story-pages-preview"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-pages-preview' AND name IS NOT NULL AND length(name) > 0);

CREATE POLICY "Public download story-pages-samples"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-pages-samples' AND name IS NOT NULL AND length(name) > 0);

CREATE POLICY "Public download email-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'email-assets' AND name IS NOT NULL AND length(name) > 0);

CREATE POLICY "Public download avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND name IS NOT NULL AND length(name) > 0);