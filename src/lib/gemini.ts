import type { Asset } from "@/lib/assets";
import { nextId, type Scene } from "@/lib/storyboard";

export const GEMINI_KEY = "GEMINI_API_KEY";
export const HF_KEY = "HF_TOKEN";
const MODELS = ["gemini-1.5-flash", "gemini-2.5-flash"]; // fallback if 1.5 is retired

export const getKey = (k: string) => (typeof window === "undefined" ? "" : localStorage.getItem(k) ?? "");
export const setKey = (k: string, v: string) => (v.trim() ? localStorage.setItem(k, v.trim()) : localStorage.removeItem(k));

export class MissingKeyError extends Error {
  constructor() {
    super("Chưa có GEMINI_API_KEY.");
  }
}

type Raw = {
  id?: unknown; text?: unknown; prompt?: unknown; camera?: unknown; duration?: unknown;
  character_codes?: unknown; location_code?: unknown; ingredient_codes?: unknown; prop_codes?: unknown;
};

const codes = (v: unknown): string[] => (Array.isArray(v) ? v : v ? [v] : []).map((x) => String(x).trim().toUpperCase()).filter(Boolean);

/** Điền tên tài nguyên đính kèm lên các trường text (Nhân vật / Bối cảnh / Đạo cụ). */
export function syncAssetText(s: Scene, assets: Asset[]): Scene {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const names = (ids: string[]) => ids.map((id) => byId.get(id)?.name).filter(Boolean).join(", ");
  const ch = names(s.character_ids ?? []);
  const loc = s.location_id ? names([s.location_id]) : "";
  const pr = names([...(s.prop_ids ?? []), ...(s.ingredient_ids ?? [])]);
  return { ...s, character: ch || s.character, location: loc || s.location, props: pr || s.props };
}

const selectedContext = (selected: Asset[]) =>
  selected.length
    ? buildAssetContext(selected)
    : "(Chưa có tài nguyên nào được đính kèm — hãy tự chọn từ danh sách tài nguyên hiện có nếu phù hợp.)";

const PRIORITY_RULE = `QUY TẮC ƯU TIÊN TÀI NGUYÊN ĐÃ CHỌN (QUAN TRỌNG NHẤT): Nếu kịch bản chữ mâu thuẫn với Tài nguyên ĐÃ CHỌN/đính kèm (ví dụ kịch bản nói "con hẻm" nhưng bối cảnh đính kèm là "Vườn"), BẮT BUỘC viết prompt tiếng Anh theo Tài nguyên đính kèm (viết "Garden", KHÔNG viết "Alleyway"). Tài nguyên đính kèm luôn thắng kịch bản chữ về nhân vật, bối cảnh, đạo cụ.`;

const TYPE_LABEL: Record<Asset["type"], string> = {
  character: "CHARACTERS",
  location: "LOCATIONS",
  ingredient: "INGREDIENTS",
  prop: "PROPS",
};

/** Gom toàn bộ tài nguyên (tên, mã, mô tả, chi tiết) thành context gửi kèm cho Gemini. */
export function buildAssetContext(assets: Asset[]): string {
  const groups: Record<Asset["type"], string[]> = { character: [], location: [], ingredient: [], prop: [] };
  for (const a of assets) {
    const details = Object.entries(a.details ?? {})
      .filter(([, v]) => v && v.trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    const parts = [`- ${a.name} (${a.code})`];
    if (a.description?.trim()) parts.push(`Description: ${a.description.trim()}`);
    if (details) parts.push(`Details: ${details}`);
    if (a.notes?.trim()) parts.push(`Notes: ${a.notes.trim()}`);
    groups[a.type].push(parts.join(". "));
  }
  const sections = (Object.keys(groups) as Asset["type"][])
    .filter((t) => groups[t].length > 0)
    .map((t) => `${TYPE_LABEL[t]}:\n${groups[t].join("\n")}`);
  return sections.length ? sections.join("\n\n") : "(Chưa có tài nguyên nào trong thư viện.)";
}

const PROMPT = (script: string, assetContext: string, selected: string) => `Bạn là một Chuyên gia Prompt Engineer cho Midjourney & Sora, đồng thời là đạo diễn storyboard.

NHIỆM VỤ: Chia kịch bản sau thành các phân cảnh và viết prompt tiếng Anh cực kỳ chi tiết cho từng cảnh.

DANH SÁCH TÀI NGUYÊN HIỆN CÓ CỦA DỰ ÁN (nhân vật, bối cảnh, nguyên liệu, đạo cụ người dùng đã tải ảnh tham chiếu):
${assetContext}

TÀI NGUYÊN ĐÃ CHỌN / ĐÍNH KÈM VÀO STORYBOARD (ưu tiên tuyệt đối):
${selected}

${PRIORITY_RULE}

QUY TẮC BẮT BUỘC khi viết trường "prompt" (image_prompt / video_prompt):
1. TUYỆT ĐỐI BÁM SÁT TÀI NGUYÊN: Nếu cảnh quay có xuất hiện Nhân vật, Bối cảnh, Nguyên liệu hoặc Đạo cụ nằm trong danh sách Tài nguyên ở trên, phải CHỈ ĐÍCH DANH tên của chúng trong prompt tiếng Anh, kèm theo câu lệnh nhấn mạnh: (strictly maintaining visual consistency with the reference image of [Tên tài nguyên]).
2. CHI TIẾT HÓA (High-Fidelity): Prompt phải dài, mô tả cực kỳ chi tiết về trang phục, biểu cảm, màu sắc, ánh sáng (cinematic lighting, volumetric light) và chất lượng (8k, photorealistic, hyper-detailed).
3. GÓC MÁY & CHUYỂN ĐỘNG: Mô tả rõ camera đang làm gì (panning, zooming, close-up...) và hành động vật lý của nhân vật.
4. KHÔNG BỊA TÀI NGUYÊN: Không tự ý thêm nhân vật/đạo cụ mới nếu kịch bản không yêu cầu; không bịa thông tin trái với mô tả tài nguyên.

ĐỊNH DẠNG TRẢ VỀ: DUY NHẤT một JSON Array, mỗi phần tử có dạng:
{"id": số thứ tự, "text": "mô tả cảnh bằng tiếng Việt", "prompt": "detailed English image/video prompt theo các quy tắc trên", "camera": "một trong: Toàn cảnh, Toàn thân, Trung cảnh, Cận cảnh, Cực cận, Góc thấp, Góc cao, Over-the-shoulder, POV", "duration": "số giây, ví dụ 4 giây", "character_codes": ["MÃ nhân vật xuất hiện"], "location_code": "MÃ bối cảnh hoặc null", "ingredient_codes": ["MÃ"], "prop_codes": ["MÃ"]}
Các trường *_code(s) phải dùng đúng MÃ (code trong ngoặc) của tài nguyên trong danh sách, và phải khớp với những gì được viết trong prompt.

KỊCH BẢN:
${script}`;

async function callGemini(text: string): Promise<unknown> {
  const key = getKey(GEMINI_KEY);
  if (!key) throw new MissingKeyError();
  let lastErr = "";
  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      }),
    });
    if (res.status === 404) {
      lastErr = `Model ${model} không khả dụng.`;
      continue;
    }
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error?.message ?? `Gemini lỗi ${res.status}`);
    const text: string = body?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    const json = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    try {
      return JSON.parse(json);
    } catch {
      throw new Error("Gemini trả về dữ liệu không đúng định dạng JSON.");
    }
  }
  throw new Error(lastErr || "Không gọi được Gemini.");
}


export async function analyzeWithGemini(script: string, assets: Asset[] = [], selected: Asset[] = []): Promise<Scene[]> {
  const parsed = (await callGemini(PROMPT(script, buildAssetContext(assets), selectedContext(selected)))) as { scenes?: Raw[] } | Raw[];
  const arr = Array.isArray(parsed) ? parsed : parsed?.scenes;
  if (!Array.isArray(arr)) throw new Error("Gemini trả về dữ liệu không đúng định dạng JSON.");
  const byCode = new Map(assets.map((a) => [a.code.toUpperCase(), a]));
  const pick = (v: unknown, t: Asset["type"]) => codes(v).map((c) => byCode.get(c)).filter((a): a is Asset => !!a && a.type === t).map((a) => a.id);
  const selLoc = selected.filter((a) => a.type === "location");
  return arr.map((r, i) => {
    const t = String(r.text ?? "").trim() || `Cảnh ${i + 1}`;
    const words = t.replace(/[.!?]+$/, "").split(/\s+/).slice(0, 8).join(" ");
    const d = String(r.duration ?? "").trim();
    const scene: Scene = {
      id: nextId(),
      title: words,
      description: t,
      character: "—",
      location: "—",
      props: "—",
      camera: String(r.camera ?? "Trung cảnh"),
      duration: /^\d+(\.\d+)?$/.test(d) ? `${d} giây` : d || "4 giây",
      location_id: pick(r.location_code, "location")[0] ?? (selLoc.length === 1 ? selLoc[0].id : null),
      action: String(r.prompt ?? ""),
      expression: "",
      camera_movement: "",
      lighting: "",
      time_of_day: "",
      visual_style: "",
      dialogue: "",
      sound_effect: "",
      ambient_sound: "",
      character_ids: [...new Set(pick(r.character_codes, "character"))],
      character_expressions: {},
      ingredient_ids: [...new Set(pick(r.ingredient_codes, "ingredient"))],
      prop_ids: [...new Set(pick(r.prop_codes, "prop"))],
    };
    return syncAssetText(scene, assets);
  });
}

/** Viết lại prompt tiếng Anh của 1 cảnh theo đúng tài nguyên đang đính kèm trong thẻ. */
export async function rewriteScenePrompt(scene: Scene, assets: Asset[]): Promise<string> {
  const ids = new Set([...(scene.character_ids ?? []), ...(scene.ingredient_ids ?? []), ...(scene.prop_ids ?? []), ...(scene.location_id ? [scene.location_id] : [])]);
  const attached = assets.filter((a) => ids.has(a.id));
  const text = `Bạn là Chuyên gia Prompt Engineer cho Midjourney & Sora.
Viết lại MỘT prompt tiếng Anh cực kỳ chi tiết (cinematic lighting, volumetric light, 8k, photorealistic, hyper-detailed; mô tả góc máy, chuyển động camera, hành động vật lý) cho phân cảnh dưới đây.

TÀI NGUYÊN ĐÍNH KÈM CỦA CẢNH:
${selectedContext(attached)}

${PRIORITY_RULE}
Với mỗi tài nguyên đính kèm, chỉ đích danh tên của nó kèm câu: (strictly maintaining visual consistency with the reference image of [Tên tài nguyên]). Không thêm nhân vật/bối cảnh không có.

PHÂN CẢNH: ${scene.description}
Góc máy: ${scene.camera}. Chuyển động: ${scene.camera_movement || "tự chọn"}. Ánh sáng: ${scene.lighting || "tự chọn"}. Thời gian: ${scene.time_of_day || "tự chọn"}. Phong cách: ${scene.visual_style || "photorealistic"}.
Prompt cũ (có thể sai bối cảnh, chỉ tham khảo hành động): ${scene.action}

Trả về JSON: {"prompt": "..."}`;
  const r = (await callGemini(text)) as { prompt?: unknown };
  const p = String(r?.prompt ?? "").trim();
  if (!p) throw new Error("Gemini không trả về prompt.");
  return p;
}
