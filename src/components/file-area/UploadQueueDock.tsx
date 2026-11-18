import { TransferManager } from "@/components/transfer/TransferManager"

export function UploadQueueDock({ parentId }: { parentId: string | null }) {
  return <TransferManager parentId={parentId} placement="floating" />
}
