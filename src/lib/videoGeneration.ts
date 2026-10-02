import { supabase } from "@/integrations/supabase/client";
import { block, charSection, has, para, sentence, v, type PromptCtx } from "./promptBuilder";
import type { AiModel, AiProvider, GenerationMode, ReferenceImage } from "./imageGeneration";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const VIDEO_ASPECTS = ["16:9", "9:16", "1:1", "4:3", "3:4"] as const;
export const VIDEO_RESOLUTIONS = [
  { id: "auto", label: "Auto" },
  { id: "standard", label: "Standard" },
  { id: "high", label: "High" },
] as const;
export const FRAME_RATES = [
  { id: "auto", label: "Auto" },
  { id: "24", label: "24 fps" },
  { id: "30", label: "30 fps" },
] as const;
export const VIDEO_QUALITIES = [
  { id: "standard", label: "Standard" },
  { id: "high", label: "High" },
] as const;
/** Extend this list when a provider supports more lengths. */
export const DURATIONS = ["5s", "8s", "10s"] as const;
export const CAMERA_ANGLES = ["Eye level", "Low angle", "High angle", "Top down", "Wide angle", "Close-up", "Medium shot", "Full shot"];
export const CAMERA_MOVES = ["Static", "Slow push in", "Slow pull out", "Pan left", "Pan right", "Tilt up", "Tilt down", "Tracking", "Dolly", "Orbit"];

export type VideoSettings = {
  mode: GenerationMode;
  aspect_ratio: string;
  resolution: string;
  frame_rate: string;
  quality: string;
};
export const DEFAULT_VIDEO_SETTINGS: VideoSettings = { mode: "economy", aspect_ratio: "16:9", resolution: "auto", frame_rate: "auto", quality: "standard" };

/** Per-scene overrides set on the video page; never written back to the scene. */
export type VideoShot = { camera: string; camera_movement: string; duration: string; prev_scene_id: string; next_scene_id: string };

export function buildVideoPrompt(c: PromptCtx, shot: VideoShot, neighbours: { prev?: string; next?: string }): string {
  const s = c.scene;
  const L = c.location;
  const P: string[] = [];
  P.push(
    block("SCENE", [
      `Scene ${String(c.index + 1).padStart(2, "0")}${has(s.title) ? ` — ${v(s.title)}` : ""}`,
      has(s.description) ? sentence(s.description) : "",
      has(shot.duration) ? `Video duration: ${v(shot.duration)}.` : "",
    ]),
  );
  if (c.characters.length) P.push("[CHARACTERS]\n" + c.characters.map((ch, i) => charSection(ch, i + 1, s)).join("\n\n"));
  P.push(
    block(
      "CHARACTER IDENTITY & CONSISTENCY",
      c.characters.map(
        ({ asset: a }) =>
          `${a.name}: consistent with the character reference image, exactly as shown in the master image. Keep the exact fur pattern, fur color, eye color, body proportions, outfit, accessories and distinctive features of ${a.name} throughout the whole video.`,
      ),
    ),
  );
  P.push(
    block(
      "EXPRESSION",
      c.characters.map(({ asset: a, expression: e }) =>
        e ? `${a.name}: ${e.name}${has(e.description) ? ` — ${sentence(e.description)}` : ""}` : `${a.name}: no specific expression selected.`,
      ),
    ),
  );
  if (L)
    P.push(
      block("ENVIRONMENT", [
        para([`The scene takes place at ${L.name}.`, has(L.description) ? sentence(L.description) : "", has(L.details["traits"]) ? `Recognizable features: ${sentence(L.details["traits"]!)}` : ""]),
        "In the specific background provided in the reference. Matching the exact layout and lighting of the environment image. Keep the layout, architecture, vegetation, lighting and landmarks unchanged for the whole video.",
      ]),
    );
  P.push(
    block(
      "INGREDIENTS",
      c.ingredients.map((a) => `Using the exact ${a.name} from the ingredient library. The visual features of the ${a.name} must match the reference.${has(a.description) ? ` ${sentence(a.description)}` : ""}`),
    ),
  );
  P.push(block("PROPS", c.props.map((a) => `${a.name}: use the exact prop shown in the reference.${has(a.description) ? ` ${sentence(a.description)}` : ""}`)));
  P.push(
    block("ACTION / MOTION", [
      has(s.action) ? `Character motion: ${sentence(s.action)}` : "",
      has(s.action) ? "Body motion, facial motion and object motion follow only the action described above; add no other actions." : "",
    ]),
  );
  P.push(block("CHARACTER PERFORMANCE", [has(s.expression) ? `Mood / performance: ${sentence(s.expression)}` : ""]));
  P.push(block("CAMERA", [has(shot.camera) ? `Camera angle: ${v(shot.camera)}.` : ""]));
  P.push(block("CAMERA MOVEMENT", [has(shot.camera_movement) ? `Camera movement: ${v(shot.camera_movement)}.` : ""]));
  P.push(block("LIGHTING", [has(s.lighting) ? `${sentence(s.lighting)}` : L && has(L.details["lighting"]) ? `${sentence(L.details["lighting"]!)} (from the location)` : ""]));
  P.push(block("TIME OF DAY", [has(s.time_of_day) ? `${sentence(s.time_of_day)}` : L && has(L.details["time"]) ? `${sentence(L.details["time"]!)} (from the location)` : ""]));
  P.push(block("VISUAL STYLE", [has(s.visual_style) ? sentence(s.visual_style) : L && has(L.details["style"]) ? `${sentence(L.details["style"]!)} (from the location)` : ""]));
  P.push(
    block("VIDEO CONTINUITY", [
      neighbours.prev ? `Continues from the previous scene: ${neighbours.prev}.` : "",
      neighbours.next ? `Leads into the next scene: ${neighbours.next}.` : "",
      neighbours.prev || neighbours.next ? "Keep characters, outfits, location and lighting continuous between scenes." : "",
    ]),
  );
  P.push(
    block("AUDIO", [
      has(s.dialogue) ? `Dialogue: ${v(s.dialogue)}` : "",
      has(s.sound_effect) ? `Sound effects: ${sentence(s.sound_effect)}` : "",
      has(s.ambient_sound) ? `Ambient sound: ${sentence(s.ambient_sound)}` : "",
    ]),
  );
  P.push(
    block("IMPORTANT CONSISTENCY RULES", [
      "- Preserve the exact Master Image references in every frame.",
      c.characters.length ? "- Do not rename, redesign or swap characters." : "",
      L ? "- Do not change the location layout or lighting." : "",
      c.ingredients.length ? "- Do not replace any ingredient with a different one." : "",
      "- Do not introduce unreferenced characters, objects or ingredients.",
    ]),
  );
  P.push(
    block(
      "NEGATIVE / AVOID CHANGES",
      c.characters.map(({ asset: a, sheet }) => (has(sheet?.["negative_avoid_changes"]) ? `${a.name}: ${sentence(sheet!["negative_avoid_changes"]!)}` : "")),
    ),
  );
  return P.filter(Boolean).join("\n\n");
}


/* ---------- video prompt versions (append-only) ---------- */
export type VideoPromptVersion = { id: string; source_type: "auto_generated" | "user_edited"; prompt_text: string; version_number: number };

export async function fetchLatestVideoPrompt(sceneId: string): Promise<VideoPromptVersion | null> {
  const { data, error } = await db
    .from("video_prompt_versions")
    .select("id, source_type, prompt_text, version_number")
    .eq("scene_id", sceneId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function addVideoPromptVersion(sceneId: string, source_type: VideoPromptVersion["source_type"], prompt_text: string) {
  const latest = await fetchLatestVideoPrompt(sceneId);
  const { error } = await db
    .from("video_prompt_versions")
    .insert({ scene_id: sceneId, source_type, prompt_text, version_number: (latest?.version_number ?? 0) + 1 });
  if (error) throw error;
}

/* ---------- provider abstraction (no implementation yet) ---------- */
export type GenerateVideoInput = {
  provider: AiProvider | null;
  model: AiModel | null;
  prompt: string;
  sourceImage: string | null;
  referenceImages: ReferenceImage[];
  firstFrame: string | null;
  lastFrame: string | null;
  settings: VideoSettings & { duration: string };
};
export type GenerateVideoResult = { video_url: string; thumbnail_url?: string };
export type VideoProviderAdapter = (input: GenerateVideoInput) => Promise<GenerateVideoResult>;
const adapters: Record<string, VideoProviderAdapter> = {};
/** A provider (e.g. Google Veo) plugs in here later, server-side; keys never live in the browser. */
export function registerVideoProvider(code: string, adapter: VideoProviderAdapter) {
  adapters[code] = adapter;
}

export const VIDEO_NOT_CONNECTED = "Video Generation chưa được kết nối. Chưa có AI API nào được gọi.";
export class VideoNotConnectedError extends Error {
  constructor() {
    super(VIDEO_NOT_CONNECTED);
  }
}

export async function generateVideo(input: GenerateVideoInput): Promise<GenerateVideoResult> {
  const adapter = input.provider ? adapters[input.provider.code] : undefined;
  if (!input.provider || !input.model || !adapter) throw new VideoNotConnectedError();
  return adapter(input);
}
