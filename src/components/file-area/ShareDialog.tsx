import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ShareDialogProps {
  links: string[]
  onClose: () => void
}

export function ShareDialog({ links, onClose }: ShareDialogProps) {
  return (
    <Dialog open={links.length > 0} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分享链接</DialogTitle>
          <DialogDescription>当前为 mock 链接，可用于页面演示。</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link} className="rounded-[10px] border border-border/60 bg-muted/30 px-3 py-2 text-sm">
              {link}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
