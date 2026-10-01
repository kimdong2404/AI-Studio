import { useState } from "react";
import type { Scene } from "@/lib/storyboard";
import { masterUrl, type Asset, type AssetType } from "@/lib/assets";
import { AssetPicker } from "./AssetPicker";

type Props = {
  scene: Scene;
  index: number;
  delay: number;
  assets: Asset[];
  onSave: (scene: Scene) => Promise<void>;
  onDuplicate: () => void;
  onRegenerate: () => void;
};

type TextKey = "character" | "location" | "props" | "camera" | "duration";
const FIELDS: Array<{ key: TextKey; label: string; wide?: boolean }> = [
  { key: "character", label: "Nhân vật" },
  { key: "location", label: "Bối cảnh" },
  { key: "props", label: "Đạo cụ" },
  { key: "camera", label: "Góc máy" },
  { key: "duration", label: "Thời lượng", wide: true },
];

const GROUPS: Array<{ type: AssetType; icon: string; label: string; pick: string }> = [
  { type: "character", icon: "👤", label: "Nhân vật", pick: "+ Chọn nhân vật" },
  { type: "location", icon: "🏠", label: "Bối cảnh", pick: "+ Chọn bối cảnh" },
  { type: "ingredient", icon: "🍜", label: "Nguyên liệu", pick: "+ Chọn nguyên liệu" },
  { type: "prop", icon: "🎒", label: "Đạo cụ", pick: "+ Chọn đạo cụ" },
];

type ExtraKey = "camera" | "action" | "expression" | "camera_movement" | "lighting" | "time_of_day" | "visual_style" | "dialogue" | "sound_effect" | "ambient_sound";
type FieldDef = { key: ExtraKey; label: string; options?: string[]; long?: boolean; ph?: string };
const SECTIONS: Array<{ n: string; t: string; fields: FieldDef[] }> = [
  { n: "③", t: "Hành động & diễn xuất", fields: [
    { key: "action", label: "Hành động", long: true, ph: "VD: Mèo bước vào vườn, nhìn quanh rồi tiến đến luống cải." },
    { key: "expression", label: "Biểu cảm / trạng thái", ph: "VD: Vui vẻ, tò mò" },
  ] },
  { n: "④", t: "Camera", fields: [
    { key: "camera", label: "Góc máy", options: ["Toàn cảnh", "Toàn thân", "Trung cảnh", "Cận cảnh", "Cực cận", "Góc thấp", "Góc cao", "Over-the-shoulder", "POV"] },
    { key: "camera_movement", label: "Chuyển động camera", options: ["Không có / Static", "Pan left", "Pan right", "Tilt up", "Tilt down", "Zoom in", "Zoom out", "Tracking", "Dolly in", "Dolly out", "Handheld"] },
  ] },
  { n: "⑤", t: "Hình ảnh", fields: [
    { key: "lighting", label: "Ánh sáng", options: ["Ánh sáng tự nhiên", "Nắng sớm", "Nắng chiều", "Ánh sáng mềm", "Ánh sáng mạnh", "Ánh sáng trong nhà", "Ánh sáng điện", "Dramatic lighting", "Cinematic lighting"] },
    { key: "time_of_day", label: "Thời gian trong ngày", options: ["Bình minh", "Buổi sáng", "Trưa", "Chiều", "Hoàng hôn", "Buổi tối", "Đêm"] },
    { key: "visual_style", label: "Phong cách hình ảnh", options: ["Realistic", "Photorealistic", "Cinematic", "Documentary", "Rustic Vietnamese countryside", "Food commercial", "Anime", "3D animation"] },
  ] },
  { n: "⑥", t: "Âm thanh", fields: [
    { key: "dialogue", label: "Lời thoại", long: true, ph: "Có thể để trống" },
    { key: "sound_effect", label: "Hiệu ứng âm thanh", ph: "Có thể để trống" },
    { key: "ambient_sound", label: "Âm thanh môi trường", ph: "VD: Tiếng chim và tiếng lá cây" },
  ] },
];

function Heading({ n, t }: { n: string; t: string }) {
  return <p className="pt-3 text-xs font-semibold uppercase tracking-wider text-ink">{n} {t}</p>;
}

function idsOf(s: Scene, t: AssetType): string[] {
  if (t === "character") return s.character_ids ?? [];
  if (t === "ingredient") return s.ingredient_ids ?? [];
  if (t === "prop") return s.prop_ids ?? [];
  return s.location_id ? [s.location_id] : [];
}

function withIds(s: Scene, t: AssetType, ids: string[]): Scene {
  if (t === "character") return { ...s, character_ids: ids };
  if (t === "ingredient") return { ...s, ingredient_ids: ids };
  if (t === "prop") return { ...s, prop_ids: ids };
  return { ...s, location_id: ids[0] ?? null };
}

export function SceneCard({ scene, index, delay, assets = [], onSave, onDuplicate, onRegenerate }: Props) {
  const [draft, setDraft] = useState<Scene | null>(null);
  const [picking, setPicking] = useState<AssetType | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const byId = new Map(assets.map((a) => [a.id, a]));
  const resolve = (s: Scene, t: AssetType) => idsOf(s, t).map((id) => byId.get(id)).filter(Boolean) as Asset[];

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setErr(null);
    try {
      await onSave(draft);
      setDraft(null);
    } catch (e) {
      console.error("[scene save]", e);
      setErr(`Không thể lưu cảnh. ${e instanceof Error ? e.message : ""}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="rise overflow-hidden rounded-3xl border border-line bg-surface" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative">
        <div className="grid aspect-[16/9] w-full place-items-center bg-background outline-1 -outline-offset-1 outline-ink/5">
          <div className="flex flex-col items-center gap-2 text-muted-ink/60">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-8">
              <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7l1-1.6A1.5 1.5 0 0 1 9.5 3.7h5a1.5 1.5 0 0 1 1.3.7l1 1.6h1.7A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-8Z" />
              <circle cx="12" cy="12.5" r="3.3" />
            </svg>
            <span className="text-[10px] font-medium uppercase tracking-[0.15em]">Hình ảnh</span>
          </div>
        </div>
        <span className="absolute left-3 top-3 rounded-md bg-ink px-2 py-1 font-mono text-[11px] text-background">
          Cảnh {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="p-4">
        {draft ? (
          <div className="space-y-2">
            <Heading n="①" t="Thông tin cảnh" />
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full rounded-xl border border-line bg-background px-3 py-2 text-sm font-semibold focus:border-accent focus:outline-none"
              placeholder="Tiêu đề cảnh"
            />
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-xl border border-line bg-background px-3 py-2 text-xs leading-relaxed focus:border-accent focus:outline-none"
              placeholder="Mô tả cảnh"
            />
            <div className="grid grid-cols-2 gap-2">
              {FIELDS.filter((f) => f.key !== "camera").map(({ key, label }) => (
                <input
                  key={key}
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  className="w-full rounded-xl border border-line bg-background px-3 py-2 text-xs focus:border-accent focus:outline-none"
                  placeholder={label}
                />
              ))}
            </div>
            <Heading n="②" t="Tài sản tham chiếu" />
            <div className="space-y-2">
              {GROUPS.map((g) => {
                const items = resolve(draft, g.type);
                return (
                  <div key={g.type} className="rounded-2xl border border-line bg-background p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold">
                        {g.icon} {g.label}
                      </span>
                      <button
                        onClick={() => setPicking(g.type)}
                        className="rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold text-accent hover:bg-accent/20"
                      >
                        {g.type === "location" && items.length ? "Đổi bối cảnh" : g.pick}
                      </button>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-[11px] text-muted-ink">Chưa chọn.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((a) => {
                          const url = masterUrl(a);
                          return (
                            <span key={a.id} className="flex items-center gap-1.5 rounded-lg border border-line bg-surface py-1 pl-1 pr-1.5">
                              {url ? <img src={url} alt="" className="size-7 rounded object-cover" /> : <span className="size-7 rounded bg-background" />}
                              <span className="text-[11px] font-medium leading-tight">
                                {a.name}
                                <span className="block font-mono text-[9px] text-muted-ink">{a.code}</span>
                              </span>
                              <button
                                title="Xóa khỏi cảnh"
                                onClick={() => setDraft(withIds(draft, g.type, idsOf(draft, g.type).filter((x) => x !== a.id)))}
                                className="ml-1 grid size-5 place-items-center rounded-full text-xs text-muted-ink hover:bg-background hover:text-ink"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {SECTIONS.map((sec) => (
              <div key={sec.n} className="space-y-2">
                <Heading n={sec.n} t={sec.t} />
                {sec.fields.map((f) => (
                  <label key={f.key} className="block">
                    <span className="mb-1 block text-[11px] text-muted-ink">{f.label}</span>
                    {f.long ? (
                      <textarea
                        rows={2}
                        value={draft[f.key] ?? ""}
                        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                        placeholder={f.ph}
                        className="w-full resize-none rounded-xl border border-line bg-background px-3 py-2 text-xs leading-relaxed focus:border-accent focus:outline-none"
                      />
                    ) : (
                      <>
                        <input
                          list={f.options ? `opt-${f.key}` : undefined}
                          value={draft[f.key] ?? ""}
                          onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                          placeholder={f.options ? "Chọn hoặc nhập tùy chỉnh" : f.ph}
                          className="w-full rounded-xl border border-line bg-background px-3 py-2 text-xs focus:border-accent focus:outline-none"
                        />
                        {f.options && (
                          <datalist id={`opt-${f.key}`}>
                            {f.options.map((o) => (
                              <option key={o} value={o} />
                            ))}
                          </datalist>
                        )}
                      </>
                    )}
                  </label>
                ))}
              </div>
            ))}
            {err && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}
          </div>
        ) : (
          <>
            <h3 className="mb-1 font-display text-lg tracking-tight">{scene.title}</h3>
            <p className="mb-3 text-xs leading-relaxed text-muted-ink">{scene.description}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {FIELDS.map(({ key, label, wide }) => (
                <div key={key} className={wide ? "col-span-2" : undefined}>
                  <dt className="text-muted-ink">{label}</dt>
                  <dd className="font-medium">{scene[key]}</dd>
                </div>
              ))}
            </dl>
            {(scene.action || scene.camera_movement) && (
              <div className="mt-3 space-y-1 text-xs">
                {scene.action && <p className="line-clamp-2"><span className="text-muted-ink">🎬 Hành động:</span> {scene.action}</p>}
                <p><span className="text-muted-ink">🎥 Camera:</span> {[scene.camera, scene.camera_movement].filter(Boolean).join(" · ")}</p>
              </div>
            )}
            <div className="mt-4 space-y-1 rounded-2xl border border-line bg-background p-3 text-xs">
              {GROUPS.map((g) => {
                const items = resolve(scene, g.type);
                const first = items[0];
                return (
                  <p key={g.type} className="flex items-center gap-1.5 truncate">
                    <span>{g.icon}</span>
                    <span className="text-muted-ink">{g.label}:</span>
                    {first ? (
                      <>
                        {masterUrl(first) && <img src={masterUrl(first)!} alt="" className="size-5 rounded object-cover" />}
                        <span className="truncate font-medium">{first.name}</span>
                        {items.length > 1 && <span className="text-muted-ink">+ {items.length - 1}</span>}
                      </>
                    ) : (
                      <span className="text-muted-ink/70">—</span>
                    )}
                  </p>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-4 flex gap-2">
          {draft ? (
            <>
              <button onClick={() => setDraft(null)} disabled={saving} className="flex-1 rounded-xl border border-line py-2 text-xs font-medium hover:bg-background">
                Hủy
              </button>
              <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-accent py-2 text-xs font-semibold text-accent-foreground disabled:opacity-60">
                {saving ? "Đang lưu…" : "Lưu"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setDraft(scene)} className="flex-1 rounded-xl border border-line py-2 text-xs font-medium hover:bg-background">
                Chỉnh sửa
              </button>
              <button onClick={onDuplicate} className="flex-1 rounded-xl border border-line py-2 text-xs font-medium hover:bg-background">
                Sao chép
              </button>
              <button onClick={onRegenerate} className="flex-1 rounded-xl bg-accent-soft py-2 text-xs font-semibold text-accent hover:bg-accent/20">
                Tạo lại
              </button>
            </>
          )}
        </div>
      </div>

      {picking && draft && (
        <AssetPicker
          type={picking}
          assets={assets}
          single={picking === "location"}
          selectedIds={idsOf(draft, picking)}
          onClose={() => setPicking(null)}
          onSave={(ids) => {
            setDraft(withIds(draft, picking, ids));
            setPicking(null);
          }}
        />
      )}
    </article>
  );
}
