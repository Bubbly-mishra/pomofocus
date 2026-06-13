"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Plus, X, Trash2, Briefcase, BookOpen, Heart, Sun, Clock, LogOut, User } from "lucide-react"
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

const TIMER_DURATIONS = {
  pomodoro: 50 * 60,
  shortBreak: 10 * 60,
  longBreak: 30 * 60,
}

const MODE_LABELS: Record<TimerMode, string> = {
  pomodoro: "Focus Session",
  shortBreak: "Short Break",
  longBreak: "Long Break",
}

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-400",
  low: "bg-green-500",
}

const CATEGORY_CONFIG: Record<Category, { label: string; icon: React.ReactNode; accent: string; headerBg: string; dot: string }> = {
  work: {
    label: "Work",
    icon: <Briefcase className="w-4 h-4" />,
    accent: "ring-blue-400/60",
    headerBg: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    dot: "bg-blue-400",
  },
  study: {
    label: "Study",
    icon: <BookOpen className="w-4 h-4" />,
    accent: "ring-purple-400/60",
    headerBg: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    dot: "bg-purple-400",
  },
  personal: {
    label: "Personal",
    icon: <Heart className="w-4 h-4" />,
    accent: "ring-pink-400/60",
    headerBg: "bg-pink-500/15 text-pink-300 border-pink-500/30",
    dot: "bg-pink-400",
  },
}

export function PomodoroTimer({ username }: { username: string }) {
  const router = useRouter()
  const [showProfile, setShowProfile] = useState(false)
  const [mode, setMode] = useState<TimerMode>("pomodoro")
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.pomodoro)
  const [isRunning, setIsRunning] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>("today")
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isAddingTask, setIsAddingTask] = useState<ActiveTab | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [newTaskHours, setNewTaskHours] = useState<number>(1)
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium")
  const [newTaskSchedule, setNewTaskSchedule] = useState<Schedule>("today")
  const [dailyMinutes, setDailyMinutes] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const endTimeRef = useRef<number | null>(null)

  const fetcher = useCallback((url: string) => fetch(url).then((r) => r.json()), [])
  const { data: tasks = [], mutate } = useSWR<Task[]>("/api/tasks", fetcher, { fallbackData: [] })
  const { data: totalTime, mutate: mutateTotalTime } = useSWR<TotalTime>("/api/totalTime", fetcher)

  const todayTasks = tasks.filter((t) => t.schedule === "today")
  const workTasks = tasks.filter((t) => t.category === "work")
  const studyTasks = tasks.filter((t) => t.category === "study")
  const personalTasks = tasks.filter((t) => t.category === "personal")

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const formatHours = (mins?: number) => {
    const m = Math.max(0, Math.round(mins ?? 0))
    const hours = Math.floor(m / 60)
    const minutesPart = m % 60
    return `${(hours + minutesPart / 100).toFixed(2)}h`
  }

  const formatPseudoHours = (mins?: number) => {
    const m = Math.max(0, Math.round(mins ?? 0))
    const hours = Math.floor(m / 60)
    const minutesPart = m % 60
    return `${hours}.${minutesPart.toString().padStart(2, "0")}`
  }

  useEffect(() => {
    if (totalTime) setDailyMinutes(totalTime.minutes)
  }, [totalTime])

  const handleModeChange = useCallback((newMode: TimerMode) => {
    setMode(newMode)
    setTimeLeft(TIMER_DURATIONS[newMode])
    setIsRunning(false)
  }, [])

  const toggleTimer = () => {
    if (isRunning) {
      const msLeft = Math.max(0, (endTimeRef.current ?? Date.now()) - Date.now())
      setTimeLeft(Math.ceil(msLeft / 1000))
      endTimeRef.current = null
      setIsRunning(false)
    } else {
      endTimeRef.current = Date.now() + timeLeft * 1000
      setIsRunning(true)
    }
  }

  const toggleTask = async (taskId: string) => {
    const current = tasks.find((t) => t.id === taskId)
    if (!current) return
    const next: Task = { ...current, isCompleted: !current.isCompleted }
    await mutate(
      async () => {
        await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isCompleted: next.isCompleted }),
        })
        return tasks.map((t) => (t.id === taskId ? next : t))
      },
      { optimisticData: tasks.map((t) => (t.id === taskId ? next : t)), revalidate: true },
    )
  }

  const toggleSchedule = async (taskId: string) => {
    const current = tasks.find((t) => t.id === taskId)
    if (!current) return
    const nextSchedule: Schedule = current.schedule === "today" ? "later" : "today"
    const next: Task = { ...current, schedule: nextSchedule }
    await mutate(
      async () => {
        await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schedule: nextSchedule }),
        })
        return tasks.map((t) => (t.id === taskId ? next : t))
      },
      { optimisticData: tasks.map((t) => (t.id === taskId ? next : t)), revalidate: true },
    )
  }

  const addTask = async (tab: ActiveTab) => {
    if (!newTaskTitle.trim()) return
    const category: Category = tab === "today" ? "work" : tab
    const targetMins = Math.max(0, Math.round((Number(newTaskHours) || 1) * 60))
    const optimistic: Task = {
      id: `temp-${Date.now()}`,
      title: newTaskTitle.trim(),
      isCompleted: false,
      targetMinutes: targetMins,
      remainingMinutes: 0,
      priority: newTaskPriority,
      category,
      schedule: tab === "today" ? "today" : newTaskSchedule,
    }
    setNewTaskTitle("")
    setNewTaskHours(1)
    setNewTaskPriority("medium")
    setNewTaskSchedule("today")
    setIsAddingTask(null)

    await mutate(
      async () => {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: optimistic.title,
            targetHours: newTaskHours,
            priority: newTaskPriority,
            category,
            schedule: optimistic.schedule,
          }),
        })
        const created: Task = await res.json()
        return [...tasks.filter((t) => !t.id.startsWith("temp-")), created]
      },
      { optimisticData: [...tasks, optimistic], revalidate: true },
    )
  }

  const deleteTask = async (taskId: string) => {
    const next = tasks.filter((t) => t.id !== taskId)
    await mutate(
      async () => {
        await fetch(`/api/tasks/${taskId}`, { method: "DELETE" })
        return next
      },
      { optimisticData: next, revalidate: true },
    )
  }

  const addToRemainingMinutes = useCallback(async () => {
    if (!selectedTaskId) return
    const sessionMinutes = Math.round(TIMER_DURATIONS.pomodoro / 60)
    const current = tasks.find((t) => t.id === selectedTaskId)
    if (!current) return
    const prevRemaining = current.remainingMinutes ?? 0
    const nextRemaining = prevRemaining + sessionMinutes

    await mutate(
      async () => {
        await fetch(`/api/tasks/${selectedTaskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remainingMinutes: nextRemaining }),
        })
        return tasks.map((t) =>
          t.id === selectedTaskId ? { ...t, remainingMinutes: nextRemaining } : t,
        )
      },
      {
        optimisticData: tasks.map((t) =>
          t.id === selectedTaskId ? { ...t, remainingMinutes: nextRemaining } : t,
        ),
        revalidate: true,
      },
    )

    await fetch("/api/totalTime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes: sessionMinutes }),
    })

    setDailyMinutes((prev) => prev + sessionMinutes)
    mutateTotalTime()
  }, [selectedTaskId, tasks, mutate, mutateTotalTime])

  const playAlarm = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    let count = 0
    const playOnce = () => {
      el.currentTime = 0
      void el.play().catch(() => {})
      count++
      if (count < 3) el.onended = playOnce
      else el.onended = null
    }
    playOnce()
    navigator.vibrate?.(200)
    if (Notification.permission === "granted") {
      new Notification("Pomodoro Finished!", { body: "Time for a break ⏰" })
    }
  }, [])

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      if (!endTimeRef.current) return
      const msLeft = endTimeRef.current - Date.now()
      const next = Math.max(0, Math.ceil(msLeft / 1000))
      setTimeLeft((prev) => (prev !== next ? next : prev))

      if (msLeft <= 0) {
        clearInterval(interval)
        endTimeRef.current = null
        setIsRunning(false)
        playAlarm()
        if (mode === "pomodoro") {
          void addToRemainingMinutes()
          handleModeChange("shortBreak")
        } else {
          handleModeChange("pomodoro")
        }
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, mode, playAlarm, addToRemainingMinutes, handleModeChange])

  useEffect(() => {
    const formatted = formatTime(timeLeft)
    document.title = isRunning
      ? `${formatted} - ${mode.charAt(0).toUpperCase() + mode.slice(1)}`
      : `Pomodoro Timer`
  }, [timeLeft, isRunning, mode])

  const selectedTask = tasks.find((t) => t.id === selectedTaskId)

  const renderTaskCard = (task: Task, accentClass: string) => {
    const target = task.targetMinutes ?? 60
    const remaining = task.remainingMinutes ?? 0
    const isSelected = selectedTaskId === task.id
    const priority = task.priority ?? "medium"
    const catCfg = CATEGORY_CONFIG[task.category]

    return (
      <Card
        key={task.id}
        className={`glass border border-border p-3 rounded-lg cursor-pointer transition
          ${isSelected ? `ring-2 ${accentClass} bg-primary/10` : "hover:ring-1 hover:ring-primary/20"}`}
        onClick={() => setSelectedTaskId(task.id)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Checkbox
              checked={task.isCompleted}
              onClick={(e) => e.stopPropagation()}
              onCheckedChange={() => toggleTask(task.id)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
            />
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLOR[priority]}`}
              title={`Priority: ${priority}`}
            />
            <span className={`truncate text-sm ${task.isCompleted ? "line-through opacity-50" : "text-foreground"}`}>
              {task.title}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Category chip — shown in Today tab */}
            {activeTab === "today" && (
              <span className={`hidden sm:flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full ${catCfg.headerBg}`}>
                {catCfg.icon}
              </span>
            )}

            {/* Schedule toggle */}
            <button
              title={task.schedule === "today" ? "Move to Later" : "Move to Today"}
              onClick={(e) => { e.stopPropagation(); toggleSchedule(task.id) }}
              className={`text-xs px-2 py-0.5 rounded-full border transition
                ${task.schedule === "today"
                  ? "border-amber-400/50 text-amber-300 hover:bg-amber-400/10"
                  : "border-foreground/20 text-foreground/40 hover:text-foreground/70 hover:border-foreground/40"
                }`}
            >
              {task.schedule === "today" ? <Sun className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            </button>

            <Badge variant="secondary" className="text-foreground/70 text-xs hidden sm:inline-flex">
              {formatHours(remaining)}/{formatHours(target)}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/20 h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation()
                if (confirm("Delete this task?")) deleteTask(task.id)
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  const renderAddForm = (tab: ActiveTab) => {
    const isToday = tab === "today"
    return (
      <Card className="glass border border-border p-4 rounded-lg">
        <div className="flex flex-col gap-3">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="What are you working on?"
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask(tab)
              if (e.key === "Escape") setIsAddingTask(null)
            }}
            autoFocus
          />
          <div className="flex gap-2 flex-wrap">
            <Input
              type="number"
              min={0.25}
              step={0.25}
              value={newTaskHours}
              onChange={(e) => setNewTaskHours(Number(e.target.value))}
              className="w-20"
              placeholder="hrs"
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
              className="border rounded px-2 py-1 text-sm bg-background text-foreground"
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
            {/* Schedule picker — hidden in Today tab (always "today") */}
            {!isToday && (
              <select
                value={newTaskSchedule}
                onChange={(e) => setNewTaskSchedule(e.target.value as Schedule)}
                className="border rounded px-2 py-1 text-sm bg-background text-foreground"
              >
                <option value="today">☀️ Today</option>
                <option value="later">🕐 Later</option>
              </select>
            )}
            <Button onClick={() => addTask(tab)} size="sm">Add</Button>
            <Button onClick={() => setIsAddingTask(null)} variant="ghost" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  const renderTabContent = (tab: ActiveTab) => {
    let displayTasks: Task[]
    let accentClass: string

    if (tab === "today") {
      displayTasks = todayTasks
      accentClass = "ring-amber-400/60"
    } else {
      displayTasks = tab === "work" ? workTasks : tab === "study" ? studyTasks : personalTasks
      accentClass = CATEGORY_CONFIG[tab].accent
    }

    const incomplete = displayTasks.filter((t) => !t.isCompleted).length

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-foreground/60 text-xs">
            {incomplete === 0 ? "All done! 🎉" : `${incomplete} remaining`}
          </span>
          <Button
            size="sm"
            onClick={() => {
              setIsAddingTask(tab)
              setNewTaskTitle("")
              setNewTaskHours(1)
              setNewTaskPriority("medium")
              setNewTaskSchedule(tab === "today" ? "today" : "today")
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Task
          </Button>
        </div>

        <div className="space-y-2">
          {isAddingTask === tab && renderAddForm(tab)}
          {displayTasks.length === 0 && isAddingTask !== tab && (
            <p className="text-foreground/30 text-sm text-center py-6">No tasks here</p>
          )}
          {displayTasks.map((task) => renderTaskCard(task, accentClass))}
        </div>
      </div>
    )
  }

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode; badge?: number; activeCls: string }[] = [
    {
      key: "today",
      label: "Today",
      icon: <Sun className="w-4 h-4" />,
      badge: todayTasks.filter(t => !t.isCompleted).length,
      activeCls: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    },
    {
      key: "work",
      label: "Work",
      icon: <Briefcase className="w-4 h-4" />,
      badge: workTasks.filter(t => !t.isCompleted).length,
      activeCls: CATEGORY_CONFIG.work.headerBg,
    },
    {
      key: "study",
      label: "Study",
      icon: <BookOpen className="w-4 h-4" />,
      badge: studyTasks.filter(t => !t.isCompleted).length,
      activeCls: CATEGORY_CONFIG.study.headerBg,
    },
    {
      key: "personal",
      label: "Personal",
      icon: <Heart className="w-4 h-4" />,
      badge: personalTasks.filter(t => !t.isCompleted).length,
      activeCls: CATEGORY_CONFIG.personal.headerBg,
    },
  ]

  return (
    <div className="min-h-screen hills text-foreground flex flex-col relative">
      {/* Profile button */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setShowProfile((p) => !p)}
          className="flex items-center gap-2 bg-black/30 hover:bg-black/50 backdrop-blur border border-white/10 rounded-full pl-2 pr-3 py-1.5 transition-all"
        >
          <div className="w-6 h-6 rounded-full bg-primary/70 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {username[0].toUpperCase()}
          </div>
          <span className="text-xs text-white/80 font-medium hidden sm:block">{username}</span>
        </button>

        {showProfile && (
          <div className="absolute top-11 left-0 mt-1 w-56 glass border border-border rounded-2xl shadow-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/60 flex items-center justify-center text-lg font-bold text-white shrink-0">
                {username[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{username}</p>
                <p className="text-xs text-foreground/40">Pomodoro Timer</p>
              </div>
            </div>
            <div className="border-t border-border/40 pt-2">
              <p className="text-xs text-foreground/40 mb-0.5">Today's focus</p>
              <p className="text-xl font-bold text-primary">{formatPseudoHours(dailyMinutes)}h</p>
            </div>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" })
                router.push("/login")
                router.refresh()
              }}
              className="flex items-center gap-2 text-sm text-destructive/70 hover:text-destructive transition-colors pt-1"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
      {showProfile && <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />}

      <audio ref={audioRef} src="/sounds/alarm.mp3" preload="auto" aria-hidden="true" />

      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-white/8 backdrop-blur-md bg-black/20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-center">
          <span className="font-semibold text-foreground tracking-tight">Pomofocus</span>
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col items-center px-4 py-6">
        <div className="max-w-md w-full">
          {/* Timer Card */}
          <Card className="glass border border-border p-8 text-center mb-4 rounded-xl">
            <div className="flex justify-center mb-4 gap-2">
              {(["pomodoro", "shortBreak", "longBreak"] as TimerMode[]).map((m) => (
                <Button
                  key={m}
                  variant={mode === m ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleModeChange(m)}
                  className={mode === m ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-foreground/10"}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Button>
              ))}
            </div>
            <div className="text-9xl font-bold text-foreground mb-6 font-mono">{formatTime(timeLeft)}</div>
            <Button
              onClick={toggleTimer}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-12 py-3 text-lg font-semibold rounded-lg"
            >
              {isRunning ? "PAUSE" : "START"}
            </Button>
          </Card>

          {selectedTask && (
            <div className="text-lg text-primary font-bold text-center mb-4 flex items-center justify-center gap-2">
              {CATEGORY_CONFIG[selectedTask.category].icon}
              @{selectedTask.title}
              <span className={`text-xs px-2 py-0.5 rounded-full border ml-1
                ${selectedTask.schedule === "today"
                  ? "border-amber-400/50 text-amber-300"
                  : "border-foreground/20 text-foreground/40"}`}>
                {selectedTask.schedule === "today" ? "Today" : "Later"}
              </span>
            </div>
          )}

          {/* Tabs */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {tabs.map(({ key, label, icon, badge, activeCls }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg border text-xs font-semibold transition-all
                  ${activeTab === key
                    ? `${activeCls} border-current`
                    : "border-border text-foreground/40 hover:text-foreground/70 hover:border-border/70"
                  }`}
              >
                {icon}
                <span>{label}</span>
                {(badge ?? 0) > 0 && (
                  <span className={`text-xs rounded-full px-1.5 leading-4 ${activeTab === key ? "bg-white/20" : "bg-foreground/10"}`}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {tabs.map(({ key }) => activeTab === key && (
            <div key={key}>{renderTabContent(key)}</div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/8 backdrop-blur-md bg-black/20 mt-auto">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="text-xs text-foreground/30">© {new Date().getFullYear()} Pomofocus</span>
          <span className="text-xs text-foreground/25">Made with ❤️ for Doyel</span>
          <span className="text-xs text-foreground/30">Stay focused.</span>
        </div>
      </footer>
    </div>
  )
}
