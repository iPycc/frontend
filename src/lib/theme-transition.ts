import { flushSync } from "react-dom"

type TransitionOrigin = {
  x?: number
  y?: number
}

let lastPointerOrigin: { x: number; y: number; time: number } | null = null

if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (event) => {
      if (event.clientX > 0 || event.clientY > 0) {
        lastPointerOrigin = {
          x: event.clientX,
          y: event.clientY,
          time: performance.now(),
        }
      }
    },
    { passive: true, capture: true }
  )
}

function resolveOrigin(origin?: TransitionOrigin): { x: number; y: number } {
  if (typeof origin?.x === "number" && typeof origin?.y === "number") {
    return { x: origin.x, y: origin.y }
  }
  if (lastPointerOrigin && performance.now() - lastPointerOrigin.time < 1000) {
    return { x: lastPointerOrigin.x, y: lastPointerOrigin.y }
  }
  if (typeof window !== "undefined") {
    return { x: window.innerWidth - 48, y: 32 }
  }
  return { x: 0, y: 0 }
}

function spawnWaveRing(x: number, y: number, maxRadius: number, toDark: boolean) {
  if (typeof document === "undefined") return
  const ring = document.createElement("div")
  ring.setAttribute("aria-hidden", "true")
  ring.className = "theme-transition-ring"
  ring.style.left = `${x}px`
  ring.style.top = `${y}px`
  ring.style.setProperty(
    "--theme-ring-color",
    toDark ? "oklch(0.72 0.15 244 / 0.42)" : "oklch(0.82 0.15 80 / 0.48)"
  )
  document.body.appendChild(ring)

  const animation = ring.animate(
    [
      {
        width: "0px",
        height: "0px",
        opacity: 0.95,
      },
      {
        width: `${maxRadius * 2}px`,
        height: `${maxRadius * 2}px`,
        opacity: 0,
      },
    ],
    {
      duration: 540,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "forwards",
    }
  )

  animation.finished.finally(() => {
    ring.remove()
  })
}

export function runThemeTransition(
  applyTheme: () => void,
  options?: {
    origin?: TransitionOrigin
    toDark?: boolean
  }
) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    applyTheme()
    return
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const docWithTransition = document as Document & {
    startViewTransition?: (callback: () => void) => {
      ready: Promise<void>
      finished: Promise<void>
    }
  }

  if (prefersReducedMotion || typeof docWithTransition.startViewTransition !== "function") {
    document.documentElement.classList.add("theme-color-transition")
    applyTheme()
    window.setTimeout(() => {
      document.documentElement.classList.remove("theme-color-transition")
    }, 360)
    return
  }

  const { x, y } = resolveOrigin(options?.origin)
  const maxRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  )

  const root = document.documentElement
  root.dataset.themeTransition = "active"

  const transition = docWithTransition.startViewTransition(() => {
    flushSync(() => {
      applyTheme()
    })
  })

  transition.ready
    .then(() => {
      const toDark = options?.toDark ?? root.classList.contains("dark")
      spawnWaveRing(x, y, maxRadius, toDark)

      root.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${Math.ceil(maxRadius)}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 520,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      )
    })
    .catch(() => {
      // Ignore aborted view transitions.
    })

  transition.finished.finally(() => {
    delete root.dataset.themeTransition
  })
}
