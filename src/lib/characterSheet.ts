import { supabase } from "@/integrations/supabase/client";
import { BUCKET, SIGN_SECONDS, shrinkImage } from "./remoteAssets";
import type { AssetImage } from "./assets";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const SHEET_GROUPS: Array<{ n: string; t: string; fields: Array<{ key: string; label: string; long?: boolean }> }> = [
  { n: "①", t: "Thông tin cơ bản", fields: [
    { key: "species", label: "Loài" },
    { key: "breed", label: "Giống" },
    { key: "height", label: "Chiều cao / kích thước tương đối" },
    { key: "build", label: "Dáng người" },
  ] },
  { n: "②", t: "👤 Ngoại hình", fields: [
    { key: "overall_color", label: "Màu sắc tổng thể" },
    { key: "hair_color", label: "Màu tóc / lông" },
    { key: "pattern", label: "Hoa văn / pattern" },
    { key: "eye_color", label: "Màu mắt" },
    { key: "face_shape", label: "Hình dạng khuôn mặt" },
    { key: "ears", label: "Đặc điểm tai" },
    { key: "nose", label: "Đặc điểm mũi" },
    { key: "mouth", label: "Đặc điểm miệng" },
    { key: "body_features", label: "Đặc điểm cơ thể" },
    { key: "special_marks", label: "Đặc điểm nhận diện đặc biệt" },
    { key: "identity_description", label: "Identity Description — mô tả toàn bộ ngoại hình", long: true },
    { key: "appearance_description", label: "Ghi chú ngoại hình thêm", long: true },
  ] },
  { n: "③", t: "👕 Trang phục", fields: [
    { key: "outfit_main", label: "Trang phục chính" },
    { key: "outfit_color", label: "Màu sắc" },
    { key: "outfit_style", label: "Kiểu dáng" },
    { key: "footwear", label: "Giày dép" },
    { key: "accessories", label: "Phụ kiện" },
    { key: "outfit_details", label: "Chi tiết đặc biệt" },
    { key: "outfit_description", label: "Outfit Description", long: true },
  ] },
  { n: "④", t: "🎭 Tính cách", fields: [
    { key: "personality", label: "Tính cách" },
    { key: "demeanor", label: "Phong thái" },
    { key: "usual_expression", label: "Biểu cảm thường dùng (thông tin chung)" },
    { key: "behavior", label: "Hành vi đặc trưng" },
  ] },
  { n: "⑥", t: "🔒 Identity Lock", fields: [
    { key: "character_identity", label: "Character Identity", long: true },
    { key: "consistency_instruction", label: "Consistency Instruction", long: true },
    { key: "appearance_lock", label: "Appearance Lock", long: true },
    { key: "outfit_lock", label: "Outfit Lock", long: true },
    { key: "important_details", label: "Important Details", long: true },
    { key: "negative_avoid_changes", label: "Negative / Avoid Changes", long: true },
  ] },
];
export const SHEET_KEYS = SHEET_GROUPS.flatMap((g) => g.fields.map((f) => f.key));
export const LOCK_KEYS = SHEET_GROUPS.find((g) => g.n === "⑥")!.fields.map((f) => f.key);
export type Sheet = Record<string, string>;

export async function fetchSheet(characterId: string): Promise<Sheet | null> {
  const { data, error } = await db.from("character_sheets").select("*").eq("character_id", characterId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveSheet(characterId: string, sheet: Sheet) {
  const row: Record<string, string> = { character_id: characterId, updated_at: new Date().toISOString() };
  for (const k of SHEET_KEYS) row[k] = sheet[k] ?? "";
  const { error } = await db.from("character_sheets").upsert(row, { onConflict: "character_id" });
  if (error) throw error;
}

export const EXPR_FIELDS = [
  { key: "description", label: "Mô tả biểu cảm", long: true },
  { key: "facial_features", label: "Đặc điểm khuôn mặt", long: true },
  { key: "eyes", label: "Mắt" },
  { key: "brows_ears", label: "Lông mày / tai" },
  { key: "mouth", label: "Miệng" },
  { key: "head_pose", label: "Tư thế đầu" },
  { key: "notes", label: "Ghi chú", long: true },
] as const;

export type Expression = {
  id: string | null; // null until the database creates it
  character_id: string;
  name: string;
  code: string;
  fields: Record<string, string>;
  images: AssetImage[];
  masterImageId: string | null;
};

export type ExpressionLite = { id: string; character_id: string; name: string };

async function sign(paths: string[]) {
  const m = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGN_SECONDS);
    data?.forEach((d) => d.path && d.signedUrl && m.set(d.path, d.signedUrl));
  }
  return m;
}

export async function fetchExpressions(characterId: string): Promise<Expression[]> {
  const { data: rows, error } = await db.from("character_expressions").select("*").eq("character_id", characterId).order("created_at");
  if (error) throw error;
  const ids = (rows ?? []).map((r: { id: string }) => r.id);
  let imgs: Array<{ id: string; expression_id: string; storage_path: string; is_master: boolean }> = [];
  if (ids.length) {
    const { data, error: e2 } = await db.from("character_expression_images").select("*").in("expression_id", ids).order("created_at");
    if (e2) throw e2;
    imgs = data ?? [];
  }
  const signed = await sign(imgs.map((i) => i.storage_path));
  return (rows ?? []).map((r: Record<string, string>) => {
    const mine = imgs.filter((i) => i.expression_id === r["id"]);
    const fields: Record<string, string> = {};
    for (const f of EXPR_FIELDS) fields[f.key] = r[f.key] ?? "";
    return {
      id: r["id"],
      character_id: r["character_id"],
      name: r["name"] ?? "",
      code: r["code"] ?? "",
      fields,
      images: mine.map((i) => ({ id: i.id, url: signed.get(i.storage_path) ?? "", path: i.storage_path })),
      masterImageId: mine.find((i) => i.is_master)?.id ?? null,
    } as Expression;
  });
}

export async function fetchAllExpressionsLite(): Promise<ExpressionLite[]> {
  const { data, error } = await db.from("character_expressions").select("id, character_id, name").order("created_at");
  if (error) throw error;
  return data ?? [];
}

/** Create/update expression first (real DB id), then upload images, then set master. */
export async function saveExpression(e: Expression, previous: Expression | undefined) {
  const row: Record<string, string> = { character_id: e.character_id, name: e.name, code: e.code };
  for (const f of EXPR_FIELDS) row[f.key] = e.fields[f.key] ?? "";
  let id = e.id;
  if (id) {
    const { error } = await db.from("character_expressions").update(row).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await db.from("character_expressions").insert(row).select("id").single();
    if (error) throw error;
    id = data.id as string;
  }
  if (!id) throw new Error("Không nhận được ID biểu cảm từ database.");

  const keep = new Set(e.images.map((i) => i.id));
  const removed = (previous?.images ?? []).filter((i) => !keep.has(i.id));
  if (removed.length) {
    await db.from("character_expression_images").delete().in("id", removed.map((i) => i.id));
    const paths = removed.map((i) => i.path).filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  }

  await db.from("character_expression_images").update({ is_master: false }).eq("expression_id", id);
  let masterDbId: string | null = e.images.find((i) => i.id === e.masterImageId && !i.file)?.id ?? null;
  for (const img of e.images.filter((i) => i.file)) {
    const file = await shrinkImage(img.file as File);
    const ext = file.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `expressions/${id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
    if (upErr) throw new Error(`Không thể tải ảnh "${img.file?.name}" lên: ${upErr.message}`);
    const { data, error } = await db
      .from("character_expression_images")
      .insert({ expression_id: id, storage_path: path, image_url: `${BUCKET}/${path}` })
      .select("id")
      .single();
    if (error) throw error;
    if (img.id === e.masterImageId) masterDbId = data.id as string;
  }
  if (masterDbId) await db.from("character_expression_images").update({ is_master: true }).eq("id", masterDbId);
}

export async function deleteExpression(e: Expression) {
  if (!e.id) return;
  const paths = e.images.map((i) => i.path).filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  const { error } = await db.from("character_expressions").delete().eq("id", e.id);
  if (error) throw error;
}

export const VIEW_TYPES = ["Master", "Front", "Side", "Back", "Face", "Full Body", "Outfit", "Other"];

export async function fetchViewTypes(characterId: string): Promise<Record<string, string>> {
  const { data, error } = await db.from("character_images").select("id, view_type").eq("character_id", characterId);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r: { id: string; view_type: string }) => [r.id, r.view_type ?? ""]));
}

export async function saveViewTypes(map: Record<string, string>) {
  for (const [id, v] of Object.entries(map)) {
    const { error } = await db.from("character_images").update({ view_type: v }).eq("id", id);
    if (error) throw error;
  }
}

export async function fetchSheetSummaries(): Promise<Record<string, { sheet: boolean; expressions: number }>> {
  const [{ data: s }, { data: e }] = await Promise.all([
    db.from("character_sheets").select("character_id"),
    db.from("character_expressions").select("character_id"),
  ]);
  const out: Record<string, { sheet: boolean; expressions: number }> = {};
  for (const r of s ?? []) out[r.character_id] = { sheet: true, expressions: 0 };
  for (const r of e ?? []) {
    out[r.character_id] ??= { sheet: false, expressions: 0 };
    out[r.character_id]!.expressions++;
  }
  return out;
}
