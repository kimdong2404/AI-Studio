import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Asset, AssetType } from "./assets";

/** Shared image bucket for all persistent asset libraries (one upload system). */
const BUCKET = "character-images";
const SIGN_SECONDS = 60 * 60 * 24 * 365;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type RemoteConfig = {
  type: AssetType;
  table: string;
  imageTable: string;
  fk: string;
  pathPrefix: string;
  /** details key -> db column */
  columns: Record<string, string>;
};

type ImgRow = { id: string; storage_path: string; is_master: boolean } & Record<string, string | boolean>;

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_SIDE = 2560;

/** Downscale/re-encode large images so they fit the storage size limit. */
async function shrinkImage(file: File): Promise<File> {
  if (file.size <= MAX_BYTES) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  for (const q of [0.9, 0.8, 0.7, 0.6]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && (blob.size <= MAX_BYTES || q === 0.6)) {
      return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
    }
  }
  return file;
}

export function createRemoteAssets(cfg: RemoteConfig) {
  async function fetchAll(): Promise<Asset[]> {
    const [{ data: rows, error: e1 }, { data: imgs, error: e2 }] = await Promise.all([
      db.from(cfg.table).select("*").order("created_at"),
      db.from(cfg.imageTable).select("*").order("created_at"),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    const images = (imgs ?? []) as ImgRow[];
    const signed = new Map<string, string>();
    const paths = images.map((i) => i.storage_path);
    if (paths.length) {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGN_SECONDS);
      data?.forEach((d) => d.path && d.signedUrl && signed.set(d.path, d.signedUrl));
    }
    return ((rows ?? []) as Record<string, string>[]).map((r) => {
      const mine = images.filter((i) => i[cfg.fk] === r['id']);
      const details: Record<string, string> = {};
      for (const [k, col] of Object.entries(cfg.columns)) details[k] = r[col] ?? "";
      return {
        id: r['id'] as string,
        type: cfg.type,
        name: r['name'] ?? "",
        code: r['code'] ?? "",
        description: r['description'] ?? "",
        details,
        notes: r['notes'] ?? "",
        images: mine.map((i) => ({ id: i.id, url: signed.get(i.storage_path) ?? "", path: i.storage_path })),
        masterImageId: mine.find((i) => i.is_master)?.id ?? null,
      };
    });
  }

  async function save(a: Asset, previous: Asset | undefined) {
    const row: Record<string, string> = { name: a.name, code: a.code, description: a.description, notes: a.notes };
    for (const [k, col] of Object.entries(cfg.columns)) row[col] = a.details[k] ?? "";
    let id = previous?.id;
    if (id) {
      const { error } = await db.from(cfg.table).update(row).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await db.from(cfg.table).insert(row).select("id").single();
      if (error) throw error;
      id = data.id as string;
    }

    const keep = new Set(a.images.map((i) => i.id));
    const removed = (previous?.images ?? []).filter((i) => !keep.has(i.id));
    if (removed.length) {
      await db.from(cfg.imageTable).delete().in("id", removed.map((i) => i.id));
      const paths = removed.map((i) => i.path).filter(Boolean) as string[];
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    }

    await db.from(cfg.imageTable).update({ is_master: false }).eq(cfg.fk, id);
    let masterDbId: string | null = a.images.find((i) => i.id === a.masterImageId && !i.file)?.id ?? null;
    for (const img of a.images.filter((i) => i.file)) {
      const file = await shrinkImage(img.file as File);
      const ext = file.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${cfg.pathPrefix}${id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (upErr) {
        console.error("[upload] failed", path, upErr);
        throw new Error(`Không thể tải ảnh "${img.file?.name}" lên: ${upErr.message}`);
      }
      const { data, error } = await db
        .from(cfg.imageTable)
        .insert({ [cfg.fk]: id, storage_path: path, image_url: `${BUCKET}/${path}` })
        .select("id")
        .single();
      if (error) throw error;
      if (img.id === a.masterImageId) masterDbId = data.id as string;
    }
    if (!masterDbId) {
      const { data } = await db.from(cfg.imageTable).select("id").eq(cfg.fk, id).order("created_at").limit(1);
      masterDbId = data?.[0]?.id ?? null;
    }
    if (masterDbId) await db.from(cfg.imageTable).update({ is_master: true }).eq("id", masterDbId);
  }

  async function remove(a: Asset) {
    const paths = a.images.map((i) => i.path).filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    const { error } = await db.from(cfg.table).delete().eq("id", a.id);
    if (error) throw error;
  }

  function useList() {
    const [list, setList] = useState<Asset[]>([]);
    const [error, setError] = useState<string | null>(null);
    const reload = useCallback(async () => {
      try {
        setList(await fetchAll());
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

  return { fetchAll, save, remove, useList };
}
