import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import type { SourceLineRange } from "./AdaptiveCodeEditor"

type MarkdownAstNode = {
  position?: {
    start?: { line?: number }
    end?: { line?: number }
  }
}

export type MarkdownPreviewHandle = {
  setScrollRatio: (ratio: number) => void
}

type MarkdownPreviewProps = {
  content: string
  onScrollRatioChange?: (ratio: number) => void
  onSourceRangeHover?: (range: SourceLineRange | null) => void
}

export const MarkdownPreview = React.forwardRef<MarkdownPreviewHandle, MarkdownPreviewProps>(function MarkdownPreview({ content, onScrollRatioChange, onSourceRangeHover }, ref) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const suppressScrollRef = React.useRef(false)
  const hoveredRangeKeyRef = React.useRef<string | null>(null)

  React.useImperativeHandle(ref, () => ({
    setScrollRatio(ratio) {
      const element = scrollRef.current
      if (!element) return
      const maxScroll = element.scrollHeight - element.clientHeight
      suppressScrollRef.current = true
      element.scrollTop = Math.max(0, Math.min(1, ratio)) * maxScroll
      requestAnimationFrame(() => { suppressScrollRef.current = false })
    },
  }), [])

  const handleScroll = React.useCallback(() => {
    const element = scrollRef.current
    if (!element || suppressScrollRef.current) return
    const maxScroll = element.scrollHeight - element.clientHeight
    onScrollRatioChange?.(maxScroll > 0 ? element.scrollTop / maxScroll : 0)
  }, [onScrollRatioChange])

  const sourceProps = React.useCallback((node: MarkdownAstNode | undefined, className: string, inline = false) => {
    const startLine = node?.position?.start?.line
    const endLine = node?.position?.end?.line
    return {
      className: `${inline ? "markdown-source-fragment" : "markdown-source-block"} ${className}`,
      "data-source-start": startLine,
      "data-source-end": endLine,
    }
  }, [])

  const handlePreviewMouseMove = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    const sourceElement = (event.target as HTMLElement).closest<HTMLElement>("[data-source-start][data-source-end]")
    if (!sourceElement || !event.currentTarget.contains(sourceElement)) return
    const startLine = Number(sourceElement.dataset.sourceStart)
    const endLine = Number(sourceElement.dataset.sourceEnd)
    if (!Number.isFinite(startLine) || !Number.isFinite(endLine)) return
    const key = `${startLine}:${endLine}`
    if (hoveredRangeKeyRef.current === key) return
    hoveredRangeKeyRef.current = key
    onSourceRangeHover?.({ startLine, endLine })
  }, [onSourceRangeHover])

  const clearPreviewHover = React.useCallback(() => {
    hoveredRangeKeyRef.current = null
    onSourceRangeHover?.(null)
  }, [onSourceRangeHover])

  if (!content.trim()) {
    return (
      <div ref={scrollRef} className="custom-scrollbar h-full overflow-auto bg-background" onScroll={handleScroll}>
        <div className="flex min-h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
          此 Markdown 文档为空。切换到“源码”即可开始编辑。
        </div>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="custom-scrollbar h-full overflow-auto bg-background" onScroll={handleScroll}>
      <article className="mx-auto w-full max-w-4xl px-5 py-8 text-[15px] leading-7 text-foreground sm:px-8 sm:py-10 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_pre_code]:bg-transparent [&_pre_code]:p-0" onMouseMove={handlePreviewMouseMove} onMouseLeave={clearPreviewHover}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ node, ...props }) => <h1 {...sourceProps(node, "mb-5 mt-0 text-3xl font-semibold leading-tight")} {...props} />,
            h2: ({ node, ...props }) => <h2 {...sourceProps(node, "mb-4 mt-8 border-b border-border pb-2 text-2xl font-semibold leading-tight")} {...props} />,
            h3: ({ node, ...props }) => <h3 {...sourceProps(node, "mb-3 mt-7 text-xl font-semibold leading-tight")} {...props} />,
            h4: ({ node, ...props }) => <h4 {...sourceProps(node, "mb-2 mt-6 text-lg font-semibold leading-tight")} {...props} />,
            p: ({ node, ...props }) => <p {...sourceProps(node, "my-4")} {...props} />,
            strong: ({ node, ...props }) => <strong {...sourceProps(node, "font-semibold", true)} {...props} />,
            em: ({ node, ...props }) => <em {...sourceProps(node, "italic", true)} {...props} />,
            del: ({ node, ...props }) => <del {...sourceProps(node, "", true)} {...props} />,
            code: ({ node, className, ...props }) => <code {...sourceProps(node, className ?? "", true)} {...props} />,
            a: ({ node, ...props }) => <a {...sourceProps(node, "text-primary underline underline-offset-4", true)} target="_blank" rel="noreferrer noopener" {...props} />,
            blockquote: ({ node, ...props }) => <blockquote {...sourceProps(node, "my-5 border-l-4 border-border pl-4 text-muted-foreground")} {...props} />,
            ul: ({ node, ...props }) => <ul {...sourceProps(node, "my-4 list-disc pl-7")} {...props} />,
            ol: ({ node, ...props }) => <ol {...sourceProps(node, "my-4 list-decimal pl-7")} {...props} />,
            li: ({ node, ...props }) => <li {...sourceProps(node, "my-1")} {...props} />,
            pre: ({ node, ...props }) => <pre {...sourceProps(node, "my-5 overflow-auto rounded-lg bg-muted p-4 text-[13px] leading-6")} {...props} />,
            table: ({ node, ...props }) => <table {...sourceProps(node, "my-5 w-full border-collapse text-sm")} {...props} />,
            th: ({ node: _node, ...props }) => <th className="border border-border bg-muted px-3 py-2 text-left font-medium" {...props} />,
            td: ({ node: _node, ...props }) => <td className="border border-border px-3 py-2 align-top" {...props} />,
            hr: ({ node, ...props }) => <hr {...sourceProps(node, "my-8 border-border")} {...props} />,
            img: ({ node, ...props }) => <img {...sourceProps(node, "my-5 max-h-[70vh] max-w-full rounded-lg object-contain")} loading="lazy" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  )
})
