import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Asset, AssetImage } from "./assets";

const BUCKET = "character-images";
const SIGN_SECONDS = 60 * 60 * 24 * 365;

type CharRow = {
  id: string;
  name: string;
  code: string;
  description: string;
  gender: string;
  age: string;
  clothing: string;
  recognition_features: string;
  notes: string;
  created_at: string;
};
type ImgRow = {
  id: string;
  character_id: string;
  image_url: string;
  storage_path: string;
  is_master: boolean;
  created_at: string;
};

// The generated types may lag behind new tables; keep a narrow untyped handle.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function fetchCharacters(): Promise<Asset[]> {
  const [{ data: chars, error: e1 }, { data: imgs, error: e2 }] = await Promise.all([
    db.from("characters").select("*").order("created_at"),
    db.from("character_images").select("*").order("created_at"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const images = (imgs ?? []) as ImgRow[];
  const paths = images.map((i) => i.storage_path);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGN_SECONDS);
    data?.forEach((d) => d.path && d.signedUrl && signed.set(d.path, d.signedUrl));
  }
  return ((chars ?? []) as CharRow[]).map((c) => {
    const mine = images.filter((i) => i.character_id === c.id);
    return {
      id: c.id,
      type: "character",
      name: c.name,
      code: c.code,
      description: c.description,
      details: { gender: c.gender, age: c.age, outfit: c.clothing, traits: c.recognition_features },
      notes: c.notes,
      images: mine.map((i) => ({ id: i.id, url: signed.get(i.storage_path) ?? "", path: i.storage_path })),
      masterImageId: mine.find((i) => i.is_master)?.id ?? null,
    };
  });
}

/** Persist a character and sync its images (upload new, delete removed, set master). */
export async function saveCharacter(a: Asset, previous: Asset | undefined) {
  const row = {
    name: a.name,
    code: a.code,
    description: a.description,
    gender: a.details.gender ?? "",
    age: a.details.age ?? "",
    clothing: a.details.outfit ?? "",
    recognition_features: a.details.traits ?? "",
    notes: a.notes,
  };
  let id = previous?.id;
  if (id) {
    const { error } = await db.from("characters").update(row).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await db.from("characters").insert(row).select("id").single();
    if (error) throw error;
    id = data.id as string;
  }

  // removed images
  const keep = new Set(a.images.map((i) => i.id));
  const removed = (previous?.images ?? []).filter((i) => !keep.has(i.id));
  if (removed.length) {
    await db.from("character_images").delete().in("id", removed.map((i) => i.id));
    const paths = removed.map((i) => i.path).filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  }

  // clear master first (one-master constraint), then upload new images
  await db.from("character_images").update({ is_master: false }).eq("character_id", id);
  let masterDbId: string | null = a.images.find((i) => i.id === a.masterImageId && !i.file)?.id ?? null;
  for (const img of a.images.filter((i) => i.file)) {
    const file = img.file as File;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
    if (upErr) throw upErr;
    const { data, error } = await db
      .from("character_images")
      .insert({ character_id: id, storage_path: path, image_url: `${BUCKET}/${path}` })
      .select("id")
      .single();
    if (error) throw error;
    if (img.id === a.masterImageId) masterDbId = data.id as string;
  }
  if (!masterDbId) {
    const { data } = await db.from("character_images").select("id").eq("character_id", id).order("created_at").limit(1);
    masterDbId = data?.[0]?.id ?? null;
  }
  if (masterDbId) await db.from("character_images").update({ is_master: true }).eq("id", masterDbId);
}

export async function deleteCharacter(a: Asset) {
  const paths = a.images.map((i) => i.path).filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  const { error } = await db.from("characters").delete().eq("id", a.id);
  if (error) throw error;
}

export function useCharacters() {
  const [list, setList] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setList(await fetchCharacters());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { list, reload, error };
}

export type { AssetImage };
