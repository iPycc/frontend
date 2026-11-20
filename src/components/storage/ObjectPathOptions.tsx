import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEFAULT_OBJECT_PATH_TEMPLATE, objectPathSettings } from "@/components/storage/object-path"
import { FormRow } from "@/components/storage/shared"
import type { ObjectPathMode, TencentStorageDraft } from "@/components/storage/types"

const EXAMPLE_VALUES = {
  dir: "项目",
  filename: "合同.pdf",
  stem: "合同",
  ext: ".pdf",
  blob_id: "0123456789abcdef0123456789abcdef",
}

type Props = {
  draft: Pick<TencentStorageDraft, "objectKeyStyle" | "objectKeyTemplate" | "prefix" | "legacyPrefixedKeys">
  readOnly: boolean
  onMode: (mode: ObjectPathMode) => void
  onTemplate: (template: string) => void
}

export function ObjectPathOptions({ draft, readOnly, onMode, onTemplate }: Props) {
  const { object_key_template: template } = objectPathSettings(draft)
  const name = template === null
    ? `blob/${EXAMPLE_VALUES.blob_id}${draft.objectKeyStyle === "opaque" ? ".pdf" : "-合同.pdf"}`
    : template.replace(/\{\{|\}\}|\{(dir|filename|stem|ext|blob_id)\}/g, (match, field?: keyof typeof EXAMPLE_VALUES) => (
        field ? EXAMPLE_VALUES[field] : match[0]
      ))
  const prefix = draft.prefix.trim().replace(/^\/+|\/+$/g, "")
  const example = prefix ? `${prefix}/${name}` : name

  return (
    <FormRow label="存储路径" hint="应用于新写入的文件。已有文件可在后台任务中迁移。">
      <div className="min-w-0 space-y-2">
        <Select value={draft.objectKeyStyle} onValueChange={(value) => onMode(value as ObjectPathMode)} disabled={readOnly}>
          <SelectTrigger className="h-10 w-full text-[15px]" aria-label="存储路径"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="readable">Blob + 原文件名</SelectItem>
            <SelectItem value="opaque">仅 Blob ID 与扩展名</SelectItem>
            <SelectItem value="original" disabled={draft.legacyPrefixedKeys}>目录和原文件名</SelectItem>
            <SelectItem value="custom" disabled={draft.legacyPrefixedKeys}>自定义模板</SelectItem>
          </SelectContent>
        </Select>
        {draft.objectKeyStyle === "custom" ? (
          <Input aria-label="对象路径模板" className="font-mono" value={draft.objectKeyTemplate ?? DEFAULT_OBJECT_PATH_TEMPLATE}
            onChange={(event) => onTemplate(event.target.value)} maxLength={1024} disabled={readOnly} />
        ) : null}
        {draft.objectKeyStyle === "custom" ? (
          <p className="break-words text-sm text-muted-foreground">变量 {"{dir} {filename} {stem} {ext} {blob_id}"}</p>
        ) : null}
        <output aria-label="存储路径示例" className="block break-all font-mono text-sm text-muted-foreground">{example}</output>
      </div>
    </FormRow>
  )
}
