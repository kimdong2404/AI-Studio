ALTER TABLE public.prompt_versions RENAME COLUMN content TO prompt_text;
ALTER TABLE public.prompt_versions ADD COLUMN version_number integer NOT NULL DEFAULT 1;
ALTER TABLE public.prompt_versions ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.prompt_versions SET source_type = 'auto_generated' WHERE source_type = 'auto_selected';
UPDATE public.prompt_versions p SET version_number = x.n
FROM (SELECT id, row_number() OVER (PARTITION BY scene_id ORDER BY created_at) n FROM public.prompt_versions) x
WHERE x.id = p.id;