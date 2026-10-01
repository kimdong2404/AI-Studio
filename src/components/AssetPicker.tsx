import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ASSET_TYPES, masterUrl, type Asset, type AssetType } from "@/lib/assets";
import { filterAssets, SearchBar } from "./AssetLibrary";

export function AssetPicker({
  type,
  assets,
  selectedIds,
  single,
  onClose,
  onSave,
}: {
  type: AssetType;
  assets: Asset[];
  selectedIds: string[];
  single?: boolean;
  onClose: () => void;
  onSave: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [by, setBy] = useState<"all" | "name" | "code">("all");
  const [ids, setIds] = useState<string[]>(selectedIds);
  const list = useMemo(() => filterAssets(assets.filter((a) => a.type === type), q, by), [assets, type, q, by]);
  const label = ASSET_TYPES[type].label.toLowerCase();

  const toggle = (id: string) =>
    setIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : single ? [id] : [...p, id]));

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 font-display text-xl tracking-tight">
          {ASSET_TYPES[type].icon} Chọn {label}
        </h3>
        <p className="mb-4 text-xs text-muted-ink">{single ? `Chọn 1 ${label} cho cảnh này.` : `Có thể chọn nhiều ${label}.`}</p>
        <div className="mb-4">
          <SearchBar q={q} setQ={setQ} by={by} setBy={setBy} />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
          {list.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-ink">
              Chưa có {label} nào. Hãy thêm trong thư viện {label}.
            </p>
          )}
          {list.map((a) => {
            const on = ids.includes(a.id);
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
                  {a.description && <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-ink">{a.description}</p>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <span className="mr-auto text-xs text-muted-ink">Đã chọn {ids.length}</span>
          <button onClick={onClose} className="rounded-full border border-line px-5 py-2.5 text-sm font-medium">
            Hủy
          </button>
          <button onClick={() => onSave(ids)} className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground">
            Xác nhận
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
