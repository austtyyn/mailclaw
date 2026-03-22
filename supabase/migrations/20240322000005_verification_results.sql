-- Add verification issues and recommendations to domains for structured feedback
ALTER TABLE public.domains
  ADD COLUMN IF NOT EXISTS verification_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb;
