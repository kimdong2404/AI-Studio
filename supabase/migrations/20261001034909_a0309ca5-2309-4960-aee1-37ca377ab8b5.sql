ALTER TABLE public.scenes
  ADD COLUMN action text NOT NULL DEFAULT '',
  ADD COLUMN expression text NOT NULL DEFAULT '',
  ADD COLUMN camera_movement text NOT NULL DEFAULT '',
  ADD COLUMN lighting text NOT NULL DEFAULT '',
  ADD COLUMN time_of_day text NOT NULL DEFAULT '',
  ADD COLUMN visual_style text NOT NULL DEFAULT '',
  ADD COLUMN dialogue text NOT NULL DEFAULT '',
  ADD COLUMN sound_effect text NOT NULL DEFAULT '',
  ADD COLUMN ambient_sound text NOT NULL DEFAULT '';