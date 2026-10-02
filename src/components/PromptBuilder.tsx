import { useCallback, useEffect, useState } from "react";
import type { Asset } from "@/lib/assets";
import type { Scene } from "@/lib/storyboard";
import {
  buildPrompt,
  clearEditedPrompt,
  fetchSavedPrompt,
  loadContext,
  master,
  saveEditedPrompt,
  type PromptCtx,
} from "@/lib/promptBuilder";

type Props = {
  scenes: Scene[];
  assets: Asset[];
  /** Reload scenes + all libraries from the database. */
  refreshAll: () => Promise<void>;
};

type Ref = { url: string; name: string; kind: string; role: string };

export function PromptBuilder({ scenes, assets, refreshAll }: Props) {
  const [sceneId, setSceneId] = useState<string>("");
  const [ctx, setCtx] = useState<PromptCtx | null>(null);
  const [auto, setAuto] = useState("");
  const [text, setText] = useState("");
  const [saved, setSaved] = useState<{ auto_prompt: string; edited_prompt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!sceneId && scenes[0]) setSceneId(scenes[0].id);
  }, [scenes, sceneId]);

  const build = useCallback(async () => {
    const i = scenes.findIndex((s) => s.id === sceneId);
    const scene = scenes[i];
    if (!scene) return;
    setBusy(true);
    try {
      const c = await loadContext(scene, i, assets);
      const p = buildPrompt(c);
      const sp = await fetchSavedPrompt(scene.id);
      setCtx(c);
      setAuto(p);
      setSaved(sp);
      setText(sp?.edited_prompt || p);
      setMsg(null);
    } catch (e) {
      console.error("[prompt-builder]", e);
      setMsg(`Không tải được dữ liệu. ${e instanceof Error ? e.message : ""}`);
    } finally {
      setBusy(false);
    }
  }, [scenes, sceneId, assets]);

  useEffect(() => {
    void build();
  }, [build]);

  const edited = !!saved?.edited_prompt;
  const outdated = edited && saved!.auto_prompt !== auto;
  const dirty = text !== (saved?.edited_prompt || auto);

  const refs: Ref[] = [];
  if (ctx) {
    for (const { asset: a, expression: e } of ctx.characters) {
      const m = master(a);
      if (m) refs.push({ url: m.url, name: a.name, kind: "Nhân vật", role: "Master" });
      a.images.filter((i) => i.id !== a.masterImageId).forEach((i) => refs.push({ url: i.url, name: a.name, kind: "Nhân vật", role: "Reference" }));
      const em = e ? master(e) : null;
      if (e && em) refs.push({ url: em.url, name: `${a.name} — ${e.name}`, kind: "Biểu cảm", role: "Master" });
    }
    if (ctx.location) {
      const a = ctx.location;
      const m = master(a);
      if (m) refs.push({ url: m.url, name: a.name, kind: "Bối cảnh", role: "Master" });
      a.images.filter((i) => i.id !== a.masterImageId).forEach((i) => refs.push({ url: i.url, name: a.name, kind: "Bối cảnh", role: "Reference" }));
    }
    for (const [list, kind] of [[ctx.ingredients, "Nguyên liệu"], [ctx.props, "Đạo cụ"]] as const) {
      for (const a of list) {
        const m = master(a);
        if (m) refs.push({ url: m.url, name: a.name, kind, role: "Master" });
      }
    }
  }

  const nameOf = (id: string) => assets.find((a) => a.id === id)?.name;

  if (!scenes.length)
    return (
      <div className="px-8 py-20 text-center text-muted-ink">Chưa có cảnh nào. Hãy tạo storyboard trước.</div>
    );

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-8 xl:flex-row">
      <section className="min-w-0 flex-1 space-y-5">
        <div className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="mb-3 font-display text-lg tracking-tight">Chọn cảnh</h2>
          <div className="grid max-h-72 gap-2 overflow-auto sm:grid-cols-2">
            {scenes.map((s, i) => {
              const loc = s.location_id ? assets.find((a) => a.id === s.location_id) : null;
              const thumb = loc ? master(loc)?.url : undefined;
              return (
                <button
                  key={s.id}
                  onClick={() => setSceneId(s.id)}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${
                    s.id === sceneId ? "border-accent bg-accent-soft" : "border-line hover:bg-background"
                  }`}
                >
                  <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-background">
                    {thumb && <img src={thumb} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="min-w-0 text-sm">
                    <div className="truncate font-semibold">
                      Cảnh {String(i + 1).padStart(2, "0")} · {s.title}
                    </div>
                    <div className="truncate text-xs text-muted-ink">
                      👤 {s.character_ids.map(nameOf).filter(Boolean).join(", ") || "—"} · 🏠 {loc?.name ?? "—"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {ctx && (
          <div className="rounded-3xl border border-line bg-surface p-5">
            <h3 className="mb-3 font-display text-base">Tài sản trong cảnh</h3>
            <div className="flex flex-wrap gap-2">
              {[
                ...ctx.characters.map((c) => ({ a: c.asset, t: "👤", extra: c.expression ? `🎭 ${c.expression.name}` : "Chưa chọn biểu cảm" })),
                ...(ctx.location ? [{ a: ctx.location, t: "🏠", extra: "" }] : []),
                ...ctx.ingredients.map((a) => ({ a, t: "🍜", extra: "" })),
                ...ctx.props.map((a) => ({ a, t: "🎒", extra: "" })),
              ].map(({ a, t, extra }) => (
                <div key={a.id} className="flex items-center gap-2 rounded-2xl border border-line bg-background p-1.5 pr-3 text-xs">
                  <div className="size-9 overflow-hidden rounded-lg bg-surface">
                    {master(a) && <img src={master(a)!.url} alt={a.name} className="size-full object-cover" />}
                  </div>
                  <div>
                    <div className="font-semibold">{t} {a.name}</div>
                    {extra && <div className="text-muted-ink">{extra}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-line bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg tracking-tight">Generated Prompt</h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${edited || dirty ? "bg-ink text-background" : "bg-accent-soft text-accent"}`}>
              {edited || dirty ? "User Edited" : "Auto Generated"}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(text);
                  setMsg("Đã sao chép prompt.");
                }}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
              >
                Copy Prompt
              </button>
              <button
                onClick={async () => {
                  setBusy(true);
                  await refreshAll();
                  setBusy(false);
                }}
                disabled={busy}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-background disabled:opacity-60"
              >
                {busy ? "Đang tải…" : "Refresh Prompt"}
              </button>
            </div>
          </div>
          {outdated && (
            <p className="mb-3 rounded-2xl bg-destructive/10 px-4 py-2 text-sm text-destructive">
              Dữ liệu tài sản hoặc cảnh đã thay đổi sau khi bạn chỉnh sửa prompt. Bấm “Dùng prompt tự động” để cập nhật.
            </p>
          )}
          {msg && <p className="mb-3 text-sm text-muted-ink">{msg}</p>}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-[520px] w-full resize-y rounded-2xl border border-line bg-background p-4 font-mono text-xs leading-relaxed focus:border-accent focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled={!dirty || busy}
              onClick={async () => {
                try {
                  await saveEditedPrompt(sceneId, auto, text);
                  setSaved({ auto_prompt: auto, edited_prompt: text });
                  setMsg("Đã lưu prompt chỉnh sửa.");
                } catch (e) {
                  setMsg(`Không lưu được. ${e instanceof Error ? e.message : ""}`);
                }
              }}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
            >
              Lưu bản chỉnh sửa
            </button>
            <button
              disabled={!edited && !dirty}
              onClick={async () => {
                if (edited) await clearEditedPrompt(sceneId);
                setSaved(null);
                setText(auto);
                setMsg("Đã khôi phục prompt tự động.");
              }}
              className="rounded-full border border-line px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              Dùng prompt tự động
            </button>
          </div>
        </div>
      </section>

      <aside className="w-full shrink-0 xl:w-[340px]">
        <div className="rounded-3xl border border-line bg-surface p-5 xl:sticky xl:top-24">
          <h2 className="mb-3 font-display text-lg tracking-tight">Reference Images</h2>
          {refs.length === 0 ? (
            <p className="text-sm text-muted-ink">Cảnh này chưa có ảnh tham chiếu.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {refs.map((r, i) => (
                <figure key={i} className="overflow-hidden rounded-2xl border border-line bg-background">
                  <img src={r.url} alt={r.name} className="aspect-square w-full object-cover" />
                  <figcaption className="p-2 text-[11px] leading-tight">
                    <div className="truncate font-semibold">{r.name}</div>
                    <div className="text-muted-ink">
                      {r.kind} · {r.role === "Master" ? "⭐ Master" : "Reference"}
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
