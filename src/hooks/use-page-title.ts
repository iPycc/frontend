import { useEffect } from "react"

const SUFFIX = " - Cloudrave"

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title + SUFFIX
  }, [title])
}
