import * as React from "react"
import { Crepe } from "@milkdown/crepe"
import "@milkdown/crepe/theme/common/style.css"
import "@milkdown/crepe/theme/frame.css"

export function MarkdownEditor({
  initialValue,
  readOnly,
  onChange,
}: {
  initialValue: string
  readOnly: boolean
  onChange: (value: string) => void
}) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const onChangeRef = React.useRef(onChange)
  const initialValueRef = React.useRef(initialValue)
  onChangeRef.current = onChange

  React.useEffect(() => {
    if (!hostRef.current) return
    const editor = new Crepe({
      root: hostRef.current,
      defaultValue: initialValueRef.current,
      features: {
        [Crepe.Feature.AI]: false,
        [Crepe.Feature.TopBar]: true,
      },
      featureConfigs: {
        [Crepe.Feature.TopBar]: {
          headingOptions: [
            { label: "正文", level: null },
            { label: "一级标题", level: 1 },
            { label: "二级标题", level: 2 },
            { label: "三级标题", level: 3 },
            { label: "四级标题", level: 4 },
          ],
        },
      },
    })
    editor.setReadonly(readOnly)
    editor.on((listener) => {
      listener.markdownUpdated((_ctx, markdown, previous) => {
        if (markdown !== previous) onChangeRef.current(markdown)
      })
    })
    void editor.create()
    return () => { void editor.destroy() }
  }, [readOnly])

  return (
    <div className="custom-scrollbar h-full min-h-0 overflow-auto bg-background">
      <div ref={hostRef} className="milkdown mx-auto min-h-full w-full max-w-4xl px-4 py-6 sm:px-8" />
    </div>
  )
}
