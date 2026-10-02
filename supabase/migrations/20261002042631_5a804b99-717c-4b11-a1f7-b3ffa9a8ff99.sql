CREATE TABLE public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_providers TO anon, authenticated;
GRANT ALL ON public.ai_providers TO service_role;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read providers" ON public.ai_providers FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  generation_mode text NOT NULL DEFAULT 'balanced',
  enabled boolean NOT NULL DEFAULT false,
  supports_reference_images boolean NOT NULL DEFAULT false,
  supports_image_generation boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_models TO anon, authenticated;
GRANT ALL ON public.ai_models TO service_role;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read models" ON public.ai_models FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.image_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  prompt_version_id uuid REFERENCES public.prompt_versions(id) ON DELETE SET NULL,
  provider_id uuid REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  model_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL,
  prompt_text text NOT NULL DEFAULT '',
  aspect_ratio text NOT NULL DEFAULT '1:1',
  resolution text NOT NULL DEFAULT 'auto',
  image_count integer NOT NULL DEFAULT 1,
  quality text NOT NULL DEFAULT 'standard',
  generation_mode text NOT NULL DEFAULT 'economy',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','generating','completed','failed','cancelled')),
  error_message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_generations TO anon, authenticated;
GRANT ALL ON public.image_generations TO service_role;
ALTER TABLE public.image_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access image generations" ON public.image_generations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);