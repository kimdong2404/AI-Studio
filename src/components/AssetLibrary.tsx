import { useMemo, useState } from "react";
import {
  ASSET_TYPES,
  fileToDataUrl,
  masterUrl,
  newId,
  type Asset,
  type AssetType,
} from "@/lib/assets";

const input =
  "w-full rounded-xl border border-line bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none";

export function filterAssets(list: Asset[], q: string, by: "all" | "name" | "code") {
  const s = q.trim().toLowerCase();
  if (!s) return list;
  return list.filter((a) => {
    const n = a.name.toLowerCase().includes(s);
    const c = a.code.toLowerCase().includes(s);
    return by === "name" ? n : by === "code" ? c : n || c;
  });
}

export function SearchBar({
  q,
  setQ,
  by,
  setBy,
}: {
  q: string;
  setQ: (v: string) => void;
  by: "all" | "name" | "code";
  setBy: (v: "all" | "name" | "code") => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm theo tên hoặc mã…"
        className={`${input} min-w-[200px] flex-1 bg-surface`}
      />
      <div className="flex rounded-xl border border-line bg-surface p-1 text-xs">
        {(
          [
            ["all", "Tất cả"],
            ["name", "Theo tên"],
            ["code", "Theo mã"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setBy(k)}
            className={`rounded-lg px-3 py-1.5 font-medium ${by === k ? "bg-accent text-accent-foreground" : "text-muted-ink"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AssetLibrary({
  type,
  assets,
  setAssets,
}: {
  type: AssetType;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
}) {
  const meta = ASSET_TYPES[type];
  const [q, setQ] = useState("");
  const [by, setBy] = useState<"all" | "name" | "code">("all");
  const [editing, setEditing] = useState<Asset | null>(null);
  const list = useMemo(
    () => filterAssets(assets.filter((a) => a.type === type), q, by),
    [assets, type, q, by],
  );

  const save = (a: Asset) => {
    setAssets((prev) => (prev.some((p) => p.id === a.id) ? prev.map((p) => (p.id === a.id ? a : p)) : [...prev, a]));
    setEditing(null);
  };

  return (
    <div className="rise px-4 py-6 sm:px-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl tracking-tight">
          {meta.icon} {meta.title}
        </h2>
        <button
          onClick={() =>
            setEditing({
              id: newId(type),
              type,
              name: "",
              code: "",
              description: "",
              details: {},
              notes: "",
              images: [],
              masterImageId: null,
            })
          }
          className="ml-auto rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90"
        >
          {meta.add}
        </button>
      </div>
      <div className="mb-5">
        <SearchBar q={q} setQ={setQ} by={by} setBy={setBy} />
      </div>

      {list.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface px-6 py-20 text-center text-sm text-muted-ink">
          Chưa có mục nào. Bấm “{meta.add}” để bắt đầu.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((a) => {
            const url = masterUrl(a);
            return (
              <article key={a.id} className="overflow-hidden rounded-3xl border border-line bg-surface">
                <div className="relative aspect-[4/3] bg-background">
                  {url ? (
                    <img src={url} alt={a.name} className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center text-3xl">{meta.icon}</div>
                  )}
                  {url && (
                    <span className="absolute left-3 top-3 rounded-md bg-surface/95 px-2 py-1 text-[11px] font-semibold">
                      ⭐ Master
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-display text-lg tracking-tight">{a.name}</h3>
                  <p className="font-mono text-[11px] text-accent">{a.code}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-ink">{a.description}</p>
                  <p className="mt-2 text-[11px] text-muted-ink">{a.images.length} ảnh tham chiếu</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setEditing(a)}
                      className="flex-1 rounded-xl border border-line py-2 text-xs font-medium hover:bg-background"
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Xóa "${a.name}"?`)) setAssets((p) => p.filter((x) => x.id !== a.id));
                      }}
                      className="flex-1 rounded-xl border border-line py-2 text-xs font-medium text-destructive hover:bg-background"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && <AssetForm initial={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function AssetForm({ initial, onCancel, onSave }: { initial: Asset; onCancel: () => void; onSave: (a: Asset) => void }) {
  const [a, setA] = useState<Asset>(initial);
  const meta = ASSET_TYPES[a.type];

  const upload = async (files: FileList | null) => {
    if (!files) return;
    const imgs = await Promise.all(
      Array.from(files).map(async (f) => ({ id: newId("img"), url: await fileToDataUrl(f) })),
    );
    setA((p) => ({ ...p, images: [...p.images, ...imgs], masterImageId: p.masterImageId ?? imgs[0]?.id ?? null }));
  };

  const removeImg = (id: string) =>
    setA((p) => {
      const images = p.images.filter((i) => i.id !== id);
      return { ...p, images, masterImageId: p.masterImageId === id ? (images[0]?.id ?? null) : p.masterImageId };
    });

  const valid = a.name.trim() && a.code.trim();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onCancel}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-display text-xl tracking-tight">
          {initial.name ? `Chỉnh sửa: ${initial.name}` : meta.add.replace("+ ", "")}
        </h3>

        <p className="mb-2 text-sm font-medium">Ảnh tham chiếu</p>
        <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {a.images.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-2xl border border-line">
              <img src={img.url} alt="" className="size-full object-cover" />
              {a.masterImageId === img.id ? (
                <span className="absolute left-1.5 top-1.5 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                  ⭐ Master
                </span>
              ) : (
                <button
                  onClick={() => setA({ ...a, masterImageId: img.id })}
                  className="absolute left-1.5 top-1.5 rounded-md bg-surface/95 px-1.5 py-0.5 text-[10px] font-medium"
                >
                  ☆ Đặt Master
                </button>
              )}
              <button
                onClick={() => removeImg(img.id)}
                className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-surface/95 text-xs"
                title="Xóa ảnh"
              >
                ✕
              </button>
            </div>
          ))}
          <label className="grid aspect-square cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-line text-center text-xs text-muted-ink hover:border-accent">
            <span>
              <span className="block text-2xl">+</span>Tải ảnh lên
            </span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tên *">
            <input className={input} value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} />
          </Field>
          <Field label="Mã *">
            <input
              className={`${input} font-mono`}
              value={a.code}
              placeholder="VD: CHAR_GOLDEN_NY1"
              onChange={(e) => setA({ ...a, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label={a.type === "character" ? "Mô tả ngoại hình" : a.type === "ingredient" ? "Mô tả hình dạng" : "Mô tả"}>
              <textarea
                rows={3}
                className={`${input} resize-none`}
                value={a.description}
                onChange={(e) => setA({ ...a, description: e.target.value })}
              />
            </Field>
          </div>
          {meta.fields.map((f) => (
            <Field key={f.key} label={f.label}>
              <input
                className={input}
                value={a.details[f.key] ?? ""}
                onChange={(e) => setA({ ...a, details: { ...a.details, [f.key]: e.target.value } })}
              />
            </Field>
          ))}
          <div className="sm:col-span-2">
            <Field label="Ghi chú">
              <textarea
                rows={2}
                className={`${input} resize-none`}
                value={a.notes}
                onChange={(e) => setA({ ...a, notes: e.target.value })}
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-full border border-line px-5 py-2.5 text-sm font-medium">
            Hủy
          </button>
          <button
            disabled={!valid}
            onClick={() => onSave({ ...a, name: a.name.trim(), code: a.code.trim() })}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-ink">{label}</span>
      {children}
    </label>
  );
}
