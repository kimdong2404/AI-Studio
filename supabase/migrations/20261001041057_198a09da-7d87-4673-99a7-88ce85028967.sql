CREATE TABLE public.character_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL UNIQUE REFERENCES public.characters(id) ON DELETE CASCADE,
  species text NOT NULL DEFAULT '', breed text NOT NULL DEFAULT '', height text NOT NULL DEFAULT '', build text NOT NULL DEFAULT '',
  overall_color text NOT NULL DEFAULT '', hair_color text NOT NULL DEFAULT '', pattern text NOT NULL DEFAULT '', eye_color text NOT NULL DEFAULT '',
  face_shape text NOT NULL DEFAULT '', ears text NOT NULL DEFAULT '', nose text NOT NULL DEFAULT '', mouth text NOT NULL DEFAULT '',
  body_features text NOT NULL DEFAULT '', special_marks text NOT NULL DEFAULT '',
  identity_description text NOT NULL DEFAULT '', appearance_description text NOT NULL DEFAULT '',
  outfit_main text NOT NULL DEFAULT '', outfit_color text NOT NULL DEFAULT '', outfit_style text NOT NULL DEFAULT '', footwear text NOT NULL DEFAULT '',
  accessories text NOT NULL DEFAULT '', outfit_details text NOT NULL DEFAULT '', outfit_description text NOT NULL DEFAULT '',
  personality text NOT NULL DEFAULT '', demeanor text NOT NULL DEFAULT '', usual_expression text NOT NULL DEFAULT '', behavior text NOT NULL DEFAULT '',
  character_identity text NOT NULL DEFAULT '', consistency_instruction text NOT NULL DEFAULT '', appearance_lock text NOT NULL DEFAULT '',
  outfit_lock text NOT NULL DEFAULT '', important_details text NOT NULL DEFAULT '', negative_avoid_changes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.character_sheets TO anon, authenticated;
GRANT ALL ON public.character_sheets TO service_role;
ALTER TABLE public.character_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access character sheets" ON public.character_sheets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.character_expressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  name text NOT NULL, code text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
  facial_features text NOT NULL DEFAULT '', eyes text NOT NULL DEFAULT '', brows_ears text NOT NULL DEFAULT '',
  mouth text NOT NULL DEFAULT '', head_pose text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.character_expressions TO anon, authenticated;
GRANT ALL ON public.character_expressions TO service_role;
ALTER TABLE public.character_expressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access character expressions" ON public.character_expressions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.character_expression_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expression_id uuid NOT NULL REFERENCES public.character_expressions(id) ON DELETE CASCADE,
  image_url text NOT NULL, storage_path text NOT NULL,
  is_master boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX character_expression_images_one_master ON public.character_expression_images(expression_id) WHERE is_master;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.character_expression_images TO anon, authenticated;
GRANT ALL ON public.character_expression_images TO service_role;
ALTER TABLE public.character_expression_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access character expression images" ON public.character_expression_images FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.character_images ADD COLUMN view_type text NOT NULL DEFAULT '';
ALTER TABLE public.scene_characters ADD COLUMN expression_id uuid REFERENCES public.character_expressions(id) ON DELETE SET NULL;