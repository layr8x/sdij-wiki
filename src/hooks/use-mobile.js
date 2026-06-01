import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // 초기값을 lazy initializer 로 1회 측정 → effect 본문 setState 제거
  // (react-hooks/set-state-in-effect 준수, 첫 렌더 깜빡임도 방지)
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
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
