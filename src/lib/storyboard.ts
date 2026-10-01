export type Scene = {
  id: string;
  title: string;
  description: string;
  character: string;
  location: string;
  props: string;
  camera: string;
  duration: string;
  /** Reference IDs only — asset info is always read from the libraries. */
  location_id: string | null;
  action: string;
  expression: string;
  camera_movement: string;
  lighting: string;
  time_of_day: string;
  visual_style: string;
  dialogue: string;
  sound_effect: string;
  ambient_sound: string;

  character_ids: string[];
  ingredient_ids: string[];
  prop_ids: string[];
};

export const nextId = () => crypto.randomUUID();
export const SCENE_EXTRA_KEYS = ["action", "expression", "camera_movement", "lighting", "time_of_day", "visual_style", "dialogue", "sound_effect", "ambient_sound"] as const;
const NO_LINKS = { action: "", expression: "", camera_movement: "", lighting: "", time_of_day: "", visual_style: "", dialogue: "", sound_effect: "", ambient_sound: "", location_id: null, character_ids: [], ingredient_ids: [], prop_ids: [] };

export const SAMPLE_SCRIPT = `Cảnh 1: Một cô gái bước vào quán mì.
Cảnh 2: Cô gọi một tô mì cay.
Cảnh 3: Nhân viên chuẩn bị nguyên liệu.
Cảnh 4: Nhân viên nấu mì.
Cảnh 5: Tô mì cay hoàn thiện.
Cảnh 6: Cô gái thưởng thức món ăn.`;

const CHARACTERS: Array<[RegExp, string]> = [
  [/cô gái|cô ấy|\bcô\b/i, "Cô gái"],
  [/chàng trai|anh ấy|\banh\b/i, "Chàng trai"],
  [/nhân viên|đầu bếp|người nấu/i, "Nhân viên"],
  [/khách/i, "Khách hàng"],
  [/bà chủ|chủ quán/i, "Chủ quán"],
  [/em bé|đứa trẻ/i, "Em bé"],
];

const LOCATIONS: Array<[RegExp, string]> = [
  [/quán mì|quán phở|quán ăn|nhà hàng|quán/i, "Quán ăn"],
  [/bếp|nấu/i, "Bếp"],
  [/đường phố|ngoài phố|vỉa hè/i, "Đường phố"],
  [/nhà|phòng/i, "Trong nhà"],
  [/chợ/i, "Chợ"],
  [/bàn/i, "Bàn ăn"],
];

const PROPS: Array<[RegExp, string]> = [
  [/tô mì|bát mì|tô phở/i, "Tô mì, đũa"],
  [/nguyên liệu|rau|ớt|thịt/i, "Nguyên liệu tươi"],
  [/túi xách|ba lô/i, "Túi xách"],
  [/thực đơn|menu/i, "Thực đơn"],
  [/điện thoại/i, "Điện thoại"],
  [/nồi|bếp/i, "Nồi nước dùng"],
];

const CAMERAS = ["Toàn cảnh", "Trung cảnh", "Cận cảnh", "Góc trên", "Góc thấp"];

function match(rules: Array<[RegExp, string]>, text: string, fallback: string) {
  for (const [re, value] of rules) if (re.test(text)) return value;
  return fallback;
}

function cleanLine(line: string) {
  return line
    .replace(/^\s*(cảnh|scene)\s*\d+\s*[:.\-–]?\s*/i, "")
    .replace(/^\s*[-•*\d.)]+\s*/, "")
    .trim();
}

function toTitle(text: string) {
  const words = text.replace(/[.!?]+$/, "").split(/\s+/);
  const short = words.slice(0, 8).join(" ");
  return short.charAt(0).toUpperCase() + short.slice(1);
}

export function analyzeScript(script: string): Scene[] {
  const raw = script
    .split(/\n+/)
    .flatMap((line) => (line.trim().length > 140 ? line.split(/(?<=[.!?])\s+/) : [line]))
    .map(cleanLine)
    .filter((line) => line.length > 2);

  return raw.map((text, i) => ({
    id: nextId(),
    title: toTitle(text),
    description: text.endsWith(".") ? text : `${text}.`,
    character: match(CHARACTERS, text, "—"),
    location: match(LOCATIONS, text, "Chưa xác định"),
    props: match(PROPS, text, "—"),
    camera: CAMERAS[i % CAMERAS.length] ?? "Trung cảnh",
    duration: `${3 + (i % 3)} giây`,
    ...NO_LINKS,
  }));

}

export function emptyScene(index: number): Scene {
  return {
    id: nextId(),
    title: `Cảnh mới ${index}`,
    description: "Nhấn “Chỉnh sửa” để mô tả nội dung cảnh này.",
    character: "—",
    location: "—",
    props: "—",
    camera: "Trung cảnh",
    duration: "3 giây",
    ...NO_LINKS,
  };
}
