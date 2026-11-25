import * as React from "react"

export function useBreadcrumbAlignment(key: string) {
  const [element, setElement] = React.useState<HTMLElement | null>(null)
  React.useLayoutEffect(() => {
    if (!element) return
    const align = () => { element.scrollLeft = element.scrollWidth }
    align()
    const frame = window.requestAnimationFrame(align)
    return () => window.cancelAnimationFrame(frame)
  }, [element, key])
  return setElement
}
