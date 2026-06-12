"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Plus, X, Trash2, Briefcase, BookOpen } from "lucide-react"
import useSWR from "swr"

type TimerMode = "pomodoro" | "shortBreak" | "longBreak"
type Priority = "low" | "medium" | "high"
type Category = "work" | "study"

interface Task {
  id: string
  title: string
  isCompleted: boolean
  targetMinutes?: number
  remainingMinutes?: number
  priority?: Priority
  category: Category
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

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-400",
  low: "bg-green-500",
}

const CATEGORY_CONFIG: Record<Category, { label: string; icon: React.ReactNode; accent: string; headerBg: string }> = {
  work: {
    label: "Work",
    icon: <Briefcase className="w-4 h-4" />,
    accent: "ring-blue-400/60",
    headerBg: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  },
  study: {
    label: "Study",
    icon: <BookOpen className="w-4 h-4" />,
    accent: "ring-purple-400/60",
    headerBg: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
}

export function PomodoroTimer() {
  const [mode, setMode] = useState<TimerMode>("pomodoro")
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.pomodoro)
  const [isRunning, setIsRunning] = useState(false)
  const [activeCategory, setActiveCategory] = useState<Category>("work")
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isAddingTask, setIsAddingTask] = useState<Category | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [newTaskHours, setNewTaskHours] = useState<number>(1)
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium")
  const [dailyMinutes, setDailyMinutes] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const endTimeRef = useRef<number | null>(null)

  const fetcher = useCallback((url: string) => fetch(url).then((r) => r.json()), [])
  const { data: tasks = [], mutate } = useSWR<Task[]>("/api/tasks", fetcher, { fallbackData: [] })
  const { data: totalTime, mutate: mutateTotalTime } = useSWR<TotalTime>("/api/totalTime", fetcher)

  const workTasks = tasks.filter((t) => t.category === "work")
  const studyTasks = tasks.filter((t) => t.category === "study")

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

  const addTask = async (category: Category) => {
    if (!newTaskTitle.trim()) return
    const targetMins = Math.max(0, Math.round((Number(newTaskHours) || 1) * 60))
    const optimistic: Task = {
      id: `temp-${Date.now()}`,
      title: newTaskTitle.trim(),
      isCompleted: false,
      targetMinutes: targetMins,
      remainingMinutes: 0,
      priority: newTaskPriority,
      category,
    }
    setNewTaskTitle("")
    setNewTaskHours(1)
    setNewTaskPriority("medium")
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

  const renderTaskList = (category: Category) => {
    const catTasks = category === "work" ? workTasks : studyTasks
    const cfg = CATEGORY_CONFIG[category]
    const isAdding = isAddingTask === category

    return (
      <div className="space-y-2">
        {isAdding && (
          <Card className="glass border border-border p-4 rounded-lg">
            <div className="flex flex-col gap-3">
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="What are you working on?"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask(category)
                  if (e.key === "Escape") setIsAddingTask(null)
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={newTaskHours}
                  onChange={(e) => setNewTaskHours(Number(e.target.value))}
                  className="w-24"
                  placeholder="Hours"
                />
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                  className="border rounded px-2 py-1 text-sm bg-background text-foreground flex-1"
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
                <Button onClick={() => addTask(category)} size="sm">Add</Button>
                <Button onClick={() => setIsAddingTask(null)} variant="ghost" size="sm">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {catTasks.length === 0 && !isAdding && (
          <p className="text-foreground/40 text-sm text-center py-4">No tasks yet</p>
        )}

        {catTasks.map((task) => {
          const target = task.targetMinutes ?? 60
          const remaining = task.remainingMinutes ?? 0
          const isSelected = selectedTaskId === task.id
          const priority = task.priority ?? "medium"

          return (
            <Card
              key={task.id}
              className={`glass border border-border p-4 rounded-lg cursor-pointer transition
                ${isSelected ? `ring-2 ${cfg.accent} bg-primary/10` : "hover:ring-1 hover:ring-primary/20"}`}
              onClick={() => setSelectedTaskId(task.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox
                    checked={task.isCompleted}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => toggleTask(task.id)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                  />
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_COLOR[priority]}`}
                    title={`Priority: ${priority}`}
                  />
                  <span
                    className={`truncate ${task.isCompleted ? "line-through opacity-60 text-foreground/70" : "text-foreground"}`}
                  >
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Badge variant="secondary" className="text-foreground/80 text-xs">
                    {formatHours(remaining)} / {formatHours(target)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/20 h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm("Delete this task?")) deleteTask(task.id)
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className="min-h-screen hills text-foreground flex flex-col relative">
      <div className="fixed top-4 left-4 z-50 text-sm bg-primary/20 text-primary-foreground px-3 py-1 rounded shadow">
        {formatPseudoHours(dailyMinutes)}h today
      </div>

      <audio ref={audioRef} src="/sounds/alarm.mp3" preload="auto" aria-hidden="true" />

      <header className="glass p-4 text-center text-1xl font-bold rounded-b-xl mb-4">
        Pomodoro Timer
      </header>

      <main className="flex-1 w-full flex flex-col items-center px-4">
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
                  className={
                    mode === m ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-foreground/10"
                  }
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
            <div className="text-xl text-primary font-bold text-center mb-4 flex items-center justify-center gap-2">
              {CATEGORY_CONFIG[selectedTask.category].icon}
              @{selectedTask.title}
            </div>
          )}

          {/* Category Tabs */}
          <div className="flex gap-2 mb-3">
            {(["work", "study"] as Category[]).map((cat) => {
              const cfg = CATEGORY_CONFIG[cat]
              const isActive = activeCategory === cat
              const count = (cat === "work" ? workTasks : studyTasks).filter(t => !t.isCompleted).length
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border text-sm font-semibold transition-all
                    ${isActive
                      ? `${cfg.headerBg} border-current`
                      : "border-border text-foreground/50 hover:text-foreground/80 hover:border-border/80"
                    }`}
                >
                  {cfg.icon}
                  {cfg.label}
                  {count > 0 && (
                    <span className={`text-xs rounded-full px-1.5 py-0.5 ${isActive ? "bg-white/20" : "bg-foreground/10"}`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Active Category Task Panel */}
          {(["work", "study"] as Category[]).map((cat) => (
            activeCategory === cat && (
              <div key={cat} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-foreground/70 text-sm font-medium">
                    {workTasks.filter(t=>!t.isCompleted).length + studyTasks.filter(t=>!t.isCompleted).length === 0
                      ? "All done! 🎉"
                      : `${(cat === "work" ? workTasks : studyTasks).filter(t => !t.isCompleted).length} task(s) remaining`}
                  </h2>
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsAddingTask(cat)
                      setNewTaskTitle("")
                      setNewTaskHours(1)
                      setNewTaskPriority("medium")
                    }}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Task
                  </Button>
                </div>
                {renderTaskList(cat)}
              </div>
            )
          ))}
        </div>
      </main>

      <footer className="glass text-foreground text-center p-3 mt-3 rounded-t-xl">
        Made with ❤️ for Doyel
      </footer>
    </div>
  )
}
