import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SceneCard } from "@/components/SceneCard";
import {
  analyzeScript,
  emptyScene,
  SAMPLE_SCENES,
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
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const CAMERAS = ["Toàn cảnh", "Trung cảnh", "Cận cảnh", "Góc trên", "Góc thấp"];

function StudioPage() {
  const [section, setSection] = useState<SectionId>("script");
  const [script, setScript] = useState(SAMPLE_SCRIPT);
  const [scenes, setScenes] = useState<Scene[]>(SAMPLE_SCENES);
  const [analyzing, setAnalyzing] = useState(false);

  const workspaceVisible = section === "script" || section === "storyboard";

  const analyze = () => {
    if (!script.trim()) return;
    setAnalyzing(true);
    setSection("storyboard");
    window.setTimeout(() => {
      setScenes(analyzeScript(script));
      setAnalyzing(false);
    }, 700);
  };

  const updateScene = (updated: Scene) =>
    setScenes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

  const duplicateScene = (id: string) =>
    setScenes((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      const source = prev[i];
      if (!source) return prev;
      const copy: Scene = { ...source, id: `${source.id}-copy-${Date.now()}` };
      return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
    });

  const regenerateScene = (id: string) =>
    setScenes((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              camera: CAMERAS[(CAMERAS.indexOf(s.camera) + 1) % CAMERAS.length] ?? s.camera,
              duration: `${3 + ((parseInt(s.duration, 10) || 3) % 4)} giây`,
            }
          : s,
      ),
    );


  return (
    <div className="min-h-screen bg-background font-body text-ink antialiased">
      <aside className="fixed bottom-0 left-0 top-0 z-20 flex w-16 flex-col items-center gap-1 border-r border-line bg-surface py-4">
        <div className="mb-4 grid size-10 place-items-center rounded-2xl bg-ink font-display text-lg text-background">
          S
        </div>
        <nav className="flex flex-col gap-1">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              title={item.label}
              onClick={() => setSection(item.id)}
              className={`grid size-11 place-items-center rounded-2xl text-lg ${
                section === item.id
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-ink hover:bg-background"
              }`}
            >
              {item.icon}
            </button>
          ))}
        </nav>
      </aside>

      <div className="pl-16">
        <header className="sticky top-0 z-10 border-b border-line bg-background/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-8">
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
                <span className="size-1.5 rounded-full bg-accent" />
                {analyzing ? "Đang phân tích…" : "Sẵn sàng"}
              </span>
            </div>
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
                  <button
                    onClick={() => setScenes((p) => [...p, emptyScene(p.length + 1)])}
                    className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-background hover:bg-ink/90"
                  >
                    + Thêm cảnh
                  </button>
                  <button
                    onClick={analyze}
                    className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-background"
                  >
                    Phân tích lại
                  </button>
                  <button
                    onClick={() => setScenes([])}
                    className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-muted-ink hover:bg-background"
                  >
                    Xóa tất cả
                  </button>
                </div>
              </div>

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
                      onChange={updateScene}
                      onDuplicate={() => duplicateScene(scene.id)}
                      onRegenerate={() => regenerateScene(scene.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="px-4 py-6 sm:px-8">
            <div className="rise rounded-3xl border border-line bg-surface px-6 py-24 text-center">
              <p className="font-display text-2xl tracking-tight">
                {SECTIONS.find((s) => s.id === section)?.label}
              </p>
              <p className="mt-2 text-sm text-muted-ink">
                Tính năng này sẽ được bổ sung ở phiên bản tiếp theo.
              </p>
              <button
                onClick={() => setSection("storyboard")}
                className="mt-6 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-background hover:bg-ink/90"
              >
                Quay lại Storyboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
