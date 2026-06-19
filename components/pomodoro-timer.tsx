"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { AppHeader } from "@/components/app-header"
import { AppBrand } from "@/components/app-brand"
import { Plus, X, Trash2, Briefcase, BookOpen, Heart, Sun, Clock, MoreVertical, CheckCircle2 } from "lucide-react"
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

const ALARM_SOUND_SRC = "/sounds/deep-chime.wav"

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
  today:    "bg-amber-500/20 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.12)]",
  work:     "bg-blue-500/20 text-blue-300 shadow-[0_0_20px_rgba(96,165,250,0.12)]",
  study:    "bg-purple-500/20 text-purple-300 shadow-[0_0_20px_rgba(192,132,252,0.12)]",
  personal: "bg-pink-500/20 text-pink-300 shadow-[0_0_20px_rgba(244,114,182,0.12)]",
}

const CAT_CHIP: Record<Category, string> = {
  work:     "bg-blue-500/20 text-blue-300",
  study:    "bg-purple-500/20 text-purple-300",
  personal: "bg-pink-500/20 text-pink-300",
}

const CAT_ICON: Record<Category, React.ReactNode> = {
  work:     <Briefcase className="w-3.5 h-3.5" />,
  study:    <BookOpen  className="w-3.5 h-3.5" />,
  personal: <Heart     className="w-3.5 h-3.5" />,
}

const CAT_ACCENT: Record<Category, string> = {
  work:     "bg-blue-500/10 shadow-[inset_3px_0_0_rgba(96,165,250,0.65)]",
  study:    "bg-purple-500/10 shadow-[inset_3px_0_0_rgba(192,132,252,0.65)]",
  personal: "bg-pink-500/10 shadow-[inset_3px_0_0_rgba(244,114,182,0.65)]",
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
  const [openMenuId,      setOpenMenuId]      = useState<string | null>(null)
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
  const R = 154, STROKE = 6, CIRC = 2 * Math.PI * R
  const ringOffset = CIRC * (timeLeft / totalDuration)
  const todayTasks = tabTasks("today")
  const openTodayTasks = todayTasks.filter(t => !t.isCompleted)
  const doneTodayTasks = todayTasks.filter(t => t.isCompleted)
  const dailyGoalMinutes = 50 * 6
  const sessionsDone = Math.min(6, Math.floor(dailyMinutes / 50))
  const plannedCapacityMinutes = 6 * 60
  const plannedTodayMinutes = todayTasks.reduce((sum, task) => sum + (task.targetMinutes ?? 60), 0)
  const nextTask = selectedTask ?? openTodayTasks[0]

  // ── timer ──────────────────────────────────────────────────────────────────
  const handleModeChange = useCallback((m: TimerMode) => {
    const nextDuration = DURATIONS[m]

    setShowModeMenu(false)
    endTimeRef.current = null
    setIsRunning(false)
    setMode(m)
    setTimeLeft(nextDuration)
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

  const playAlarm = useCallback((completedMode: TimerMode) => {
    const source = audioRef.current
    const playChime = (delay: number) => {
      window.setTimeout(() => {
        const el = source ? source.cloneNode(true) as HTMLAudioElement : new Audio(ALARM_SOUND_SRC)
        el.volume = 0.92
        el.currentTime = 0
        void el.play().catch(() => {})
      }, delay)
    }

    playChime(0)
    playChime(1400)
    navigator.vibrate?.([180, 80, 180])

    if (Notification.permission === "granted") {
      new Notification(`${MODE_LABEL[completedMode]} done!`, {
        body: completedMode === "pomodoro" ? "Take a mindful break." : "Your break is complete.",
      })
    }
  }, [])

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      if (!endTimeRef.current) return
      const msLeft = endTimeRef.current - Date.now()
      const next   = Math.max(0, Math.ceil(msLeft / 1000))
      setTimeLeft(p => p !== next ? next : p)
      if (msLeft <= 0) {
        clearInterval(id); endTimeRef.current = null; setIsRunning(false); playAlarm(mode)
        if (mode === "pomodoro") { void addToRemaining(); handleModeChange("shortBreak") }
        else handleModeChange("pomodoro")
      }
    }, 500)
    return () => clearInterval(id)
  }, [isRunning, mode, playAlarm, addToRemaining, handleModeChange])

  useEffect(() => {
    document.title = isRunning ? `${fmtTime(timeLeft)} — ${MODE_LABEL[mode]}` : "DeepWork"
  }, [timeLeft, isRunning, mode])

  useEffect(() => {
    if (!openMenuId) return

    const closeMenu = () => setOpenMenuId(null)
    const closeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu()
    }

    document.addEventListener("click", closeMenu)
    document.addEventListener("keydown", closeMenuOnEscape)
    return () => {
      document.removeEventListener("click", closeMenu)
      document.removeEventListener("keydown", closeMenuOnEscape)
    }
  }, [openMenuId])

  useEffect(() => {
    if (!showModeMenu) return

    const closeModeMenu = () => setShowModeMenu(false)
    const closeModeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModeMenu()
    }

    document.addEventListener("click", closeModeMenu)
    document.addEventListener("keydown", closeModeMenuOnEscape)
    return () => {
      document.removeEventListener("click", closeModeMenu)
      document.removeEventListener("keydown", closeModeMenuOnEscape)
    }
  }, [showModeMenu])

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
    if (selectedTaskId === id) setSelectedTaskId(null)
    const next = tasks.filter(t => t.id !== id)
    await mutate(async () => { await fetch(`/api/tasks/${id}`, { method: "DELETE" }); return next }, { optimisticData: next, revalidate: true })
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="hills min-h-screen lg:h-screen lg:min-h-0 flex flex-col text-foreground lg:overflow-hidden">
      <audio ref={audioRef} src={ALARM_SOUND_SRC} preload="auto" aria-hidden="true" />

      <AppHeader activePage="focus" focusMinutes={dailyMinutes} username={username} />

      {/* Unified dashboard card — greeting + 3-column body, all in one block */}
      <main className="flex-1 lg:min-h-0 max-w-7xl w-full mx-auto px-2.5 sm:px-4 md:px-6 pt-2 sm:pt-3 pb-2 sm:pb-3 flex">
        <div className="w-full lg:min-h-0 rounded-[2.25rem] bg-black/30 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_70px_rgba(0,0,0,0.35)] flex flex-col overflow-x-hidden lg:overflow-hidden">

          {/* Greeting row */}
          <div className="px-3 sm:px-6 md:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white/[0.025] rounded-t-[2.25rem]">
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate">
                {(() => {
                  const h = new Date().getHours()
                  const greeting = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
                  return `${greeting}, ${username[0].toUpperCase()}${username.slice(1)}!`
                })()} <span className="inline-block">👋</span>
              </h1>
              <p className="text-foreground/55 text-xs mt-0.5 truncate">
                {nextTask ? `Next focus: ${nextTask.title}` : "Plan one meaningful task and start gently."}
              </p>
            </div>
            <div className="flex items-center gap-2 justify-between md:justify-end flex-wrap w-full md:w-auto">
              <div className="rounded-2xl bg-primary/10 px-2 sm:px-3 py-2 text-center md:text-right">
                <p className="text-sm font-bold text-primary">{fmtMins(dailyMinutes)}</p>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.16em] text-foreground/45 leading-none">focused</p>
              </div>
              <div className="rounded-2xl bg-white/6 px-2 sm:px-3 py-2 text-center md:text-right">
                <p className="text-sm font-bold text-foreground">{sessionsDone}/6</p>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.16em] text-foreground/45 leading-none">sessions</p>
              </div>
              <div className="rounded-2xl bg-white/6 px-2 sm:px-3 py-2 text-center md:text-right">
                <p className="text-sm font-bold text-foreground">{openTodayTasks.length}</p>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.16em] text-foreground/45 leading-none">open</p>
              </div>
              <div className="hidden sm:flex md:flex">
                <AppBrand />
              </div>
            </div>
          </div>

          {/* 3-column body */}
          <div className="flex flex-1 lg:min-h-0 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_13.5rem_minmax(0,1fr)] gap-2 sm:gap-3 p-2 sm:p-3 items-stretch">

        {/* LEFT — Timer */}
        <div className="w-full min-w-0 min-h-0 flex flex-col gap-3">

          {/* Outer rounded container */}
          <div className="rounded-[2rem] bg-white/[0.025] p-2.5 flex flex-col gap-2.5 lg:flex-1 min-h-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_16px_46px_rgba(0,0,0,0.18)]">

          {/* Timer card */}
          <div className="bg-white/[0.04] rounded-3xl px-3 sm:px-6 py-3 sm:py-4 flex flex-1 min-h-0 flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute inset-x-4 sm:inset-x-10 top-4 sm:top-8 h-12 sm:h-20 rounded-full bg-primary/10 blur-3xl" />

            {/* Ring + clock */}
            <div className="relative flex items-center justify-center h-[min(40vh,260px)] sm:h-[min(46vh,340px)] md:h-[min(52vh,410px)] w-[min(40vh,260px)] sm:w-[min(46vh,340px)] md:w-[min(52vh,410px)]">
              <svg viewBox="0 0 340 340" className="absolute h-full w-full -rotate-90">
                <defs>
                  <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <circle cx={170} cy={170} r={R} fill="none" stroke="currentColor" strokeWidth={STROKE} className="text-white/8" />
                <circle
                  cx={170} cy={170} r={R}
                  fill="none" stroke="url(#ringGradient)" strokeWidth={STROKE}
                  strokeDasharray={CIRC} strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                  style={{ filter: "drop-shadow(0 0 8px var(--color-primary))" }}
                />
              </svg>

              <div className="absolute inset-0 grid place-items-center">
                <div className="flex translate-y-3 flex-col items-center justify-center gap-5">
                  <span className="block text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-none font-bold font-mono tabular-nums tracking-tighter text-foreground">
                    {fmtTime(timeLeft)}
                  </span>

                  {/* Mode dropdown trigger */}
                  <div className="relative">
                    <button
                      onClick={event => {
                        event.stopPropagation()
                        setShowModeMenu(p => !p)
                      }}
                      className="flex items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground/90 transition-colors bg-white/8 hover:bg-white/12 rounded-full px-3.5 py-1.5"
                    >
                      {MODE_LABEL[mode]}
                      <svg width="12" height="12" viewBox="0 0 12 12" className={["transition-transform", showModeMenu ? "rotate-180" : ""].join(" ")}>
                        <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {showModeMenu && (
                      <div
                        onClick={event => event.stopPropagation()}
                        className="absolute top-10 left-1/2 -translate-x-1/2 w-40 glass rounded-2xl p-1.5 flex flex-col gap-0.5 z-50"
                      >
                        {(["pomodoro", "shortBreak", "longBreak"] as TimerMode[]).map(m => (
                          <button
                            key={m}
                            onClick={() => handleModeChange(m)}
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
                    className="w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95"
                    style={{
                      background: "color-mix(in oklab, var(--color-primary) 22%, transparent)",
                    }}
                  >
                    {isRunning ? (
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
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
            </div>

          </div>

          {/* Active task */}
          {selectedTask ? (
            <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className={["w-2 h-2 rounded-full shrink-0", PRIORITY_DOT[selectedTask.priority ?? "medium"]].join(" ")} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground/40 mb-0.5">Working on</p>
                <p className="text-sm font-semibold text-primary truncate">{selectedTask.title}</p>
                <p className="text-[11px] text-foreground/45 mt-1">{fmtMins(selectedTask.remainingMinutes ?? 0)} focused / {fmtMins(selectedTask.targetMinutes ?? 60)} planned</p>
              </div>
              <button onClick={() => setSelectedTaskId(null)} className="text-foreground/30 hover:text-foreground/60 shrink-0 p-1 rounded-lg hover:bg-white/8 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : nextTask ? (
            <button
              type="button"
              onClick={() => setSelectedTaskId(nextTask.id)}
              className="rounded-2xl bg-white/[0.035] px-4 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] hover:bg-white/[0.055] transition-colors"
            >
              <p className="text-[11px] uppercase tracking-[0.14em] text-foreground/35 font-semibold">Suggested next task</p>
              <p className="text-sm font-semibold text-primary truncate mt-0.5">{nextTask.title}</p>
            </button>
          ) : (
            <div className="rounded-2xl bg-primary/8 px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-xs text-foreground/50">Select a task to start tracking your focus</p>
            </div>
          )}
          </div>{/* end outer rounded container */}
        </div>

        {/* MIDDLE — Today's stats */}
        <div className="w-full min-w-0 min-h-0 flex flex-col">
          <div className="rounded-3xl bg-white/[0.025] px-3.5 py-4 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_16px_46px_rgba(0,0,0,0.26)] flex flex-col items-center justify-between gap-3 lg:h-full min-h-0">

            {(() => {
              const doneCount   = doneTodayTasks.length
              const totalCount  = todayTasks.length
              const pct         = Math.min(1, dailyMinutes / dailyGoalMinutes)
              const focusGoalComplete = dailyMinutes >= dailyGoalMinutes
              const plannedOverCapacity = plannedTodayMinutes > plannedCapacityMinutes
              const percentDisp = Math.round(pct * 100)

              const ringR = 48, ringStroke = 8, ringCirc = 2 * Math.PI * ringR
              const ringOffset2 = ringCirc * (1 - pct)

              return (
                <>
                  {/* Header */}
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-foreground">Today&apos;s Focus</h3>
                    <p className="text-xs font-medium text-emerald-400 mt-0.5">{doneCount}/{totalCount} tasks done</p>
                  </div>

                  {/* Focus time */}
                  <div className="text-center rounded-2xl bg-white/6 px-3 py-3 w-full">
                    <p className="text-xl font-bold text-primary leading-tight">{fmtMins(dailyMinutes)}</p>
                    <p className="text-xs text-foreground/55 mt-0.5">Focus completed</p>
                  </div>

                  {/* Capacity ring */}
                  <div className="relative flex items-center justify-center" style={{ width: 112, height: 112 }}>
                    <svg width={112} height={112} style={{ position: "absolute", transform: "rotate(-90deg)" }}>
                      <circle cx={56} cy={56} r={ringR} fill="none" stroke="currentColor" strokeWidth={ringStroke} className="text-white/8" />
                      <circle
                        cx={56} cy={56} r={ringR}
                        fill="none" stroke="currentColor" strokeWidth={ringStroke}
                        strokeDasharray={ringCirc} strokeDashoffset={ringOffset2}
                        strokeLinecap="round"
                        className={["transition-all duration-700", focusGoalComplete ? "text-emerald-300" : "text-primary"].join(" ")}
                      />
                    </svg>
                    <div className="relative z-10 flex flex-col items-center leading-none">
                      <span className={["text-xl font-bold", focusGoalComplete ? "text-emerald-300" : "text-foreground"].join(" ")}>{percentDisp}%</span>
                      <span className="text-[10px] text-foreground/50 mt-1.5">6 sessions</span>
                    </div>
                  </div>

                  {/* Planned capacity */}
                  <div
                    className={[
                      "rounded-2xl px-2 py-2.5 text-center w-full transition-all",
                      plannedOverCapacity
                        ? "bg-red-500/8 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.18),0_0_22px_rgba(248,113,113,0.10)]"
                        : "bg-white/6",
                    ].join(" ")}
                  >
                    <p className={["text-lg font-bold leading-tight", plannedOverCapacity ? "text-red-200" : "text-foreground"].join(" ")}>
                      {fmtMins(plannedTodayMinutes)} of {fmtMins(plannedCapacityMinutes)}
                    </p>
                    <p className={["text-xs", plannedOverCapacity ? "text-red-200/70" : "text-foreground/55"].join(" ")}>
                      {plannedOverCapacity ? "planned over capacity" : "planned today"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full">
                    <div className="rounded-2xl bg-white/6 px-2 py-2 text-center">
                      <p className="text-base font-bold text-foreground">{sessionsDone}</p>
                      <p className="text-[10px] text-foreground/45">sessions</p>
                    </div>
                    <div className="rounded-2xl bg-white/6 px-2 py-2 text-center">
                      <p className="text-base font-bold text-foreground">{openTodayTasks.length}</p>
                      <p className="text-[10px] text-foreground/45">open</p>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        {/* RIGHT — Tasks (simplified) */}
        <div className="w-full min-w-0 min-h-0 flex flex-col gap-2.5">

          <div className="rounded-3xl bg-white/[0.025] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_16px_46px_rgba(0,0,0,0.26)] flex flex-col lg:h-full min-h-0">

            {/* Panel header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2 gap-3">
              <div>
                <h2 className="font-semibold text-foreground text-base">Choose Focus</h2>
                <p className="text-xs text-foreground/45 mt-0.5">{openTodayTasks.length} open today</p>
              </div>
              <button
                onClick={() => router.push("/tasks")}
                className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
              >
                View all
              </button>
            </div>

            {/* Add form */}
            {isAddingTask && (
              <div className="mx-3 mb-2 rounded-2xl px-4 py-4 bg-black/20 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                <Input
                  value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="What are you working on?"
                  onKeyDown={e => { if (e.key === "Enter") addTask(); if (e.key === "Escape") setIsAddingTask(false) }}
                  autoFocus className="bg-black/20 border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                />
                <div className="flex gap-2 flex-wrap items-center">
                  <Input type="number" min={0.25} step={0.25} value={newHours} onChange={e => setNewHours(Number(e.target.value))} className="w-20 text-sm bg-black/20 border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" placeholder="hrs" />
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)} className="rounded-lg px-2 py-1.5 text-xs bg-black/25 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value as Category)} className="rounded-lg px-2 py-1.5 text-xs bg-black/25 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <option value="work">💼 Work</option>
                    <option value="study">📖 Study</option>
                    <option value="personal">🩷 Personal</option>
                  </select>
                  <div className="flex gap-1.5 ml-auto">
                    <button onClick={addTask} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-semibold hover:brightness-110 transition">Add</button>
                    <button onClick={() => setIsAddingTask(false)} className="text-foreground/50 hover:text-foreground hover:bg-white/8 p-1.5 rounded-lg transition"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            )}

            {/* Task list — simplified, no progress bars */}
            <div className="px-3 py-2.5 space-y-1 flex-1 min-h-0 overflow-y-auto">
              {displayTasks.filter(t => !t.isCompleted).length === 0 && !isAddingTask && (
                <div className="flex flex-col items-center justify-center py-16 text-foreground/30 text-center">
                  <CheckCircle2 className="w-9 h-9 mb-3 text-primary/60" />
                  <p className="text-sm font-medium text-foreground/55">
                    {displayTasks.length > 0 ? "All done for now" : "Nothing here yet"}
                  </p>
                  <p className="text-xs text-foreground/35 mt-1">
                    {displayTasks.length > 0 ? "Completed tasks are hidden here — check the Tasks page." : "Add one clear task to start the day cleanly."}
                  </p>
                </div>
              )}

              {displayTasks.filter(t => !t.isCompleted).map(task => {
                const isSelected = selectedTaskId === task.id
                const isMenuOpen = openMenuId === task.id
                const priority = task.priority ?? "medium"
                const spent = task.remainingMinutes ?? 0
                const target = task.targetMinutes ?? 60

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
                    className={[
                      "flex items-center gap-2.5 px-3 py-3 rounded-xl cursor-pointer transition-all relative",
                      isSelected ? "bg-white/[0.045] shadow-[inset_3px_0_0_rgba(207,236,245,0.45)]" : "hover:bg-white/[0.035]",
                      task.isCompleted ? "opacity-40" : "",
                    ].join(" ")}
                  >
                    <span
                      title={`${priority[0].toUpperCase()}${priority.slice(1)} priority`}
                      className={["w-2 h-2 rounded-full shrink-0", PRIORITY_DOT[priority]].join(" ")}
                    />
                    <Checkbox
                      checked={task.isCompleted}
                      onClick={e => e.stopPropagation()}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary border-2 border-foreground/50 shrink-0"
                    />
                    <span className={["flex-1 text-sm min-w-0 truncate font-medium", task.isCompleted ? "line-through text-foreground/50" : "text-foreground"].join(" ")}>
                      {task.title}
                    </span>

                    {isSelected && (
                      <span className="hidden xl:inline-flex rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                        Active
                      </span>
                    )}

                    {/* Time spent / planned */}
                    <span className="text-xs text-foreground/55 shrink-0 tabular-nums">
                      {fmtMins(spent)} / {fmtMins(target)}
                    </span>

                    {/* Category icon chip */}
                    <span title={TAB_LABEL[task.category]} aria-label={`${TAB_LABEL[task.category]} category`} className={["flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full shrink-0", CAT_CHIP[task.category]].join(" ")}>
                      {CAT_ICON[task.category]}
                    </span>

                    {/* Kebab menu */}
                    <button
                      type="button"
                      aria-label={`Open actions for ${task.title}`}
                      aria-expanded={isMenuOpen}
                      onClick={e => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : task.id) }}
                      className="p-1 rounded-lg text-foreground/30 hover:text-foreground/70 hover:bg-white/8 transition shrink-0"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="absolute top-10 right-3 w-44 glass rounded-xl p-1.5 flex flex-col gap-0.5 z-50"
                      >
                        <button
                          onClick={() => { toggleSchedule(task.id); setOpenMenuId(null) }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground/70 hover:bg-white/6 hover:text-foreground/90 transition-colors text-left"
                        >
                          {task.schedule === "today" ? <Clock className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                          {task.schedule === "today" ? "Move to Later" : "Move to Today"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { void deleteTask(task.id); setOpenMenuId(null) }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors text-left"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Bottom Add Task bar */}
            <div className="mt-auto px-5 pt-2 pb-4 flex items-center justify-between gap-3">
              <p className="text-xs text-foreground/35 hidden sm:block">
                Tip: pick one task before starting the timer.
              </p>
              <button
                onClick={() => { setIsAddingTask(true); setNewTitle(""); setNewHours(1); setNewPriority("medium"); setNewSchedule("today"); setNewCategory("work") }}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:brightness-110 rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>
          </div>
        </div>
          </div>{/* end 3-column body */}
        </div>{/* end unified dashboard card */}
      </main>

    </div>
  )
}
