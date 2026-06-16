"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Plus, X, Trash2, Briefcase, BookOpen, Heart, Sun, Clock, LogOut } from "lucide-react"
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
  const R = 98, STROKE = 5, CIRC = 2 * Math.PI * R
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

          {/* Profile */}
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

      {showProfile && <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />}

      {/* Body */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 gap-4">

        {/* LEFT — Timer sticky on desktop */}
        <div className="w-full lg:w-1/2 lg:sticky lg:top-14 lg:self-start lg:h-[calc(100vh-56px)] flex flex-col gap-3 lg:py-2">

          {/* Outer rounded container */}
          <div className="border border-white/8 rounded-[2.5rem] bg-black/20 backdrop-blur-sm p-4 flex flex-col gap-3 lg:flex-1">

          {/* Timer card */}
          <div className="bg-white/3 rounded-2xl px-8 py-6 flex flex-col items-center text-center border border-white/5">

            {/* Mode pills */}
            <div className="flex gap-1 mb-5 bg-black/25 rounded-full p-1 border border-white/8">
              {(["pomodoro", "shortBreak", "longBreak"] as TimerMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className={[
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap",
                    mode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/50 hover:text-foreground/80",
                  ].join(" ")}
                >
                  {MODE_LABEL[m]}
                </button>
              ))}
            </div>

            {/* Ring + clock */}
            <div className="relative flex items-center justify-center mb-5" style={{ width: 220, height: 220 }}>
              <svg width={220} height={220} style={{ position: "absolute", transform: "rotate(-90deg)" }}>
                <circle cx={110} cy={110} r={R} fill="none" stroke="currentColor" strokeWidth={STROKE} className="text-white/10" />
                <circle
                  cx={110} cy={110} r={R}
                  fill="none" stroke="currentColor" strokeWidth={STROKE}
                  strokeDasharray={CIRC} strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  className="text-primary transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="text-6xl font-bold font-mono tabular-nums tracking-tighter text-foreground relative z-10">
                {fmtTime(timeLeft)}
              </span>
            </div>

            {/* Start / Pause */}
            <button
              onClick={toggleTimer}
              className={[
                "w-full py-3.5 rounded-2xl text-sm font-bold tracking-widest uppercase transition-all shadow-lg mb-1.5",
                isRunning
                  ? "bg-white/10 border border-white/20 text-foreground hover:bg-white/15"
                  : "bg-primary text-primary-foreground hover:brightness-110",
              ].join(" ")}
            >
              {isRunning ? "Pause" : "Start"}
            </button>
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

        {/* RIGHT — Tasks */}
        <div className="w-full lg:w-1/2 lg:h-[calc(100vh-56px)] flex flex-col gap-2.5 min-w-0 lg:py-2">

          {/* Tab bar */}
          <div className="flex gap-2 overflow-x-auto pb-1 shrink-0" style={{ scrollbarWidth: "none" }}>
            {(["today", "work", "study", "personal"] as ActiveTab[]).map(tab => {
              const count    = tabTasks(tab).filter(t => !t.isCompleted).length
              const isActive = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setIsAddingTask(false) }}
                  className={[
                    "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap shrink-0",
                    isActive ? TAB_ACTIVE[tab] : "border-border/40 text-foreground/40 hover:text-foreground/70 hover:border-border/70",
                  ].join(" ")}
                >
                  {TAB_ICON[tab]}
                  <span>{TAB_LABEL[tab]}</span>
                  {count > 0 && (
                    <span className={["text-xs rounded-full px-1.5 py-0.5 leading-none font-bold", isActive ? "bg-white/25" : "bg-white/10"].join(" ")}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Task panel */}
          <div className="glass rounded-3xl flex flex-col overflow-hidden lg:flex-1 lg:min-h-0">

            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
              <div>
                <h2 className="font-semibold text-foreground text-base">{TAB_LABEL[activeTab]}</h2>
                <p className="text-xs text-foreground/40 mt-0.5">
                  {displayTasks.filter(t => !t.isCompleted).length === 0
                    ? (displayTasks.length > 0 ? "All done 🎉" : "No tasks yet")
                    : `${displayTasks.filter(t => !t.isCompleted).length} remaining`}
                </p>
              </div>
              <button
                onClick={() => { setIsAddingTask(true); setNewTitle(""); setNewHours(1); setNewPriority("medium"); setNewSchedule("today"); setNewCategory("work") }}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:brightness-110 rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Task
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
                  {activeTab === "today" ? (
                    <select value={newCategory} onChange={e => setNewCategory(e.target.value as Category)} className="border border-border/60 rounded-lg px-2 py-1.5 text-xs bg-background text-foreground">
                      <option value="work">💼 Work</option>
                      <option value="study">📖 Study</option>
                      <option value="personal">🩷 Personal</option>
                    </select>
                  ) : (
                    <select value={newSchedule} onChange={e => setNewSchedule(e.target.value as Schedule)} className="border border-border/60 rounded-lg px-2 py-1.5 text-xs bg-background text-foreground">
                      <option value="today">☀️ Today</option>
                      <option value="later">🕐 Later</option>
                    </select>
                  )}
                  <div className="flex gap-1.5 ml-auto">
                    <button onClick={addTask} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-semibold hover:brightness-110 transition">Add</button>
                    <button onClick={() => setIsAddingTask(false)} className="text-foreground/50 hover:text-foreground border border-border/40 p-1.5 rounded-lg transition"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            )}

            {/* Task list */}
            <div className="px-3 py-2.5 space-y-1.5 lg:flex-1 lg:overflow-y-auto no-scrollbar">
              {displayTasks.length === 0 && !isAddingTask && (
                <div className="flex flex-col items-center justify-center py-16 text-foreground/20">
                  <p className="text-4xl mb-2">✓</p>
                  <p className="text-sm">Nothing here yet</p>
                </div>
              )}

              {[...displayTasks.filter(t => !t.isCompleted), ...displayTasks.filter(t => t.isCompleted)].map(task => {
                const isSelected = selectedTaskId === task.id
                const isConfirm  = confirmDeleteId === task.id
                const priority   = task.priority ?? "medium"
                const target     = task.targetMinutes ?? 60
                const spent      = task.remainingMinutes ?? 0
                const pct        = Math.min(1, spent / Math.max(1, target))

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
                    className={[
                      "flex flex-col gap-2 p-3 rounded-xl border cursor-pointer transition-all",
                      isSelected ? CAT_ACCENT[task.category] + " shadow-sm" : "border-border/40 bg-black/20 hover:bg-black/30 hover:border-border/60",
                      task.isCompleted ? "opacity-40" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={task.isCompleted}
                        onClick={e => e.stopPropagation()}
                        onCheckedChange={() => toggleTask(task.id)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary border-2 border-foreground/50 shrink-0"
                      />
                      <div className={["w-2 h-2 rounded-full shrink-0", PRIORITY_DOT[priority]].join(" ")} />
                      <span className={["flex-1 text-sm min-w-0 truncate font-medium", task.isCompleted ? "line-through text-foreground/40" : "text-foreground"].join(" ")}>
                        {task.title}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {activeTab === "today" && (
                          <span className={["flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border", CAT_CHIP[task.category]].join(" ")}>
                            {CAT_ICON[task.category]}
                          </span>
                        )}
                        <button
                          title={task.schedule === "today" ? "Move to Later" : "Move to Today"}
                          onClick={e => { e.stopPropagation(); toggleSchedule(task.id) }}
                          className={[
                            "p-1.5 rounded-lg border transition",
                            task.schedule === "today"
                              ? "border-amber-400/40 text-amber-300 bg-amber-400/10 hover:bg-amber-400/20"
                              : "border-border/30 text-foreground/30 hover:text-foreground/60",
                          ].join(" ")}
                        >
                          {task.schedule === "today" ? <Sun className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        </button>
                        {isConfirm ? (
                          <>
                            <button onClick={e => { e.stopPropagation(); deleteTask(task.id) }} className="text-xs px-2.5 py-1 rounded-lg bg-destructive text-white hover:brightness-110 font-semibold">Yes</button>
                            <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(null) }} className="text-xs px-2.5 py-1 rounded-lg border border-border text-foreground/50 hover:text-foreground">No</button>
                          </>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(task.id) }} className="p-1.5 rounded-lg text-destructive/40 hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-7">
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-primary/60 transition-all duration-500" style={{ width: `${pct * 100}%` }} />
                      </div>
                      <span className="text-xs text-foreground/35 shrink-0 tabular-nums">{fmtMins(spent)} / {fmtMins(target)}</span>
                    </div>
                  </div>
                )
              })}
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
