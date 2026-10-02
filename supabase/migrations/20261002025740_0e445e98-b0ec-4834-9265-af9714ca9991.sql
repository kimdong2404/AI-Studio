CREATE TABLE public.scene_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL UNIQUE REFERENCES public.scenes(id) ON DELETE CASCADE,
  auto_prompt text NOT NULL DEFAULT '',
  edited_prompt text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scene_prompts TO anon, authenticated;
GRANT ALL ON public.scene_prompts TO service_role;
ALTER TABLE public.scene_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access scene prompts" ON public.scene_prompts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);