import { useEffect, useMemo, useRef, useState } from "react";
import type { Asset } from "@/lib/assets";
import type { Scene } from "@/lib/storyboard";
import { fetchSavedPrompt, loadContext, master, type PromptCtx } from "@/lib/promptBuilder";
import { fetchProviderConfig, MODES, type AiModel, type AiProvider, type ReferenceImage } from "@/lib/imageGeneration";
import {
  addVideoPromptVersion,
  buildVideoPrompt,
  CAMERA_ANGLES,
  CAMERA_MOVES,
  DEFAULT_VIDEO_SETTINGS,
  DURATIONS,
  fetchLatestVideoPrompt,
  FRAME_RATES,
  generateVideo,
  VIDEO_ASPECTS,
  VIDEO_NOT_CONNECTED,
  VIDEO_QUALITIES,
  VIDEO_RESOLUTIONS,
  type VideoPromptVersion,
  type VideoSettings,
  type VideoShot,
} from "@/lib/videoGeneration";

type Props = { scenes: Scene[]; assets: Asset[]; onGoToImage: () => void };
type Ref = ReferenceImage & { key: string; group: string };
/** Generated scene images — none exist until an image provider is connected. */
type SourceImage = { id: string; url: string };

const SETTINGS_KEY = "video_generation_settings";
const SCENE_KEY = "video_generation_scene";
const shotKey = (id: string) => `video_shot_${id}`;
const draftKey = (id: string) => `video_prompt_draft_${id}`;
const num = (i: number) => `Cảnh ${String(i + 1).padStart(2, "0")}`;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <h2 className="mb-3 font-display text-lg tracking-tight">{title}</h2>
      {children}
    </div>
  );
}
function Pills({ value, options, onChange }: { value: string; options: Array<{ id: string; label: string }>; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} className={`rounded-full border px-3 py-1.5 text-sm ${value === o.id ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line hover:bg-background"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-muted-ink">{label}</span>
      {children}
    </label>
  );
}
const inputCls = "w-full rounded-xl border border-line bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none";

export function VideoGeneration({ scenes, assets, onGoToImage }: Props) {
  const [sceneId, setSceneId] = useState("");
  const [ctx, setCtx] = useState<PromptCtx | null>(null);
  const [builderSource, setBuilderSource] = useState<"Auto Generated" | "User Edited">("Auto Generated");
  const [shot, setShot] = useState<VideoShot>({ camera: "", camera_movement: "", duration: "", prev_scene_id: "", next_scene_id: "" });
  const [saved, setSaved] = useState<VideoPromptVersion | null>(null);
  const [text, setText] = useState("");
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [firstFrame, setFirstFrame] = useState("");
  const [lastFrame, setLastFrame] = useState("none");
  const [notice, setNotice] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [cfg, setCfg] = useState<{ providers: AiProvider[]; models: AiModel[] }>({ providers: [], models: [] });
  const sourceImages: SourceImage[] = [];
  const [sourceId, setSourceId] = useState("");
  const assetsRef = useRef(assets);
  assetsRef.current = assets;
  const assetsKey = assets.map((a) => `${a.id}:${a.masterImageId}`).join(",");

  useEffect(() => {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      if (s) setSettings({ ...DEFAULT_VIDEO_SETTINGS, ...JSON.parse(s) });
      const sc = localStorage.getItem(SCENE_KEY);
      if (sc) setSceneId(sc);
    } catch { /* ignore */ }
    void fetchProviderConfig().then(setCfg).catch((e) => console.error("[video config]", e));
  }, []);
  useEffect(() => {
    if (scenes.length && !scenes.some((s) => s.id === sceneId)) setSceneId(scenes[0]!.id);
  }, [scenes, sceneId]);

  const sceneIdx = scenes.findIndex((s) => s.id === sceneId);
  const scene = scenes[sceneIdx];

  // Load scene context (fresh data by ID) + saved video prompt — only on scene open / data change.
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!scene) return;
    try { localStorage.setItem(SCENE_KEY, scene.id); } catch { /* ignore */ }
    let cancelled = false;
    void (async () => {
      const [c, sp, latest] = await Promise.all([loadContext(scene, sceneIdx, assetsRef.current), fetchSavedPrompt(scene.id), fetchLatestVideoPrompt(scene.id)]);
      if (cancelled) return;
      setCtx(c);
      setBuilderSource(sp ? "User Edited" : "Auto Generated");
      if (loadedFor.current !== scene.id) {
        loadedFor.current = scene.id;
        let stored: Partial<VideoShot> = {};
        try { stored = JSON.parse(localStorage.getItem(shotKey(scene.id)) ?? "{}"); } catch { /* ignore */ }
        setShot({
          camera: stored.camera ?? scene.camera ?? "",
          camera_movement: stored.camera_movement ?? scene.camera_movement ?? "",
          duration: stored.duration ?? scene.duration ?? "",
          prev_scene_id: stored.prev_scene_id ?? scenes[sceneIdx - 1]?.id ?? "",
          next_scene_id: stored.next_scene_id ?? scenes[sceneIdx + 1]?.id ?? "",
        });
        setSaved(latest);
        setSelected({});
        setNotice(null);
        setMsg(null);
        setFirstFrame("");
        setLastFrame("none");
        const draft = localStorage.getItem(draftKey(scene.id));
        setText(draft ?? (latest?.source_type === "user_edited" ? latest.prompt_text : "")); // "" → filled with auto below
      }
    })().catch((e) => console.error("[video-gen]", e));
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId, scenes, assetsKey]);

  const neighbours = {
    prev: (() => { const i = scenes.findIndex((s) => s.id === shot.prev_scene_id); return i >= 0 ? `${num(i)} — ${scenes[i]!.title}` : undefined; })(),
    next: (() => { const i = scenes.findIndex((s) => s.id === shot.next_scene_id); return i >= 0 ? `${num(i)} — ${scenes[i]!.title}` : undefined; })(),
  };
  const auto = useMemo(() => (ctx && ctx.scene.id === sceneId ? buildVideoPrompt(ctx, shot, neighbours) : ""), // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx, shot, neighbours.prev, neighbours.next, sceneId]);

  // Follow the auto prompt only while the user has not edited it.
  const prevAuto = useRef("");
  useEffect(() => {
    if (!auto) return;
    const userSaved = saved?.source_type === "user_edited";
    setText((t) => (t === "" || (!userSaved && t === prevAuto.current) ? auto : t));
    prevAuto.current = auto;
  }, [auto, saved]);

  const baseline = saved?.source_type === "user_edited" ? saved.prompt_text : auto;
  const dirty = text !== baseline;
  const status = dirty ? "User Edited — Unsaved" : saved?.source_type === "user_edited" ? "User Edited" : "Auto Generated";

  const updateShot = (patch: Partial<VideoShot>) => {
    setShot((p) => {
      const n = { ...p, ...patch };
      try { localStorage.setItem(shotKey(sceneId), JSON.stringify(n)); } catch { /* ignore */ }
      return n;
    });
  };
  const updateSettings = (patch: Partial<VideoSettings>) => {
    setSettings((p) => {
      const n = { ...p, ...patch };
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(n)); } catch { /* ignore */ }
      return n;
    });
  };
  const onType = (t: string) => {
    setText(t);
    setMsg(null);
    try { localStorage.setItem(draftKey(sceneId), t); } catch { /* ignore */ }
  };
  const onSave = async () => {
    try {
      await addVideoPromptVersion(sceneId, "user_edited", text);
      setSaved(await fetchLatestVideoPrompt(sceneId));
      localStorage.removeItem(draftKey(sceneId));
      setMsg("Đã lưu Video Prompt.");
    } catch (e) {
      console.error("[video prompt save]", e);
      setMsg(`Không thể lưu Video Prompt. ${e instanceof Error ? e.message : ""}`);
    }
  };
  const onReset = async () => {
    if (dirty && !window.confirm("Bạn có thay đổi chưa lưu. Thay bằng prompt tự động?")) return;
    try {
      if (saved?.source_type === "user_edited") {
        await addVideoPromptVersion(sceneId, "auto_generated", auto);
        setSaved(await fetchLatestVideoPrompt(sceneId));
      }
      localStorage.removeItem(draftKey(sceneId));
      setText(auto);
      setMsg("Đã chuyển về Auto Generated.");
    } catch (e) {
      console.error("[video prompt reset]", e);
      setMsg(`Không thể đặt lại. ${e instanceof Error ? e.message : ""}`);
    }
  };

  // Reference images from the scene's assets (current URLs, nothing re-uploaded).
  const refs: Ref[] = [];
  if (ctx) {
    const push = (group: string, a: { name: string; images: { id: string; url: string }[]; masterImageId: string | null }, kind: string, masterLabel = "Master") => {
      const m = master(a);
      if (m) refs.push({ key: `${group}:${m.id}`, group, url: m.url, assetName: a.name, kind, role: masterLabel });
      a.images.filter((i) => i.id !== a.masterImageId).forEach((i, n) => refs.push({ key: `${group}:${i.id}`, group, url: i.url, assetName: a.name, kind, role: `Reference ${n + 1}` }));
    };
    ctx.characters.forEach((c) => {
      push("CHARACTERS", c.asset, "Nhân vật");
      if (c.expression) {
        const m = master(c.expression);
        if (m) refs.push({ key: `CHARACTERS:ex:${m.id}`, group: "CHARACTERS", url: m.url, assetName: `${c.asset.name} — ${c.expression.name}`, kind: "Biểu cảm", role: "Expression Master" });
      }
    });
    if (ctx.location) push("LOCATION", ctx.location, "Bối cảnh");
    ctx.ingredients.forEach((a) => push("INGREDIENTS", a, "Nguyên liệu"));
    ctx.props.forEach((a) => push("PROPS", a, "Đạo cụ"));
    sourceImages.forEach((s) => refs.push({ key: `SOURCE:${s.id}`, group: "SOURCE IMAGE", url: s.url, assetName: "Generated Scene Image", kind: "Ảnh cảnh", role: "Source Image Master" }));
  }
  const isOn = (r: Ref) => selected[r.key] ?? r.role.includes("Master");
  const chosen = refs.filter(isOn);
  const groups = ["CHARACTERS", "LOCATION", "INGREDIENTS", "PROPS", "SOURCE IMAGE"].filter((g) => refs.some((r) => r.group === g));
  const frameOptions = [...sourceImages.map((s, i) => ({ key: `SOURCE:${s.id}`, label: `Generated Scene Image ${i + 1}`, url: s.url })), ...refs.filter((r) => r.group !== "SOURCE IMAGE").map((r) => ({ key: r.key, label: `${r.assetName} · ${r.role}`, url: r.url }))];
  const first = frameOptions.find((f) => f.key === firstFrame);

  const provider = cfg.providers[0] ?? null;
  const model = provider ? cfg.models.find((m) => m.provider_id === provider.id && m.generation_mode === settings.mode) ?? null : null;

  const onGenerate = async () => {
    try {
      await generateVideo({
        provider, model, prompt: text,
        sourceImage: sourceImages.find((s) => s.id === sourceId)?.url ?? null,
        referenceImages: chosen, firstFrame: first?.url ?? null, lastFrame: null,
        settings: { ...settings, duration: shot.duration },
      });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : VIDEO_NOT_CONNECTED);
    }
  };

  if (!scenes.length) return <div className="px-8 py-20 text-center text-muted-ink">Chưa có cảnh nào. Hãy tạo storyboard trước.</div>;
  const nameOf = (id: string) => assets.find((a) => a.id === id)?.name;
  const sceneOpts = [{ id: "", label: "— Không có —" }, ...scenes.map((s, i) => ({ id: s.id, label: `${num(i)} — ${s.title}` })).filter((o) => o.id !== sceneId)];

  return (
    <div className="space-y-6 px-4 py-6 sm:px-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_320px]">
        {/* LEFT */}
        <div className="min-w-0 space-y-6">
          <Card title="Chọn cảnh">
            <div className="grid max-h-64 gap-2 overflow-auto">
              {scenes.map((s, i) => {
                const loc = s.location_id ? assets.find((a) => a.id === s.location_id) : null;
                const thumb = loc ? master(loc)?.url : undefined;
                return (
                  <button key={s.id} onClick={() => setSceneId(s.id)} className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${s.id === sceneId ? "border-accent bg-accent-soft" : "border-line hover:bg-background"}`}>
                    <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-background">{thumb && <img src={thumb} alt="" className="size-full object-cover" />}</div>
                    <div className="min-w-0 text-sm">
                      <div className="truncate font-semibold">{num(i)} · {s.title}</div>
                      <div className="truncate text-xs text-muted-ink">👤 {s.character_ids.map(nameOf).filter(Boolean).join(", ") || "—"} · 🏠 {loc?.name ?? "—"}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {scene && ctx && (
              <dl className="mt-4 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
                {[
                  ["Mô tả", scene.description], ["Thời lượng", scene.duration], ["Hành động", scene.action], ["Biểu cảm", scene.expression],
                  ["Góc máy", scene.camera], ["Chuyển động", scene.camera_movement], ["Ánh sáng", scene.lighting], ["Thời gian", scene.time_of_day],
                  ["Phong cách", scene.visual_style], ["Thoại", scene.dialogue], ["Hiệu ứng", scene.sound_effect], ["Âm nền", scene.ambient_sound],
                  ["Nhân vật", ctx.characters.map((c) => `${c.asset.name}${c.expression ? ` (🎭 ${c.expression.name})` : ""}`).join(", ")],
                  ["Bối cảnh", ctx.location?.name], ["Nguyên liệu", ctx.ingredients.map((a) => a.name).join(", ")], ["Đạo cụ", ctx.props.map((a) => a.name).join(", ")],
                ].filter(([, val]) => val && val !== "—").map(([k, val]) => (
                  <div key={k as string}><dt className="text-muted-ink">{k}</dt><dd className="font-medium">{val}</dd></div>
                ))}
              </dl>
            )}
          </Card>

          <Card title="🖼️ Source Image">
            {sourceImages.length ? (
              <div className="grid grid-cols-3 gap-2">
                {sourceImages.map((s) => (
                  <button key={s.id} onClick={() => setSourceId(s.id)} className={`overflow-hidden rounded-2xl border ${sourceId === s.id ? "border-accent" : "border-line"}`}>
                    <img src={s.url} alt="" className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-background p-4 text-sm">
                <span className="text-muted-ink">Chưa có ảnh đầu vào</span>
                <button onClick={onGoToImage} className="ml-auto rounded-full border border-line px-3 py-1.5 font-medium hover:bg-surface">← Đi tới Tạo ảnh AI</button>
              </div>
            )}
          </Card>

          <Card title="🎬 Video Prompt">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent">{status}</span>
              <span className="text-muted-ink">Prompt Builder: {builderSource}</span>
              <div className="ml-auto flex flex-wrap gap-2">
                <button onClick={() => void navigator.clipboard.writeText(text).then(() => setMsg("Đã copy prompt."))} className="rounded-full border border-line px-3 py-1.5 text-sm">📋 Copy Prompt</button>
                <button onClick={onSave} disabled={!dirty} className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground disabled:opacity-40">💾 Save Prompt</button>
                <button onClick={onReset} className="rounded-full border border-line px-3 py-1.5 text-sm">↩ Reset to Auto Generated</button>
              </div>
            </div>
            <textarea value={text} onChange={(e) => onType(e.target.value)} className="h-96 w-full resize-y rounded-2xl border border-line bg-background p-4 font-mono text-xs leading-relaxed focus:border-accent focus:outline-none" />
            {msg && <p className="mt-2 text-sm text-accent">{msg}</p>}
          </Card>
        </div>

        {/* MIDDLE */}
        <div className="min-w-0 space-y-6">
          <Card title="📚 Video Reference Images">
            {!refs.length ? <p className="text-sm text-muted-ink">Cảnh này chưa có ảnh tham chiếu.</p> : (
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
          <Card title="🎞️ Frame Control">
            <div className="space-y-3">
              <Field label="First Frame">
                <select value={firstFrame} onChange={(e) => setFirstFrame(e.target.value)} className={inputCls}>
                  <option value="">— Chưa chọn —</option>
                  {frameOptions.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </Field>
              {first && <img src={first.url} alt="First frame" className="h-32 rounded-2xl object-cover" />}
              <Field label="Last Frame (không bắt buộc)">
                <select value={lastFrame} onChange={(e) => setLastFrame(e.target.value)} className={inputCls}>
                  <option value="none">None</option>
                </select>
              </Field>
            </div>
          </Card>
          <Card title="🔗 Video Continuity">
            <div className="space-y-3">
              <Field label="Previous Scene">
                <select value={shot.prev_scene_id} onChange={(e) => updateShot({ prev_scene_id: e.target.value })} className={inputCls}>
                  {sceneOpts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Next Scene">
                <select value={shot.next_scene_id} onChange={(e) => updateShot({ next_scene_id: e.target.value })} className={inputCls}>
                  {sceneOpts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </Field>
            </div>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          <Card title="🎥 Camera & Duration">
            <div className="space-y-3">
              <Field label="Camera Angle">
                <input list="vg-angles" value={shot.camera} onChange={(e) => updateShot({ camera: e.target.value })} placeholder="Custom…" className={inputCls} />
                <datalist id="vg-angles">{CAMERA_ANGLES.map((a) => <option key={a} value={a} />)}</datalist>
              </Field>
              <Field label="Camera Movement">
                <input list="vg-moves" value={shot.camera_movement} onChange={(e) => updateShot({ camera_movement: e.target.value })} placeholder="Custom…" className={inputCls} />
                <datalist id="vg-moves">{CAMERA_MOVES.map((a) => <option key={a} value={a} />)}</datalist>
              </Field>
              <Field label="Duration">
                <input list="vg-dur" value={shot.duration} onChange={(e) => updateShot({ duration: e.target.value })} className={inputCls} />
                <datalist id="vg-dur">{DURATIONS.map((a) => <option key={a} value={a} />)}</datalist>
              </Field>
              <p className="text-xs text-muted-ink">Chỉ áp dụng cho video, không thay đổi cảnh gốc.</p>
            </div>
          </Card>
          <Card title="⚙️ Video Settings">
            <div className="space-y-3 text-sm">
              <div><div className="mb-1 text-xs text-muted-ink">Generation Mode</div><Pills value={settings.mode} options={MODES.map((m) => ({ id: m.id, label: `${m.dot} ${m.label}` }))} onChange={(mode) => updateSettings({ mode: mode as VideoSettings["mode"] })} /></div>
              <div><div className="mb-1 text-xs text-muted-ink">Aspect Ratio</div><Pills value={settings.aspect_ratio} options={VIDEO_ASPECTS.map((a) => ({ id: a, label: a }))} onChange={(aspect_ratio) => updateSettings({ aspect_ratio })} /></div>
              <div><div className="mb-1 text-xs text-muted-ink">Resolution</div><Pills value={settings.resolution} options={VIDEO_RESOLUTIONS.map((r) => ({ id: r.id, label: r.label }))} onChange={(resolution) => updateSettings({ resolution })} /></div>
              <div><div className="mb-1 text-xs text-muted-ink">Frame Rate</div><Pills value={settings.frame_rate} options={FRAME_RATES.map((r) => ({ id: r.id, label: r.label }))} onChange={(frame_rate) => updateSettings({ frame_rate })} /></div>
              <div><div className="mb-1 text-xs text-muted-ink">Quality</div><Pills value={settings.quality} options={VIDEO_QUALITIES.map((r) => ({ id: r.id, label: r.label }))} onChange={(quality) => updateSettings({ quality })} /></div>
            </div>
          </Card>
          <Card title="💰 Cost Protection">
            <p className="text-sm">{VIDEO_NOT_CONNECTED}</p>
            <p className="mt-2 text-sm text-muted-ink">Estimated Cost: Not available</p>
          </Card>
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-display text-lg tracking-tight">Generation Summary</h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
          {[
            ["Scene", scene ? `${num(sceneIdx)} — ${scene.title}` : "—"],
            ["Characters", ctx?.characters.map((c) => c.asset.name).join(", ") || "—"],
            ["Location", ctx?.location?.name ?? "—"],
            ["Ingredients", ctx?.ingredients.map((a) => a.name).join(", ") || "—"],
            ["Props", ctx?.props.map((a) => a.name).join(", ") || "—"],
            ["Expression", ctx?.characters.filter((c) => c.expression).map((c) => `${c.asset.name}: ${c.expression!.name}`).join(", ") || "—"],
            ["Source Image", sourceId ? "Đã chọn" : "Chưa có ảnh đầu vào"],
            ["Reference Images", chosen.length],
            ["Prompt", status === "Auto Generated" ? "Auto Generated" : "User Edited"],
            ["Generation Mode", MODES.find((m) => m.id === settings.mode)!.label],
            ["Provider", provider?.name ?? "Chưa kết nối"],
            ["Model", model?.name ?? "Chưa cấu hình"],
            ["Estimated Cost", "Not available"],
          ].map(([k, val]) => (
            <div key={k as string}><dt className="text-xs text-muted-ink">{k}</dt><dd className="font-semibold">{val}</dd></div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={onGenerate} className="rounded-2xl bg-accent px-6 py-3 text-base font-semibold text-accent-foreground hover:bg-accent/90">🎬 Tạo video</button>
          {notice && <p className="rounded-2xl bg-destructive/10 px-4 py-2 text-sm text-destructive">{notice}</p>}
        </div>
      </div>
    </div>
  );
}
