CREATE TABLE public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  description text NOT NULL DEFAULT '',
  gender text NOT NULL DEFAULT '',
  age text NOT NULL DEFAULT '',
  clothing text NOT NULL DEFAULT '',
  recognition_features text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.character_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  storage_path text NOT NULL,
  is_master boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.character_images(character_id);
CREATE UNIQUE INDEX character_one_master ON public.character_images(character_id) WHERE is_master;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.characters TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.character_images TO anon, authenticated;
GRANT ALL ON public.characters TO service_role;
GRANT ALL ON public.character_images TO service_role;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access characters" ON public.characters FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access character images" ON public.character_images FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read character images" ON storage.objects FOR SELECT USING (bucket_id = 'character-images');
CREATE POLICY "Public upload character images" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'character-images');
CREATE POLICY "Public delete character images" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'character-images');

INSERT INTO public.characters (name, code, description) VALUES
 ('Mèo Golden', 'CHAR_GOLDEN_NY1', 'Mèo Golden màu NY1, thân hình mập mũm mĩm nhưng không béo phì.'),
 ('Cô gái', 'CHAR_GIRL_001', 'Cô gái trẻ, tóc dài, phong cách giản dị.');