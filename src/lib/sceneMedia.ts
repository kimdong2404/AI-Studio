import { masterUrl, type Asset } from "@/lib/assets";
import type { Scene } from "@/lib/storyboard";
import { getKey, HF_KEY, HF_MODEL_KEY, DEFAULT_HF_MODEL } from "@/lib/gemini";

/** Model ID comes from Settings (localStorage) — never hard-coded here. */
export const getHfModel = () => {
  // Accept a bare ID or a pasted URL; keep only "owner/model".
  const raw = (getKey(HF_MODEL_KEY) || "").trim().replace(/^https?:\/\/[^/]+\/(hf-inference\/)?(models\/)?/, "").replace(/\/+$/, "");
  return raw || DEFAULT_HF_MODEL;
};

/** Hugging Face retired api-inference.huggingface.co (it no longer responds → "Failed to fetch"). */
export const HF_INFERENCE_BASE = "https://router.huggingface.co/hf-inference/models/";

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
 * FLUX.1-schnell / SDXL are text-to-image only (no `image` param), so reference assets are
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

/** Blob → data URL (for localStorage persistence; blob URLs die on reload). */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

/**
 * Calls Hugging Face Inference directly from the browser, with automatic model fallback:
 * - Outer loop walks a fallback list (user's model from Settings first, then free backups).
 * - Inner loop retries each model twice on 503 (cold start), waiting `estimated_time`.
 * - 400/401/410/429 or a failed fetch breaks to the next model immediately.
 * - On success: Blob → object URL for display + data URL for storage, then return.
 */
export async function generateSceneImage(scene: Scene, assets: Asset[], onStatus?: (msg: string) => void): Promise<string> {
  const hfToken = getHfToken();
  if (!hfToken) throw new MissingHfTokenError();
  const prompt = buildImagePrompt(scene, assets);

  // Fallback chain: the model from Settings first, then stable free backups (deduped).
  const modelsToTry = [
    ...new Set([
      getHfModel(),
      "Lykon/dreamshaper-8",
      "runwayml/stable-diffusion-v1-5",
      "prompthero/openjourney-v4",
    ]),
  ].filter(Boolean);

  try {
    for (const currentModel of modelsToTry) {
      onStatus?.(`Đang thử: ${currentModel}...`);

      // Inner loop: cold-start retry (2 attempts) for the current model.
      for (let attempt = 1; attempt <= 2; attempt++) {
        let response: Response;
        try {
          response = await fetch(`${HF_INFERENCE_BASE}${currentModel}`, {
            method: "POST",
            headers: {
              Authorization: "Bearer " + hfToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: prompt }),
          });
        } catch (fetchError) {
          // Fetch failed (network/CORS) — skip straight to the next model.
          console.error(`[generateSceneImage] ${currentModel} fetch failed:`, fetchError);
          break;
        }

        if (response.ok) {
          // Success: read as Blob, make an object URL for immediate display.
          const blob = await response.blob();
          if (!blob.type.startsWith("image/")) {
            throw new Error(`Hugging Face trả về dữ liệu không phải ảnh (${blob.type || "không rõ"}).`);
          }
          const imageUrl = URL.createObjectURL(blob);
          // Persist a data-URL copy so the image survives reload (blob URLs don't).
          try {
            storeSceneImage(scene.id, await blobToDataUrl(blob));
          } catch { /* best effort */ }
          return imageUrl;
        }

        if (response.status === 503) {
          // Model is loading (cold start) — wait the estimated time, then retry this model.
          let estimated = 10;
          try {
            const j = await response.json();
            if (typeof j.estimated_time === "number") estimated = Math.max(2, Math.ceil(j.estimated_time));
          } catch { /* body wasn't JSON — keep default */ }
          for (let s = estimated; s > 0; s--) {
            onStatus?.(`Mô hình ${currentModel} đang khởi động, chờ ${s} giây... (lần ${attempt}/2)`);
            await sleep(1000);
          }
          continue;
        }

        // 400/401/410/429 or anything else — break to the next model.
        const detail = await response.text().catch(() => "");
        console.error(`[generateSceneImage] ${currentModel} HTTP ${response.status}: ${detail.slice(0, 300)}`);
        break;
      }
      // This model failed — the outer loop moves to the next one automatically.
    }
    throw new Error("Tất cả các mô hình đều đang quá tải hoặc hết Quota. Vui lòng thử lại sau.");
  } catch (e) {
    console.error("[generateSceneImage]", e);
    throw e;
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
