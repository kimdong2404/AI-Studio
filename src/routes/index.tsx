import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, FolderOpen, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SceneCard } from "@/components/SceneCard";
import { AssetLibrary } from "@/components/AssetLibrary";
import { PromptBuilder } from "@/components/PromptBuilder";
import { ImageGeneration } from "@/components/ImageGeneration";
import { SettingsDialog } from "@/components/SettingsDialog";
import { analyzeWithGemini, GEMINI_KEY, getKey, MissingKeyError, rewriteScenePrompt } from "@/lib/gemini";
import { generateSceneImage, getHfToken, loadSceneImage, MissingHfTokenError, storeSceneImage } from "@/lib/sceneMedia";
import { VideoGeneration } from "@/components/VideoGeneration";
import { deleteProp, saveProp, useProps } from "@/lib/props";
import { fetchAllExpressionsLite, type ExpressionLite } from "@/lib/characterSheet";
import { fetchScenes, replaceScenes, saveOrder, saveScene } from "@/lib/scenes";
import { deleteCharacter, saveCharacter, useCharacters } from "@/lib/characters";
import { deleteLocation, saveLocation, useLocations } from "@/lib/locations";
import { deleteIngredient, saveIngredient, useIngredients } from "@/lib/ingredients";
import {
  emptyScene,
  nextId,
  SAMPLE_SCRIPT,
  type Scene,
} from "@/lib/storyboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Storyboard Studio — Biến ý tưởng thành storyboard" },
      {
        name: "description",
        content:
          "Nhập kịch bản video của bạn và nhận ngay storyboard phân cảnh trực quan: nhân vật, bối cảnh, đạo cụ, góc máy và thời lượng.",
      },
      { property: "og:title", content: "AI Storyboard Studio" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "Nhập kịch bản, nhận storyboard phân cảnh trực quan trong vài giây.",
      },
    ],
  }),
  component: StudioPage,
});

const SECTIONS = [
  { id: "script", label: "Kịch bản", icon: "✎" },
  { id: "characters", label: "Nhân vật", icon: "◉" },
  { id: "locations", label: "Bối cảnh", icon: "▤" },
  { id: "ingredients", label: "Nguyên liệu", icon: "✦" },
  { id: "props", label: "Đạo cụ", icon: "▣" },
  { id: "storyboard", label: "Storyboard", icon: "▦" },
  { id: "prompt", label: "Prompt Builder", icon: "✨" },
  { id: "image", label: "Tạo ảnh AI", icon: "🎨" },
  { id: "video", label: "Tạo Video AI", icon: "🎬" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const CAMERAS = ["Toàn cảnh", "Trung cảnh", "Cận cảnh", "Góc trên", "Góc thấp"];

const LIB_TYPE = {
  characters: "character",
  locations: "location",
  ingredients: "ingredient",
  props: "prop",
} as const;

const VOICES = ["Giọng Nữ truyền cảm", "Giọng Bà lão", "Giọng Nam trầm"];
const VIDEO_MODELS = ["Luma Lower Priority", "Wan 2.1", "CogVideoX"];
const RESOURCE_SECTIONS = SECTIONS.filter((item) => item.id in LIB_TYPE);

function StudioPage() {
  const [section, setSection] = useState<SectionId>("script");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [voiceover, setVoiceover] = useState("");
  const [videoModel, setVideoModel] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [script, setScript] = useState(SAMPLE_SCRIPT);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [retryMsg, setRetryMsg] = useState<string | null>(null);
  const onRetry = (n: number, max: number, w: number) => setRetryMsg(`🔄 Google đang quá tải — Đang thử lại... (lần ${n}/${max}, chờ ${w} giây)`);
  const [dbError, setDbError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const characters = useCharacters();
  const locations = useLocations();
  const ingredients = useIngredients();
  const props = useProps();
  const assets = [...characters.list, ...locations.list, ...ingredients.list, ...props.list];

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
      setDbError(null);
    } catch (e) {
      console.error("[storyboard]", e);
      setDbError(`Không thể lưu storyboard. ${e instanceof Error ? e.message : ""}`);
    }
  };

  useEffect(() => {
    void run(async () => setScenes(await fetchScenes()));
  }, []);
  const [expressions, setExpressions] = useState<ExpressionLite[]>([]);
  type Media = { image?: string | null; loading?: boolean; status?: string; error?: string };
  const [media, setMedia] = useState<Record<string, Media>>({});
  const [rendering, setRendering] = useState(false);
  const patchMedia = (id: string, m: Media) => setMedia((prev) => ({ ...prev, [id]: { ...prev[id], ...m } }));
  useEffect(() => {
    setMedia((prev) => {
      const next = { ...prev };
      for (const sc of scenes) if (next[sc.id]?.image === undefined) next[sc.id] = { ...next[sc.id], image: loadSceneImage(sc.id) };
      return next;
    });
  }, [scenes]);
  const needHfToken = () => {
    setSettingsNotice("Vui lòng nhập Hugging Face Token để tạo hình ảnh.");
    setSettingsOpen(true);
  };
  /** Returns false if it should stop (missing token). */
  const genImage = async (sc: Scene): Promise<boolean> => {
    if (!getHfToken()) {
      needHfToken();
      return false;
    }
    patchMedia(sc.id, { loading: true, error: undefined, status: "Đang tạo hình ảnh..." });
    try {
      const url = await generateSceneImage(sc, assets, (m) => patchMedia(sc.id, { status: m }));
      storeSceneImage(sc.id, url);
      patchMedia(sc.id, { image: url, loading: false, status: undefined });
    } catch (e) {
      console.error("[hf image]", e);
      if (e instanceof MissingHfTokenError) {
        needHfToken();
        patchMedia(sc.id, { loading: false, status: undefined });
        return false;
      }
      patchMedia(sc.id, { loading: false, status: undefined, error: e instanceof Error ? e.message : String(e) });
    }
    return true;
  };
  const renderAll = async () => {
    if (rendering) return;
    if (!scenes.length) return setActionNotice("Chưa có phân cảnh để render.");
    if (!getHfToken()) return needHfToken();
    setRendering(true);
    try {
      for (const [i, sc] of scenes.entries()) {
        setActionNotice(`🎬 Đang render cảnh ${i + 1}/${scenes.length}…`);
        if (!(await genImage(sc))) break;
      }
      setActionNotice("✅ Render xong. Bấm ▶ trên từng cảnh để nghe giọng đọc.");
    } finally {
      setRendering(false);
    }
  };
  useEffect(() => {
    void fetchAllExpressionsLite().then(setExpressions).catch((e) => console.error("[expressions]", e));
  }, [section]);

  const workspaceVisible = section === "script" || section === "storyboard";

  const analyze = async () => {
    if (!script.trim() || analyzing) return;
    if (!getKey(GEMINI_KEY)) {
      setSettingsNotice("Vui lòng nhập GEMINI_API_KEY để phân tích kịch bản.");
      setSettingsOpen(true);
      return;
    }
    setAnalyzing(true);
    setAnalyzeError(null);
    setSection("storyboard");
    try {
      const used = new Set(scenes.flatMap((sc) => [...sc.character_ids, ...sc.ingredient_ids, ...sc.prop_ids, ...(sc.location_id ? [sc.location_id] : [])]));
      const next = await analyzeWithGemini(script, assets, assets.filter((a) => used.has(a.id)), onRetry);
      setScenes(next);
      await run(() => replaceScenes(next));
    } catch (e) {
      console.error("[gemini]", e);
      if (e instanceof MissingKeyError) {
        setSettingsNotice("Vui lòng nhập GEMINI_API_KEY.");
        setSettingsOpen(true);
      } else setAnalyzeError(`Phân tích thất bại: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRetryMsg(null);
      setAnalyzing(false);
    }
  };

  const updateScene = async (updated: Scene) => {
    const i = scenes.findIndex((s) => s.id === updated.id);
    await saveScene(updated, i < 0 ? scenes.length : i);
    setScenes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const duplicateScene = (id: string) => {
    const i = scenes.findIndex((s) => s.id === id);
    const source = scenes[i];
    if (!source) return;
    const copy: Scene = { ...source, id: nextId() };
    const next = [...scenes.slice(0, i + 1), copy, ...scenes.slice(i + 1)];
    setScenes(next);
    void run(async () => {
      await saveScene(copy, i + 1);
      await saveOrder(next);
    });
  };

  const regenerateScene = async (id: string) => {
    const s = scenes.find((x) => x.id === id);
    if (!s) return;
    if (getKey(GEMINI_KEY)) {
      setAnalyzeError(null);
      try {
        const upd = { ...s, action: await rewriteScenePrompt(s, assets, onRetry) };
        setScenes((prev) => prev.map((x) => (x.id === id ? upd : x)));
        await run(() => saveScene(upd, scenes.indexOf(s)));
      } catch (e) {
        console.error("[gemini rewrite]", e);
        setAnalyzeError(`Không viết lại được prompt: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setRetryMsg(null);
      }
      return;
    }
    const upd = {
      ...s,
      camera: CAMERAS[(CAMERAS.indexOf(s.camera) + 1) % CAMERAS.length] ?? s.camera,
      duration: `${3 + ((parseInt(s.duration, 10) || 3) % 4)} giây`,
    };
    setScenes((prev) => prev.map((x) => (x.id === id ? upd : x)));
    void run(() => saveScene(upd, scenes.indexOf(s)));
  };

  return (
    <div className="min-h-screen bg-background font-body text-ink antialiased">
      <aside className={`fixed bottom-0 left-0 top-0 z-20 flex flex-col items-center gap-1 overflow-y-auto border-r border-line bg-surface py-4 ${sidebarExpanded ? "w-52" : "w-16"}`}>
        <div className="mb-4 grid size-10 place-items-center rounded-2xl bg-ink font-display text-lg text-background">
          S
        </div>
        <nav aria-label="Điều hướng chính" className={`flex w-full flex-col gap-1 ${sidebarExpanded ? "px-3" : "px-2"}`}>
          {SECTIONS.filter((item) => !(item.id in LIB_TYPE)).map((item) => (
            <div key={item.id}>
            <Button
              key={item.id}
              variant="ghost"
              title={item.label}
              aria-label={item.label}
              aria-current={section === item.id ? "page" : undefined}
              onClick={() => setSection(item.id)}
              className={`h-11 w-full ${sidebarExpanded ? "justify-start" : "px-0"} ${
                section === item.id
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-ink hover:bg-background"
              }`}
            >
              <span aria-hidden="true" className="w-5 shrink-0 text-center text-lg">{item.icon}</span>
              {sidebarExpanded && <span>{item.label}</span>}
            </Button>
            {item.id === "script" && (
              <Collapsible open={resourcesOpen && sidebarExpanded} onOpenChange={setResourcesOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    title="Tài nguyên"
                    aria-label="Tài nguyên"
                    onClick={() => {
                      if (!sidebarExpanded) {
                        setSidebarExpanded(true);
                        setResourcesOpen(true);
                      }
                    }}
                    className={`mt-1 h-11 w-full ${sidebarExpanded ? "justify-start" : "px-0"} ${section in LIB_TYPE ? "bg-accent-soft text-accent" : "text-muted-ink hover:bg-background"}`}
                  >
                    <FolderOpen aria-hidden="true" />
                    {sidebarExpanded && <><span>Tài nguyên</span><ChevronDown className={`ml-auto transition-transform motion-reduce:transition-none ${resourcesOpen ? "rotate-180" : ""}`} /></>}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="ml-2 mt-1 border-l border-line pl-2">
                  {RESOURCE_SECTIONS.map((resource) => (
                    <Button key={resource.id} variant="ghost" title={resource.label} aria-current={section === resource.id ? "page" : undefined} onClick={() => setSection(resource.id)} className={`mb-1 h-9 w-full justify-start ${section === resource.id ? "bg-accent text-accent-foreground" : "text-muted-ink hover:bg-background"}`}>
                      <span aria-hidden="true" className="w-4 text-center">{resource.icon}</span>{resource.label}
                    </Button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
            </div>
          ))}
        </nav>
      </aside>

      <div className={sidebarExpanded ? "pl-52" : "pl-16"}>
        <header className="sticky top-0 z-10 border-b border-line bg-background/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-8">
            <Button variant="ghost" size="icon" title={sidebarExpanded ? "Thu gọn thanh điều hướng" : "Mở thanh điều hướng"} aria-label={sidebarExpanded ? "Thu gọn thanh điều hướng" : "Mở thanh điều hướng"} onClick={() => setSidebarExpanded((expanded) => !expanded)}>
              {sidebarExpanded ? <PanelLeftClose /> : <PanelLeftOpen />}
            </Button>
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-ink font-display text-base text-background">
                S
              </div>
              <div>
                <h1 className="font-display text-xl leading-none tracking-tight">
                  AI Storyboard Studio
                </h1>
                <p className="mt-0.5 text-xs text-muted-ink">
                  Biến ý tưởng thành storyboard bằng AI
                </p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
                <span className={`size-1.5 rounded-full bg-accent ${analyzing ? "animate-pulse" : ""}`} />
                {analyzing ? "Đang phân tích…" : "Sẵn sàng"}
              </span>
              <Button variant="outline" onClick={() => { setSettingsNotice(null); setSettingsOpen(true); }}>
                <span aria-hidden="true">⚙️</span> Cài đặt
              </Button>
            </div>
            <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} notice={settingsNotice} />
          </div>
        </header>

        {workspaceVisible ? (
          <div className="flex flex-col gap-6 px-4 py-6 sm:px-8 lg:flex-row">
            <section className="rise w-full shrink-0 lg:w-[340px]">
              <div className="rounded-3xl border border-line bg-surface p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-lg tracking-tight">Kịch bản</h2>
                  <span className="font-mono text-[11px] text-muted-ink">01</span>
                </div>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Nhập ý tưởng hoặc kịch bản video của bạn..."
                  className="h-56 w-full resize-none rounded-2xl border border-line bg-background p-4 text-sm leading-relaxed text-ink placeholder:text-muted-ink/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <div className="mt-4 grid gap-3">
                  <div>
                    <label htmlFor="script-voiceover" className="mb-1.5 block text-xs font-semibold text-ink">Chọn Giọng đọc (Voiceover)</label>
                    <Select value={voiceover} onValueChange={setVoiceover}>
                      <SelectTrigger id="script-voiceover" className="bg-background"><SelectValue placeholder="Chọn giọng đọc" /></SelectTrigger>
                      <SelectContent>{VOICES.map((voice) => <SelectItem key={voice} value={voice}>{voice}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="script-video-model" className="mb-1.5 block text-xs font-semibold text-ink">Chọn Model Video</label>
                    <Select value={videoModel} onValueChange={setVideoModel}>
                      <SelectTrigger id="script-video-model" className="bg-background"><SelectValue placeholder="Chọn model video" /></SelectTrigger>
                      <SelectContent>{VIDEO_MODELS.map((model) => <SelectItem key={model} value={model}>{model}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <button
                  onClick={analyze}
                  disabled={analyzing}
                  className="mt-4 w-full rounded-2xl bg-accent py-3.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-60"
                >
                  {analyzing ? "Đang phân tích…" : "Phân tích kịch bản"}
                </button>
                <div className="mt-4 rounded-2xl border border-line bg-background p-3 text-[11px] leading-relaxed text-muted-ink">
                  <span className="font-medium text-ink">Ví dụ:</span>
                  <br />
                  Cảnh 1: Một cô gái bước vào quán mì.
                  <br />
                  Cảnh 2: Cô gọi một tô mì cay.
                  <br />
                  Cảnh 3: Nhân viên bắt đầu nấu mì.
                  <br />
                  Cảnh 4: Tô mì cay được đặt lên bàn.
                </div>
              </div>
            </section>

            <section className="min-w-0 flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl tracking-tight">Storyboard của bạn</h2>
                <span className="font-mono text-[11px] text-muted-ink">02</span>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => {
                      const n = emptyScene(scenes.length + 1);
                      setScenes((p) => [...p, n]);
                      void run(() => saveScene(n, scenes.length));
                    }}
                    className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-background hover:bg-ink/90"
                  >
                    + Thêm cảnh
                  </Button>
                  <Button className="bg-accent font-semibold text-accent-foreground shadow-sm hover:bg-accent/90" disabled={rendering} onClick={() => void renderAll()}>
                    <span aria-hidden="true">🎬</span> {rendering ? "Đang render…" : "Render All"}
                  </Button>
                  <Button variant="outline" onClick={() => setActionNotice("Chưa có video và âm thanh đã tạo để tải xuống ZIP.")}>
                    <span aria-hidden="true">⬇️</span> Export ZIP
                  </Button>
                  <button
                    onClick={analyze}
                    className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-background"
                  >
                    Phân tích lại
                  </button>
                  <button
                    onClick={() => {
                      setScenes([]);
                      void run(() => replaceScenes([]));
                    }}
                    className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-muted-ink hover:bg-background"
                  >
                    Xóa tất cả
                  </button>
                </div>
              </div>

              {actionNotice && <p role="status" className="mb-4 rounded-md border border-line bg-surface px-4 py-3 text-sm text-muted-ink">{actionNotice}</p>}
              {retryMsg && <p role="status" className="mb-4 animate-pulse rounded-md border border-line bg-accent-soft px-4 py-3 text-sm text-accent">{retryMsg}</p>}
              {analyzing && !retryMsg && <p role="status" className="mb-4 animate-pulse rounded-md border border-line bg-surface px-4 py-3 text-sm text-muted-ink">⏳ Gemini đang phân tích kịch bản…</p>}
              {analyzeError && <p role="alert" className="mb-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{analyzeError}</p>}
              {dbError && (
                <p className="mb-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{dbError}</p>
              )}
              {scenes.length === 0 ? (
                <div className="rounded-3xl border border-line bg-surface px-6 py-20 text-center">
                  <p className="font-display text-xl tracking-tight">
                    Storyboard của bạn sẽ xuất hiện ở đây
                  </p>
                  <p className="mt-2 text-sm text-muted-ink">
                    Nhập kịch bản ở bên trái và bấm “Phân tích kịch bản” để bắt đầu.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {scenes.map((scene, i) => (
                    <SceneCard
                      key={scene.id}
                      scene={scene}
                      index={i}
                      delay={60 * (i + 1)}
                      assets={assets}
                      expressions={expressions}
                      onSave={updateScene}
                      onDuplicate={() => duplicateScene(scene.id)}
                      onRegenerate={() => void regenerateScene(scene.id)}
                      media={media[scene.id]}
                      onGenerateImage={() => void genImage(scene)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : section === "video" ? (
          <VideoGeneration scenes={scenes} assets={assets} onGoToImage={() => setSection("image")} />
        ) : section === "image" ? (
          <ImageGeneration scenes={scenes} assets={assets} />
        ) : section === "prompt" ? (
          <PromptBuilder
            scenes={scenes}
            assets={assets}
            refreshAll={async () => {
              await Promise.all([characters.reload(), locations.reload(), ingredients.reload(), props.reload()]);
              setScenes(await fetchScenes());
            }}
          />
        ) : (
          <AssetLibrary
            key={section}
            type={LIB_TYPE[section as keyof typeof LIB_TYPE]}
            assets={assets}
            setAssets={() => {}}
            remote={
              section === "characters"
                ? {
                    save: async (a, prev) => {
                      await saveCharacter(a, prev);
                      await characters.reload();
                    },
                    remove: async (a) => {
                      await deleteCharacter(a);
                      await characters.reload();
                    },
                  }
                : section === "locations"
                  ? {
                      save: async (a, prev) => {
                        await saveLocation(a, prev);
                        await locations.reload();
                      },
                      remove: async (a) => {
                        await deleteLocation(a);
                        await locations.reload();
                      },
                    }
                  : section === "ingredients"
                    ? {
                        save: async (a, prev) => {
                          await saveIngredient(a, prev);
                          await ingredients.reload();
                        },
                        remove: async (a) => {
                          await deleteIngredient(a);
                          await ingredients.reload();
                        },
                      }
                    : {
                        save: async (a, prev) => {
                          await saveProp(a, prev);
                          await props.reload();
                        },
                        remove: async (a) => {
                          await deleteProp(a);
                          await props.reload();
                        },
                      }
            }
          />
        )}
      </div>
    </div>
  );
}
