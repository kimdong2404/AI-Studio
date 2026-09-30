import { useEffect, useState } from "react";

export type AssetType = "character" | "location" | "ingredient" | "prop";

export type AssetImage = { id: string; url: string; path?: string; file?: File };

export type Asset = {
  id: string; // unique id, never the name
  type: AssetType;
  name: string;
  code: string;
  description: string;
  details: Record<string, string>;
  notes: string;
  images: AssetImage[];
  masterImageId: string | null;
};

/** Stored on each scene — enough for AI to know exactly which image to use. */
export type SceneAsset = {
  asset_id: string;
  asset_name: string;
  asset_code: string;
  asset_type: AssetType;
  master_image: string | null;
};

export const ASSET_TYPES: Record<
  AssetType,
  { label: string; title: string; add: string; icon: string; fields: Array<{ key: string; label: string }> }
> = {
  character: {
    label: "Nhân vật",
    title: "Thư viện nhân vật",
    add: "+ Thêm nhân vật",
    icon: "👤",
    fields: [
      { key: "gender", label: "Giới tính" },
      { key: "age", label: "Độ tuổi" },
      { key: "outfit", label: "Trang phục" },
      { key: "traits", label: "Đặc điểm nhận diện" },
    ],
  },
  location: {
    label: "Bối cảnh",
    title: "Thư viện bối cảnh",
    add: "+ Thêm bối cảnh",
    icon: "🏠",
    fields: [
      { key: "locType", label: "Loại bối cảnh" },
      { key: "traits", label: "Đặc điểm nhận diện" },
      { key: "lighting", label: "Màu sắc / ánh sáng" },
      { key: "time", label: "Thời gian trong ngày" },
      { key: "style", label: "Phong cách" },
    ],
  },
  ingredient: {
    label: "Nguyên liệu",
    title: "Thư viện nguyên liệu",
    add: "+ Thêm nguyên liệu",
    icon: "🍜",
    fields: [
      { key: "ingType", label: "Loại nguyên liệu" },
      { key: "traits", label: "Đặc điểm nhận diện" },
      { key: "color", label: "Màu sắc" },
      { key: "shape", label: "Hình dạng" },
      { key: "freshness", label: "Trạng thái / độ tươi" },
    ],
  },
  prop: { label: "Đạo cụ", title: "Thư viện đạo cụ", add: "+ Thêm đạo cụ", icon: "🎒", fields: [] },
};

export const newId = (p: string) =>
  `${p}_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now() + Math.random()}`;

function placeholder(label: string, hue: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="hsl(${hue},45%,86%)"/><text x="200" y="165" font-family="sans-serif" font-size="30" text-anchor="middle" fill="hsl(${hue},35%,35%)">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function demo(type: AssetType, name: string, code: string, description: string, hue: number): Asset {
  const img = { id: `img_${code}`, url: placeholder(name, hue) };
  return {
    id: `demo_${code}`,
    type,
    name,
    code,
    description,
    details: {},
    notes: "",
    images: [img],
    masterImageId: img.id,
  };
}

export const DEMO_ASSETS: Asset[] = [
  demo("location", "Quán mì Việt Nam", "BG_QUAN_MI_001", "Quán mì nhỏ, bàn gỗ, ánh đèn vàng ấm.", 25),
  demo("location", "Bếp củi miền Tây", "BG_BEP_CUI_001", "Bếp củi dài, mỗi bếp riêng biệt, không nối liền nhau, không gian bếp dân dã Việt Nam.", 15),
  demo("ingredient", "Mì", "ING_MI_001", "Sợi mì vàng, dai, xoăn nhẹ.", 48),
  demo("ingredient", "Ớt xiêm xanh", "ING_OT_XIEM_XANH", "Ớt xiêm xanh nhỏ, thon dài, màu xanh tươi, mọc thành chùm, nhiều quả.", 110),
  demo("ingredient", "Tắc", "ING_TAC_001", "Quả tắc nhỏ, tròn, vỏ xanh vàng.", 75),
  demo("prop", "Nồi nấu mì", "PROP_NOI_MI_001", "Nồi nhôm lớn dùng để nấu mì.", 210),
  demo("prop", "Tô mì", "PROP_TO_MI_001", "Tô sứ trắng viền xanh.", 195),
];

export const masterUrl = (a: Asset) =>
  a.images.find((i) => i.id === a.masterImageId)?.url ?? a.images[0]?.url ?? null;

export const toSceneAsset = (a: Asset): SceneAsset => ({
  asset_id: a.id,
  asset_name: a.name,
  asset_code: a.code,
  asset_type: a.type,
  master_image: masterUrl(a),
});

const KEY = "storyboard.assets.v2";

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>(DEMO_ASSETS.filter((a) => a.type === "prop"));
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setAssets((JSON.parse(raw) as Asset[]).filter((a) => a.type === "prop"));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(assets));
    } catch {
      /* storage full */
    }
  }, [assets, loaded]);
  return [assets, setAssets] as const;
}

/** Resize an uploaded image so it fits in browser storage. */
export function fileToDataUrl(file: File, max = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
