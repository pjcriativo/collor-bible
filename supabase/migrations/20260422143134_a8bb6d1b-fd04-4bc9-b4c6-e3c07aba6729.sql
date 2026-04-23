ALTER PUBLICATION supabase_realtime ADD TABLE public.user_favorites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_story_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_page_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_artworks;

ALTER TABLE public.user_favorites REPLICA IDENTITY FULL;
ALTER TABLE public.user_story_progress REPLICA IDENTITY FULL;
ALTER TABLE public.user_page_progress REPLICA IDENTITY FULL;
ALTER TABLE public.user_artworks REPLICA IDENTITY FULL;