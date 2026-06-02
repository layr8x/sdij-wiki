import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // 초기값은 마운트 시 1회 계산 (effect 내 setState 회피 — react-hooks/set-state-in-effect)
  const [isMobile, setIsMobile] = React.useState(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isMobile
}
