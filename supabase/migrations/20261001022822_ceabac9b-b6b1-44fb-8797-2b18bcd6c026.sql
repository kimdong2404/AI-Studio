CREATE TABLE public.props (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, code text NOT NULL,
  description text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.props TO anon, authenticated;
GRANT ALL ON public.props TO service_role;
ALTER TABLE public.props ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access props" ON public.props FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.prop_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prop_id uuid NOT NULL REFERENCES public.props(id) ON DELETE CASCADE,
  image_url text NOT NULL, storage_path text NOT NULL,
  is_master boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX prop_images_one_master ON public.prop_images(prop_id) WHERE is_master;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prop_images TO anon, authenticated;
GRANT ALL ON public.prop_images TO service_role;
ALTER TABLE public.prop_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access prop images" ON public.prop_images FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
  character text NOT NULL DEFAULT '', location text NOT NULL DEFAULT '',
  props text NOT NULL DEFAULT '', camera text NOT NULL DEFAULT '', duration text NOT NULL DEFAULT '',
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenes TO anon, authenticated;
GRANT ALL ON public.scenes TO service_role;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access scenes" ON public.scenes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.scene_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scene_id, character_id)
);
CREATE TABLE public.scene_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scene_id, ingredient_id)
);
CREATE TABLE public.scene_props (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  prop_id uuid NOT NULL REFERENCES public.props(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scene_id, prop_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scene_characters, public.scene_ingredients, public.scene_props TO anon, authenticated;
GRANT ALL ON public.scene_characters, public.scene_ingredients, public.scene_props TO service_role;
ALTER TABLE public.scene_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_props ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access scene characters" ON public.scene_characters FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access scene ingredients" ON public.scene_ingredients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access scene props" ON public.scene_props FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.scenes (position, title, description, character, location, props, camera, duration) VALUES
(0,'Cô gái bước vào quán mì','Một cô gái trẻ đẩy cửa bước vào quán mì Việt Nam vào buổi chiều.','Cô gái','Quán mì','Túi xách','Toàn cảnh','4 giây'),
(1,'Cô gái gọi một tô mì cay','Cô ngồi xuống bàn, nhìn thực đơn và gọi một tô mì cay.','Cô gái','Bàn ăn trong quán','Thực đơn','Trung cảnh','3 giây'),
(2,'Nhân viên chuẩn bị nguyên liệu','Nhân viên bếp xếp thịt, rau thơm và ớt lên khay chuẩn bị nấu.','Nhân viên','Bếp quán','Rau thơm, ớt','Cận cảnh','4 giây'),
(3,'Nhân viên nấu mì','Sợi mì được trụng trong nồi nước dùng đang sôi, khói bốc lên.','Nhân viên','Bếp quán','Nồi nước dùng','Cận cảnh','5 giây'),
(4,'Tô mì cay hoàn thiện','Tô mì cay đỏ rực được đặt lên bàn gỗ, khói nghi ngút.','—','Bàn ăn trong quán','Tô mì, đũa','Góc trên','3 giây'),
(5,'Cô gái thưởng thức món ăn','Cô gái gắp một đũa mì, mỉm cười hài lòng khi thưởng thức.','Cô gái','Bàn ăn trong quán','Đũa, khăn giấy','Cận cảnh','5 giây');