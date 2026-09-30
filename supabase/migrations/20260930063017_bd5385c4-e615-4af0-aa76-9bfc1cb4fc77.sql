CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  description text NOT NULL DEFAULT '',
  location_type text NOT NULL DEFAULT '',
  recognition_features text NOT NULL DEFAULT '',
  color_lighting text NOT NULL DEFAULT '',
  time_of_day text NOT NULL DEFAULT '',
  style text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO anon, authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access locations" ON public.locations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.location_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  storage_path text NOT NULL,
  is_master boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_images TO anon, authenticated;
GRANT ALL ON public.location_images TO service_role;
ALTER TABLE public.location_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access location images" ON public.location_images FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE UNIQUE INDEX location_images_one_master ON public.location_images(location_id) WHERE is_master;
CREATE INDEX location_images_location_id ON public.location_images(location_id);