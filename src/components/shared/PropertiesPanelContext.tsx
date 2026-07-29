import * as React from "react"

import type { FileNode } from "@/lib/models"

export interface PropertiesPanelContextValue {
  node: FileNode | null
  nodes: FileNode[]
  bucketName: string
  formatBytes: (size?: number) => string
  open: (node: FileNode) => void
  openMulti: (nodes: FileNode[]) => void
  toggle: (node: FileNode) => void
  close: () => void
}

const PropertiesPanelContext = React.createContext<PropertiesPanelContextValue>({
  node: null,
  nodes: [],
  bucketName: "",
  formatBytes: () => "-",
  open: () => {},
  openMulti: () => {},
  toggle: () => {},
  close: () => {},
})

export function usePropertiesPanel() {
  return React.useContext(PropertiesPanelContext)
}

export function PropertiesPanelProvider({
  bucketName,
  formatBytes,
  children,
}: {
  bucketName: string
  formatBytes: (size?: number) => string
  children: React.ReactNode
}) {
  const [node, setNode] = React.useState<FileNode | null>(null)
  const [nodes, setNodes] = React.useState<FileNode[]>([])
  const sameNodeIds = React.useCallback((left: FileNode[], right: FileNode[]) => {
    return left.length === right.length && left.every((item, index) => item.id === right[index]?.id)
  }, [])
  const openPanel = React.useCallback((nextNode: FileNode) => {
    setNode((current) => (current?.id === nextNode.id ? current : nextNode))
    setNodes((current) => (current.length === 1 && current[0]?.id === nextNode.id ? current : [nextNode]))
  }, [])
  const openMulti = React.useCallback((nextNodes: FileNode[]) => {
    const nextNode = nextNodes[0] ?? null
    setNode((current) => (current?.id === nextNode?.id ? current : nextNode))
    setNodes((current) => (sameNodeIds(current, nextNodes) ? current : nextNodes))
  }, [sameNodeIds])
  const togglePanel = React.useCallback((nextNode: FileNode) => {
    setNode((current) => (current?.id === nextNode.id ? null : nextNode))
    setNodes((current) => (current.length === 1 && current[0]?.id === nextNode.id ? [] : [nextNode]))
  }, [])
  const closePanel = React.useCallback(() => {
    setNode((current) => (current === null ? current : null))
    setNodes((current) => (current.length === 0 ? current : []))
  }, [])

  const value = React.useMemo<PropertiesPanelContextValue>(
    () => ({ node, nodes, bucketName, formatBytes, open: openPanel, openMulti, toggle: togglePanel, close: closePanel }),
    [node, nodes, bucketName, formatBytes, openPanel, openMulti, togglePanel, closePanel]
  )

  return (
    <PropertiesPanelContext.Provider value={value}>
      {children}
    </PropertiesPanelContext.Provider>
  )
}
