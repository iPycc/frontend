import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormRow } from "@/components/storage/shared"
import type { StorageFormMode, TencentStorageDraft } from "@/components/storage/types"

type Props = {
  draft: TencentStorageDraft
  mode: StorageFormMode
  onChange: (draft: TencentStorageDraft) => void
}

export function EncryptionOptions({ draft, mode, onChange }: Props) {
  const readonly = mode === "readonly"
  const update = <K extends keyof TencentStorageDraft>(key: K, value: TencentStorageDraft[K]) =>
    onChange({ ...draft, [key]: value })

  return (
    <>
      <FormRow label="服务端加密" hint="由腾讯云在对象落盘时加密，不会把客户端永久密钥暴露给浏览器。">
        <Select
          value={draft.serverSideEncryption}
          onValueChange={(value) => update("serverSideEncryption", value as TencentStorageDraft["serverSideEncryption"])}
          disabled={readonly}
        >
          <SelectTrigger className="h-10 w-full text-[15px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">不启用</SelectItem>
            <SelectItem value="SSE-COS">SSE-COS（COS 托管密钥）</SelectItem>
            <SelectItem value="SSE-KMS">SSE-KMS（腾讯云 KMS）</SelectItem>
          </SelectContent>
        </Select>
      </FormRow>

      {draft.serverSideEncryption === "SSE-KMS" ? (
        <FormRow label="KMS Key ID" hint="可留空使用 COS 默认 KMS 密钥，也可填写指定 CMK ID。">
          <Input
            className="h-10 w-full font-mono text-sm"
            value={draft.kmsKeyId}
            onChange={(event) => update("kmsKeyId", event.target.value)}
            placeholder="留空使用默认密钥"
            disabled={readonly}
          />
        </FormRow>
      ) : null}
    </>
  )
}
