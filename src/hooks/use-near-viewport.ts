import * as React from "react"

export function useNearViewport<T extends Element>(
  enabled: boolean,
  rootMargin = "320px 0px"
) {
  const ref = React.useRef<T>(null)
  const [isNear, setIsNear] = React.useState(false)

  React.useEffect(() => {
    if (!enabled || isNear) return
    const element = ref.current
    if (!element) return
    if (!("IntersectionObserver" in window)) {
      setIsNear(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setIsNear(true)
        observer.disconnect()
      },
      { rootMargin }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [enabled, isNear, rootMargin])

  return { ref, isNear: enabled && isNear }
}
