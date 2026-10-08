import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GEMINI_KEY, HF_KEY, getKey, setKey } from "@/lib/gemini";

export function SettingsDialog({ open, onOpenChange, notice }: { open: boolean; onOpenChange: (o: boolean) => void; notice?: string | null }) {
  const [gemini, setGemini] = useState("");
  const [hf, setHf] = useState("");
  useEffect(() => {
    if (open) {
      setGemini(getKey(GEMINI_KEY));
      setHf(getKey(HF_KEY));
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
        <div className="grid gap-4">
          <div>
            <label htmlFor="gemini-key" className="mb-1.5 block text-sm font-semibold">GEMINI_API_KEY</label>
            <input id="gemini-key" type="password" autoComplete="off" value={gemini} onChange={(e) => setGemini(e.target.value)} placeholder="AIza..." className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none" />
          </div>
          <div>
            <label htmlFor="hf-key" className="mb-1.5 block text-sm font-semibold">Hugging Face Token <span className="font-normal text-muted-ink">(sau này)</span></label>
            <input id="hf-key" type="password" autoComplete="off" value={hf} onChange={(e) => setHf(e.target.value)} placeholder="hf_..." className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={() => { setKey(GEMINI_KEY, gemini); setKey(HF_KEY, hf); onOpenChange(false); }}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
