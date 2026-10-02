import { useEffect, useRef, useState } from "react";
import type { Asset } from "@/lib/assets";
import type { Scene } from "@/lib/storyboard";
import { buildPrompt, fetchSavedPrompt, loadContext, master, type PromptCtx } from "@/lib/promptBuilder";
import {
  ASPECTS,
  COUNTS,
  DEFAULT_SETTINGS,
  fetchProviderConfig,
  generateImage,
  MODES,
  QUALITIES,
  RESOLUTIONS,
  type AiModel,
  type AiProvider,
  type ImageSettings,
  type ReferenceImage,
} from "@/lib/imageGeneration";

type Props = { scenes: Scene[]; assets: Asset[] };
type Ref = ReferenceImage & { key: string; group: string };

const SETTINGS_KEY = "image_generation_settings";
const SCENE_KEY = "image_generation_scene";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <h2 className="mb-3 font-display text-lg tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

function Pills<T extends string | number>({ value, options, onChange }: { value: T; options: Array<{ id: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.id)}
          onClick={() => onChange(o.id)}
          className={`rounded-full border px-3 py-1.5 text-sm ${value === o.id ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line hover:bg-background"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ImageGeneration({ scenes, assets }: Props) {
  const [sceneId, setSceneId] = useState("");
  const [ctx, setCtx] = useState<PromptCtx | null>(null);
  const [builderPrompt, setBuilderPrompt] = useState("");
  const [promptSource, setPromptSource] = useState<"Auto Generated" | "User Edited">("Auto Generated");
  const [prompt, setPrompt] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState<ImageSettings>(DEFAULT_SETTINGS);
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [cfg, setCfg] = useState<{ providers: AiProvider[]; models: AiModel[] }>({ providers: [], models: [] });
  const assetsRef = useRef(assets);
  assetsRef.current = assets;
  const assetsKey = assets.map((a) => `${a.id}:${a.masterImageId}`).join(",");

  useEffect(() => {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) });
      const sc = localStorage.getItem(SCENE_KEY);
      if (sc) setSceneId(sc);
    } catch { /* ignore */ }
    void fetchProviderConfig().then(setCfg).catch((e) => console.error("[image-gen config]", e));
  }, []);

  useEffect(() => {
    if (scenes.length && !scenes.some((s) => s.id === sceneId)) setSceneId(scenes[0]!.id);
  }, [scenes, sceneId]);

  const update = (patch: Partial<ImageSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Load the scene's current Prompt Builder prompt (saved user edit wins) — only on scene open / data change.
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    const i = scenes.findIndex((s) => s.id === sceneId);
    const scene = scenes[i];
    if (!scene) return;
    try { localStorage.setItem(SCENE_KEY, scene.id); } catch { /* ignore */ }
    let cancelled = false;
    void (async () => {
      const c = await loadContext(scene, i, assetsRef.current);
      const auto = buildPrompt(c);
      const sp = await fetchSavedPrompt(scene.id);
      if (cancelled) return;
      const p = sp?.edited_prompt ?? auto;
      setCtx(c);
      setBuilderPrompt(p);
      setPromptSource(sp ? "User Edited" : "Auto Generated");
      if (loadedFor.current !== scene.id) {
        setPrompt(p);
        setSelected({});
        setNotice(null);
        loadedFor.current = scene.id;
      }
    })().catch((e) => console.error("[image-gen]", e));
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId, scenes, assetsKey]);

  const refs: Ref[] = [];
  if (ctx) {
    const push = (group: string, a: { name: string; images: { id: string; url: string }[]; masterImageId: string | null }, kind: string, withRefs: boolean, masterLabel = "Master") => {
      const m = master(a);
      if (m) refs.push({ key: `${group}:${m.id}`, group, url: m.url, assetName: a.name, kind, role: masterLabel });
      if (withRefs)
        a.images
          .filter((i) => i.id !== a.masterImageId)
          .forEach((i, n) => refs.push({ key: `${group}:${i.id}`, group, url: i.url, assetName: a.name, kind, role: `Reference ${n + 1}` }));
    };
    ctx.characters.forEach((c) => push("CHARACTERS", c.asset, "Nhân vật", true));
    if (ctx.location) push("LOCATION", ctx.location, "Bối cảnh", true);
    ctx.ingredients.forEach((a) => push("INGREDIENTS", a, "Nguyên liệu", false));
    ctx.props.forEach((a) => push("PROPS", a, "Đạo cụ", false));
    ctx.characters.forEach((c) => c.expression && push("EXPRESSIONS", { ...c.expression, name: `${c.asset.name} — ${c.expression.name}` }, "Biểu cảm", false, "Expression Master"));
  }
  // Masters on by default, extra references off by default.
  const isOn = (r: Ref) => selected[r.key] ?? r.role.includes("Master");
  const chosen = refs.filter(isOn);
  const groups = ["CHARACTERS", "LOCATION", "INGREDIENTS", "PROPS", "EXPRESSIONS"].filter((g) => refs.some((r) => r.group === g));

  const sceneIdx = scenes.findIndex((s) => s.id === sceneId);
  const scene = scenes[sceneIdx];
  const nameOf = (id: string) => assets.find((a) => a.id === id)?.name;
  const provider = cfg.providers[0] ?? null;
  const model = provider ? cfg.models.find((m) => m.provider_id === provider.id && m.generation_mode === settings.mode) ?? null : null;
  const promptLabel = prompt === builderPrompt ? promptSource : "Đã chỉnh sửa tại đây";

  const onGenerate = async () => {
    try {
      // Provider-agnostic call; with nothing configured it throws before any network request.
      await generateImage({ provider, model, prompt, referenceImages: chosen, settings });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    }
  };

  if (!scenes.length) return <div className="px-8 py-20 text-center text-muted-ink">Chưa có cảnh nào. Hãy tạo storyboard trước.</div>;

  return (
    <div className="space-y-6 px-4 py-6 sm:px-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_320px]">
        {/* LEFT: scene + prompt */}
        <div className="min-w-0 space-y-6">
          <Card title="Chọn cảnh">
            <div className="grid max-h-64 gap-2 overflow-auto">
              {scenes.map((s, i) => {
                const loc = s.location_id ? assets.find((a) => a.id === s.location_id) : null;
                const thumb = loc ? master(loc)?.url : undefined;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSceneId(s.id)}
                    className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${s.id === sceneId ? "border-accent bg-accent-soft" : "border-line hover:bg-background"}`}
                  >
                    <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-background">{thumb && <img src={thumb} alt="" className="size-full object-cover" />}</div>
                    <div className="min-w-0 text-sm">
                      <div className="truncate font-semibold">Cảnh {String(i + 1).padStart(2, "0")} · {s.title}</div>
                      <div className="truncate text-xs text-muted-ink">
                        👤 {s.character_ids.map(nameOf).filter(Boolean).join(", ") || "—"} · 🏠 {loc?.name ?? "—"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
          <Card title="Prompt">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent">{promptLabel}</span>
              <button onClick={() => setPrompt(builderPrompt)} disabled={prompt === builderPrompt} className="ml-auto rounded-full border border-line px-3 py-1.5 text-sm disabled:opacity-40">
                Reset to Prompt Builder
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="h-96 w-full resize-y rounded-2xl border border-line bg-background p-4 font-mono text-xs leading-relaxed focus:border-accent focus:outline-none"
            />
            <p className="mt-2 text-xs text-muted-ink">Chỉnh sửa ở đây không thay đổi Prompt Builder.</p>
          </Card>
        </div>

        {/* MIDDLE: references */}
        <Card title="Reference Images">
          {!refs.length ? (
            <p className="text-sm text-muted-ink">Cảnh này chưa có ảnh tham chiếu.</p>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g}>
                  <h3 className="mb-2 font-mono text-[11px] tracking-wider text-muted-ink">{g}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {refs.filter((r) => r.group === g).map((r) => (
                      <label key={r.key} className={`cursor-pointer overflow-hidden rounded-2xl border ${isOn(r) ? "border-accent" : "border-line opacity-60"}`}>
                        <img src={r.url} alt={r.assetName} className="aspect-square w-full object-cover" />
                        <div className="flex items-start gap-1.5 p-2 text-[11px] leading-tight">
                          <input type="checkbox" checked={isOn(r)} onChange={(e) => setSelected((p) => ({ ...p, [r.key]: e.target.checked }))} className="mt-0.5" />
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{r.assetName}</div>
                            <div className="text-muted-ink">{r.kind} · {r.role.includes("Master") ? `⭐ ${r.role}` : r.role}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* RIGHT: settings */}
        <div className="space-y-4">
          <Card title="AI Generation Mode">
            <Pills value={settings.mode} options={MODES.map((m) => ({ id: m.id, label: `${m.dot} ${m.label}` }))} onChange={(mode) => update({ mode })} />
            <p className="mt-2 text-xs text-muted-ink">Model will be configured in AI Settings.</p>
          </Card>
          <Card title="AI Provider">
            <div className="space-y-1 text-sm">
              <div>Provider: <b>{provider?.name ?? "Chưa kết nối"}</b></div>
              <div>AI Model: <b>{model?.name ?? "Chưa cấu hình"}</b></div>
            </div>
          </Card>
          <Card title="Image Settings">
            <div className="space-y-3 text-sm">
              <div><div className="mb-1 text-xs text-muted-ink">Aspect Ratio</div><Pills value={settings.aspect_ratio} options={ASPECTS.map((a) => ({ id: a, label: a }))} onChange={(aspect_ratio) => update({ aspect_ratio })} /></div>
              <div><div className="mb-1 text-xs text-muted-ink">Resolution</div><Pills value={settings.resolution} options={RESOLUTIONS.map((r) => ({ id: r.id as string, label: r.label }))} onChange={(resolution) => update({ resolution })} /></div>
              <div><div className="mb-1 text-xs text-muted-ink">Number of Images</div><Pills value={settings.image_count} options={COUNTS.map((n) => ({ id: n as number, label: String(n) }))} onChange={(image_count) => update({ image_count })} /></div>
              <div><div className="mb-1 text-xs text-muted-ink">Quality</div><Pills value={settings.quality} options={QUALITIES.map((q) => ({ id: q.id as string, label: q.label }))} onChange={(quality) => update({ quality })} /></div>
            </div>
          </Card>
          <Card title="Estimated Cost">
            <p className="text-sm text-muted-ink">Not available — AI provider not connected.</p>
          </Card>
          <Card title="Budget Protection">
            <p className="mb-2 text-sm">Paid generation requires confirmation.</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> Tôi xác nhận tạo ảnh
            </label>
          </Card>
        </div>
      </div>

      {/* BOTTOM: summary + generate */}
      <div className="rounded-3xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-lg tracking-tight">Generation Summary</h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
          {[
            ["Scene", scene ? `Cảnh ${String(sceneIdx + 1).padStart(2, "0")} — ${scene.title}` : "—"],
            ["Characters", ctx?.characters.length ?? 0],
            ["Location", ctx?.location ? 1 : 0],
            ["Ingredients", ctx?.ingredients.length ?? 0],
            ["Props", ctx?.props.length ?? 0],
            ["Expression", ctx?.characters.filter((c) => c.expression).length ?? 0],
            ["Reference Images", chosen.length],
            ["Prompt", promptLabel],
            ["Generation Mode", MODES.find((m) => m.id === settings.mode)!.label],
            ["Provider", provider?.name ?? "Chưa kết nối"],
            ["Model", model?.name ?? "Chưa cấu hình"],
            ["Estimated Cost", "Not available"],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-xs text-muted-ink">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={onGenerate} className="rounded-2xl bg-accent px-6 py-3 text-base font-semibold text-accent-foreground hover:bg-accent/90">
            🎨 Tạo ảnh
          </button>
          {notice && <p className="rounded-2xl bg-destructive/10 px-4 py-2 text-sm text-destructive">{notice}</p>}
        </div>
      </div>

      <Card title="Generated Images">
        <p className="text-sm text-muted-ink">Chưa có ảnh được tạo.</p>
      </Card>
    </div>
  );
}
