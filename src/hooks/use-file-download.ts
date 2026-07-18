import { useCallback, useEffect, useRef, useState } from "react"

import { requestResponse } from "@/api/client"

export type DownloadTask = {
  name: string
  phase: "choosing" | "preparing" | "downloading" | "complete" | "error"
  loaded: number
  total: number | null
  speed?: number
  sourceLabel?: string
  filesCompleted?: number
  totalFiles?: number
  currentFile?: string
  message?: string
}

export type DirectoryDownloadNode = {
  id: number
  name: string
  type: "folder" | "file"
  size?: number
}

type WritableFile = {
  write: (data: Uint8Array) => Promise<void>
  close: () => Promise<void>
  abort: () => Promise<void>
}

type FileHandle = {
  createWritable: () => Promise<WritableFile>
}

type DirectoryHandle = {
  getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<DirectoryHandle>
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileHandle>
  queryPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>
  requestPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>
}

type FilePickerWindow = Window & {
  showSaveFilePicker?: (options: { suggestedName: string }) => Promise<FileHandle>
  showDirectoryPicker?: (options?: { startIn?: "downloads"; mode?: "readwrite" }) => Promise<DirectoryHandle>
}

type DirectoryDownloadOptions = {
  prepare?: () => Promise<void>
  getChildren: (folder: DirectoryDownloadNode) => Promise<DirectoryDownloadNode[]>
  buildFileUrl: (file: DirectoryDownloadNode) => string
}

type PreparedFile = {
  node: DirectoryDownloadNode
  path: string[]
}

function safeSuggestedName(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/, "").slice(0, 240) || "download"
}

function safePathSegment(value: string) {
  return safeSuggestedName(value).replace(/[\\/]/g, "_")
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && (error.name === "AbortError" || error.name === "NotAllowedError")
}

function getSourceLabel(response: Response) {
  try {
    return new URL(response.url).origin === window.location.origin ? "本地服务" : "对象存储直连"
  } catch {
    return "下载服务"
  }
}

async function ensureWritePermission(handle: DirectoryHandle) {
  if (!handle.queryPermission) return true
  if (await handle.queryPermission({ mode: "readwrite" }) === "granted") return true
  return handle.requestPermission ? await handle.requestPermission({ mode: "readwrite" }) === "granted" : false
}

async function getDirectory(root: DirectoryHandle, path: string[]) {
  let current = root
  for (const segment of path) {
    current = await current.getDirectoryHandle(safePathSegment(segment), { create: true })
  }
  return current
}

export function useFileDownload() {
  const [task, setTask] = useState<DownloadTask | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const supportsDirectoryDownload = typeof window !== "undefined" && Boolean((window as FilePickerWindow).showDirectoryPicker)

  useEffect(() => () => {
    controllerRef.current?.abort()
  }, [])

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setTask(null)
  }, [])

  const dismiss = useCallback(() => {
    setTask(null)
  }, [])

  const finishTask = useCallback((nextTask: DownloadTask) => {
    setTask(nextTask)
  }, [])

  const download = useCallback(async (url: string, suggestedName: string) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const name = safeSuggestedName(suggestedName)
    const picker = (window as FilePickerWindow).showSaveFilePicker
    let fileHandle: FileHandle | null = null

    try {
      if (picker) {
        setTask({ name, phase: "choosing", loaded: 0, total: null })
        fileHandle = await picker.call(window, { suggestedName: name })
      }

      setTask({ name, phase: "preparing", loaded: 0, total: null })
      const response = await requestResponse(url, {
        headers: { Accept: "application/octet-stream" },
        signal: controller.signal,
      })
      const contentLength = Number(response.headers.get("Content-Length"))
      const total = Number.isFinite(contentLength) && contentLength > 0 ? contentLength : null
      const reader = response.body?.getReader()
      const sourceLabel = getSourceLabel(response)
      let loaded = 0
      let speed = 0
      let lastSampleBytes = 0
      let lastSampleTime = performance.now()
      let lastUiTime = 0

      const reportProgress = (force = false) => {
        const now = performance.now()
        const elapsed = (now - lastSampleTime) / 1000
        if ((elapsed >= 0.4 || force) && loaded > lastSampleBytes) {
          const sample = (loaded - lastSampleBytes) / Math.max(elapsed, 0.001)
          speed = speed > 0 ? speed * 0.65 + sample * 0.35 : sample
          lastSampleBytes = loaded
          lastSampleTime = now
        }
        if (force || now - lastUiTime >= 400) {
          setTask({ name, phase: "downloading", loaded, total, speed, sourceLabel })
          lastUiTime = now
        }
      }

      if (fileHandle) {
        const writable = await fileHandle.createWritable()
        try {
          if (reader) {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              await writable.write(value)
              loaded += value.byteLength
              reportProgress()
            }
          } else {
            const data = new Uint8Array(await response.arrayBuffer())
            await writable.write(data)
            loaded = data.byteLength
            reportProgress(true)
          }
          await writable.close()
        } catch (error) {
          await writable.abort().catch(() => undefined)
          throw error
        }
      } else {
        const chunks: ArrayBuffer[] = []
        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value.slice().buffer)
            loaded += value.byteLength
            reportProgress()
          }
        } else {
          const data = await response.arrayBuffer()
          chunks.push(data)
          loaded = data.byteLength
          reportProgress(true)
        }
        const objectUrl = window.URL.createObjectURL(new Blob(chunks))
        const anchor = document.createElement("a")
        anchor.href = objectUrl
        anchor.download = name
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000)
      }

      reportProgress(true)
      finishTask({ name, phase: "complete", loaded, total: total ?? loaded, speed, sourceLabel })
      return true
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        setTask(null)
        return false
      }
      setTask({
        name,
        phase: "error",
        loaded: 0,
        total: null,
        message: error instanceof Error ? error.message : "下载失败",
      })
      throw error
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [finishTask])

  const downloadToDirectory = useCallback(async (
    roots: DirectoryDownloadNode[],
    options: DirectoryDownloadOptions
  ) => {
    const picker = (window as FilePickerWindow).showDirectoryPicker
    if (!picker) throw new Error("当前浏览器不支持保存原始文件夹，请改用 ZIP 下载")

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const name = roots.length === 1 ? roots[0].name : `${roots.length} 项内容`

    try {
      setTask({ name, phase: "choosing", loaded: 0, total: null, message: "请选择保存文件夹" })
      const target = await picker.call(window, { startIn: "downloads", mode: "readwrite" })
      if (!await ensureWritePermission(target)) throw new Error("未获得所选文件夹的写入权限")
      await options.prepare?.()

      setTask({ name, phase: "preparing", loaded: 0, total: null, message: "正在读取文件清单…" })
      const directories: string[][] = []
      const files: PreparedFile[] = []

      const walk = async (node: DirectoryDownloadNode, parentPath: string[]) => {
        if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError")
        const path = [...parentPath, safePathSegment(node.name)]
        if (node.type === "file") {
          files.push({ node, path })
          return
        }
        directories.push(path)
        const children = await options.getChildren(node)
        for (const child of children) await walk(child, path)
      }

      for (const root of roots) await walk(root, [])
      for (const path of directories) await getDirectory(target, path)

      const total = files.reduce((sum, file) => sum + Math.max(0, file.node.size ?? 0), 0) || null
      let loaded = 0
      let filesCompleted = 0
      let speed = 0
      let sourceLabel = "下载服务"
      let lastSampleBytes = 0
      let lastSampleTime = performance.now()
      let lastUiTime = 0

      const reportProgress = (relativePath: string, force = false) => {
        const now = performance.now()
        const elapsed = (now - lastSampleTime) / 1000
        if ((elapsed >= 0.4 || force) && loaded > lastSampleBytes) {
          const sample = (loaded - lastSampleBytes) / Math.max(elapsed, 0.001)
          speed = speed > 0 ? speed * 0.65 + sample * 0.35 : sample
          lastSampleBytes = loaded
          lastSampleTime = now
        }
        if (force || now - lastUiTime >= 400) {
          setTask({
            name,
            phase: "downloading",
            loaded,
            total,
            speed,
            sourceLabel,
            filesCompleted,
            totalFiles: files.length,
            currentFile: relativePath,
          })
          lastUiTime = now
        }
      }

      for (const file of files) {
        if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError")
        const relativePath = file.path.join("/")
        reportProgress(relativePath, true)
        const directory = await getDirectory(target, file.path.slice(0, -1))
        const handle = await directory.getFileHandle(safePathSegment(file.path.at(-1) ?? file.node.name), { create: true })
        const writable = await handle.createWritable()
        try {
          const response = await requestResponse(options.buildFileUrl(file.node), {
            headers: { Accept: "application/octet-stream" },
            signal: controller.signal,
          })
          sourceLabel = getSourceLabel(response)
          const reader = response.body?.getReader()
          if (reader) {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              await writable.write(value)
              loaded += value.byteLength
              reportProgress(relativePath)
            }
          } else {
            const data = new Uint8Array(await response.arrayBuffer())
            await writable.write(data)
            loaded += data.byteLength
            reportProgress(relativePath, true)
          }
          await writable.close()
          filesCompleted += 1
          reportProgress(relativePath, true)
        } catch (error) {
          await writable.abort().catch(() => undefined)
          throw error
        }
      }

      finishTask({ name, phase: "complete", loaded, total: total ?? loaded, speed, sourceLabel, filesCompleted, totalFiles: files.length })
      return true
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        setTask(null)
        return false
      }
      setTask({
        name,
        phase: "error",
        loaded: 0,
        total: null,
        message: error instanceof Error ? error.message : "文件夹下载失败",
      })
      throw error
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [finishTask])

  return { task, download, downloadToDirectory, supportsDirectoryDownload, cancel, dismiss }
}
