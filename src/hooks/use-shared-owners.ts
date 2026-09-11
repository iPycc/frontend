import { useEffect, useRef, useState } from "react"
import { getSharedOwners, SHARED_CHANGED_EVENT, type SharedOwnerSummary } from "@/api/shared"

const MAX_AGE = 60_000

// The cache lives with the sidebar, never in storage or across authenticated users.
export function useSharedOwners(userId: string | null) {
  const [snapshot, setSnapshot] = useState<{
    userId: string | null; owners: SharedOwnerSummary[]; loading: boolean; error: boolean
  }>({ userId: null, owners: [], loading: false, error: false })
  const retryRef = useRef<() => void>(() => {})

  useEffect(() => {
    setSnapshot({ userId, owners: [], loading: userId !== null, error: false })
    if (userId === null) return
    let disposed = false
    let pending = false
    let invalidated = false
    let updatedAt = 0
    const controller = new AbortController()
    const refresh = async (force = false) => {
      if (disposed) return
      if (pending) {
        if (force) invalidated = true
        return
      }
      if (!force && Date.now() - updatedAt < MAX_AGE) return
      pending = true
      setSnapshot((value) => ({ ...value, loading: true }))
      try {
        const owners = await getSharedOwners(controller.signal)
        if (!disposed) {
          updatedAt = Date.now()
          setSnapshot({ userId, owners, loading: false, error: false })
        }
      } catch {
        if (!disposed) setSnapshot((value) => ({ ...value, loading: false, error: true }))
      } finally {
        pending = false
        if (!disposed && invalidated) {
          invalidated = false
          void refresh(true)
        }
      }
    }
    const onFocus = () => { if (document.visibilityState === "visible") void refresh() }
    const onChanged = () => { void refresh(true) }
    retryRef.current = onChanged
    void refresh()
    const timer = window.setInterval(onFocus, MAX_AGE)
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    window.addEventListener(SHARED_CHANGED_EVENT, onChanged)
    return () => {
      disposed = true
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
      window.removeEventListener(SHARED_CHANGED_EVENT, onChanged)
      retryRef.current = () => {}
    }
  }, [userId])

  const current = snapshot.userId === userId
  return {
    owners: current ? snapshot.owners : [],
    loading: current ? snapshot.loading : userId !== null,
    error: current && snapshot.error,
    retry: () => retryRef.current(),
  }
}
