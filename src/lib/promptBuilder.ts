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

const NONE = /^(không|khong|none|no|n\/a|không có|không mặc.*)$/i;
const isNone = (s?: string | null) => NONE.test(v(s));
const SPECIES: Array<[RegExp, string]> = [
  [/mèo|cat/i, "cat"], [/chó|dog/i, "dog"], [/thỏ|rabbit/i, "rabbit"], [/gấu|bear/i, "bear"],
  [/chim|bird/i, "bird"], [/cáo|fox/i, "fox"], [/người|human/i, "person"],
];
const sentence = (s: string) => {
  const t = v(s);
  if (!t) return "";
  const c = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(c) ? c : `${c}.`;
};
const para = (xs: Array<string | false | null | undefined>) => xs.filter((x): x is string => !!x && x.trim() !== "").join(" ");

function charSection(c: CharCtx, n: number, scene: Scene): string {
  const { asset: a, sheet: sh, expression: e } = c;
  const name = a.name;
  const g = v(a.details["gender"]).toLowerCase();
  const male = /^(đực|nam|male|trai|m)$/.test(g);
  const female = /^(cái|nữ|nu|female|gái|f)$/.test(g);
  const pron = male ? "He" : female ? "She" : "They";
  const verb = (s3: string, pl: string) => (male || female ? s3 : pl);
  const speciesSrc = `${v(sh?.["species"])} ${a.description}`;
  const noun = SPECIES.find(([re]) => re.test(speciesSrc))?.[1] ?? "character";
  const age = v(a.details["age"]);
  const ageTxt = /^\d+$/.test(age) ? `${age}-year-old ` : "";
  const sexTxt = male ? "male " : female ? "female " : "";
  const outfit = a.details["outfit"];
  const noOutfit = isNone(outfit) || isNone(sh?.["outfit_main"]) || isNone(sh?.["outfit_description"]);

  const basics = para([
    `${name} is a ${ageTxt}${sexTxt}${noun}.`,
    !/^\d+$/.test(age) && has(age) ? `Age: ${v(age)}.` : "",
    !male && !female && has(g) ? `Gender: ${v(a.details["gender"])}.` : "",
    has(sh?.["breed"]) ? `Breed: ${v(sh!["breed"])}.` : "",
    has(a.description) ? sentence(a.description) : "",
  ]);

  const identity = para([
    has(sh?.["identity_description"]) ? `The ${noun} named ${name}: ${sentence(sh!["identity_description"]!)}` : `The ${noun} named ${name}.`,
    has(sh?.["character_identity"]) ? sentence(sh!["character_identity"]!) : "",
    has(sh?.["personality"]) ? `Personality: ${sentence(sh!["personality"]!)}` : "",
  ]);

  const looks = [
    ["Overall color", "overall_color"], ["Fur / hair color", "hair_color"], ["Pattern", "pattern"], ["Eye color", "eye_color"],
    ["Face shape", "face_shape"], ["Ears", "ears"], ["Nose", "nose"], ["Mouth", "mouth"], ["Body", "body_features"], ["Special marks", "special_marks"],
  ]
    .filter(([, k]) => has(sh?.[k!]) && !isNone(sh?.[k!]))
    .map(([l, k]) => `${l}: ${v(sh![k!])}`);
  const appearance = para([
    looks.length ? sentence(looks.join("; ")) : "",
    has(sh?.["appearance_description"]) && !isNone(sh!["appearance_description"]) ? sentence(sh!["appearance_description"]!) : "",
    has(a.details["traits"]) ? `Distinctive features: ${sentence(a.details["traits"]!)}` : "",
  ]);

  const outfitTxt = noOutfit
    ? `${pron} ${verb("does", "do")} not wear clothing.`
    : para([
        has(outfit) ? `${name} wears ${v(outfit)}.` : "",
        has(sh?.["outfit_description"]) ? sentence(sh!["outfit_description"]!) : "",
        has(sh?.["accessories"]) && !isNone(sh!["accessories"]) ? `Accessories: ${sentence(sh!["accessories"]!)}` : "",
      ]);

  const consistency = [
    "Consistent with the character reference image.",
    "Exactly as shown in the master image.",
    `The ${noun} named ${name}, maintaining the exact ${noun === "cat" || noun === "dog" || noun === "fox" || noun === "rabbit" || noun === "bear" ? "fur pattern" : "appearance"}${noOutfit ? "" : " and outfit"} from the reference.`,
    has(sh?.["consistency_instruction"]) ? sentence(sh!["consistency_instruction"]!) : "",
    has(sh?.["appearance_lock"]) ? `Appearance lock: ${sentence(sh!["appearance_lock"]!)}` : "",
    has(sh?.["outfit_lock"]) ? `Outfit lock: ${sentence(sh!["outfit_lock"]!)}` : "",
    has(sh?.["important_details"]) ? `Important details: ${sentence(sh!["important_details"]!)}` : "",
  ];

  let expr = "No specific expression selected.";
  if (e) {
    const f = e.fields;
    const bits = [
      has(f["eyes"]) ? `eyes: ${v(f["eyes"])}` : "",
      has(f["brows_ears"]) ? `brows / ears: ${v(f["brows_ears"])}` : "",
      has(f["mouth"]) ? `mouth: ${v(f["mouth"])}` : "",
      has(f["facial_features"]) ? `face: ${v(f["facial_features"])}` : "",
      has(f["head_pose"]) ? `head pose: ${v(f["head_pose"])}` : "",
    ].filter(Boolean);
    expr = para([
      `${name} has the "${e.name}" expression${bits.length ? ` (${bits.join("; ")})` : ""}.`,
      has(f["description"]) ? sentence(f["description"]!) : "",
      has(f["notes"]) ? sentence(f["notes"]!) : "",
      master(e) ? "Match the expression master image." : "",
    ]);
  }
  void scene;

  const extra = a.images.filter((i) => i.id !== a.masterImageId).length;
  const refs = [
    master(a) ? "Character master image (primary reference)." : "",
    e && master(e) ? "Expression master image." : "",
    extra ? `${extra} additional character reference image${extra > 1 ? "s" : ""}.` : "",
    "Character sheet text above.",
  ].filter(Boolean).map((t, i) => `${i + 1}. ${t}`);

  return [
    `[CHARACTER ${n} — ${name.toUpperCase()}]${has(a.code) ? ` (${a.code})` : ""}`,
    basics,
    `Identity: ${identity}`,
    appearance && `Appearance: ${appearance}`,
    outfitTxt && `Outfit: ${outfitTxt}`,
    `Consistency: ${para(consistency)}`,
    `Expression: ${expr}`,
    `Reference priority: ${refs.join(" ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPrompt(c: PromptCtx): string {
  const s = c.scene;
  const L = c.location;
  const parts: string[] = [];

  parts.push(
    block("SCENE", [
      `Scene ${String(c.index + 1).padStart(2, "0")}${has(s.title) ? ` — ${v(s.title)}` : ""}`,
      has(s.description) ? sentence(s.description) : "",
      has(s.duration) ? `Duration: ${v(s.duration)}.` : "",
      has(s.expression) ? `Overall mood: ${sentence(s.expression)}` : "",
    ]),
  );

  c.characters.forEach((ch, i) => parts.push(charSection(ch, i + 1, s)));

  if (L)
    parts.push(
      block("LOCATION / BACKGROUND", [
        para([
          `The scene takes place at ${L.name}${has(L.code) ? ` (${L.code})` : ""}.`,
          has(L.details["locType"]) ? `Type of place: ${sentence(L.details["locType"]!)}` : "",
          has(L.description) ? sentence(L.description) : "",
          has(L.details["traits"]) ? `Recognizable features: ${sentence(L.details["traits"]!)}` : "",
          has(L.notes) ? sentence(L.notes) : "",
        ]),
        "In the specific background provided in the reference. Matching the exact layout and lighting of the environment image.",
        master(L) ? "The location master image is the primary reference." : "",
      ]),
    );

  if (c.ingredients.length)
    parts.push(
      "[INGREDIENTS]\n" +
        c.ingredients
          .map((a) =>
            [
              `[INGREDIENT — ${a.name.toUpperCase()}]${has(a.code) ? ` (${a.code})` : ""}`,
              para([
                has(a.description) ? sentence(a.description) : "",
                has(a.details["ingType"]) ? `Type: ${sentence(a.details["ingType"]!)}` : "",
                has(a.details["color"]) ? `Color: ${sentence(a.details["color"]!)}` : "",
                has(a.details["shape"]) ? `Shape: ${sentence(a.details["shape"]!)}` : "",
                has(a.details["freshness"]) ? `Condition: ${sentence(a.details["freshness"]!)}` : "",
                has(a.details["traits"]) ? `Recognizable features: ${sentence(a.details["traits"]!)}` : "",
                has(a.notes) ? sentence(a.notes) : "",
              ]),
              `Using the exact ${a.name} from the ingredient library. The visual features of the ${a.name} must match the reference. Do not change its color, shape, size, texture or condition.`,
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n\n"),
    );

  if (c.props.length)
    parts.push(
      "[PROPS]\n" +
        c.props
          .map((a) =>
            [
              `[PROP — ${a.name.toUpperCase()}]${has(a.code) ? ` (${a.code})` : ""}`,
              para([has(a.description) ? sentence(a.description) : "", has(a.notes) ? sentence(a.notes) : ""]),
              "Use the exact prop shown in the reference. Maintain its original shape, material, color and visual details.",
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n\n"),
    );

  if (has(s.action))
    parts.push(
      block("ACTION / PERFORMANCE", [
        sentence(s.action),
        c.characters.length > 1 ? "Each character keeps their own identity; do not swap actions between characters." : "",
      ]),
    );

  parts.push(
    block("CAMERA", [has(s.camera) ? `Camera angle: ${v(s.camera)}.` : "", has(s.camera_movement) ? `Camera movement: ${v(s.camera_movement)}.` : ""]),
  );

  // Scene-specific data wins; location defaults only fill gaps.
  parts.push(
    block("LIGHTING & TIME", [
      has(s.lighting) ? `Lighting: ${v(s.lighting)}.` : L && has(L.details["lighting"]) ? `Lighting: ${v(L.details["lighting"])} (from the location).` : "",
      has(s.time_of_day) ? `Time of day: ${v(s.time_of_day)}.` : L && has(L.details["time"]) ? `Time of day: ${v(L.details["time"])} (from the location).` : "",
    ]),
  );

  parts.push(
    block("VISUAL STYLE", [has(s.visual_style) ? sentence(s.visual_style) : L && has(L.details["style"]) ? `${sentence(L.details["style"]!)} (from the location)` : ""]),
  );

  parts.push(
    block("AUDIO", [
      has(s.dialogue) ? `Dialogue: ${v(s.dialogue)}` : "",
      has(s.sound_effect) ? `Sound effects: ${sentence(s.sound_effect)}` : "",
      has(s.ambient_sound) ? `Ambient sound: ${sentence(s.ambient_sound)}` : "",
    ]),
  );

  const R = (cond: unknown, t: string) => (cond ? `- ${t}` : "");
  const ch = c.characters.length;
  parts.push(
    block("IMPORTANT CONSISTENCY RULES", [
      R(ch, "Preserve the exact identity of every referenced character."),
      R(ch, "Preserve the exact appearance and distinctive features of every character."),
      "- Preserve the exact Master Image references.",
      R(L, "Preserve the exact location layout and lighting from the reference."),
      R(c.ingredients.length, "Preserve the exact visual features of referenced ingredients."),
      R(c.props.length, "Preserve the exact appearance of referenced props."),
      "- Do not replace or redesign referenced assets.",
      "- Do not introduce unreferenced characters, objects or ingredients.",
      R(ch, "Do not change character identity, fur pattern, facial structure or distinctive features."),
      "- Do not change the visual identity of referenced assets.",
    ]),
  );

  parts.push(
    block(
      "NEGATIVE / AVOID CHANGES",
      c.characters.map(({ asset: a, sheet: sh }) => (has(sh?.["negative_avoid_changes"]) ? `${a.name}: ${sentence(sh!["negative_avoid_changes"]!)}` : "")),
    ),
  );

  return parts.filter(Boolean).join("\n\n");
}

export type SavedPrompt = { auto_prompt: string; edited_prompt: string };

async function nextVersion(sceneId: string): Promise<number> {
  const { data } = await db.from("prompt_versions").select("version_number").eq("scene_id", sceneId).order("version_number", { ascending: false }).limit(1).maybeSingle();
  return (data?.version_number ?? 0) + 1;
}

/** Latest version decides what is shown; versions are append-only (never overwritten). */
export async function fetchSavedPrompt(sceneId: string): Promise<SavedPrompt | null> {
  const { data, error } = await db
    .from("prompt_versions")
    .select("source_type, prompt_text, auto_snapshot")
    .eq("scene_id", sceneId)
    .order("version_number", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.source_type !== "user_edited") return null;
  return { auto_prompt: data.auto_snapshot, edited_prompt: data.prompt_text };
}

export async function saveEditedPrompt(sceneId: string, auto: string, edited: string) {
  const version_number = await nextVersion(sceneId);
  const { error } = await db
    .from("prompt_versions")
    .insert({ scene_id: sceneId, source_type: "user_edited", prompt_text: edited, auto_snapshot: auto, version_number });
  if (error) throw error;
}

/** Switch back to auto without deleting saved user versions. */
export async function clearEditedPrompt(sceneId: string, auto: string) {
  const version_number = await nextVersion(sceneId);
  const { error } = await db
    .from("prompt_versions")
    .insert({ scene_id: sceneId, source_type: "auto_generated", prompt_text: auto, auto_snapshot: auto, version_number });
  if (error) throw error;
}
