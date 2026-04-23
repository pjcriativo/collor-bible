CREATE TABLE public.story_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  story_slug TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  overall_progress_percent INTEGER NOT NULL DEFAULT 0,
  unlocked_milestone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_slug)
);

ALTER TABLE public.story_completions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_story_completions_user_id ON public.story_completions(user_id);
CREATE INDEX idx_story_completions_story_slug ON public.story_completions(story_slug);

CREATE POLICY "Users can view their own story completions"
ON public.story_completions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own story completions"
ON public.story_completions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all story completions"
ON public.story_completions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_story_completions_updated_at
BEFORE UPDATE ON public.story_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();