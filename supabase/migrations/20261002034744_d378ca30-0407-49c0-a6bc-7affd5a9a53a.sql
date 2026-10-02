CREATE TABLE public.prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'user_edited',
  content text NOT NULL DEFAULT '',
  auto_snapshot text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX prompt_versions_scene_idx ON public.prompt_versions(scene_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompt_versions TO anon, authenticated;
GRANT ALL ON public.prompt_versions TO service_role;
ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access prompt versions" ON public.prompt_versions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
INSERT INTO public.prompt_versions (scene_id, source_type, content, auto_snapshot, created_at)
SELECT scene_id, 'user_edited', edited_prompt, auto_prompt, updated_at FROM public.scene_prompts WHERE edited_prompt <> '';