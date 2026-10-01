import { supabase } from "@/integrations/supabase/client";
import { SCENE_EXTRA_KEYS, type Scene } from "./storyboard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** Scene stores only reference IDs; asset data is always read from the libraries. */
const LINKS = [
  { table: "scene_characters", col: "character_id", key: "character_ids" },
  { table: "scene_ingredients", col: "ingredient_id", key: "ingredient_ids" },
  { table: "scene_props", col: "prop_id", key: "prop_ids" },
] as const;

const row = (s: Scene, position: number) => ({
  id: s.id,
  position,
  title: s.title,
  description: s.description,
  character: s.character,
  location: s.location,
  props: s.props,
  camera: s.camera,
  duration: s.duration,
  location_id: s.location_id,
  ...Object.fromEntries(SCENE_EXTRA_KEYS.map((k) => [k, s[k] ?? ""])),
});

export async function fetchScenes(): Promise<Scene[]> {
  const [sc, ...links] = await Promise.all([
    db.from("scenes").select("*").order("position").order("created_at"),
    ...LINKS.map((l) => db.from(l.table).select(`scene_id, ${l.col}`)),
  ]);
  for (const r of [sc, ...links]) if (r.error) throw r.error;
  return (sc.data as Record<string, string | null>[]).map((r) => {
    const s: Scene = {
      id: r["id"] as string,
      title: r["title"] ?? "",
      description: r["description"] ?? "",
      character: r["character"] ?? "",
      location: r["location"] ?? "",
      props: r["props"] ?? "",
      camera: r["camera"] ?? "",
      duration: r["duration"] ?? "",
      location_id: r["location_id"] ?? null,
      ...(Object.fromEntries(SCENE_EXTRA_KEYS.map((k) => [k, r[k] ?? ""])) as Record<(typeof SCENE_EXTRA_KEYS)[number], string>),
      character_ids: [],
      ingredient_ids: [],
      prop_ids: [],
    };
    LINKS.forEach((l, i) => {
      s[l.key] = (links[i].data as Record<string, string>[])
        .filter((x) => x["scene_id"] === s.id)
        .map((x) => x[l.col] as string);
    });
    return s;
  });
}

/** Save scene fields + sync relations (adds missing, removes dropped, never duplicates). */
export async function saveScene(s: Scene, position: number) {
  const { error } = await db.from("scenes").upsert(row(s, position));
  if (error) throw error;
  for (const l of LINKS) {
    const ids = [...new Set(s[l.key])];
    const { data, error: e1 } = await db.from(l.table).select(`id, ${l.col}`).eq("scene_id", s.id);
    if (e1) throw e1;
    const existing = (data ?? []) as Record<string, string>[];
    const drop = existing.filter((x) => !ids.includes(x[l.col] as string)).map((x) => x["id"]);
    if (drop.length) {
      const { error: e2 } = await db.from(l.table).delete().in("id", drop);
      if (e2) throw e2;
    }
    const add = ids.filter((id) => !existing.some((x) => x[l.col] === id));
    if (add.length) {
      const { error: e3 } = await db
        .from(l.table)
        .upsert(add.map((id) => ({ scene_id: s.id, [l.col]: id })), { onConflict: `scene_id,${l.col}`, ignoreDuplicates: true });
      if (e3) throw e3;
    }
  }
}

export async function saveOrder(scenes: Scene[]) {
  if (!scenes.length) return;
  const { error } = await db.from("scenes").upsert(scenes.map(row));
  if (error) throw error;
}

/** Replace the whole storyboard (used by "Phân tích kịch bản" / "Xóa tất cả"). */
export async function replaceScenes(scenes: Scene[]) {
  const { error } = await db.from("scenes").delete().not("id", "is", null);
  if (error) throw error;
  for (const [i, s] of scenes.entries()) await saveScene(s, i);
}
