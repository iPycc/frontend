/**
 * 全局按压涟漪反馈。
 *
 * 用法:给任何可点击元素加 `data-ripple` 属性(并确保它有
 * `relative overflow-hidden` 类来裁剪波纹),即可在按下时
 * 从点击位置扩散一个圆形波纹。键盘 Enter/Space 触发时波纹从中心扩散。
 *
 * 通过 document 捕获阶段的事件委托实现,无需在每个组件里接线。
 */

const RIPPLE_ATTR = "data-ripple"
const DISABLED_SELECTOR = "[disabled], [data-disabled], [aria-disabled='true']"

const preparedHosts = new WeakSet<HTMLElement>()

function prepareHost(host: HTMLElement) {
  if (preparedHosts.has(host)) return
  preparedHosts.add(host)
  if (getComputedStyle(host).position === "static") {
    host.style.position = "relative"
  }
}

function spawnRipple(host: HTMLElement, clientX: number, clientY: number) {
  const rect = host.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return

  // 半径取点击点到最远边角的距离,保证波纹完全覆盖宿主
  const radius = Math.hypot(
    Math.max(clientX - rect.left, rect.right - clientX),
    Math.max(clientY - rect.top, rect.bottom - clientY),
  )
  const diameter = Math.max(radius * 2, 12)

  const ink = document.createElement("span")
  ink.className = "ripple-ink"
  ink.style.width = `${diameter}px`
  ink.style.height = `${diameter}px`
  ink.style.left = `${clientX - rect.left - diameter / 2}px`
  ink.style.top = `${clientY - rect.top - diameter / 2}px`

  const cleanup = () => ink.remove()
  ink.addEventListener("animationend", cleanup, { once: true })
  setTimeout(cleanup, 900)

  host.appendChild(ink)
}

function resolveHost(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null
  const host = target.closest(`[${RIPPLE_ATTR}]`)
  if (!(host instanceof HTMLElement)) return null
  if (host.matches(DISABLED_SELECTOR)) return null
  return host
}

export function attachGlobalRipple() {
  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    const host = resolveHost(event.target)
    if (!host) return
    prepareHost(host)
    spawnRipple(host, event.clientX, event.clientY)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return
    const host = resolveHost(event.target)
    if (!host) return
    prepareHost(host)
    const rect = host.getBoundingClientRect()
    spawnRipple(host, rect.left + rect.width / 2, rect.top + rect.height / 2)
  }

  // 捕获阶段:即使内部处理器 stopPropagation 也能即时反馈
  document.addEventListener("pointerdown", handlePointerDown, true)
  document.addEventListener("keydown", handleKeyDown, true)

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown, true)
    document.removeEventListener("keydown", handleKeyDown, true)
  }
}
