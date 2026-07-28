import * as React from "react"
import Hls from "hls.js"
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconLoader2,
  IconMusic,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconVolume,
  IconVolumeOff,
  IconX,
} from "@tabler/icons-react"

import type { PreviewManifest } from "@/api/files"
import { previewSourceUrls } from "@/lib/preview-assets"
import { cn } from "@/lib/utils"

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00"
  const seconds = Math.floor(value % 60).toString().padStart(2, "0")
  const minutes = Math.floor(value / 60) % 60
  const hours = Math.floor(value / 3600)
  return hours ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`
}

interface AudioPlayerProps {
  manifest?: PreviewManifest
  fallbackName?: string
  compact?: boolean
  onToggleCompact?: () => void
  onClose?: () => void
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
  queuePosition?: string
}

export function AudioPlayer({
  manifest,
  fallbackName,
  compact = false,
  onToggleCompact,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  queuePosition,
}: AudioPlayerProps) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [failed, setFailed] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [coverFailed, setCoverFailed] = React.useState(false)
  const [playing, setPlaying] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [volume, setVolume] = React.useState(1)
  const [muted, setMuted] = React.useState(false)
  const [rate, setRate] = React.useState(1)

  const hlsSource = manifest?.assets.hls?.url
  const sources = manifest
    ? (manifest.assets.audio?.url ? [manifest.assets.audio.url] : previewSourceUrls(manifest))
    : []
  const sourceSignature = sources.join("\n")
  const [sourceIndex, setSourceIndex] = React.useState(0)
  const source = sources[sourceIndex]
  const cover = manifest?.assets.cover?.url

  React.useEffect(() => {
    setSourceIndex(0)
  }, [manifest?.node_id, manifest?.version, sourceSignature])

  const title = manifest
    ? (typeof manifest.metadata.title === "string" && manifest.metadata.title.trim()
        ? manifest.metadata.title.trim()
        : manifest.name)
    : (fallbackName || "音频")
  const artist = manifest && typeof manifest.metadata.artist === "string" ? manifest.metadata.artist.trim() : ""
  const album = manifest && typeof manifest.metadata.album === "string" ? manifest.metadata.album.trim() : ""
  const displaySubtitle = [artist, album].filter(Boolean).join(" · ")

  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    setFailed(false)
    setCoverFailed(false)
    setLoading(true)
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    let hls: Hls | null = null

    if (!manifest || (manifest.status === "processing" && !hlsSource && !manifest.assets.audio)) {
      audio.removeAttribute("src")
    } else if (hlsSource) {
      if (audio.canPlayType("application/vnd.apple.mpegurl")) {
        audio.src = hlsSource
      } else if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 30 })
        hls.loadSource(hlsSource)
        hls.attachMedia(audio)
        hls.on(Hls.Events.ERROR, (_, data) => data.fatal && setFailed(true))
      } else {
        setFailed(true)
      }
    } else if (source) {
      audio.src = source
    }

    return () => {
      hls?.destroy()
      audio.pause()
      audio.removeAttribute("src")
      audio.load()
    }
  }, [hlsSource, manifest, manifest?.assets.audio, manifest?.node_id, manifest?.status, manifest?.version, source])

  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = rate
  }, [rate])

  const togglePlayback = React.useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }, [])

  const seekBy = React.useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.min(Math.max(0, audio.currentTime + seconds), audio.duration || Infinity)
  }, [])

  const toggleMute = React.useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setMuted(audio.muted)
  }, [])

  const cycleRate = React.useCallback(() => {
    const rates = [1, 1.25, 1.5, 2, 0.75]
    const next = rates[(rates.indexOf(rate) + 1) % rates.length]
    setRate(next)
  }, [rate])

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (event.key === " " || event.key === "k") {
      event.preventDefault()
      togglePlayback()
    }
    if (event.key === "ArrowLeft") seekBy(-5)
    if (event.key === "ArrowRight") seekBy(5)
  }, [togglePlayback, seekBy])

  const progressPercent = duration ? Math.min(100, (currentTime / duration) * 100) : 0

  const audioElement = (
    <audio
      ref={audioRef}
      autoPlay
      preload="metadata"
      onLoadedMetadata={(event) => {
        setLoading(false)
        setDuration(event.currentTarget.duration || 0)
        setVolume(event.currentTarget.volume)
      }}
      onCanPlay={(event) => {
        setLoading(false)
        void event.currentTarget.play().catch(() => undefined)
      }}
      onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onEnded={() => setPlaying(false)}
      onError={() => {
        if (!hlsSource && sourceIndex + 1 < sources.length) {
          setLoading(true)
          setSourceIndex((value) => value + 1)
          return
        }
        setLoading(false)
        setFailed(true)
      }}
    />
  )

  const renderCompact = () => (
    <div
      className="flex h-full w-full items-center gap-3 overflow-hidden bg-card px-3 py-2 text-card-foreground"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="迷你音频播放器"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
        {cover && !coverFailed ? (
          <img src={cover} alt="" className="h-full w-full object-cover" onError={() => setCoverFailed(true)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <IconMusic size={20} />
          </div>
        )}
        {playing && (
          <span className="absolute bottom-0.5 right-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="truncate text-sm font-medium" title={title}>{title}</p>
        <p className="truncate text-xs text-muted-foreground" title={displaySubtitle || "音频"}>
          {displaySubtitle || "音频"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {hasPrevious ? (
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="上一首"
          >
            <IconPlayerSkipBackFilled size={16} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={togglePlayback}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95"
          aria-label={playing ? "暂停" : "播放"}
        >
          {playing ? <IconPlayerPauseFilled size={18} /> : <IconPlayerPlayFilled size={18} className="ml-0.5" />}
        </button>
        {hasNext ? (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="下一首"
          >
            <IconPlayerSkipForwardFilled size={16} />
          </button>
        ) : null}
      </div>

      <div className="hidden flex-1 items-center gap-2 px-2 sm:flex">
        <span className="text-xs tabular-nums text-muted-foreground">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step="0.05"
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => {
            const value = Number(event.target.value)
            if (audioRef.current) audioRef.current.currentTime = value
            setCurrentTime(value)
          }}
          className="media-range media-range-themed h-1 flex-1"
          style={{ "--range-progress": `${progressPercent}%` } as React.CSSProperties}
          aria-label="播放进度"
        />
        <span className="text-xs tabular-nums text-muted-foreground">{formatTime(duration)}</span>
      </div>

      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={toggleMute}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={muted ? "取消静音" : "静音"}
        >
          {muted || volume === 0 ? <IconVolumeOff size={18} /> : <IconVolume size={18} />}
        </button>
        {onToggleCompact ? (
          <button
            type="button"
            onClick={onToggleCompact}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="展开播放器"
          >
            <IconArrowsMaximize size={18} />
          </button>
        ) : null}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="关闭播放器"
          >
            <IconX size={18} />
          </button>
        ) : null}
      </div>
    </div>
  )

  const renderFull = () => (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="音频播放器"
    >
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-muted/60 to-background px-6 py-8">
        <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
          <div
            className={cn(
              "relative aspect-square w-full max-w-[min(72vw,22rem)] overflow-hidden rounded-2xl shadow-2xl transition-shadow",
              playing && "shadow-primary/20"
            )}
          >
            {cover && !coverFailed ? (
              <img
                src={cover}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setCoverFailed(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                <IconMusic size={80} stroke={1} />
              </div>
            )}
            {playing && (
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
            )}
          </div>

          <div className="w-full text-center">
            <h2 className="line-clamp-2 text-xl font-semibold leading-tight sm:text-2xl" title={title}>{title}</h2>
            <p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground sm:text-base" title={displaySubtitle || "未知艺术家"}>
              {displaySubtitle || "未知艺术家"}
            </p>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-card/50 px-5 pb-5 pt-4 sm:px-8 sm:pb-6 sm:pt-5">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <div className="space-y-1.5">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step="0.05"
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (audioRef.current) audioRef.current.currentTime = value
                setCurrentTime(value)
              }}
              className="media-range media-range-themed h-1.5 w-full"
              style={{ "--range-progress": `${progressPercent}%` } as React.CSSProperties}
              aria-label="播放进度"
            />
            <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleMute}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label={muted ? "取消静音" : "静音"}
              >
                {muted || volume === 0 ? <IconVolumeOff size={18} /> : <IconVolume size={18} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  if (audioRef.current) {
                    audioRef.current.volume = value
                    audioRef.current.muted = false
                  }
                  setVolume(value)
                  setMuted(false)
                }}
                className="media-range media-range-themed hidden w-20 sm:block"
                style={{ "--range-progress": `${muted ? 0 : volume * 100}%` } as React.CSSProperties}
                aria-label="音量"
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {hasPrevious ? (
                <button
                  type="button"
                  onClick={onPrevious}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
                  aria-label="上一首"
                >
                  <IconPlayerSkipBackFilled size={20} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={togglePlayback}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105 active:scale-95"
                aria-label={playing ? "暂停" : "播放"}
              >
                {playing ? <IconPlayerPauseFilled size={26} /> : <IconPlayerPlayFilled size={26} className="ml-1" />}
              </button>
              {hasNext ? (
                <button
                  type="button"
                  onClick={onNext}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
                  aria-label="下一首"
                >
                  <IconPlayerSkipForwardFilled size={20} />
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-1">
              {queuePosition ? (
                <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">{queuePosition}</span>
              ) : null}
              <button
                type="button"
                onClick={cycleRate}
                className="inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-md px-1.5 text-xs font-medium tabular-nums text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="播放速度"
              >
                {rate}x
              </button>
              {onToggleCompact ? (
                <button
                  type="button"
                  onClick={onToggleCompact}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  aria-label="最小化播放器"
                >
                  <IconArrowsMinimize size={18} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {manifest?.status === "processing" ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/90 px-6 text-center backdrop-blur-sm">
          <IconLoader2 size={32} className="animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">正在生成兼容预览，完成后会自动加载</p>
        </div>
      ) : null}
      {failed ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/90 px-6 text-center backdrop-blur-sm">
          <IconMusic size={40} className="text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">浏览器无法解码此音频</p>
        </div>
      ) : null}
      {loading && manifest?.status !== "processing" && !failed ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
          <IconLoader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : null}
    </div>
  )

  if (!manifest) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        正在读取音频信息
        {audioElement}
      </div>
    )
  }

  return (
    <>
      <div className={cn("h-full w-full", compact ? "block" : "hidden")}>
        {renderCompact()}
      </div>
      <div className={cn("h-full w-full", compact ? "hidden" : "block")}>
        {renderFull()}
      </div>
      {audioElement}
    </>
  )
}
