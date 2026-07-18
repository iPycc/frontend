import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { FormRow } from "@/components/storage/shared"
import type { StorageFormMode, TencentStorageDraft } from "@/components/storage/types"

type Props = {
  draft: TencentStorageDraft
  mode: StorageFormMode
  onChange: (draft: TencentStorageDraft) => void
}

export function MountOptions({ draft, mode, onChange }: Props) {
  const readonly = mode === "readonly"
  const update = <K extends keyof TencentStorageDraft>(key: K, value: TencentStorageDraft[K]) =>
    onChange({ ...draft, [key]: value })

  return (
    <>
      <FormRow label="地域" hint="须与存储桶所属地域一致，例如 ap-guangzhou。">
        <Input
          className="h-10 w-full text-[15px]"
          value={draft.region}
          onChange={(event) => update("region", event.target.value)}
          placeholder="ap-guangzhou"
          disabled={readonly}
        />
      </FormRow>

      <FormRow label="对象前缀" hint="仅管理此前缀下的对象；留空表示存储桶根目录。">
        <Input
          className="h-10 w-full font-mono text-sm"
          value={draft.prefix}
          onChange={(event) => update("prefix", event.target.value.replace(/^\/+/, ""))}
          placeholder="users/primary"
          disabled={readonly}
        />
      </FormRow>

      <FormRow label="挂载模式" hint="托管模式只显示 Cloudrave 创建的文件；镜像模式可导入此前缀中的已有对象。">
        <Select
          value={draft.mountMode}
          onValueChange={(value) => update("mountMode", value as TencentStorageDraft["mountMode"])}
          disabled={readonly}
        >
          <SelectTrigger className="h-10 w-full text-[15px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="managed">托管（推荐）</SelectItem>
            <SelectItem value="mirror">镜像并导入已有对象</SelectItem>
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow
        label="原始对象命名"
        hint="只影响今后上传的新对象。文件夹由 Cloudrave 的目录树管理，不会创建空的对象占位符。"
      >
        <Select
          value={draft.objectKeyStyle}
          onValueChange={(value) => update("objectKeyStyle", value as TencentStorageDraft["objectKeyStyle"])}
          disabled={readonly}
        >
          <SelectTrigger className="h-10 w-full text-[15px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="readable">blobid-原文件名（推荐）</SelectItem>
            <SelectItem value="opaque">仅 blobid 与扩展名</SelectItem>
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow label="只读挂载" hint="启用后禁止上传、重命名和删除，适合归档桶或共享数据源。">
        <div className="flex min-h-10 items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">{draft.readOnly ? "只允许浏览与下载" : "允许正常读写"}</span>
          <Switch checked={draft.readOnly} onCheckedChange={(checked) => update("readOnly", checked)} disabled={readonly} />
        </div>
      </FormRow>

    </>
  )
}
