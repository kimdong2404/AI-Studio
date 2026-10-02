CREATE TABLE public.video_prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  prompt_text text NOT NULL DEFAULT '',
  version_number integer NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('auto_generated','user_edited')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scene_id, version_number)
);
GRANT SELECT, INSERT ON public.video_prompt_versions TO anon, authenticated;
GRANT ALL ON public.video_prompt_versions TO service_role;
ALTER TABLE public.video_prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open read video prompt versions" ON public.video_prompt_versions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Open append video prompt versions" ON public.video_prompt_versions FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE public.video_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  source_image_id uuid,
  prompt_version_id uuid REFERENCES public.video_prompt_versions(id) ON DELETE SET NULL,
  provider_id uuid REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  model_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL,
  prompt_text text NOT NULL DEFAULT '',
  aspect_ratio text NOT NULL DEFAULT '',
  resolution text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  frame_rate text NOT NULL DEFAULT '',
  quality text NOT NULL DEFAULT '',
  generation_mode text NOT NULL DEFAULT '',
  first_frame_url text NOT NULL DEFAULT '',
  last_frame_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','generating','completed','failed','cancelled')),
  video_url text NOT NULL DEFAULT '',
  thumbnail_url text NOT NULL DEFAULT '',
  error_message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_generations TO anon, authenticated;
GRANT ALL ON public.video_generations TO service_role;
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open read video generations" ON public.video_generations FOR SELECT TO anon, authenticated USING (true);
-- No AI connected yet: the app may only create/keep drafts.
CREATE POLICY "Drafts only insert" ON public.video_generations FOR INSERT TO anon, authenticated WITH CHECK (status = 'draft');
CREATE POLICY "Drafts only update" ON public.video_generations FOR UPDATE TO anon, authenticated USING (status = 'draft') WITH CHECK (status = 'draft');
CREATE POLICY "Drafts only delete" ON public.video_generations FOR DELETE TO anon, authenticated USING (status = 'draft');

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER video_generations_touch BEFORE UPDATE ON public.video_generations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();