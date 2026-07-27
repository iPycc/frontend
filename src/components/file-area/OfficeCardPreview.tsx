import * as React from "react"

import {
  buildOfficeCardCoverUrl,
  getOfficeCardPreview,
  type OfficeCardPreviewData,
} from "@/api/files"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const officeExtensions = new Set([
  "doc", "docx", "docm", "dot", "dotx",
  "xls", "xlsx", "xlsm", "xlsb", "xltx",
  "ppt", "pptx", "pptm", "pps", "ppsx",
])

export function isOfficeFile(extension?: string) {
  return officeExtensions.has(extension?.toLowerCase() ?? "")
}

export function OfficeCardPreview({
  nodeId,
  version,
  fallback,
}: {
  nodeId: number
  version?: string
  fallback: React.ReactNode
}) {
  const [preview, setPreview] = React.useState<OfficeCardPreviewData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [imageFailed, setImageFailed] = React.useState(false)

  React.useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setPreview(null)
    setImageFailed(false)
    void getOfficeCardPreview(nodeId, version, controller.signal)
      .then((value) => setPreview(value))
      .catch(() => {
        if (!controller.signal.aborted) setPreview(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [nodeId, version])

  if (loading) {
    return <Skeleton className="pointer-events-none absolute inset-0 size-full rounded-none" />
  }
  if (!preview || preview.kind === "unsupported") {
    return fallback
  }
  if (preview.kind === "document" && preview.lines.length > 0) {
    return <DocumentCover lines={preview.lines} />
  }
  if (preview.kind === "spreadsheet" && preview.rows.length > 0) {
    return <SpreadsheetCover rows={preview.rows} />
  }
  if (preview.kind === "presentation" && (preview.lines.length > 0 || preview.cover_available)) {
    return (
      <PresentationCover
        preview={preview}
        coverUrl={buildOfficeCardCoverUrl(nodeId, version)}
        imageFailed={imageFailed}
        onImageError={() => setImageFailed(true)}
      />
    )
  }
  return fallback
}

function DocumentCover({ lines }: { lines: string[] }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden bg-muted/40 p-3"
      aria-hidden="true"
    >
      <div className="flex h-[calc(100%+32px)] aspect-[210/297] shrink-0 flex-col gap-1.5 border border-black/10 bg-white px-4 py-5 text-left font-sans text-[9px] leading-[1.55] text-zinc-900 shadow-sm">
        {lines.slice(0, 16).map((line, index) => (
          <p key={`${index}-${line}`} className="shrink-0 break-words">
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}

function SpreadsheetCover({ rows }: { rows: string[][] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background p-2" aria-hidden="true">
      <table className="w-max min-w-full table-fixed border-collapse text-left text-[9px] leading-3 text-foreground">
        <tbody>
          {rows.slice(0, 12).map((row, rowIndex) => (
            <tr key={rowIndex} className={cn(rowIndex === 0 && "bg-muted/60 font-medium")}>
              {row.slice(0, 8).map((cell, columnIndex) => (
                <td
                  key={columnIndex}
                  className="h-5 min-w-14 max-w-24 truncate border border-border/70 px-1.5 align-middle"
                  title={cell}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PresentationCover({
  preview,
  coverUrl,
  imageFailed,
  onImageError,
}: {
  preview: OfficeCardPreviewData
  coverUrl: string
  imageFailed: boolean
  onImageError: () => void
}) {
  const showImage = preview.cover_available && !imageFailed
  const exactThumbnail = showImage && preview.cover_kind === "thumbnail"
  const aspectRatio = preview.aspect_ratio && preview.aspect_ratio > 0 ? preview.aspect_ratio : 16 / 9

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden bg-muted/40 p-3" aria-hidden="true">
      <div
        className="relative w-full overflow-hidden rounded-sm border border-border bg-background"
        style={{ aspectRatio }}
      >
        {showImage ? (
          <img
            src={coverUrl}
            alt=""
            className={cn("absolute inset-0 size-full", exactThumbnail ? "object-contain" : "object-cover")}
            draggable={false}
            onError={onImageError}
          />
        ) : null}
        {!exactThumbnail && preview.lines.length > 0 ? (
          <div className={cn(
            "absolute inset-x-0 bottom-0 flex max-h-full flex-col gap-1 overflow-hidden p-3 text-left",
            showImage ? "bg-background/90" : "inset-y-0 justify-center bg-background"
          )}>
            <p className="break-words text-xs font-semibold leading-4 text-foreground">{preview.lines[0]}</p>
            {preview.lines.slice(1, 5).map((line, index) => (
              <p key={`${index}-${line}`} className="break-words text-[9px] leading-3 text-muted-foreground">
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
