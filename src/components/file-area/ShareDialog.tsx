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
  open: boolean
  links: string[]
  onOpenChange: (open: boolean) => void
}

export function ShareDialog({ open, links, onOpenChange }: ShareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分享链接</DialogTitle>
          <DialogDescription>当前显示的是已生成的分享链接。</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
              {link}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
