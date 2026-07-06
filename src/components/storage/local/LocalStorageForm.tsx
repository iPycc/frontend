﻿import * as React from "react"
import { IconCheck, IconX } from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  buildLocalStoragePath,
  getLocalStoragePathSuggestions,
  validateLocalStoragePath,
} from "@/lib/models"
import { FormCard, FormRow, PathValidator, StorageFormHeader } from "@/components/storage/shared"
import type { LocalStorageDraft, StorageFormMode } from "@/components/storage/types"
import { cn } from "@/lib/utils"

interface LocalStorageFormProps {
  draft: LocalStorageDraft
  initialDraft?: LocalStorageDraft
  mode?: StorageFormMode
  onChange: (draft: LocalStorageDraft) => void
  onBack?: () => void
  onSubmit: () => void
  submitLabel?: string
}

export function LocalStorageForm({
  draft,
  initialDraft,
  mode = "create",
  onChange,
  onBack,
  onSubmit,
  submitLabel,
}: LocalStorageFormProps) {
  const readonly = mode === "readonly"
  const isDirty = React.useMemo(() => {
    if (!initialDraft || mode !== "edit") return false
    return (
      draft.name !== initialDraft.name ||
      draft.path !== initialDraft.path ||
      draft.concurrency !== initialDraft.concurrency ||
      draft.multipartThreshold !== initialDraft.multipartThreshold ||
      draft.partSize !== initialDraft.partSize
    )
  }, [draft, initialDraft, mode])

  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const validation = validateLocalStoragePath(draft.path)
  const suggestions = React.useMemo(
    () => getLocalStoragePathSuggestions(draft.path || draft.name),
    [draft.name, draft.path]
  )

  const update = <K extends keyof LocalStorageDraft>(key: K, value: LocalStorageDraft[K]) =>
    onChange({ ...draft, [key]: value })

  const applyNamePath = React.useCallback(() => {
    if (draft.pathCustomized || !draft.name.trim()) {
      return
    }

    update("path", buildLocalStoragePath(draft.name))
  }, [draft.name, draft.pathCustomized])

  const handleSubmit = () => {
    if (!draft.name.trim()) {
      toast.error("请先填写存储策略名称。")
      return
    }

    if (!validation.isValid) {
      toast.error(validation.message)
      return
    }

    onSubmit()
  }

  const handleReset = () => {
    if (initialDraft) {
      onChange(initialDraft)
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-3">
      <StorageFormHeader title={mode === "edit" ? `编辑 ${initialDraft?.name || "本机存储"}` : "添加 本机存储"} onBack={onBack} />

      <FormCard
        title="本机存储"
        description="仅保留本机目录路径字段，移除 CORS、远程签名和跨域等冗余配置。"
        className="overflow-visible"
      >
        <FormRow label="名称" hint="输入名称后失焦会自动生成 /upload/{名称} 形式的默认目录。">
          <Input
            className="h-10 w-full text-[15px]"
            value={draft.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("name", e.target.value)}
            onBlur={applyNamePath}
            placeholder="例如：23网络高级"
            disabled={readonly}
          />
        </FormRow>

        <FormRow label="目录路径" hint="支持实时路径提示与合法性校验，默认要求位于 /upload 下。">
          <div className="relative">
            <Input.Search
              className="h-10 w-full text-[15px]"
              value={draft.path}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                onChange({ ...draft, path: e.target.value, pathCustomized: true })
              }}
              placeholder="/upload/23网络高级"
              trailing={
                validation.isValid ? (
                  <IconCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <IconX size={14} className="text-destructive" />
                )
              }
              disabled={readonly}
            />

            {showSuggestions && !readonly ? (
              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-border/60 bg-popover shadow-md">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                      suggestion === draft.path ? "bg-accent/60" : ""
                    )}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      onChange({
                        ...draft,
                        path: suggestion,
                        pathCustomized: true,
                      })
                      setShowSuggestions(false)
                    }}
                  >
                    <span className="truncate font-mono">{suggestion}</span>
                    <span className="text-xs text-muted-foreground">使用</span>
                  </button>
                ))}
              </div>
            ) : null}

            <PathValidator isValid={validation.isValid} message={validation.message} />
          </div>
        </FormRow>
      </FormCard>

      <FormCard
        title="上传配置"
        description="控制文件上传的分块策略与并发数，本机存储无需配置密钥或跨域。"
        footer={
          mode === "create" ? (
            <Button className="px-6 py-2.5 text-[15px]" onClick={handleSubmit} disabled={readonly}>
              {submitLabel ?? "创建"}
            </Button>
          ) : null
        }
      >
        <FormRow label="分块阈值" hint="文件大于此值时自动切换为分块上传。">
          <Select
            value={draft.multipartThreshold}
            onValueChange={(v) => update("multipartThreshold", v)}
            disabled={readonly}
          >
            <SelectTrigger className="h-10 w-full text-[15px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5 MB">5 MB</SelectItem>
              <SelectItem value="10 MB">10 MB</SelectItem>
              <SelectItem value="25 MB">25 MB</SelectItem>
              <SelectItem value="50 MB">50 MB</SelectItem>
              <SelectItem value="100 MB">100 MB</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>

        <FormRow label="分块大小" hint="每个分块的大小，建议与阈值保持一致或更小。">
          <Select
            value={draft.partSize}
            onValueChange={(v) => update("partSize", v)}
            disabled={readonly}
          >
            <SelectTrigger className="h-10 w-full text-[15px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5 MB">5 MB</SelectItem>
              <SelectItem value="10 MB">10 MB</SelectItem>
              <SelectItem value="25 MB">25 MB</SelectItem>
              <SelectItem value="50 MB">50 MB</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>

        <FormRow label="上传并发数" hint="同时进行的分块上传线程数，本机存储建议保持为 1。">
          <Select
            value={String(draft.concurrency)}
            onValueChange={(v) => update("concurrency", Number(v))}
            disabled={readonly}
          >
            <SelectTrigger className="h-10 w-full text-[15px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1（推荐）</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="4">4</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>
      </FormCard>

      {mode === "edit" && isDirty && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 rounded-2xl bg-background/95 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md ring-1 ring-border/50 animate-in slide-in-from-bottom-8 fade-in dark:bg-background/80 md:left-8">
          <div className="hidden px-2 text-sm font-medium text-muted-foreground sm:block">
            您有未保存的更改
          </div>
          <Button variant="outline" size="sm" className="h-9 px-5" onClick={handleReset}>
            重置
          </Button>
          <Button size="sm" className="h-9 px-6" onClick={handleSubmit}>
            保存
          </Button>
        </div>
      )}
    </div>
  )
}

