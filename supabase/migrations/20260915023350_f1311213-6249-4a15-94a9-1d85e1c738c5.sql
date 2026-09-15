ALTER TABLE public.resume_analyses
  ADD COLUMN IF NOT EXISTS technical_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS soft_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS experience_summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS education_summary text NOT NULL DEFAULT '';