import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Server-side proxy to Hugging Face Inference (avoids browser CORS). One attempt; client handles retries. */
export const hfGenerateImage = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ token: z.string().min(1).max(500), model: z.string().min(1).max(200), prompt: z.string().min(1).max(8000) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const res = await fetch(`https://api-inference.huggingface.co/models/${data.model}`, {
        method: "POST",
        headers: { Authorization: "Bearer " + data.token, "Content-Type": "application/json", Accept: "image/png", "x-wait-for-model": "true" },
        body: JSON.stringify({ inputs: data.prompt, parameters: { width: 1024, height: 576 } }),
      });
      const ct = res.headers.get("content-type") ?? "";
      if (res.ok && ct.startsWith("image/")) {
        const buf = new Uint8Array(await res.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        return { ok: true as const, dataUrl: `data:${ct};base64,${btoa(bin)}` };
      }
      const text = await res.text();
      let error = text.slice(0, 500);
      let estimated_time: number | null = null;
      try {
        const j = JSON.parse(text);
        error = String(j.error ?? error);
        estimated_time = typeof j.estimated_time === "number" ? j.estimated_time : null;
      } catch { /* not JSON */ }
      return { ok: false as const, status: res.status, error: error || `HTTP ${res.status}`, estimated_time };
    } catch (e) {
      return { ok: false as const, status: 0, error: e instanceof Error ? e.message : String(e), estimated_time: null };
    }
  });
