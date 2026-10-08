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

type Raw = { id?: unknown; text?: unknown; prompt?: unknown; camera?: unknown; duration?: unknown };

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

const PROMPT = (script: string, assetContext: string) => `Bạn là một Chuyên gia Prompt Engineer cho Midjourney & Sora, đồng thời là đạo diễn storyboard.

NHIỆM VỤ: Chia kịch bản sau thành các phân cảnh và viết prompt tiếng Anh cực kỳ chi tiết cho từng cảnh.

DANH SÁCH TÀI NGUYÊN HIỆN CÓ CỦA DỰ ÁN (nhân vật, bối cảnh, nguyên liệu, đạo cụ người dùng đã tải ảnh tham chiếu):
${assetContext}

QUY TẮC BẮT BUỘC khi viết trường "prompt" (image_prompt / video_prompt):
1. TUYỆT ĐỐI BÁM SÁT TÀI NGUYÊN: Nếu cảnh quay có xuất hiện Nhân vật, Bối cảnh, Nguyên liệu hoặc Đạo cụ nằm trong danh sách Tài nguyên ở trên, phải CHỈ ĐÍCH DANH tên của chúng trong prompt tiếng Anh, kèm theo câu lệnh nhấn mạnh: (strictly maintaining visual consistency with the reference image of [Tên tài nguyên]).
2. CHI TIẾT HÓA (High-Fidelity): Prompt phải dài, mô tả cực kỳ chi tiết về trang phục, biểu cảm, màu sắc, ánh sáng (cinematic lighting, volumetric light) và chất lượng (8k, photorealistic, hyper-detailed).
3. GÓC MÁY & CHUYỂN ĐỘNG: Mô tả rõ camera đang làm gì (panning, zooming, close-up...) và hành động vật lý của nhân vật.
4. KHÔNG BỊA TÀI NGUYÊN: Không tự ý thêm nhân vật/đạo cụ mới nếu kịch bản không yêu cầu; không bịa thông tin trái với mô tả tài nguyên.

ĐỊNH DẠNG TRẢ VỀ: DUY NHẤT một JSON Array, mỗi phần tử có dạng:
{"id": số thứ tự, "text": "mô tả cảnh bằng tiếng Việt", "prompt": "detailed English image/video prompt theo các quy tắc trên", "camera": "một trong: Toàn cảnh, Toàn thân, Trung cảnh, Cận cảnh, Cực cận, Góc thấp, Góc cao, Over-the-shoulder, POV", "duration": "số giây, ví dụ 4 giây"}

KỊCH BẢN:
${script}`;

export async function analyzeWithGemini(script: string, assets: Asset[] = []): Promise<Scene[]> {
  const key = getKey(GEMINI_KEY);
  if (!key) throw new MissingKeyError();
  const assetContext = buildAssetContext(assets);
  let lastErr = "";
  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: PROMPT(script, assetContext) }] }],
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
    let arr: Raw[];
    try {
      const parsed = JSON.parse(json);
      arr = Array.isArray(parsed) ? parsed : parsed?.scenes;
      if (!Array.isArray(arr)) throw new Error();
    } catch {
      throw new Error("Gemini trả về dữ liệu không đúng định dạng JSON.");
    }
    return arr.map((r, i) => {
      const t = String(r.text ?? "").trim() || `Cảnh ${i + 1}`;
      const words = t.replace(/[.!?]+$/, "").split(/\s+/).slice(0, 8).join(" ");
      const d = String(r.duration ?? "").trim();
      return {
        id: nextId(),
        title: words,
        description: t,
        character: "—",
        location: "—",
        props: "—",
        camera: String(r.camera ?? "Trung cảnh"),
        duration: /^\d+(\.\d+)?$/.test(d) ? `${d} giây` : d || "4 giây",
        location_id: null,
        action: String(r.prompt ?? ""),
        expression: "",
        camera_movement: "",
        lighting: "",
        time_of_day: "",
        visual_style: "",
        dialogue: "",
        sound_effect: "",
        ambient_sound: "",
        character_ids: [],
        character_expressions: {},
        ingredient_ids: [],
        prop_ids: [],
      };
    });
  }
  throw new Error(lastErr || "Không gọi được Gemini.");
}
