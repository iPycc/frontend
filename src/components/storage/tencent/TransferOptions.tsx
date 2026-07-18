import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormRow } from "@/components/storage/shared"
import type { StorageFormMode, TencentStorageDraft } from "@/components/storage/types"

interface TransferOptionsProps {
  draft: TencentStorageDraft
  mode: StorageFormMode
  onChange: (draft: TencentStorageDraft) => void
}

export function TransferOptions({ draft, mode, onChange }: TransferOptionsProps) {
  const disabled = mode === "readonly"
  const update = <K extends keyof TencentStorageDraft>(key: K, value: TencentStorageDraft[K]) =>
    onChange({ ...draft, [key]: value })

  return (
    <>
      <FormRow label="分块阈值" hint="文件不超过阈值时使用单次 PUT，超过后自动切换为分块上传。">
        <Select
          value={draft.multipartThreshold}
          onValueChange={(value) => update("multipartThreshold", value)}
          disabled={disabled}
        >
          <SelectTrigger className="h-10 w-full text-[15px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5 MB">5 MB</SelectItem>
            <SelectItem value="10 MB">10 MB</SelectItem>
            <SelectItem value="16 MB">16 MB</SelectItem>
            <SelectItem value="25 MB">25 MB</SelectItem>
            <SelectItem value="50 MB">50 MB</SelectItem>
            <SelectItem value="64 MB">64 MB</SelectItem>
            <SelectItem value="100 MB">100 MB</SelectItem>
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow label="分块大小" hint="每块为 1 MB 至 5 GB；网络不稳定时建议 10–25 MB。">
        <Select value={draft.partSize} onValueChange={(value) => update("partSize", value)} disabled={disabled}>
          <SelectTrigger className="h-10 w-full text-[15px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5 MB">5 MB</SelectItem>
            <SelectItem value="10 MB">10 MB</SelectItem>
            <SelectItem value="16 MB">16 MB</SelectItem>
            <SelectItem value="25 MB">25 MB</SelectItem>
            <SelectItem value="50 MB">50 MB</SelectItem>
            <SelectItem value="64 MB">64 MB</SelectItem>
            <SelectItem value="100 MB">100 MB</SelectItem>
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow label="分块并发数" hint="每个文件同时上传的分块数；前端会限制上限，避免占满浏览器连接。">
        <Select
          value={String(draft.concurrency)}
          onValueChange={(value) => update("concurrency", Number(value))}
          disabled={disabled}
        >
          <SelectTrigger className="h-10 w-full text-[15px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3（推荐）</SelectItem>
          </SelectContent>
        </Select>
      </FormRow>
    </>
  )
}
