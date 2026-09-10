import * as React from "react"

import { useIsMobile } from "@/hooks/use-mobile"
import { PreviewSkeleton } from "./PreviewSkeleton"

export type AdaptiveCodeEditorProps = {
  value: string
  language: string
  readOnly?: boolean
  ariaLabel: string
  onChange: (value: string) => void
  onSave: () => void
  onScrollRatioChange?: (ratio: number) => void
  highlightRange?: SourceLineRange | null
}

export type SourceLineRange = { startLine: number; endLine: number }

export type AdaptiveCodeEditorHandle = {
  setScrollRatio: (ratio: number) => void
}

const CodeMirrorEditor = React.lazy(() => import("./CodeMirrorEditor").then((module) => ({ default: module.CodeMirrorEditor })))
const MonacoCodeEditor = React.lazy(() => import("./MonacoCodeEditor").then((module) => ({ default: module.MonacoCodeEditor })))

export const AdaptiveCodeEditor = React.forwardRef<AdaptiveCodeEditorHandle, AdaptiveCodeEditorProps>(function AdaptiveCodeEditor(props, ref) {
  const isMobile = useIsMobile()
  return (
    <React.Suspense fallback={<PreviewSkeleton kind="text" />}>
      {isMobile ? <CodeMirrorEditor ref={ref} {...props} /> : <MonacoCodeEditor ref={ref} {...props} />}
    </React.Suspense>
  )
})
