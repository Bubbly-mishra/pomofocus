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

interface TotalTime { _id: string; date: string; minutes: number }

const TIMER_DURATIONS: Record<TimerMode, number> = {
  pomodoro:   50 * 60,
  shortBreak: 10 * 60,
  longBreak:  30 * 60,
}

const MODE_LABELS: Record<TimerMode, string> = {
  pomodoro:   "Deep Work",
  shortBreak: "Short Break",
  longBreak:  "Long Break",
}

const PRIORITY_COLOR: Record<Priority, string> = {
  high:   "bg-red-400",
  medium: "bg-yellow-400",
  low:    "bg-green-400",
}

const TABS = [
  { key: "today"    as ActiveTab, label: "Today",    icon: <Sun       className="w-4 h-4" />, color: "text-amber-300",  activeBg: "bg-amber-500/15  border-amber-400/40"  },
  { key: "work"     as ActiveTab, label: "Work",     icon: <Briefcase className="w-4 h-4" />, color: "text-blue-300",   activeBg: "bg-blue-500/15   border-blue-400/40"   },
  { key: "study"    as ActiveTab, label: "Study",    icon: <BookOpen  className="w-4 h-4" />, color: "text-purple-300", activeBg: "bg-purple-500/15 border-purple-400/40" },
  { key: "personal" as ActiveTab, label: "Personal", icon: <Heart     className="w-4 h-4" />, color: "text-pink-300",   activeBg: "bg-pink-500/15   border-pink-400/40"   },
]

const CAT_CHIP: Record<Category, { bg: string; icon: React.ReactNode }> = {
  work:     { bg: "bg-blue-500/20 text-blue-300 border-blue-400/30",     icon: <Briefcase className="w-3 h-3" /> },
  study:    { bg: "bg-purple-500/20 text-purple-300 border-purple-400/30", icon: <BookOpen  className="w-3 h-3" /> },
  personal: { bg: "bg-pink-500/20 text-pink-300 border-pink-400/30",     icon: <Heart     className="w-3 h-3" /> },
}

const fmtTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

const fmtMins = (m = 0) => {
  const mm = Math.max(0, Math.round(m))
  const h = Math.floor(mm / 60), r = mm % 60
  return h === 0 ? `${r}m` : r === 0 ? `${h}h` : `${h}h ${r}m`
}

const fmtFocusHours = (m = 0) => {
  const mm = Math.max(0, Math.round(m))
  return `${Math.floor(mm / 60)}.${String(mm % 60).padStart(2, "0")}h`
}

export function PomodoroTimer({ username }: { username: string }) {
  const router = useRouter()
  const [showProfile,      setShowProfile]      = useState(false)
  const [mode,             setMode]             = useState<TimerMode>("pomodoro")
  const [timeLeft,         setTimeLeft]         = useState(TIMER_DURATIONS.pomodoro)
  const [isRunning,        setIsRunning]        = useState(false)
  const [activeTab,        setActiveTab]        = useState<ActiveTab>("today")
  const [selectedTaskId,   setSelectedTaskId]   = useState<string | null>(null)
  const [isAddingTask,     setIsAddingTask]     = useState(false)
  const [newTitle,         setNewTitle]         = useState("")
  const [newHours,         setNewHours]         = useState(1)
  const [newPriority,      setNewPriority]      = useState<Priority>("medium")
  const [newSchedule,      setNewSchedule]      = useState<Schedule>("today")
  const [newCategory,      setNewCategory]      = useState<Category>("work")
  const [dailyMinutes,     setDailyMinutes]     = useState(0)
  const [confirmDeleteId,  setConfirmDeleteId]  = useState<string | null>(null)

  const audioRef   = useRef<HTMLAudioElement | null>(null)
  const endTimeRef = useRef<number | null>(null)

  const fetcher = useCallback((url: string) => fetch(url).then(r => r.json()), [])
  const { data: tasks = [], mutate } = useSWR<Task[]>("/api/tasks", fetcher, { fallbackData: [] })
  const { data: totalTime, mutate: mutateTotalTime } = useSWR<TotalTime>("/api/totalTime", fetcher)

  useEffect(() => { if (totalTime) setDailyMinutes(totalTime.minutes) }, [totalTime])

  const byTab = (tab: ActiveTab) =>
    tab === "today" ? tasks.filter(t => t.schedule === "today")
    : tasks.filter(t => t.category === tab)

  const displayTasks = byTab(activeTab)
  const selectedTask = tasks.find(t => t.id === selectedTaskId)
  const totalDuration = TIMER_DURATIONS[mode]
  const progress = 1 - timeLeft / totalDuration

  // ── timer ─────────────────────────────────────────────────────────────────
  const handleModeChange = useCallback((m: TimerMode) => {
    setMode(m); setTimeLeft(TIMER_DURATIONS[m]); setIsRunning(false)
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

  const addToRemainingMinutes = useCallback(async () => {
    if (!selectedTaskId) return
    const mins = Math.round(TIMER_DURATIONS.pomodoro / 60)
    const cur = tasks.find(t => t.id === selectedTaskId)
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
    const el = audioRef.current; if (!el) return
    let n = 0
    const go = () => { el.currentTime = 0; void el.play().catch(() => {}); n++; if (n < 3) el.onended = go; else el.onended = null }
    go(); navigator.vibrate?.(200)
    if (Notification.permission === "granted") new Notification("Session done!", { body: "Take a break ⏰" })
  }, [])

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      if (!endTimeRef.current) return
      const msLeft = endTimeRef.current - Date.now()
      const next = Math.max(0, Math.ceil(msLeft / 1000))
      setTimeLeft(p => p !== next ? next : p)
      if (msLeft <= 0) {
        clearInterval(id); endTimeRef.current = null; setIsRunning(false); playAlarm()
        if (mode === "pomodoro") { void addToRemainingMinutes(); handleModeChange("shortBreak") }
        else handleModeChange("pomodoro")
      }
    }, 500)
    return () => clearInterval(id)
  }, [isRunning, mode, playAlarm, addToRemainingMinutes, handleModeChange])

  useEffect(() => {
    document.title = isRunning ? `${fmtTime(timeLeft)} — ${MODE_LABELS[mode]}` : "Flowtime"
  }, [timeLeft, isRunning, mode])

  // ── mutations ──────────────────────────────────────────────────────────────
  const patch = useCallback(async (id: string, body: object) => {
    const optimistic = tasks.map(t => t.id === id ? { ...t, ...body } : t)
    await mutate(async () => {
      await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      return optimistic
    }, { optimisticData: optimistic, revalidate: true })
  }, [tasks, mutate])

  const toggleTask     = (id: string) => patch(id, { isCompleted: !tasks.find(t => t.id === id)?.isCompleted })
  const toggleSchedule = (id: string) => {
    const t = tasks.find(t => t.id === id)
    if (t) patch(id, { schedule: t.schedule === "today" ? "later" : "today" })
  }

  const addTask = async () => {
    if (!newTitle.trim()) return
    const category: Category = activeTab === "today" ? newCategory : activeTab as Category
    const schedule: Schedule = activeTab === "today" ? "today" : newSchedule
    const targetMinutes = Math.max(0, Math.round((newHours || 1) * 60))
    const optimistic: Task = {
      id: `temp-${Date.now()}`, title: newTitle.trim(), isCompleted: false,
      targetMinutes, remainingMinutes: 0, priority: newPriority, category, schedule,
    }
    setNewTitle(""); setNewHours(1); setNewPriority("medium"); setNewSchedule("today"); setIsAddingTask(false)
    await mutate(async () => {
      const res = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: optimistic.title, targetHours: newHours, priority: newPriority, category, schedule }),
      })
      const created = await res.json()
      return [...tasks.filter(t => !t.id.startsWith("temp-")), created]
    }, { optimisticData: [...tasks, optimistic], revalidate: true })
  }

  const deleteTask = async (id: string) => {
    setConfirmDeleteId(null)
    if (selectedTaskId === id) setSelectedTaskId(null)
    const next = tasks.filter(t => t.id !== id)
    await mutate(async () => { await fetch(`/api/tasks/${id}`, { method: "DELETE" }); return next },
      { optimisticData: next, revalidate: true })
  }

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login"); router.refresh()
  }

  // ── SVG ring ───────────────────────────────────────────────────────────────
  const R = 88, STROKE = 5, CIRC = 2 * Math.PI * R
  const dash = CIRC * (1 - progress)

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="hills min-h-screen flex flex-col text-foreground">
      <audio ref={audioRef} src="/sounds/alarm.mp3" preload="auto" aria-hidden />

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/8 backdrop-blur-md bg-black/25">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(p => !p)}
              className="flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 rounded-full pl-1.5 pr-3 py-1 transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-primary/70 flex items-center justify-center text-xs font-bold text-white">
                {username[0].toUpperCase()}
              </div>
              <span className="text-sm text-white/70 font-medium hidden sm:block">{username}</span>
            </button>

            {showProfile && (
              <div className="absolute top-11 left-0 w-56 glass border border-border rounded-2xl shadow-2xl p-4 flex flex-col gap-3 z-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/60 flex items-center justify-center text-base font-bold text-white">
                    {username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{username}</p>
                    <p className="text-xs text-foreground/40">Flowtime</p>
                  </div>
                </div>
                <div className="border-t border-border/40 pt-2">
                  <p className="text-xs text-foreground/40 mb-0.5">Today's focus</p>
                  <p className="text-xl font-bold text-primary">{fmtFocusHours(dailyMinutes)}</p>
                </div>
                <button onClick={signOut} className="flex items-center gap-2 text-sm text-destructive/70 hover:text-destructive transition-colors">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}
          </div>

          <span className="font-semibold tracking-tight text-foreground">Flowtime</span>

          {/* Today's total */}
          <div className="text-right">
            <p className="text-xs text-foreground/35 leading-none mb-0.5">Today</p>
            <p className="text-sm font-bold text-primary">{fmtFocusHours(dailyMinutes)}</p>
          </div>
        </div>
      </header>

      {showProfile && <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />}

      {/* ── Two-column body ── */}
      <main className="flex-1 flex items-stretch max-w-6xl w-full mx-auto px-6 py-8 gap-6">

        {/* ════ LEFT — Timer ════ */}
        <div className="w-[420px] shrink-0 flex flex-col gap-4">

          {/* Timer card */}
          <div className="glass border border-border rounded-3xl p-8 flex flex-col items-center text-center flex-1 justify-center">

            {/* Mode tabs */}
            <div className="flex gap-1.5 mb-10 bg-white/5 rounded-full p-1">
              {(["pomodoro", "shortBreak", "longBreak"] as TimerMode[]).map(m => (
                <button key={m} onClick={() => handleModeChange(m)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all
                    ${mode === m ? "bg-primary/25 text-primary border border-primary/30" : "text-foreground/40 hover:text-foreground/70"}`}>
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>

            {/* Ring + clock */}
            <div className="relative flex items-center justify-center mb-10" style={{ width: 200, height: 200 }}>
              <svg width={200} height={200} style={{ transform: "rotate(-90deg)", position: "absolute" }}>
                <circle cx={100} cy={100} r={R} fill="none" stroke="currentColor" strokeWidth={STROKE} className="text-white/8" />
                <circle cx={100} cy={100} r={R} fill="none" stroke="currentColor" strokeWidth={STROKE}
                  strokeDasharray={CIRC} strokeDashoffset={dash} strokeLinecap="round"
                  className="text-primary transition-all duration-1000 ease-linear" />
              </svg>
              <span className="text-6xl font-bold font-mono tabular-nums tracking-tighter text-foreground relative z-10">
                {fmtTime(timeLeft)}
              </span>
            </div>

            {/* Start/Pause */}
            <button onClick={toggleTimer}
              className={`w-full py-4 rounded-2xl text-base font-bold tracking-widest uppercase transition-all shadow-lg mb-3
                ${isRunning
                  ? "bg-white/8 border border-white/15 text-foreground/80 hover:bg-white/12"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
              {isRunning ? "Pause" : "Start"}
            </button>
            <p className="text-foreground/20 text-xs">space to toggle</p>
          </div>

          {/* Active task pill */}
          {selectedTask ? (
            <div className="glass border border-border rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLOR[selectedTask.priority ?? "medium"]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground/40 mb-0.5">Working on</p>
                <p className="text-sm font-semibold text-primary truncate">{selectedTask.title}</p>
              </div>
              <button onClick={() => setSelectedTaskId(null)} className="text-foreground/30 hover:text-foreground/60 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="glass border border-dashed border-border/40 rounded-2xl px-4 py-3 text-center">
              <p className="text-xs text-foreground/25">Click a task to track it</p>
            </div>
          )}
        </div>

        {/* ════ RIGHT — Tasks ════ */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Tab bar */}
          <div className="flex gap-2">
            {TABS.map(tab => {
              const count = byTab(tab.key).filter(t => !t.isCompleted).length
              const isActive = activeTab === tab.key
              return (
                <button key={tab.key} onClick={() => { setActiveTab(tab.key); setIsAddingTask(false) }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all
                    ${isActive ? `${tab.activeBg} ${tab.color}` : "border-border/40 text-foreground/35 hover:text-foreground/60 hover:border-border/60"}`}>
                  {tab.icon}
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={`text-xs rounded-full px-1.5 py-0.5 leading-none ${isActive ? "bg-white/20" : "bg-white/8"}`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Task panel */}
          <div className="glass border border-border rounded-3xl flex-1 flex flex-col overflow-hidden">

            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {TABS.find(t => t.key === activeTab)?.label}
                </h2>
                <p className="text-xs text-foreground/35 mt-0.5">
                  {displayTasks.filter(t => !t.isCompleted).length === 0
                    ? displayTasks.length > 0 ? "All done 🎉" : "No tasks yet"
                    : `${displayTasks.filter(t => !t.isCompleted).length} remaining`}
                </p>
              </div>
              <button
                onClick={() => { setIsAddingTask(true); setNewTitle(""); setNewHours(1); setNewPriority("medium"); setNewSchedule("today"); setNewCategory("work") }}
                className="flex items-center gap-1.5 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/25 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </div>

            {/* Add form */}
            {isAddingTask && (
              <div className="px-6 py-4 border-b border-border/30 bg-white/3">
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="What are you working on?"
                  onKeyDown={e => { if (e.key === "Enter") addTask(); if (e.key === "Escape") setIsAddingTask(false) }}
                  autoFocus className="mb-3" />
                <div className="flex gap-2 flex-wrap items-center">
                  <Input type="number" min={0.25} step={0.25} value={newHours}
                    onChange={e => setNewHours(Number(e.target.value))}
                    className="w-20 text-sm" placeholder="hrs" />
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)}
                    className="border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground">
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                  {activeTab === "today" ? (
                    <select value={newCategory} onChange={e => setNewCategory(e.target.value as Category)}
                      className="border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground">
                      <option value="work">💼 Work</option>
                      <option value="study">📖 Study</option>
                      <option value="personal">🩷 Personal</option>
                    </select>
                  ) : (
                    <select value={newSchedule} onChange={e => setNewSchedule(e.target.value as Schedule)}
                      className="border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground">
                      <option value="today">☀️ Today</option>
                      <option value="later">🕐 Later</option>
                    </select>
                  )}
                  <div className="flex gap-1.5 ml-auto">
                    <button onClick={addTask} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary/90 transition">Add</button>
                    <button onClick={() => setIsAddingTask(false)} className="text-foreground/40 hover:text-foreground border border-border/40 px-2 py-1.5 rounded-lg text-xs transition"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            )}

            {/* Task list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {displayTasks.length === 0 && !isAddingTask && (
                <div className="flex flex-col items-center justify-center h-40 text-foreground/20">
                  <p className="text-3xl mb-2">✓</p>
                  <p className="text-sm">No tasks here</p>
                </div>
              )}

              {/* Incomplete first, then completed */}
              {[...displayTasks.filter(t => !t.isCompleted), ...displayTasks.filter(t => t.isCompleted)].map(task => {
                const isSelected  = selectedTaskId === task.id
                const isConfirm   = confirmDeleteId === task.id
                const priority    = task.priority ?? "medium"
                const target      = task.targetMinutes ?? 60
                const spent       = task.remainingMinutes ?? 0
                const pct         = Math.min(1, spent / Math.max(1, target))
                const chip        = CAT_CHIP[task.category]

                return (
                  <div key={task.id}
                    onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
                    className={`group flex flex-col gap-2 p-3.5 rounded-2xl border cursor-pointer transition-all
                      ${isSelected
                        ? "border-primary/40 bg-primary/8 shadow-sm"
                        : "border-border/40 bg-white/3 hover:bg-white/6 hover:border-border/60"
                      } ${task.isCompleted ? "opacity-50" : ""}`}>

                    <div className="flex items-center gap-3">
                      <Checkbox checked={task.isCompleted}
                        onClick={e => e.stopPropagation()}
                        onCheckedChange={() => toggleTask(task.id)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0" />

                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_COLOR[priority]}`} />

                      <span className={`flex-1 text-sm min-w-0 truncate ${task.isCompleted ? "line-through" : "text-foreground"}`}>
                        {task.title}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Category chip (Today tab only) */}
                        {activeTab === "today" && (
                          <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border ${chip.bg}`}>
                            {chip.icon}
                          </span>
                        )}
                        {/* Schedule toggle */}
                        <button title={task.schedule === "today" ? "Move to Later" : "Move to Today"}
                          onClick={e => { e.stopPropagation(); toggleSchedule(task.id) }}
                          className={`p-1 rounded-lg border transition
                            ${task.schedule === "today"
                              ? "border-amber-400/40 text-amber-300 bg-amber-400/10 hover:bg-amber-400/20"
                              : "border-border/30 text-foreground/30 hover:text-foreground/60"}`}>
                          {task.schedule === "today" ? <Sun className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        </button>
                        {/* Delete */}
                        {isConfirm ? (
                          <>
                            <button onClick={e => { e.stopPropagation(); deleteTask(task.id) }}
                              className="text-xs px-2 py-0.5 rounded-lg bg-destructive/80 text-white hover:bg-destructive">Yes</button>
                            <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(null) }}
                              className="text-xs px-2 py-0.5 rounded-lg border border-border text-foreground/50 hover:text-foreground">No</button>
                          </>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(task.id) }}
                            className="p-1 rounded-lg text-destructive/40 hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2 pl-7">
                      <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
                        <div className="h-full rounded-full bg-primary/50 transition-all duration-500" style={{ width: `${pct * 100}%` }} />
                      </div>
                      <span className="text-xs text-foreground/30 shrink-0 tabular-nums">{fmtMins(spent)} / {fmtMins(target)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 backdrop-blur-md bg-black/20">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
          <span className="text-xs text-foreground/25">© {new Date().getFullYear()} Flowtime</span>
          <span className="text-xs text-foreground/20">Made with ❤️ for Doyel</span>
          <span className="text-xs text-foreground/25">Stay focused.</span>
        </div>
      </footer>
    </div>
  )
}
