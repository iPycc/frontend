import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function MarkdownPreview({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
        此 Markdown 文档为空。切换到“源码”即可开始编辑。
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-background">
      <article className="mx-auto w-full max-w-4xl px-5 py-8 text-[15px] leading-7 text-foreground sm:px-8 sm:py-10 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_pre_code]:bg-transparent [&_pre_code]:p-0">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ node: _node, ...props }) => <h1 className="mb-5 mt-0 text-3xl font-semibold leading-tight" {...props} />,
            h2: ({ node: _node, ...props }) => <h2 className="mb-4 mt-8 border-b border-border pb-2 text-2xl font-semibold leading-tight" {...props} />,
            h3: ({ node: _node, ...props }) => <h3 className="mb-3 mt-7 text-xl font-semibold leading-tight" {...props} />,
            h4: ({ node: _node, ...props }) => <h4 className="mb-2 mt-6 text-lg font-semibold leading-tight" {...props} />,
            p: ({ node: _node, ...props }) => <p className="my-4" {...props} />,
            a: ({ node: _node, ...props }) => <a className="text-primary underline underline-offset-4" target="_blank" rel="noreferrer noopener" {...props} />,
            blockquote: ({ node: _node, ...props }) => <blockquote className="my-5 border-l-4 border-border pl-4 text-muted-foreground" {...props} />,
            ul: ({ node: _node, ...props }) => <ul className="my-4 list-disc pl-7" {...props} />,
            ol: ({ node: _node, ...props }) => <ol className="my-4 list-decimal pl-7" {...props} />,
            li: ({ node: _node, ...props }) => <li className="my-1" {...props} />,
            pre: ({ node: _node, ...props }) => <pre className="my-5 overflow-auto rounded-lg bg-muted p-4 text-[13px] leading-6" {...props} />,
            table: ({ node: _node, ...props }) => <table className="my-5 w-full border-collapse text-sm" {...props} />,
            th: ({ node: _node, ...props }) => <th className="border border-border bg-muted px-3 py-2 text-left font-medium" {...props} />,
            td: ({ node: _node, ...props }) => <td className="border border-border px-3 py-2 align-top" {...props} />,
            hr: ({ node: _node, ...props }) => <hr className="my-8 border-border" {...props} />,
            img: ({ node: _node, ...props }) => <img className="my-5 max-h-[70vh] max-w-full rounded-lg object-contain" loading="lazy" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  )
}
