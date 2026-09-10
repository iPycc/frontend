import * as React from "react"
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { bracketMatching, defaultHighlightStyle, foldGutter, indentOnInput, syntaxHighlighting } from "@codemirror/language"
import { searchKeymap } from "@codemirror/search"
import { EditorState, StateEffect, StateField, type Extension } from "@codemirror/state"
import {
  crosshairCursor,
  Decoration,
  type DecorationSet,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view"
import { cpp } from "@codemirror/lang-cpp"
import { css } from "@codemirror/lang-css"
import { html } from "@codemirror/lang-html"
import { java } from "@codemirror/lang-java"
import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import { markdown } from "@codemirror/lang-markdown"
import { python } from "@codemirror/lang-python"
import { sql } from "@codemirror/lang-sql"
import { xml } from "@codemirror/lang-xml"

import type { AdaptiveCodeEditorHandle, AdaptiveCodeEditorProps, SourceLineRange } from "./AdaptiveCodeEditor"

const setHighlightedLines = StateEffect.define<SourceLineRange | null>()

const highlightedLinesField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(highlights, transaction) {
    const effect = transaction.effects.find((item) => item.is(setHighlightedLines))
    if (!effect) return highlights.map(transaction.changes)
    if (!effect.value) return Decoration.none
    const { doc } = transaction.state
    const startLine = Math.max(1, Math.min(effect.value.startLine, doc.lines))
    const endLine = Math.max(startLine, Math.min(effect.value.endLine, doc.lines))
    const decorations = []
    for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
      decorations.push(Decoration.line({ class: "markdown-source-highlight" }).range(doc.line(lineNumber).from))
    }
    return Decoration.set(decorations)
  },
  provide: (field) => EditorView.decorations.from(field),
})

function languageExtension(language: string): Extension[] {
  switch (language) {
    case "javascript": return [javascript()]
    case "javascriptreact": return [javascript({ jsx: true })]
    case "typescript": return [javascript({ typescript: true })]
    case "typescriptreact": return [javascript({ jsx: true, typescript: true })]
    case "json": return [json()]
    case "css": return [css()]
    case "html": return [html()]
    case "markdown": return [markdown()]
    case "python": return [python()]
    case "sql": return [sql()]
    case "cpp": case "c": return [cpp()]
    case "java": return [java()]
    case "xml": case "yaml": return [xml()]
    default: return []
  }
}

export const CodeMirrorEditor = React.forwardRef<AdaptiveCodeEditorHandle, AdaptiveCodeEditorProps>(function CodeMirrorEditor(props, ref) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const viewRef = React.useRef<EditorView | null>(null)
  const externalUpdateRef = React.useRef(false)
  const suppressScrollRef = React.useRef(false)
  const onChangeRef = React.useRef(props.onChange)
  const onSaveRef = React.useRef(props.onSave)
  onChangeRef.current = props.onChange
  onSaveRef.current = props.onSave

  React.useEffect(() => {
    if (!hostRef.current) return
    const extensions: Extension[] = [
      lineNumbers(), highlightActiveLineGutter(), highlightSpecialChars(), history(), foldGutter(),
      drawSelection(), dropCursor(), indentOnInput(), syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(), rectangularSelection(), crosshairCursor(), highlightActiveLine(),
      EditorState.readOnly.of(Boolean(props.readOnly)), EditorView.editable.of(!props.readOnly),
      keymap.of([{ key: "Mod-s", run: () => { onSaveRef.current(); return true } }, indentWithTab, ...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      EditorView.lineWrapping,
      highlightedLinesField,
      EditorView.theme({
        "&": { height: "100%", backgroundColor: "var(--background)", color: "var(--foreground)" },
        ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: "13px", lineHeight: "1.55" },
        ".cm-gutters": { backgroundColor: "var(--muted)", color: "var(--muted-foreground)", borderRight: "1px solid var(--border)" },
        ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "color-mix(in oklab, var(--accent) 75%, transparent)" },
        ".cm-content": { padding: "12px 0" },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !externalUpdateRef.current) onChangeRef.current(update.state.doc.toString())
      }),
      ...languageExtension(props.language),
    ]
    const view = new EditorView({ parent: hostRef.current, state: EditorState.create({ doc: props.value, extensions }) })
    viewRef.current = view
    const handleScroll = () => {
      if (suppressScrollRef.current) return
      const maxScroll = view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight
      props.onScrollRatioChange?.(maxScroll > 0 ? view.scrollDOM.scrollTop / maxScroll : 0)
    }
    view.scrollDOM.addEventListener("scroll", handleScroll, { passive: true })
    return () => { view.scrollDOM.removeEventListener("scroll", handleScroll); view.destroy(); viewRef.current = null }
  }, [props.ariaLabel, props.language, props.readOnly])

  React.useImperativeHandle(ref, () => ({
    setScrollRatio(ratio) {
      const view = viewRef.current
      if (!view) return
      const maxScroll = view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight
      suppressScrollRef.current = true
      view.scrollDOM.scrollTop = Math.max(0, Math.min(1, ratio)) * maxScroll
      requestAnimationFrame(() => { suppressScrollRef.current = false })
    },
  }), [])

  React.useEffect(() => {
    const view = viewRef.current
    if (!view || view.state.doc.toString() === props.value) return
    externalUpdateRef.current = true
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: props.value } })
    externalUpdateRef.current = false
  }, [props.value])

  React.useEffect(() => {
    viewRef.current?.dispatch({ effects: setHighlightedLines.of(props.highlightRange ?? null) })
  }, [props.highlightRange])

  return <div ref={hostRef} className="custom-scrollbar h-full min-h-0" role="textbox" aria-label={props.ariaLabel} />
})
