"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, ListTodo, LogOut, Target } from "lucide-react"
import useSWR from "swr"

type ActivePage = "focus" | "tasks" | "report"

interface TotalTime {
  minutes: number
}

const fmtFocus = (m = 0) => {
  const mm = Math.max(0, Math.round(m))
  return `${Math.floor(mm / 60)}.${String(mm % 60).padStart(2, "0")}h`
}

export function AppHeader({ activePage, focusMinutes, username }: { activePage: ActivePage; focusMinutes?: number; username: string }) {
  const router = useRouter()
  const [showProfile, setShowProfile] = useState(false)

  const fetcher = useCallback((url: string) => fetch(url).then(r => r.json()), [])
  const { data: totalTime } = useSWR<TotalTime>(focusMinutes === undefined ? "/api/totalTime" : null, fetcher)
  const displayedFocus = focusMinutes ?? totalTime?.minutes ?? 0

  useEffect(() => {
    if (!showProfile) return

    const closeProfile = () => setShowProfile(false)
    const closeProfileOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeProfile()
    }

    document.addEventListener("click", closeProfile)
    document.addEventListener("keydown", closeProfileOnEscape)
    return () => {
      document.removeEventListener("click", closeProfile)
      document.removeEventListener("keydown", closeProfileOnEscape)
    }
  }, [showProfile])

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  const navItem = (active: boolean) => [
    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm border border-transparent transition-all",
    active
      ? "border-primary/20 bg-primary/10 text-primary font-semibold shadow-[0_0_18px_rgba(207,236,245,0.12)]"
      : "text-foreground/60 hover:text-foreground/90 hover:bg-white/6 font-medium",
  ].join(" ")

  const profileActive = showProfile

  return (
    <header className="sticky top-0 z-30 shadow-[0_14px_38px_rgba(0,0,0,0.2)]">
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/25 to-black/40 backdrop-blur-xl" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center">
        <div className="flex items-center gap-1 rounded-full bg-black/12 p-1">
          <button type="button" onClick={() => router.push("/")} className={navItem(activePage === "focus")}>
            <Target className="w-4 h-4" />
            <span className="hidden sm:block">DeepWork</span>
          </button>

          <button type="button" onClick={() => router.push("/tasks")} className={navItem(activePage === "tasks")}>
            <ListTodo className="w-4 h-4" />
            <span className="hidden sm:block">Tasks</span>
          </button>

          <button type="button" onClick={() => router.push("/report")} className={navItem(activePage === "report")}>
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:block">Report</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={event => { event.stopPropagation(); setShowProfile(p => !p) }}
              className={[
                "flex items-center gap-2 rounded-full border border-transparent pl-1.5 pr-3 py-1 transition-all",
                profileActive
                  ? "border-primary/20 bg-primary/10 text-primary shadow-[0_0_18px_rgba(207,236,245,0.12)]"
                  : "text-foreground/60 hover:text-foreground/90 hover:bg-white/6",
              ].join(" ")}
            >
              <div className="w-6 h-6 rounded-full bg-primary/90 flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                {username[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium hidden sm:block">{username}</span>
            </button>

            {showProfile && (
              <div onClick={event => event.stopPropagation()} className="absolute top-12 left-0 w-60 glass rounded-2xl p-5 flex flex-col gap-4 z-50">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/80 flex items-center justify-center text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20">
                    {username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{username}</p>
                    <p className="text-xs text-foreground/50 mt-0.5">DeepWork</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-foreground/50 mb-1">Today&apos;s focus</p>
                  <p className="text-2xl font-bold text-primary">{fmtFocus(displayedFocus)}</p>
                </div>
                <button onClick={signOut} className="flex items-center gap-2 text-sm text-foreground/55 hover:text-destructive transition-colors group">
                  <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
