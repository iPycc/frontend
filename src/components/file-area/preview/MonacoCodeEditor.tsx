import * as React from "react"
import * as monaco from "monaco-editor"
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker"
import CssWorker from "monaco-editor/language/css/css.worker.js?worker"
import HtmlWorker from "monaco-editor/language/html/html.worker.js?worker"
import JsonWorker from "monaco-editor/language/json/json.worker.js?worker"
import TsWorker from "monaco-editor/language/typescript/ts.worker.js?worker"

import type { AdaptiveCodeEditorHandle, AdaptiveCodeEditorProps } from "./AdaptiveCodeEditor"

export const MonacoCodeEditor = React.forwardRef<AdaptiveCodeEditorHandle, AdaptiveCodeEditorProps>(function MonacoCodeEditor(props, ref) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const decorationsRef = React.useRef<monaco.editor.IEditorDecorationsCollection | null>(null)
  const suppressScrollRef = React.useRef(false)
  const onChangeRef = React.useRef(props.onChange)
  const onSaveRef = React.useRef(props.onSave)
  onChangeRef.current = props.onChange
  onSaveRef.current = props.onSave

  React.useEffect(() => {
    self.MonacoEnvironment = {
      getWorker(_moduleId: string, label: string) {
        if (label === "json") return new JsonWorker()
        if (label === "css" || label === "scss" || label === "less") return new CssWorker()
        if (label === "html" || label === "handlebars" || label === "razor") return new HtmlWorker()
        if (label === "typescript" || label === "javascript") return new TsWorker()
        return new EditorWorker()
      },
    }
  }, [])

  React.useEffect(() => {
    if (!hostRef.current) return
    const editor = monaco.editor.create(hostRef.current, {
      value: props.value,
      language: props.language,
      readOnly: props.readOnly,
      automaticLayout: true,
      fontSize: 13,
      lineHeight: 20,
      fontLigatures: true,
      minimap: { enabled: true, maxColumn: 80 },
      padding: { top: 12, bottom: 12 },
      renderWhitespace: "selection",
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      wordWrap: "off",
      theme: document.documentElement.classList.contains("dark") ? "vs-dark" : "vs",
      ariaLabel: props.ariaLabel,
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onSaveRef.current())
    const subscription = editor.onDidChangeModelContent(() => onChangeRef.current(editor.getValue()))
    const scrollSubscription = editor.onDidScrollChange(() => {
      if (suppressScrollRef.current) return
      const maxScroll = editor.getScrollHeight() - editor.getLayoutInfo().height
      props.onScrollRatioChange?.(maxScroll > 0 ? editor.getScrollTop() / maxScroll : 0)
    })
    decorationsRef.current = editor.createDecorationsCollection()
    editorRef.current = editor
    return () => {
      subscription.dispose()
      scrollSubscription.dispose()
      decorationsRef.current?.clear()
      decorationsRef.current = null
      editor.dispose()
      editorRef.current = null
    }
  }, [props.ariaLabel, props.language, props.readOnly])

  React.useImperativeHandle(ref, () => ({
    setScrollRatio(ratio) {
      const editor = editorRef.current
      if (!editor) return
      const maxScroll = editor.getScrollHeight() - editor.getLayoutInfo().height
      suppressScrollRef.current = true
      editor.setScrollTop(Math.max(0, Math.min(1, ratio)) * maxScroll)
      requestAnimationFrame(() => { suppressScrollRef.current = false })
    },
  }), [])

  React.useEffect(() => {
    const editor = editorRef.current
    if (editor && editor.getValue() !== props.value) editor.setValue(props.value)
  }, [props.value])

  React.useEffect(() => {
    const range = props.highlightRange
    decorationsRef.current?.set(range ? [{
      range: new monaco.Range(range.startLine, 1, range.endLine, 1),
      options: { isWholeLine: true, className: "markdown-source-highlight" },
    }] : [])
  }, [props.highlightRange])

  return <div ref={hostRef} className="h-full min-h-0" />
})
