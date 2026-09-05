import * as React from "react"
import Hls from "hls.js"
import {
  IconArrowsMaximize,
  IconLoader2,
  IconPictureInPicture,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconVolume,
  IconVolumeOff,
} from "@tabler/icons-react"

import type { PreviewManifest } from "@/api/files"
import { previewSourceUrls } from "@/lib/preview-assets"
import { cn } from "@/lib/utils"
import { PreviewSkeleton } from "./PreviewSkeleton"

const videoControlButton = "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/90 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00"
  const seconds = Math.floor(value % 60).toString().padStart(2, "0")
  const minutes = Math.floor(value / 60) % 60
  const hours = Math.floor(value / 3600)
  return hours ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`
}

export function MediaPreview({ manifest }: { manifest: PreviewManifest }) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const autoplayAttemptedRef = React.useRef<string | null>(null)
  const [failed, setFailed] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [playing, setPlaying] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [volume, setVolume] = React.useState(1)
  const [muted, setMuted] = React.useState(false)
  const [rate, setRate] = React.useState(1)
  const hlsSource = manifest.assets.hls?.url
  const sources = previewSourceUrls(manifest)
  const sourceSignature = sources.join("\n")
  const [sourceIndex, setSourceIndex] = React.useState(0)
  const source = sources[sourceIndex]
  const poster = manifest.assets.poster?.url

  React.useEffect(() => {
    setSourceIndex(0)
  }, [manifest.node_id, manifest.version, sourceSignature])

  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return
    setFailed(false)
    setLoading(true)
    setPlaying(false)
    setCurrentTime(0)
    let hls: Hls | null = null

    if (manifest.status === "processing" && !hlsSource && !source) {
      video.removeAttribute("src")
    } else if (hlsSource) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hlsSource
      } else if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 30 })
        hls.loadSource(hlsSource)
        hls.attachMedia(video)
        hls.on(Hls.Events.ERROR, (_, data) => data.fatal && setFailed(true))
      } else {
        setFailed(true)
      }
    } else if (source) {
      video.src = source
    }

    return () => {
      hls?.destroy()
      video.pause()
      video.removeAttribute("src")
      video.load()
    }
  }, [hlsSource, manifest.node_id, manifest.status, manifest.version, source])

  const togglePlayback = React.useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play()
    else video.pause()
  }, [])

  const seekBy = (seconds: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.min(Math.max(0, video.currentTime + seconds), video.duration || Infinity)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }

  const cycleRate = () => {
    const video = videoRef.current
    if (!video) return
    const rates = [1, 1.25, 1.5, 2, 0.75]
    const next = rates[(rates.indexOf(rate) + 1) % rates.length]
    video.playbackRate = next
    setRate(next)
  }

const toggleFullscreen = () => {
  const video = videoRef.current
  if (!video) return

  if (document.fullscreenElement) {
    void document.exitFullscreen()
    return
  }

  // 标准全屏（桌面 / Android / iPad）
  if (hostRef.current && typeof hostRef.current.requestFullscreen === "function") {
    void hostRef.current.requestFullscreen()
    return
  }
  if (typeof video.requestFullscreen === "function") {
    void video.requestFullscreen()
    return
  }

  // iPhone Safari 原生视频全屏
  const webkitVideo = video as HTMLVideoElement & {
    webkitEnterFullscreen?: () => void
    webkitEnterFullScreen?: () => void
    webkitSupportsFullscreen?: boolean
  }
  if (webkitVideo.webkitEnterFullscreen && (webkitVideo.webkitSupportsFullscreen ?? true)) {
    webkitVideo.webkitEnterFullscreen()
    return
  }
  if (webkitVideo.webkitEnterFullScreen && (webkitVideo.webkitSupportsFullscreen ?? true)) {
    webkitVideo.webkitEnterFullScreen()
  }
}

  const togglePictureInPicture = async () => {
    const video = videoRef.current
    if (!video || !("pictureInPictureEnabled" in document)) return
    if (document.pictureInPictureElement) await document.exitPictureInPicture()
    else await video.requestPictureInPicture()
  }

  return (
    <div
      ref={hostRef}
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-black"
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest("button, input, select")) return
        if ([" ", "k", "ArrowLeft", "ArrowRight", "f"].includes(event.key)) event.stopPropagation()
        if (event.key === " " || event.key === "k") { event.preventDefault(); togglePlayback() }
        if (event.key === "ArrowLeft") seekBy(-5)
        if (event.key === "ArrowRight") seekBy(5)
        if (event.key.toLowerCase() === "f") void toggleFullscreen()
      }}
      tabIndex={0}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
      <video
        ref={(element) => { videoRef.current = element }}
        poster={poster}
        playsInline
        className={cn(
          "h-full w-full object-contain transition-opacity duration-150",
          loading ? "opacity-0" : "opacity-100"
        )}
        preload="metadata"
        onLoadedMetadata={(event) => {
          setLoading(false)
          setDuration(event.currentTarget.duration || 0)
          setVolume(event.currentTarget.volume)
        }}
        onCanPlay={(event) => {
          setLoading(false)
          const key = `${manifest.node_id}:${manifest.version}`
          if (autoplayAttemptedRef.current !== key) {
            autoplayAttemptedRef.current = key
            void event.currentTarget.play().catch(() => {
              // Autoplay can be blocked; the play button remains available.
            })
          }
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
        onClick={() => {
          togglePlayback()
              }}
        onDoubleClick={() => void toggleFullscreen()}
      />

      {manifest.status === "processing" ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b0c0e] text-white/70">
          <IconLoader2 size={22} className="animate-spin" /><span className="ml-2 text-sm">正在生成兼容预览，完成后会自动加载</span>
        </div>
      ) : null}
      {failed ? <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b0c0e] px-6 text-center text-sm text-white/70">浏览器无法解码此媒体，兼容版本也尚未生成。仍可下载原文件。</div> : null}
      {loading && manifest.status !== "processing" && !failed ? <PreviewSkeleton kind="video" className="pointer-events-none absolute inset-0 z-10" /> : null}

      </div>
      <div className="shrink-0 border-t border-white/10 bg-[#171717] px-3 py-2 text-white sm:px-4" aria-label="视频控制栏">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step="0.05"
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => {
            const value = Number(event.target.value)
            if (videoRef.current) videoRef.current.currentTime = value
            setCurrentTime(value)
          }}
          className="media-range video-range w-full"
          style={{ "--range-progress": `${duration ? Math.min(100, (currentTime / duration) * 100) : 0}%` } as React.CSSProperties}
          aria-label="播放进度"
        />
        <div className="mt-1.5 flex items-center gap-1">
          <button type="button" className={videoControlButton} onClick={togglePlayback} aria-label={playing ? "暂停" : "播放"}>{playing ? <IconPlayerPauseFilled size={19} /> : <IconPlayerPlayFilled size={19} />}</button>
          <span className="ml-1 whitespace-nowrap text-xs tabular-nums text-white/85">{formatTime(currentTime)} / {formatTime(duration)}</span>
          <div className="flex-1" />
          <button type="button" className={videoControlButton} onClick={toggleMute} aria-label={muted ? "取消静音" : "静音"}>{muted || volume === 0 ? <IconVolumeOff size={20} /> : <IconVolume size={20} />}</button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (videoRef.current) { videoRef.current.volume = value; videoRef.current.muted = false }
              setVolume(value); setMuted(false)
            }}
            className="media-range hidden w-20 sm:block"
            style={{ "--range-progress": `${muted ? 0 : volume * 100}%` } as React.CSSProperties}
            aria-label="音量"
          />
          <button type="button" className="h-8 rounded-md px-2 text-xs font-medium text-white/90 hover:bg-white/15" onClick={cycleRate} aria-label="播放速度">{rate}x</button>
          <button type="button" className={cn(videoControlButton, "hidden sm:inline-flex")} onClick={() => void togglePictureInPicture()} aria-label="画中画"><IconPictureInPicture size={20} /></button>
          <button type="button" className={videoControlButton} onClick={() => void toggleFullscreen()} aria-label="全屏"><IconArrowsMaximize size={20} /></button>
        </div>
      </div>
    </div>
  )
}
