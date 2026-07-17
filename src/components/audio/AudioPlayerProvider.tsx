import * as React from "react"
import { IconDownload, IconX } from "@tabler/icons-react"
import { toast } from "sonner"

import { buildDownloadUrl, getPreviewManifest, peekPreviewManifest, type PreviewManifest } from "@/api/files"
import { requestResponse } from "@/api/client"
import { AudioPlayer } from "@/components/audio/AudioPlayer"
import { Button } from "@/components/ui/button"
import type { FileNode } from "@/lib/models"
import { cn } from "@/lib/utils"

type PlayerMode = "window" | "minimized"

interface AudioPlayerContextValue {
  openAudio: (file: FileNode, queue?: FileNode[]) => void
  closeAudio: () => void
  activeFile: FileNode | null
}

const AudioPlayerContext = React.createContext<AudioPlayerContextValue>({
  openAudio: () => undefined,
  closeAudio: () => undefined,
  activeFile: null,
})

export function useAudioPlayer() {
  return React.useContext(AudioPlayerContext)
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = React.useState<FileNode[]>([])
  const [index, setIndex] = React.useState(0)
  const [mode, setMode] = React.useState<PlayerMode>("window")
  const [manifest, setManifest] = React.useState<PreviewManifest | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const activeFile = queue[index] ?? null
  const backendId = activeFile?.backendId

  const closeAudio = React.useCallback(() => {
    setQueue([])
    setIndex(0)
    setManifest(null)
    setError(null)
    setMode("window")
  }, [])

  const openAudio = React.useCallback((file: FileNode, candidates: FileNode[] = []) => {
    const audioQueue = candidates.filter((candidate) => candidate.kind === "file" && candidate.mediaType === "audio")
    const nextQueue = audioQueue.some((candidate) => candidate.id === file.id) ? audioQueue : [file, ...audioQueue]
    const nextIndex = Math.max(0, nextQueue.findIndex((candidate) => candidate.id === file.id))
    setQueue(nextQueue)
    setIndex(nextIndex)
    setMode("window")
  }, [])

  React.useEffect(() => {
    if (!backendId) return
    const controller = new AbortController()
    const cached = peekPreviewManifest(backendId)
    setManifest(cached)
    setLoading(!cached)
    setError(null)
    void getPreviewManifest(backendId, controller.signal)
      .then((next) => {
        setManifest(next)
        setLoading(false)
      })
      .catch((reason) => {
        if (controller.signal.aborted) return
        setLoading(false)
        setError(reason instanceof Error ? reason.message : "音频信息加载失败")
      })
    return () => controller.abort()
  }, [backendId])

  const changeTrack = React.useCallback((offset: number) => {
    setIndex((current) => {
      if (queue.length <= 1) return current
      return (current + offset + queue.length) % queue.length
    })
  }, [queue.length])

  const download = React.useCallback(async () => {
    if (!activeFile?.backendId) return
    try {
      const response = await requestResponse(buildDownloadUrl(activeFile.backendId), {
        headers: { Accept: "application/octet-stream" },
      })
      const blob = await response.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = objectUrl
      anchor.download = activeFile.name
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(objectUrl)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "音频下载失败")
    }
  }, [activeFile])

  const minimized = mode === "minimized"

  return (
    <AudioPlayerContext.Provider value={{ openAudio, closeAudio, activeFile }}>
      {children}
      {activeFile ? (
        <div
          className={cn(
            "fixed z-[70]",
            minimized ? "bottom-3 right-3 sm:bottom-4 sm:right-4" : "inset-0 flex items-center justify-center p-3 sm:p-6"
          )}
        >
          {!minimized ? (
            <button
              type="button"
              className="absolute inset-0 bg-black/25 backdrop-blur-sm"
              onClick={() => setMode("minimized")}
              aria-label="最小化播放器"
            />
          ) : null}
          <section
            className={cn(
              "relative flex overflow-hidden border border-border bg-background text-foreground shadow-2xl",
              minimized
                ? "h-[4.75rem] w-[min(36rem,calc(100vw-1.5rem))] rounded-xl"
                : "h-[min(88dvh,52rem)] w-[min(92vw,28rem)] flex-col rounded-2xl"
            )}
            aria-label="全局音频播放器"
          >
            {!minimized ? (
              <header className="absolute right-2 top-2 z-30 flex items-center gap-1 sm:right-3 sm:top-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 bg-background/60 text-muted-foreground backdrop-blur-sm hover:bg-background/80 hover:text-foreground"
                  onClick={() => void download()}
                  aria-label="下载音频"
                >
                  <IconDownload size={18} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 bg-background/60 text-muted-foreground backdrop-blur-sm hover:bg-background/80 hover:text-foreground"
                  onClick={closeAudio}
                  aria-label="关闭播放器"
                >
                  <IconX size={18} />
                </Button>
              </header>
            ) : null}
            {error ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-destructive">
                {error}
              </div>
            ) : loading || !manifest ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                正在读取音频信息
              </div>
            ) : (
              <AudioPlayer
                manifest={manifest}
                fallbackName={activeFile.name}
                compact={minimized}
                onToggleCompact={() => setMode(minimized ? "window" : "minimized")}
                onClose={minimized ? closeAudio : undefined}
                onPrevious={queue.length > 1 ? () => changeTrack(-1) : undefined}
                onNext={queue.length > 1 ? () => changeTrack(1) : undefined}
                hasPrevious={queue.length > 1}
                hasNext={queue.length > 1}
                queuePosition={minimized ? undefined : `${index + 1} / ${queue.length}`}
              />
            )}
          </section>
        </div>
      ) : null}
    </AudioPlayerContext.Provider>
  )
}
