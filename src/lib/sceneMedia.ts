import { masterUrl, type Asset } from "@/lib/assets";
import type { Scene } from "@/lib/storyboard";
import { getKey, HF_KEY, HF_MODEL_KEY, DEFAULT_HF_MODEL } from "@/lib/gemini";
import { hfGenerateImage } from "@/lib/hfImage.functions";

/** Model ID comes from Settings (localStorage) — never hard-coded here. */
export const getHfModel = () => getKey(HF_MODEL_KEY) || DEFAULT_HF_MODEL;

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

/** Calls Hugging Face via our server (no CORS). Handles cold start: waits estimated_time then retries (max 3). */
export async function generateSceneImage(scene: Scene, assets: Asset[], onStatus?: (msg: string) => void): Promise<string> {
  const token = getHfToken();
  if (!token) throw new MissingHfTokenError();
  const prompt = buildImagePrompt(scene, assets);
  const model = getHfModel();
  const MAX = 3;
  for (let attempt = 0; ; attempt++) {
    let r: Awaited<ReturnType<typeof hfGenerateImage>>;
    try {
      r = await hfGenerateImage({ data: { token, model, prompt } });
    } catch (e) {
      throw new Error(`Không kết nối được máy chủ tạo ảnh: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (r.ok) return r.dataUrl;
    const { status, error: msg, estimated_time } = r;
    const loading = estimated_time != null || /loading/i.test(msg);
    if ((loading || status === 503 || status === 429) && attempt < MAX) {
      const wait = Math.min(Math.max(Math.ceil(estimated_time ?? [5, 10, 20][attempt]!), 2), 120);
      for (let s = wait; s > 0; s--) {
        onStatus?.(loading ? `Đang tải mô hình, vui lòng chờ ${s} giây... (lần ${attempt + 1}/${MAX})` : `Hugging Face quá tải (${status}), thử lại sau ${s} giây... (lần ${attempt + 1}/${MAX})`);
        await sleep(1000);
      }
      continue;
    }
    if (status === 401 || status === 403) throw new Error(`Lỗi ${status}: Hugging Face Token không hợp lệ hoặc thiếu quyền Inference. (${msg})`);
    if (status === 404 || status === 410 || /deprecated|not found|does not exist/i.test(msg)) {
      throw new Error(`Lỗi ${status}: Model "${model}" không còn khả dụng — hãy mở ⚙️ Cài đặt và đổi Hugging Face Model ID. (${msg})`);
    }
    throw new Error(`Hugging Face lỗi ${status || "mạng"}: ${msg}`);
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
