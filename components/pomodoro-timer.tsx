"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Plus, X, Trash2, Briefcase, BookOpen, Heart, Sun, Clock, LogOut, ListTodo } from "lucide-react"
import useSWR from "swr"

type TimerMode = "pomodoro" | "shortBreak" | "longBreak"
type Priority = "low" | "medium" | "high"
type Category = "work" | "study" | "personal"
type Schedule = "today" | "later"
type ActiveTab = "today" | Category

interface Task {
  id: string
  title: string
  isCompleted: boolean
  targetMinutes?: number
  remainingMinutes?: number
  priority?: Priority
  category: Category
  schedule: Schedule
}

interface TotalTime {
  _id: string
  date: string
  minutes: number
}

const DURATIONS: Record<TimerMode, number> = {
  pomodoro:   50 * 60,
  shortBreak: 10 * 60,
  longBreak:  30 * 60,
}

const MODE_LABEL: Record<TimerMode, string> = {
  pomodoro:   "Deep Work",
  shortBreak: "Short Break",
  longBreak:  "Long Break",
}

const PRIORITY_DOT: Record<Priority, string> = {
  high:   "bg-red-400",
  medium: "bg-yellow-400",
  low:    "bg-green-400",
}

const TAB_LABEL: Record<ActiveTab, string> = {
  today: "Today", work: "Work", study: "Study", personal: "Personal",
}

const TAB_ICON: Record<ActiveTab, React.ReactNode> = {
  today:    <Sun       className="w-4 h-4" />,
  work:     <Briefcase className="w-4 h-4" />,
  study:    <BookOpen  className="w-4 h-4" />,
  personal: <Heart     className="w-4 h-4" />,
}

const TAB_ACTIVE: Record<ActiveTab, string> = {
  today:    "bg-amber-500/20 text-amber-300 border-amber-400/50",
  work:     "bg-blue-500/20 text-blue-300 border-blue-400/50",
  study:    "bg-purple-500/20 text-purple-300 border-purple-400/50",
  personal: "bg-pink-500/20 text-pink-300 border-pink-400/50",
}

const CAT_CHIP: Record<Category, string> = {
  work:     "bg-blue-500/20 text-blue-300 border-blue-400/30",
  study:    "bg-purple-500/20 text-purple-300 border-purple-400/30",
  personal: "bg-pink-500/20 text-pink-300 border-pink-400/30",
}

const CAT_ICON: Record<Category, React.ReactNode> = {
  work:     <Briefcase className="w-3.5 h-3.5" />,
  study:    <BookOpen  className="w-3.5 h-3.5" />,
  personal: <Heart     className="w-3.5 h-3.5" />,
}

const CAT_ACCENT: Record<Category, string> = {
  work:     "border-blue-400/50 bg-blue-500/10",
  study:    "border-purple-400/50 bg-purple-500/10",
  personal: "border-pink-400/50 bg-pink-500/10",
}

const fmtTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

const fmtMins = (m = 0) => {
  const mm = Math.max(0, Math.round(m))
  const h = Math.floor(mm / 60), r = mm % 60
  if (h === 0) return `${r}m`
  if (r === 0) return `${h}h`
  return `${h}h ${r}m`
}

const fmtFocus = (m = 0) => {
  const mm = Math.max(0, Math.round(m))
  return `${Math.floor(mm / 60)}.${String(mm % 60).padStart(2, "0")}h`
}

export function PomodoroTimer({ username }: { username: string }) {
  const router = useRouter()
  const [mode,            setMode]            = useState<TimerMode>("pomodoro")
  const [timeLeft,        setTimeLeft]        = useState(DURATIONS.pomodoro)
  const [isRunning,       setIsRunning]       = useState(false)
  const [activeTab,       setActiveTab]       = useState<ActiveTab>("today")
  const [selectedTaskId,  setSelectedTaskId]  = useState<string | null>(null)
  const [isAddingTask,    setIsAddingTask]    = useState(false)
  const [newTitle,        setNewTitle]        = useState("")
  const [newHours,        setNewHours]        = useState(1)
  const [newPriority,     setNewPriority]     = useState<Priority>("medium")
  const [newSchedule,     setNewSchedule]     = useState<Schedule>("today")
  const [newCategory,     setNewCategory]     = useState<Category>("work")
  const [dailyMinutes,    setDailyMinutes]    = useState(0)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showProfile,     setShowProfile]     = useState(false)
  const [showModeMenu,    setShowModeMenu]    = useState(false)

  const audioRef   = useRef<HTMLAudioElement | null>(null)
  const endTimeRef = useRef<number | null>(null)

  const fetcher = useCallback((url: string) => fetch(url).then(r => r.json()), [])
  const { data: tasks = [], mutate }              = useSWR<Task[]>("/api/tasks", fetcher, { fallbackData: [] })
  const { data: totalTime, mutate: mutateTotalTime } = useSWR<TotalTime>("/api/totalTime", fetcher)

  useEffect(() => { if (totalTime) setDailyMinutes(totalTime.minutes) }, [totalTime])

  const tabTasks = useCallback((tab: ActiveTab) => {
    if (tab === "today") return tasks.filter(t => t.schedule === "today")
    return tasks.filter(t => t.category === (tab as Category))
  }, [tasks])

  const displayTasks  = tabTasks(activeTab)
  const selectedTask  = tasks.find(t => t.id === selectedTaskId)
  const totalDuration = DURATIONS[mode]
  const R = 168, STROKE = 7, CIRC = 2 * Math.PI * R
  const ringOffset = CIRC * (timeLeft / totalDuration)

  // ── timer ──────────────────────────────────────────────────────────────────
  const handleModeChange = useCallback((m: TimerMode) => {
    setMode(m); setTimeLeft(DURATIONS[m]); setIsRunning(false)
  }, [])

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      setTimeLeft(Math.ceil(Math.max(0, (endTimeRef.current ?? Date.now()) - Date.now()) / 1000))
      endTimeRef.current = null
      setIsRunning(false)
    } else {
      endTimeRef.current = Date.now() + timeLeft * 1000
      setIsRunning(true)
    }
  }, [isRunning, timeLeft])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLSelectElement)) {
        e.preventDefault(); toggleTimer()
      }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [toggleTimer])

  const addToRemaining = useCallback(async () => {
    if (!selectedTaskId) return
    const mins = Math.round(DURATIONS.pomodoro / 60)
    const cur  = tasks.find(t => t.id === selectedTaskId)
    if (!cur) return
    const next = (cur.remainingMinutes ?? 0) + mins
    await mutate(async () => {
      await fetch(`/api/tasks/${selectedTaskId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remainingMinutes: next }),
      })
      return tasks.map(t => t.id === selectedTaskId ? { ...t, remainingMinutes: next } : t)
    }, { optimisticData: tasks.map(t => t.id === selectedTaskId ? { ...t, remainingMinutes: next } : t), revalidate: true })
    await fetch("/api/totalTime", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ minutes: mins }) })
    setDailyMinutes(p => p + mins)
    mutateTotalTime()
  }, [selectedTaskId, tasks, mutate, mutateTotalTime])

  const playAlarm = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    let n = 0
    const go = () => {
      el.currentTime = 0; void el.play().catch(() => {})
      n++; if (n < 3) el.onended = go; else el.onended = null
    }
    go()
    navigator.vibrate?.(200)
    if (Notification.permission === "granted") new Notification("Session done!", { body: "Take a break" })
  }, [])

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      if (!endTimeRef.current) return
      const msLeft = endTimeRef.current - Date.now()
      const next   = Math.max(0, Math.ceil(msLeft / 1000))
      setTimeLeft(p => p !== next ? next : p)
      if (msLeft <= 0) {
        clearInterval(id); endTimeRef.current = null; setIsRunning(false); playAlarm()
        if (mode === "pomodoro") { void addToRemaining(); handleModeChange("shortBreak") }
        else handleModeChange("pomodoro")
      }
    }, 500)
    return () => clearInterval(id)
  }, [isRunning, mode, playAlarm, addToRemaining, handleModeChange])

  useEffect(() => {
    document.title = isRunning ? `${fmtTime(timeLeft)} — ${MODE_LABEL[mode]}` : "DeepWork"
  }, [timeLeft, isRunning, mode])

  // ── mutations ──────────────────────────────────────────────────────────────
  const patchTask = useCallback(async (id: string, patch: object) => {
    const opt = tasks.map(t => t.id === id ? { ...t, ...patch } : t)
    await mutate(async () => {
      await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) })
      return opt
    }, { optimisticData: opt, revalidate: true })
  }, [tasks, mutate])

  const toggleTask     = (id: string) => { const t = tasks.find(t => t.id === id); if (t) patchTask(id, { isCompleted: !t.isCompleted }) }
  const toggleSchedule = (id: string) => { const t = tasks.find(t => t.id === id); if (t) patchTask(id, { schedule: t.schedule === "today" ? "later" : "today" }) }

  const addTask = async () => {
    if (!newTitle.trim()) return
    const category: Category = activeTab === "today" ? newCategory : (activeTab as Category)
    const schedule: Schedule = activeTab === "today" ? "today" : newSchedule
    const targetMinutes      = Math.max(0, Math.round((newHours || 1) * 60))
    const optimistic: Task   = {
      id: `temp-${Date.now()}`, title: newTitle.trim(), isCompleted: false,
      targetMinutes, remainingMinutes: 0, priority: newPriority, category, schedule,
    }
    setNewTitle(""); setNewHours(1); setNewPriority("medium"); setNewSchedule("today"); setIsAddingTask(false)
    await mutate(async () => {
      const res     = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: optimistic.title, targetHours: newHours, priority: newPriority, category, schedule }) })
      const created = await res.json()
      return [...tasks.filter(t => !t.id.startsWith("temp-")), created]
    }, { optimisticData: [...tasks, optimistic], revalidate: true })
  }

  const deleteTask = async (id: string) => {
    setConfirmDeleteId(null)
    if (selectedTaskId === id) setSelectedTaskId(null)
    const next = tasks.filter(t => t.id !== id)
    await mutate(async () => { await fetch(`/api/tasks/${id}`, { method: "DELETE" }); return next }, { optimisticData: next, revalidate: true })
  }

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="hills min-h-screen flex flex-col text-foreground">
      <audio ref={audioRef} src="/sounds/alarm.mp3" preload="auto" aria-hidden="true" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/8">
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/25 to-black/40 backdrop-blur-xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

          {/* Profile + Tasks */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowProfile(p => !p)}
                className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full bg-primary/90 flex items-center justify-center text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 ring-2 ring-primary/30">
                  {username[0].toUpperCase()}
                </div>
                <span className="text-sm text-foreground/70 font-medium hidden sm:block">{username}</span>
              </button>

              {showProfile && (
                <div className="absolute top-12 left-0 w-60 glass rounded-2xl p-5 flex flex-col gap-4 z-50">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/80 flex items-center justify-center text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20">
                      {username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{username}</p>
                      <p className="text-xs text-foreground/40 mt-0.5">DeepWork</p>
                    </div>
                  </div>
                  <div className="h-px bg-white/8" />
                  <div>
                    <p className="text-xs text-foreground/40 mb-1">Today&apos;s focus</p>
                    <p className="text-2xl font-bold text-primary">{fmtFocus(dailyMinutes)}</p>
                  </div>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 text-sm text-foreground/50 hover:text-destructive transition-colors group"
                  >
                    <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    Sign out
                  </button>
                </div>
              )}
            </div>

            {/* Tasks — navigates to dedicated tasks page */}
            <button
              onClick={() => router.push("/tasks")}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all border bg-white/6 text-foreground/60 border-white/10 hover:text-foreground/85 hover:bg-white/10"
            >
              <ListTodo className="w-4 h-4" />
              <span className="hidden sm:block">Tasks</span>
            </button>
          </div>

          {/* Brand */}
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-primary/90 via-foreground to-primary/90">
              DeepWork
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-foreground/30 -mt-0.5 hidden sm:block">Focus · Flow · Finish</span>
          </div>

          {/* Today */}
          <div className="text-right">
            <p className="text-xs text-foreground/35 leading-none mb-0.5 tracking-wide uppercase">Today</p>
            <p className="text-sm font-bold text-primary">{fmtFocus(dailyMinutes)}</p>
          </div>
        </div>
      </header>

      {(showProfile || showModeMenu) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowProfile(false); setShowModeMenu(false) }} />
      )}

      {/* Body */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 gap-4">

        {/* LEFT — Timer sticky on desktop */}
        <div className="w-full lg:w-[36%] lg:sticky lg:top-14 lg:self-start lg:h-[calc(100vh-56px)] flex flex-col gap-3 lg:py-2">

          {/* Outer rounded container */}
          <div className="border border-white/8 rounded-[2.5rem] bg-black/20 backdrop-blur-sm p-4 flex flex-col gap-3 lg:flex-1">

          {/* Timer card */}
          <div className="bg-white/3 rounded-2xl px-6 py-8 flex flex-col items-center text-center border border-white/5 relative">

            {/* Ring + clock */}
            <div className="relative flex items-center justify-center mb-6" style={{ width: 360, height: 360 }}>
              <svg width={360} height={360} style={{ position: "absolute", transform: "rotate(-90deg)" }}>
                <defs>
                  <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <circle cx={180} cy={180} r={R} fill="none" stroke="currentColor" strokeWidth={STROKE} className="text-white/8" />
                <circle
                  cx={180} cy={180} r={R}
                  fill="none" stroke="url(#ringGradient)" strokeWidth={STROKE}
                  strokeDasharray={CIRC} strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                  style={{ filter: "drop-shadow(0 0 8px var(--color-primary))" }}
                />
              </svg>

              <div className="relative z-10 flex flex-col items-center gap-3">
                <span className="text-7xl font-bold font-mono tabular-nums tracking-tighter text-foreground">
                  {fmtTime(timeLeft)}
                </span>

                {/* Mode dropdown trigger */}
                <div className="relative">
                  <button
                    onClick={() => setShowModeMenu(p => !p)}
                    className="flex items-center gap-1.5 text-sm text-foreground/60 hover:text-foreground/90 transition-colors"
                  >
                    {MODE_LABEL[mode]}
                    <svg width="12" height="12" viewBox="0 0 12 12" className={["transition-transform", showModeMenu ? "rotate-180" : ""].join(" ")}>
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {showModeMenu && (
                    <div className="absolute top-7 left-1/2 -translate-x-1/2 w-40 glass rounded-2xl p-1.5 flex flex-col gap-0.5 z-50">
                      {(["pomodoro", "shortBreak", "longBreak"] as TimerMode[]).map(m => (
                        <button
                          key={m}
                          onClick={() => { handleModeChange(m); setShowModeMenu(false) }}
                          className={[
                            "px-3 py-2 rounded-xl text-sm font-medium text-left transition-colors",
                            mode === m ? "bg-primary/20 text-primary" : "text-foreground/60 hover:bg-white/6 hover:text-foreground/90",
                          ].join(" ")}
                        >
                          {MODE_LABEL[m]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Circular play / pause button */}
                <button
                  onClick={toggleTimer}
                  className="mt-2 w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg"
                  style={{
                    background: "color-mix(in oklab, var(--color-primary) 22%, transparent)",
                    border: "1px solid color-mix(in oklab, var(--color-primary) 45%, transparent)",
                  }}
                >
                  {isRunning ? (
                    <svg width="26" height="26" viewBox="0 0 22 22" fill="none">
                      <rect x="5" y="4" width="4" height="14" rx="1.5" fill="var(--color-foreground)" />
                      <rect x="13" y="4" width="4" height="14" rx="1.5" fill="var(--color-foreground)" />
                    </svg>
                  ) : (
                    <svg width="26" height="26" viewBox="0 0 22 22" fill="none">
                      <path d="M5 3.5v15l13-7.5z" fill="var(--color-foreground)" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <p className="text-foreground/25 text-xs">Space to toggle</p>
          </div>

          {/* Active task */}
          {selectedTask ? (
            <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className={["w-2 h-2 rounded-full shrink-0", PRIORITY_DOT[selectedTask.priority ?? "medium"]].join(" ")} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground/40 mb-0.5">Working on</p>
                <p className="text-sm font-semibold text-primary truncate">{selectedTask.title}</p>
              </div>
              <button onClick={() => setSelectedTaskId(null)} className="text-foreground/30 hover:text-foreground/60 shrink-0 p-1 rounded-lg hover:bg-white/8 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="glass border-2 border-dashed border-border/30 rounded-2xl px-4 py-3 text-center">
              <p className="text-xs text-foreground/30">Tap a task on the right to track it</p>
            </div>
          )}
          </div>{/* end outer rounded container */}
        </div>

        {/* MIDDLE — Today's stats */}
        <div className="w-full lg:w-[22%] flex flex-col lg:py-2">
          <div className="glass rounded-3xl px-5 py-5 flex flex-col items-center gap-4 lg:flex-1">

            {(() => {
              const todayList   = tabTasks("today")
              const doneCount   = todayList.filter(t => t.isCompleted).length
              const totalCount  = todayList.length
              const totalHours  = todayList.reduce((sum: number, t: Task) => sum + (t.targetMinutes ?? 60) / 60, 0)
              const cap         = 6
              const pct         = Math.min(1, totalHours / cap)
              const over        = totalHours > cap
              const percentDisp = Math.round(pct * 100)
              const remainMin   = Math.max(0, cap * 60 - totalHours * 60)
              const sessionsLeft = over ? 0 : Math.ceil(remainMin / 50)

              const ringR = 64, ringStroke = 10, ringCirc = 2 * Math.PI * ringR
              const ringOffset2 = ringCirc * (1 - pct)

              return (
                <>
                  {/* Header */}
                  <div className="text-center">
                    <h3 className="text-base font-semibold text-foreground">Today&apos;s</h3>
                    <p className="text-xs font-medium text-emerald-400 mt-0.5">{doneCount}/{totalCount} Done</p>
                  </div>

                  {/* Focus time */}
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary leading-tight">{fmtMins(dailyMinutes)}</p>
                    <p className="text-xs text-foreground/35 mt-0.5">Focus Time</p>
                  </div>

                  {/* Capacity ring */}
                  <div className="relative flex items-center justify-center" style={{ width: 148, height: 148 }}>
                    <svg width={148} height={148} style={{ position: "absolute", transform: "rotate(-90deg)" }}>
                      <circle cx={74} cy={74} r={ringR} fill="none" stroke="currentColor" strokeWidth={ringStroke} className="text-white/8" />
                      <circle
                        cx={74} cy={74} r={ringR}
                        fill="none" stroke="currentColor" strokeWidth={ringStroke}
                        strokeDasharray={ringCirc} strokeDashoffset={ringOffset2}
                        strokeLinecap="round"
                        className={["transition-all duration-700", over ? "text-red-400" : "text-primary"].join(" ")}
                      />
                    </svg>
                    <span className={["relative z-10 text-2xl font-bold", over ? "text-red-300" : "text-foreground"].join(" ")}>
                      {percentDisp}%
                    </span>
                  </div>

                  {/* Sessions left / over capacity chip */}
                  {over ? (
                    <div className="bg-red-500/10 border border-red-400/30 rounded-2xl px-4 py-2.5 text-center w-full">
                      <p className="text-xs font-semibold text-red-300">Over capacity</p>
                    </div>
                  ) : (
                    <div className="bg-white/4 border border-white/10 rounded-2xl px-4 py-2.5 text-center w-full">
                      <p className="text-lg font-bold text-foreground leading-tight">{sessionsLeft}</p>
                      <p className="text-xs text-foreground/35">Session{sessionsLeft === 1 ? "" : "s"} Left</p>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>

        {/* RIGHT — Tasks (simplified) */}
        <div className="w-full lg:flex-1 flex flex-col gap-2.5 min-w-0 lg:py-2">

          <div className="glass rounded-3xl flex flex-col overflow-hidden lg:flex-1 lg:min-h-0">

            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <h2 className="font-semibold text-foreground text-base">Today&apos;s Tasks</h2>
              <button
                onClick={() => router.push("/tasks")}
                className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
              >
                View all
              </button>
            </div>

            {/* Add form */}
            {isAddingTask && (
              <div className="px-5 py-4 border-b border-border/30 bg-black/15 space-y-3">
                <Input
                  value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="What are you working on?"
                  onKeyDown={e => { if (e.key === "Enter") addTask(); if (e.key === "Escape") setIsAddingTask(false) }}
                  autoFocus className="bg-black/20 border-border/60"
                />
                <div className="flex gap-2 flex-wrap items-center">
                  <Input type="number" min={0.25} step={0.25} value={newHours} onChange={e => setNewHours(Number(e.target.value))} className="w-20 text-sm bg-black/20 border-border/60" placeholder="hrs" />
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)} className="border border-border/60 rounded-lg px-2 py-1.5 text-xs bg-background text-foreground">
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value as Category)} className="border border-border/60 rounded-lg px-2 py-1.5 text-xs bg-background text-foreground">
                    <option value="work">💼 Work</option>
                    <option value="study">📖 Study</option>
                    <option value="personal">🩷 Personal</option>
                  </select>
                  <div className="flex gap-1.5 ml-auto">
                    <button onClick={addTask} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-semibold hover:brightness-110 transition">Add</button>
                    <button onClick={() => setIsAddingTask(false)} className="text-foreground/50 hover:text-foreground border border-border/40 p-1.5 rounded-lg transition"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            )}

            {/* Task list — simplified, no progress bars */}
            <div className="px-3 py-2.5 space-y-1 flex-1 lg:overflow-y-auto no-scrollbar">
              {displayTasks.length === 0 && !isAddingTask && (
                <div className="flex flex-col items-center justify-center py-16 text-foreground/20">
                  <p className="text-4xl mb-2">✓</p>
                  <p className="text-sm">Nothing here yet</p>
                </div>
              )}

              {[...displayTasks.filter(t => !t.isCompleted), ...displayTasks.filter(t => t.isCompleted)].map(task => {
                const isSelected = selectedTaskId === task.id
                const isConfirm  = confirmDeleteId === task.id
                const catTextColor = task.category === "work" ? "text-blue-300" : task.category === "study" ? "text-purple-300" : "text-pink-300"

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
                    className={[
                      "flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all",
                      isSelected ? CAT_ACCENT[task.category] + " border" : "hover:bg-white/5 border border-transparent",
                      task.isCompleted ? "opacity-40" : "",
                    ].join(" ")}
                  >
                    <Checkbox
                      checked={task.isCompleted}
                      onClick={e => e.stopPropagation()}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary border-2 border-foreground/50 shrink-0"
                    />
                    <span className={["flex-1 text-sm min-w-0 truncate font-medium", task.isCompleted ? "line-through text-foreground/40" : "text-foreground"].join(" ")}>
                      {task.title}
                    </span>
                    <span className={["text-xs font-medium shrink-0", catTextColor].join(" ")}>
                      {TAB_LABEL[task.category]}
                    </span>
                    {isConfirm ? (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={e => { e.stopPropagation(); deleteTask(task.id) }} className="text-xs px-2 py-1 rounded-lg bg-destructive text-white hover:brightness-110 font-semibold">Yes</button>
                        <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(null) }} className="text-xs px-2 py-1 rounded-lg border border-border text-foreground/50 hover:text-foreground">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(task.id) }}
                        className="p-1 rounded-lg text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Bottom Add Task bar */}
            <div className="px-5 py-3 border-t border-border/30 flex justify-end">
              <button
                onClick={() => { setIsAddingTask(true); setNewTitle(""); setNewHours(1); setNewPriority("medium"); setNewSchedule("today"); setNewCategory("work") }}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:brightness-110 rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/8 mt-auto">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <span className="text-xs text-foreground/25 tracking-wide">© {new Date().getFullYear()} DeepWork</span>
          <span className="text-xs text-foreground/20">Made with ❤️ for Doyel</span>
          <span className="text-xs text-foreground/25 tracking-widest uppercase">Stay focused.</span>
        </div>
      </footer>
    </div>
  )
}
