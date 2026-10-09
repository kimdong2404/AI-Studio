import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GEMINI_KEY, HF_KEY, HF_MODEL_KEY, DEFAULT_HF_MODEL, getKey, setKey } from "@/lib/gemini";

export function SettingsDialog({ open, onOpenChange, notice }: { open: boolean; onOpenChange: (o: boolean) => void; notice?: string | null }) {
  const [gemini, setGemini] = useState("");
  const [hf, setHf] = useState("");
  const [hfModel, setHfModel] = useState(DEFAULT_HF_MODEL);
  useEffect(() => {
    if (open) {
      setGemini(getKey(GEMINI_KEY));
      setHf(getKey(HF_KEY));
      setHfModel(getKey(HF_MODEL_KEY) || DEFAULT_HF_MODEL);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>⚙️ Cài đặt</DialogTitle>
          <DialogDescription>Khóa được lưu trong trình duyệt này (localStorage), không gửi lên máy chủ của ứng dụng.</DialogDescription>
        </DialogHeader>
        {notice && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{notice}</p>}
        <p className="text-xs text-muted-ink">Gemini: {gemini ? "✅ đã lưu" : "chưa có"} · Hugging Face: {hf ? "✅ đã lưu" : "chưa có"}</p>
        <div className="grid gap-4">
          <div>
            <label htmlFor="gemini-key" className="mb-1.5 block text-sm font-semibold">GEMINI_API_KEY</label>
            <input id="gemini-key" type="password" autoComplete="off" value={gemini} onChange={(e) => setGemini(e.target.value)} placeholder="AIza..." className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none" />
          </div>
          <div>
            <label htmlFor="hf-key" className="mb-1.5 block text-sm font-semibold">Hugging Face Token <span className="font-normal text-muted-ink">(sau này)</span></label>
            <input id="hf-key" type="password" autoComplete="off" value={hf} onChange={(e) => setHf(e.target.value)} placeholder="hf_..." className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none" />
          </div>
          <div>
            <label htmlFor="hf-model" className="mb-1.5 block text-sm font-semibold">Hugging Face Model ID</label>
            <input id="hf-model" type="text" autoComplete="off" value={hfModel} onChange={(e) => setHfModel(e.target.value)} placeholder={DEFAULT_HF_MODEL} className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none" />
            <p className="mt-1 text-xs text-muted-ink">Ví dụ: {DEFAULT_HF_MODEL} hoặc runwayml/stable-diffusion-v1-5. Đổi model tại đây khi model hiện tại bị lỗi.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={() => { setKey(GEMINI_KEY, gemini); setKey(HF_KEY, hf); setKey(HF_MODEL_KEY, hfModel || DEFAULT_HF_MODEL); onOpenChange(false); }}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
