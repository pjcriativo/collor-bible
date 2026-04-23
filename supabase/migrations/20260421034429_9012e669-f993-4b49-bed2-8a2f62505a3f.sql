CREATE TABLE public.user_notification_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  story_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_id)
);

ALTER TABLE public.user_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification reads"
ON public.user_notification_reads
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notification reads"
ON public.user_notification_reads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification reads"
ON public.user_notification_reads
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification reads"
ON public.user_notification_reads
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_user_notification_reads_user_id
ON public.user_notification_reads (user_id);

CREATE TRIGGER update_user_notification_reads_updated_at
BEFORE UPDATE ON public.user_notification_reads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();