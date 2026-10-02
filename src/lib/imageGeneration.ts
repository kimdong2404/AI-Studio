import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type GenerationMode = "economy" | "balanced" | "quality";
export const MODES: Array<{ id: GenerationMode; label: string; dot: string }> = [
  { id: "economy", label: "Tiết kiệm", dot: "🟢" },
  { id: "balanced", label: "Cân bằng", dot: "🟡" },
  { id: "quality", label: "Chất lượng cao", dot: "🔴" },
];
export const ASPECTS = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;
export const RESOLUTIONS = [
  { id: "auto", label: "Auto" },
  { id: "standard", label: "Standard" },
  { id: "high", label: "High" },
] as const;
export const COUNTS = [1, 2, 4] as const;
export const QUALITIES = [
  { id: "standard", label: "Standard" },
  { id: "high", label: "High" },
] as const;

export type ImageSettings = {
  mode: GenerationMode;
  aspect_ratio: string;
  resolution: string;
  image_count: number;
  quality: string;
};
export const DEFAULT_SETTINGS: ImageSettings = { mode: "economy", aspect_ratio: "1:1", resolution: "auto", image_count: 1, quality: "standard" };

export type ReferenceImage = { url: string; assetName: string; kind: string; role: string };

export type AiProvider = { id: string; name: string; code: string; enabled: boolean };
export type AiModel = {
  id: string;
  provider_id: string;
  name: string;
  code: string;
  generation_mode: GenerationMode;
  enabled: boolean;
  supports_reference_images: boolean;
};

/** Providers/models come from configuration tables only — nothing is hard-coded. */
export async function fetchProviderConfig(): Promise<{ providers: AiProvider[]; models: AiModel[] }> {
  const [p, m] = await Promise.all([
    db.from("ai_providers").select("id, name, code, enabled").eq("enabled", true),
    db.from("ai_models").select("id, provider_id, name, code, generation_mode, enabled, supports_reference_images").eq("enabled", true),
  ]);
  if (p.error) throw p.error;
  if (m.error) throw m.error;
  return { providers: p.data ?? [], models: m.data ?? [] };
}

export type GenerateImageInput = {
  provider: AiProvider | null;
  model: AiModel | null;
  prompt: string;
  referenceImages: ReferenceImage[];
  settings: ImageSettings;
};
export type GenerateImageResult = { images: string[] };

/** A provider implementation plugs in here later (registered by provider code). */
export type ProviderAdapter = (input: GenerateImageInput) => Promise<GenerateImageResult>;
const adapters: Record<string, ProviderAdapter> = {};
export function registerProvider(code: string, adapter: ProviderAdapter) {
  adapters[code] = adapter;
}

export class NotConnectedError extends Error {
  constructor() {
    super("AI Image Generation chưa được kết nối. Chưa có API nào được gọi.");
  }
}

/** Provider-agnostic entry point. With no provider/adapter configured, nothing is called. */
export async function generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
  const adapter = input.provider ? adapters[input.provider.code] : undefined;
  if (!input.provider || !input.model || !adapter) throw new NotConnectedError();
  return adapter(input);
}
