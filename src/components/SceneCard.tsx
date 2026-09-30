import { useState } from "react";
import type { Scene } from "@/lib/storyboard";

type Props = {
  scene: Scene;
  index: number;
  delay: number;
  onChange: (scene: Scene) => void;
  onDuplicate: () => void;
  onRegenerate: () => void;
};

const FIELDS: Array<{ key: keyof Scene; label: string; wide?: boolean }> = [
  { key: "character", label: "Nhân vật" },
  { key: "location", label: "Bối cảnh" },
  { key: "props", label: "Đạo cụ" },
  { key: "camera", label: "Góc máy" },
  { key: "duration", label: "Thời lượng", wide: true },
];

export function SceneCard({ scene, index, delay, onChange, onDuplicate, onRegenerate }: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <article
      className="rise overflow-hidden rounded-3xl border border-line bg-surface"
      style={{ animationDelay: `${delay}ms` }}
    >
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
        {editing ? (
          <div className="space-y-2">
            <input
              value={scene.title}
              onChange={(e) => onChange({ ...scene, title: e.target.value })}
              className="w-full rounded-xl border border-line bg-background px-3 py-2 text-sm font-semibold focus:border-accent focus:outline-none"
              placeholder="Tiêu đề cảnh"
            />
            <textarea
              value={scene.description}
              onChange={(e) => onChange({ ...scene, description: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-xl border border-line bg-background px-3 py-2 text-xs leading-relaxed focus:border-accent focus:outline-none"
              placeholder="Mô tả cảnh"
            />
            <div className="grid grid-cols-2 gap-2">
              {FIELDS.map(({ key, label }) => (
                <input
                  key={key}
                  value={scene[key]}
                  onChange={(e) => onChange({ ...scene, [key]: e.target.value })}
                  className="w-full rounded-xl border border-line bg-background px-3 py-2 text-xs focus:border-accent focus:outline-none"
                  placeholder={label}
                />
              ))}
            </div>
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
          </>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setEditing((v) => !v)}
            className="flex-1 rounded-xl border border-line py-2 text-xs font-medium hover:bg-background"
          >
            {editing ? "Xong" : "Chỉnh sửa"}
          </button>
          <button
            onClick={onDuplicate}
            className="flex-1 rounded-xl border border-line py-2 text-xs font-medium hover:bg-background"
          >
            Sao chép
          </button>
          <button
            onClick={onRegenerate}
            className="flex-1 rounded-xl bg-accent-soft py-2 text-xs font-semibold text-accent hover:bg-accent/20"
          >
            Tạo lại
          </button>
        </div>
      </div>
    </article>
  );
}
