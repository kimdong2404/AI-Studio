import { masterUrl, type Asset } from "@/lib/assets";
import type { Scene } from "@/lib/storyboard";
import { getKey, HF_KEY, HF_MODEL_KEY, DEFAULT_HF_MODEL } from "@/lib/gemini";

/** Model ID comes from Settings (localStorage) — never hard-coded here. */
export const getHfModel = () => getKey(HF_MODEL_KEY) || DEFAULT_HF_MODEL;
const HF_URL = (model: string) => `https://api-inference.huggingface.co/models/${model}`;

export class MissingHfTokenError extends Error {
  constructor() {
    super("Chưa có Hugging Face Token.");
  }
}

export const getHfToken = () => getKey(HF_KEY) || getKey("HUGGINGFACE_TOKEN");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function attachedAssets(scene: Scene, assets: Asset[]) {
  const ids = new Set([...(scene.location_id ? [scene.location_id] : []), ...scene.character_ids, ...scene.prop_ids, ...scene.ingredient_ids]);
  return assets.filter((a) => ids.has(a.id));
}

/**
 * FLUX.1-schnell is text-to-image only (no `image` param), so reference assets are
 * folded into the prompt as names + descriptions + reference-image URLs.
 */
export function buildImagePrompt(scene: Scene, assets: Asset[]): string {
  const base = (scene.action || scene.description).trim();
  const refs = attachedAssets(scene, assets).map((a) => {
    const url = masterUrl(a);
    return `${a.name}${a.description ? ` (${a.description.trim()})` : ""}${url ? ` [reference image: ${url}]` : ""}`;
  });
  return refs.length ? `${base}\n\nStrictly maintain visual consistency with these references: ${refs.join("; ")}` : base;
}

/** Calls Hugging Face, returns a data URL of the generated image. Retries while the model is loading / overloaded. */
export async function generateSceneImage(scene: Scene, assets: Asset[], onStatus?: (msg: string) => void): Promise<string> {
  const token = getHfToken();
  if (!token) throw new MissingHfTokenError();
  const prompt = buildImagePrompt(scene, assets);
  const delays = [2, 4, 6];
  const model = getHfModel();
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(HF_URL(model), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "image/png" },
      body: JSON.stringify({ inputs: prompt, parameters: { width: 1024, height: 576 } }),
    });
    if (res.ok) {
      const blob = await res.blob();
      return await new Promise<string>((ok, bad) => {
        const fr = new FileReader();
        fr.onload = () => ok(String(fr.result));
        fr.onerror = () => bad(fr.error);
        fr.readAsDataURL(blob);
      });
    }
    const body = await res.json().catch(() => null);
    const msg = String(body?.error ?? `Hugging Face lỗi ${res.status}`);
    if ((res.status === 503 || res.status === 429) && attempt < delays.length) {
      onStatus?.(`Đang thử lại... (lần ${attempt + 1}/${delays.length})`);
      await sleep(delays[attempt]! * 1000);
      continue;
    }
    if (res.status === 401 || res.status === 403) throw new Error("Hugging Face Token không hợp lệ hoặc thiếu quyền Inference.");
    if (res.status === 404 || res.status === 410 || /deprecated|not found|does not exist/i.test(msg)) {
      throw new Error(`Model "${model}" không còn khả dụng — hãy mở ⚙️ Cài đặt và đổi Hugging Face Model ID.`);
    }
    throw new Error(msg);
  }
}

/* ---------- local persistence (images are large → best effort) ---------- */
const imgKey = (id: string) => `scene_image_${id}`;
export const loadSceneImage = (id: string) => (typeof window === "undefined" ? null : localStorage.getItem(imgKey(id)));
export function storeSceneImage(id: string, dataUrl: string) {
  try {
    localStorage.setItem(imgKey(id), dataUrl);
  } catch {
    /* quota exceeded — keep in memory only */
  }
}

/* ---------- free Vietnamese TTS via the browser's Web Speech API ---------- */
export const ttsSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

function viVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang.toLowerCase().startsWith("vi")) ?? undefined;
}

export const hasVietnameseVoice = () => ttsSupported() && !!viVoice();

/** Speaks the text; resolves when finished or stopped. */
export function speakVietnamese(text: string, onEnd?: () => void) {
  if (!ttsSupported()) throw new Error("Trình duyệt không hỗ trợ đọc giọng nói.");
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "vi-VN";
  const v = viVoice();
  if (v) u.voice = v;
  u.rate = 0.95;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}
export const stopSpeaking = () => ttsSupported() && window.speechSynthesis.cancel();
