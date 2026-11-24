export function publishPopupResult<T extends object>(message: T, channelName: string, storageKey: string) {
  try {
    window.opener?.postMessage(message, window.location.origin)
  } catch {
    // COOP can sever the opener; the other same-origin channels still work.
  }

  if (typeof window.BroadcastChannel !== "undefined") {
    const channel = new window.BroadcastChannel(channelName)
    channel.postMessage(message)
    channel.close()
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ ...message, timestamp: Date.now() }))
    window.localStorage.removeItem(storageKey)
  } catch {
    // The other channels remain available when storage is blocked.
  }
}

export function subscribePopupResults<T>(
  channelName: string,
  storageKey: string,
  getPopup: () => Window | null,
  isMessage: (data: unknown) => data is T,
  handler: (message: T) => void
) {
  const deliver = (data: unknown) => {
    if (getPopup() && isMessage(data)) handler(data)
  }
  const handleWindowMessage = (event: MessageEvent<unknown>) => {
    if (event.origin === window.location.origin && event.source === getPopup()) deliver(event.data)
  }
  const channel = typeof window.BroadcastChannel !== "undefined"
    ? new window.BroadcastChannel(channelName)
    : null
  const handleChannelMessage = (event: MessageEvent<unknown>) => deliver(event.data)
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== storageKey || !event.newValue) return
    try {
      deliver(JSON.parse(event.newValue))
    } catch {
      // Ignore malformed cross-window data.
    }
  }

  window.addEventListener("message", handleWindowMessage)
  window.addEventListener("storage", handleStorage)
  channel?.addEventListener("message", handleChannelMessage)
  return () => {
    window.removeEventListener("message", handleWindowMessage)
    window.removeEventListener("storage", handleStorage)
    channel?.close()
  }
}
