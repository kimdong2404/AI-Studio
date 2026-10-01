import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { masterUrl, newId, type Asset } from "@/lib/assets";
import {
  deleteExpression,
  EXPR_FIELDS,
  fetchExpressions,
  fetchSheet,
  fetchViewTypes,
  LOCK_KEYS,
  saveExpression,
  saveSheet,
  saveViewTypes,
  SHEET_GROUPS,
  VIEW_TYPES,
  type Expression,
  type Sheet,
} from "@/lib/characterSheet";

const input =
  "w-full rounded-xl border border-line bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none";

function Head({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider">{children}</h4>;
}

function Txt({ label, value, onChange, long }: { label: string; value: string; onChange: (v: string) => void; long?: boolean | undefined }) {
  return (
    <label className={`block ${long ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-[11px] text-muted-ink">{label}</span>
      {long ? (
        <textarea rows={2} className={`${input} resize-none`} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={input} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

export function CharacterSheet({ character, onClose, onChanged }: { character: Asset; onClose: () => void; onChanged?: (() => void) | undefined }) {
  const [sheet, setSheet] = useState<Sheet>({});
  const [exprs, setExprs] = useState<Expression[]>([]);
  const [views, setViews] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Expression | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadExprs = async () => setExprs(await fetchExpressions(character.id));
  useEffect(() => {
    void (async () => {
      try {
        const [s, , v] = await Promise.all([fetchSheet(character.id), loadExprs(), fetchViewTypes(character.id)]);
        setSheet(s ?? {});
        setViews(v);
      } catch (e) {
        setMsg({ ok: false, text: `Không tải được Character Sheet. ${e instanceof Error ? e.message : ""}` });
      }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await saveSheet(character.id, sheet);
      await saveViewTypes(views);
      setMsg({ ok: true, text: "Đã lưu Character Sheet." });
      onChanged?.();
    } catch (e) {
      console.error("[character sheet]", e);
      setMsg({ ok: false, text: `Không thể lưu Character Sheet. ${e instanceof Error ? e.message : ""}` });
    } finally {
      setSaving(false);
    }
  };

  const master = masterUrl(character);
  const lockSet = LOCK_KEYS.some((k) => sheet[k]?.trim());
  const set = (k: string) => (v: string) => setSheet((p) => ({ ...p, [k]: v }));

  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center gap-3">
          <h3 className="font-display text-xl tracking-tight">📋 Character Sheet — {character.name}</h3>
          <button onClick={onClose} className="ml-auto rounded-full border border-line px-4 py-1.5 text-sm">Đóng</button>
        </div>
        {!loaded ? (
          <p className="py-10 text-center text-sm text-muted-ink">Đang tải…</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
            <div>
              {SHEET_GROUPS.filter((g) => g.n !== "⑥").map((g) => (
                <div key={g.n}>
                  <Head>{g.n} {g.t}</Head>
                  {g.n === "①" && (
                    <div className="mb-3 grid gap-2 rounded-2xl bg-background p-3 text-xs sm:grid-cols-2">
                      <p><span className="text-muted-ink">Tên nhân vật:</span> {character.name}</p>
                      <p><span className="text-muted-ink">Mã:</span> <span className="font-mono">{character.code}</span></p>
                      <p><span className="text-muted-ink">Giới tính:</span> {character.details["gender"] || "—"}</p>
                      <p><span className="text-muted-ink">Độ tuổi:</span> {character.details["age"] || "—"}</p>
                      <p className="text-[10px] text-muted-ink sm:col-span-2">Tên, mã, giới tính, độ tuổi sửa trong form “Chỉnh sửa” nhân vật.</p>
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {g.fields.map((f) => (
                      <Txt key={f.key} label={f.label} long={f.long} value={sheet[f.key] ?? ""} onChange={set(f.key)} />
                    ))}
                  </div>
                </div>
              ))}

              <Head>⑤ 🎭 Thư viện biểu cảm</Head>
              <div className="grid gap-2 sm:grid-cols-2">
                {exprs.map((x) => {
                  const url = x.images.find((i) => i.id === x.masterImageId)?.url ?? x.images[0]?.url;
                  return (
                    <div key={x.id} className="flex items-center gap-3 rounded-2xl border border-line p-2">
                      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-background">
                        {url ? <img src={url} alt="" className="size-full object-cover" /> : "🎭"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{x.name}</p>
                        <p className="truncate text-[11px] text-muted-ink">
                          {x.images.length} ảnh{x.masterImageId ? " · ⭐ Expression Master" : ""}
                        </p>
                      </div>
                      <button onClick={() => setEditing(x)} className="rounded-lg border border-line px-2 py-1 text-[11px]">Sửa</button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Xóa biểu cảm "${x.name}" và các ảnh của nó?`)) return;
                          try {
                            await deleteExpression(x);
                            await loadExprs();
                            onChanged?.();
                          } catch (e) {
                            setMsg({ ok: false, text: `Không thể xóa biểu cảm. ${e instanceof Error ? e.message : ""}` });
                          }
                        }}
                        className="rounded-lg border border-line px-2 py-1 text-[11px] text-destructive"
                      >
                        Xóa
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setEditing({ id: null, character_id: character.id, name: "", code: "", fields: {}, images: [], masterImageId: null })}
                className="mt-2 rounded-full bg-accent-soft px-4 py-2 text-xs font-semibold text-accent"
              >
                + Thêm biểu cảm
              </button>

              {(() => {
                const g = SHEET_GROUPS.find((x) => x.n === "⑥")!;
                return (
                  <div>
                    <Head>{g.n} {g.t}</Head>
                    <p className="mb-2 text-[11px] text-muted-ink">
                      Gợi ý cụm từ chuẩn: “Consistent with the character reference image”, “Exactly as shown in the master image”. Luôn dùng tên riêng ({character.name}).
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {g.fields.map((f) => (
                        <Txt key={f.key} label={f.label} long={f.long} value={sheet[f.key] ?? ""} onChange={set(f.key)} />
                      ))}
                    </div>
                  </div>
                );
              })()}

              <Head>⑦ Ảnh tham chiếu</Head>
              {character.images.length === 0 ? (
                <p className="text-xs text-muted-ink">Chưa có ảnh. Thêm ảnh trong form “Chỉnh sửa” nhân vật.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {character.images.map((img) => (
                    <div key={img.id} className="overflow-hidden rounded-xl border border-line">
                      <img src={img.url} alt="" className="aspect-square w-full object-cover" />
                      <select
                        value={views[img.id] ?? ""}
                        onChange={(e) => setViews((p) => ({ ...p, [img.id]: e.target.value }))}
                        className="w-full border-t border-line bg-background px-1 py-1 text-[11px]"
                      >
                        <option value="">Chưa phân loại</option>
                        {VIEW_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <Head>⑧ Master Image</Head>
              {master ? (
                <img src={master} alt="Master" className="w-48 rounded-2xl border border-line object-cover" />
              ) : (
                <p className="text-xs text-muted-ink">Nhân vật chưa có Master Image.</p>
              )}
              <p className="mt-1 text-[11px] text-muted-ink">Luôn dùng Master Image hiện tại của nhân vật — đổi trong form “Chỉnh sửa”.</p>

              <div className="sticky bottom-0 mt-6 flex items-center gap-3 border-t border-line bg-surface py-3">
                {msg && <p className={`text-xs ${msg.ok ? "text-accent" : "text-destructive"}`}>{msg.text}</p>}
                <button onClick={save} disabled={saving} className="ml-auto rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60">
                  {saving ? "Đang lưu…" : "Lưu Character Sheet"}
                </button>
              </div>
            </div>

            <aside className="h-fit rounded-2xl border border-line bg-background p-4 text-xs lg:sticky lg:top-0">
              <p className="mb-2 font-semibold uppercase tracking-wider">Preview</p>
              {master && <img src={master} alt="" className="mb-3 aspect-square w-full rounded-xl object-cover" />}
              <dl className="space-y-2">
                <div><dt className="text-muted-ink">Tên</dt><dd className="font-medium">{character.name}</dd></div>
                <div><dt className="text-muted-ink">Identity</dt><dd>{sheet["identity_description"] || sheet["character_identity"] || "—"}</dd></div>
                <div><dt className="text-muted-ink">Appearance</dt><dd>{[sheet["species"], sheet["breed"], sheet["hair_color"], sheet["pattern"], sheet["eye_color"]].filter(Boolean).join(", ") || "—"}</dd></div>
                <div><dt className="text-muted-ink">Outfit</dt><dd>{sheet["outfit_description"] || sheet["outfit_main"] || "—"}</dd></div>
                <div><dt className="text-muted-ink">Expressions</dt><dd>{exprs.map((x) => x.name).join(" / ") || "—"}</dd></div>
                <div><dt className="text-muted-ink">Identity Lock</dt><dd>{lockSet ? "Đã thiết lập" : "Chưa thiết lập"}</dd></div>
              </dl>
            </aside>
          </div>
        )}
      </div>
      {editing && (
        <ExpressionForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={async (x) => {
            await saveExpression(x, editing.id ? editing : undefined);
            await loadExprs();
            setEditing(null);
            onChanged?.();
          }}
        />
      )}
    </div>,
    document.body,
  );
}

function ExpressionForm({ initial, onCancel, onSave }: { initial: Expression; onCancel: () => void; onSave: (x: Expression) => Promise<void> }) {
  const [x, setX] = useState<Expression>(initial);
  const [saving, setSaving] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);

  const upload = (files: FileList | null) => {
    if (!files) return;
    const imgs = Array.from(files)
      .filter((f) => /image\/(jpeg|png|webp)/.test(f.type))
      .map((f) => ({ id: newId("new"), url: URL.createObjectURL(f), file: f }));
    setX((p) => ({ ...p, images: [...p.images, ...imgs], masterImageId: p.masterImageId ?? imgs[0]?.id ?? null }));
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/40 p-4" onClick={(e) => { e.stopPropagation(); onCancel(); }}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 font-display text-lg tracking-tight">{initial.id ? `Sửa biểu cảm: ${initial.name}` : "Thêm biểu cảm"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Txt label="Tên biểu cảm *" value={x.name} onChange={(v) => setX({ ...x, name: v })} />
          <Txt label="Mã biểu cảm" value={x.code} onChange={(v) => setX({ ...x, code: v.toUpperCase().replace(/\s+/g, "_") })} />
          {EXPR_FIELDS.map((f) => (
            <Txt key={f.key} label={f.label} long={"long" in f && f.long} value={x.fields[f.key] ?? ""} onChange={(v) => setX({ ...x, fields: { ...x.fields, [f.key]: v } })} />
          ))}
        </div>
        <p className="mb-2 mt-4 text-xs font-semibold">Ảnh tham chiếu (không bắt buộc)</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {x.images.map((img) => (
            <div key={img.id} className={`relative overflow-hidden rounded-xl border-2 ${x.masterImageId === img.id ? "border-accent" : "border-line"}`}>
              <img src={img.url} alt="" className="aspect-square w-full object-cover" />
              <div className="flex">
                <button onClick={() => setX({ ...x, masterImageId: img.id })} className="flex-1 bg-background py-1 text-[10px]">
                  {x.masterImageId === img.id ? "⭐ Master" : "☆ Đặt Master"}
                </button>
                <button
                  onClick={() => {
                    if (x.masterImageId === img.id && x.images.length > 1) {
                      setWarn("Đây là Expression Master. Hãy chọn ảnh khác làm Master trước khi xóa.");
                      return;
                    }
                    setWarn(null);
                    setX({ ...x, images: x.images.filter((i) => i.id !== img.id), masterImageId: x.masterImageId === img.id ? null : x.masterImageId });
                  }}
                  className="bg-background px-2 text-[10px] text-destructive"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-xs text-muted-ink">
            + Thêm ảnh
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files)} />
          </label>
        </div>
        {warn && <p className="mt-3 text-xs text-destructive">{warn}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-full border border-line px-5 py-2 text-sm">Hủy</button>
          <button
            disabled={saving}
            onClick={async () => {
              if (!x.name.trim()) return setWarn("Vui lòng nhập: Tên biểu cảm");
              setSaving(true);
              setWarn(null);
              try {
                await onSave(x);
              } catch (e) {
                console.error("[expression save]", e);
                setWarn(`Không thể lưu biểu cảm. ${e instanceof Error ? e.message : ""}`);
                setSaving(false);
              }
            }}
            className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
          >
            {saving ? "Đang lưu…" : "Lưu biểu cảm"}
          </button>
        </div>
      </div>
    </div>
  );
}
