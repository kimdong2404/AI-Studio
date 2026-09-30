import { useMemo, useState } from "react";
import { ASSET_TYPES, masterUrl, toSceneAsset, type Asset, type AssetType, type SceneAsset } from "@/lib/assets";
import { filterAssets, SearchBar } from "./AssetLibrary";

export function AssetPicker({
  assets,
  selected,
  onClose,
  onSave,
}: {
  assets: Asset[];
  selected: SceneAsset[];
  onClose: () => void;
  onSave: (v: SceneAsset[]) => void;
}) {
  const [tab, setTab] = useState<AssetType>("character");
  const [q, setQ] = useState("");
  const [by, setBy] = useState<"all" | "name" | "code">("all");
  const [ids, setIds] = useState<Set<string>>(new Set(selected.map((s) => s.asset_id)));
  const list = useMemo(() => filterAssets(assets.filter((a) => a.type === tab), q, by), [assets, tab, q, by]);

  const toggle = (id: string) =>
    setIds((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const save = () => {
    // keep previously saved entries for assets that were deleted from library
    const fromLib = assets.filter((a) => ids.has(a.id)).map(toSceneAsset);
    const orphan = selected.filter((s) => ids.has(s.asset_id) && !assets.some((a) => a.id === s.asset_id));
    onSave([...fromLib, ...orphan]);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 font-display text-xl tracking-tight">Chọn asset cho cảnh</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {(Object.keys(ASSET_TYPES) as AssetType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${tab === t ? "bg-ink text-background" : "border border-line"}`}
            >
              {ASSET_TYPES[t].icon} {ASSET_TYPES[t].label}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <SearchBar q={q} setQ={setQ} by={by} setBy={setBy} />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
          {list.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-ink">Không có asset nào.</p>}
          {list.map((a) => {
            const on = ids.has(a.id);
            const url = masterUrl(a);
            return (
              <button
                key={a.id}
                onClick={() => toggle(a.id)}
                className={`overflow-hidden rounded-2xl border-2 text-left ${on ? "border-accent" : "border-line"}`}
              >
                <div className="relative aspect-[4/3] bg-background">
                  {url && <img src={url} alt={a.name} className="size-full object-cover" />}
                  {on && (
                    <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-accent text-xs text-accent-foreground">
                      ✓
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-sm font-semibold">{a.name}</p>
                  <p className="truncate font-mono text-[10px] text-muted-ink">{a.code}</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <span className="mr-auto text-xs text-muted-ink">Đã chọn {ids.size} asset</span>
          <button onClick={onClose} className="rounded-full border border-line px-5 py-2.5 text-sm font-medium">
            Hủy
          </button>
          <button onClick={save} className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground">
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
