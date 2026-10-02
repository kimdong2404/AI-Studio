import { supabase } from "@/integrations/supabase/client";
import type { Asset } from "./assets";
import { fetchExpressions, fetchSheet, type Expression, type Sheet } from "./characterSheet";
import type { Scene } from "./storyboard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type CharCtx = { asset: Asset; sheet: Sheet | null; expression: Expression | null };
export type PromptCtx = {
  scene: Scene;
  index: number;
  characters: CharCtx[];
  location: Asset | null;
  ingredients: Asset[];
  props: Asset[];
};

const v = (s?: string | null) => (s ?? "").trim();
const has = (s?: string | null) => {
  const t = v(s);
  return t !== "" && t !== "—" && t !== "-";
};
const line = (label: string, s?: string | null) => (has(s) ? `${label}: ${v(s)}` : "");
const block = (title: string, lines: Array<string | false | null | undefined>) => {
  const body = lines.filter((l): l is string => !!l && l.trim() !== "");
  return body.length ? `[${title}]\n${body.join("\n")}` : "";
};
export const master = (a: { images: { id: string; url: string }[]; masterImageId: string | null }) =>
  a.images.find((i) => i.id === a.masterImageId) ?? null;

/** Always reads fresh data: assets come from the libraries, sheets/expressions by ID. */
export async function loadContext(scene: Scene, index: number, assets: Asset[]): Promise<PromptCtx> {
  const byId = (id: string) => assets.find((a) => a.id === id) ?? null;
  const chars = scene.character_ids.map(byId).filter((a): a is Asset => !!a);
  const characters = await Promise.all(
    chars.map(async (asset) => {
      const [sheet, exprs] = await Promise.all([fetchSheet(asset.id), fetchExpressions(asset.id)]);
      const exId = scene.character_expressions?.[asset.id];
      return { asset, sheet, expression: exprs.find((e) => e.id === exId) ?? null };
    }),
  );
  return {
    scene,
    index,
    characters,
    location: scene.location_id ? byId(scene.location_id) : null,
    ingredients: scene.ingredient_ids.map(byId).filter((a): a is Asset => !!a),
    props: scene.prop_ids.map(byId).filter((a): a is Asset => !!a),
  };
}

export function buildPrompt(c: PromptCtx): string {
  const s = c.scene;
  const L = c.location;
  const parts: string[] = [];

  parts.push(
    block("SCENE", [
      `Scene ${String(c.index + 1).padStart(2, "0")}${has(s.title) ? ` — ${v(s.title)}` : ""}`,
      line("Description", s.description),
      line("Duration", s.duration),
    ]),
  );

  parts.push(
    block(
      "CHARACTERS",
      c.characters.map(({ asset: a }) =>
        [
          `- ${a.name}${has(a.code) ? ` (${a.code})` : ""}${master(a) ? " — master reference image provided" : ""}`,
          line("  Description", a.description),
          line("  Gender", a.details["gender"]),
          line("  Age", a.details["age"]),
          line("  Clothing", a.details["outfit"]),
          line("  Recognition features", a.details["traits"]),
          line("  Notes", a.notes),
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ),
  );

  parts.push(
    block(
      "CHARACTER IDENTITY & CONSISTENCY",
      c.characters.map(({ asset: a, sheet: sh }) =>
        [
          `- ${a.name}: Consistent with the character reference image. Exactly as shown in the master image. The character named ${a.name}, maintaining the exact appearance, colors, pattern and outfit from the reference.`,
          line("  Identity", sh?.["identity_description"]),
          line("  Appearance", sh?.["appearance_description"]),
          line("  Outfit", sh?.["outfit_description"]),
          line("  Personality", sh?.["personality"]),
          line("  Character identity", sh?.["character_identity"]),
          line("  Consistency instruction", sh?.["consistency_instruction"]),
          line("  Appearance lock", sh?.["appearance_lock"]),
          line("  Outfit lock", sh?.["outfit_lock"]),
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ),
  );

  parts.push(
    block(
      "CHARACTER EXPRESSION",
      [
        ...c.characters
          .filter((x) => x.expression)
          .map(({ asset: a, expression: e }) =>
            [
              `- ${a.name}: ${e!.name}${has(e!.code) ? ` (${e!.code})` : ""}${master(e!) ? " — expression reference image provided" : ""}`,
              line("  Description", e!.fields["description"]),
              line("  Facial features", e!.fields["facial_features"]),
              line("  Eyes", e!.fields["eyes"]),
              line("  Brows / ears", e!.fields["brows_ears"]),
              line("  Mouth", e!.fields["mouth"]),
              line("  Head pose", e!.fields["head_pose"]),
              line("  Notes", e!.fields["notes"]),
            ]
              .filter(Boolean)
              .join("\n"),
          ),
        has(s.expression) ? `Scene expression: ${v(s.expression)}` : "",
      ],
    ),
  );

  if (L)
    parts.push(
      block("LOCATION / BACKGROUND", [
        `${L.name}${has(L.code) ? ` (${L.code})` : ""}`,
        "In the specific background provided in the reference. Matching the exact layout and lighting of the environment image.",
        line("Description", L.description),
        line("Type", L.details["locType"]),
        line("Recognition features", L.details["traits"]),
        line("Style", L.details["style"]),
        line("Notes", L.notes),
      ]),
    );

  parts.push(
    block(
      "INGREDIENTS",
      c.ingredients.map((a) =>
        [
          `- ${a.name}${has(a.code) ? ` (${a.code})` : ""}: Using the exact ${a.name} from the ingredient library. The visual features of the ${a.name} must match the reference.`,
          line("  Description", a.description),
          line("  Recognition features", a.details["traits"]),
          line("  Color", a.details["color"]),
          line("  Shape", a.details["shape"]),
          line("  State", a.details["freshness"]),
          line("  Notes", a.notes),
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ),
  );

  parts.push(
    block(
      "PROPS",
      c.props.map((a) =>
        [
          `- ${a.name}${has(a.code) ? ` (${a.code})` : ""}: Use the exact prop shown in the reference. Maintain its original shape, material, color and visual details.`,
          line("  Description", a.description),
          line("  Notes", a.notes),
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ),
  );

  if (has(s.action)) {
    const who = c.characters
      .map(({ asset: a, expression: e }) => (e ? `${a.name} (${e.name})` : a.name))
      .join(", ");
    parts.push(
      block("ACTION / PERFORMANCE", [
        who ? `${who}, keeping their identity unchanged: ${v(s.action)}` : v(s.action),
      ]),
    );
  }

  parts.push(block("CAMERA", [line("Camera angle", s.camera), line("Camera movement", s.camera_movement)]));

  // Scene-specific data wins; location defaults only fill gaps.
  parts.push(
    block("LIGHTING & TIME", [
      has(s.lighting) ? `Lighting: ${v(s.lighting)}` : L ? line("Lighting (from location)", L.details["lighting"]) : "",
      has(s.time_of_day) ? `Time of day: ${v(s.time_of_day)}` : L ? line("Time of day (from location)", L.details["time"]) : "",
    ]),
  );

  parts.push(block("VISUAL STYLE", [v(s.visual_style)]));

  parts.push(
    block("AUDIO", [line("Dialogue", s.dialogue), line("Sound effects", s.sound_effect), line("Ambient sound", s.ambient_sound)]),
  );

  const anyRef = c.characters.length || L || c.ingredients.length || c.props.length;
  parts.push(
    block("IMPORTANT CONSISTENCY RULES", [
      anyRef ? "Reference priority: 1) Master Image, 2) additional reference images, 3) text description." : "",
      anyRef ? "Do not redesign any character, location, ingredient or prop — match the references exactly." : "",
      ...c.characters.map(({ asset: a, sheet: sh }) => line(`${a.name} — important details`, sh?.["important_details"])),
    ]),
  );

  parts.push(
    block(
      "NEGATIVE / AVOID CHANGES",
      c.characters.map(({ asset: a, sheet: sh }) => line(a.name, sh?.["negative_avoid_changes"])),
    ),
  );

  return parts.filter(Boolean).join("\n\n");
}

export type SavedPrompt = { auto_prompt: string; edited_prompt: string };

export async function fetchSavedPrompt(sceneId: string): Promise<SavedPrompt | null> {
  const { data, error } = await db.from("scene_prompts").select("auto_prompt, edited_prompt").eq("scene_id", sceneId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveEditedPrompt(sceneId: string, auto: string, edited: string) {
  const { error } = await db
    .from("scene_prompts")
    .upsert({ scene_id: sceneId, auto_prompt: auto, edited_prompt: edited, updated_at: new Date().toISOString() }, { onConflict: "scene_id" });
  if (error) throw error;
}

export async function clearEditedPrompt(sceneId: string) {
  const { error } = await db.from("scene_prompts").delete().eq("scene_id", sceneId);
  if (error) throw error;
}
