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

const PROMPT = (script: string) => `Bạn là đạo diễn storyboard. Chia kịch bản sau thành các phân cảnh.
Trả về DUY NHẤT một JSON Array, mỗi phần tử có dạng:
{"id": số thứ tự, "text": "mô tả cảnh bằng tiếng Việt", "prompt": "detailed English image/video prompt", "camera": "một trong: Toàn cảnh, Toàn thân, Trung cảnh, Cận cảnh, Cực cận, Góc thấp, Góc cao, Over-the-shoulder, POV", "duration": "số giây, ví dụ 4 giây"}

KỊCH BẢN:
${script}`;

export async function analyzeWithGemini(script: string): Promise<Scene[]> {
  const key = getKey(GEMINI_KEY);
  if (!key) throw new MissingKeyError();
  let lastErr = "";
  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: PROMPT(script) }] }],
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
