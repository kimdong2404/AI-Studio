CREATE TABLE public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  description text NOT NULL DEFAULT '',
  ingredient_type text NOT NULL DEFAULT '',
  recognition_features text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '',
  shape text NOT NULL DEFAULT '',
  freshness text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredients TO anon, authenticated;
GRANT ALL ON public.ingredients TO service_role;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access ingredients" ON public.ingredients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.ingredient_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  storage_path text NOT NULL,
  is_master boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredient_images TO anon, authenticated;
GRANT ALL ON public.ingredient_images TO service_role;
ALTER TABLE public.ingredient_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access ingredient images" ON public.ingredient_images FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE UNIQUE INDEX ingredient_images_one_master ON public.ingredient_images(ingredient_id) WHERE is_master;
CREATE INDEX ingredient_images_ingredient_id ON public.ingredient_images(ingredient_id);