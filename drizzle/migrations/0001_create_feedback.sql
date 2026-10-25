CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rating SMALLINT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own feedback insert" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND rating BETWEEN 1 AND 5 AND length(trim(comment)) > 0);

CREATE POLICY "own feedback read" ON public.feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);