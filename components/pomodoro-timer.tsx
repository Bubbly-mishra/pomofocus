"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Plus, X, Trash2 } from "lucide-react"
import useSWR from "swr"

type TimerMode = "pomodoro" | "shortBreak" | "longBreak"
type Priority = "low" | "medium" | "high"

interface Task {
  id: string
  title: string
  isCompleted: boolean
  targetMinutes?: number
  remainingMinutes?: number
  priority?: Priority
}

interface TotalTime {
  _id: string
  date: string
  minutes: number
}

const TIMER_DURATIONS = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
}

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-400",
  low: "bg-green-500",
}

export function PomodoroTimer() {
  const [mode, setMode] = useState<TimerMode>("pomodoro")
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.pomodoro)
  const [isRunning, setIsRunning] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [newTaskHours, setNewTaskHours] = useState<number>(1)
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium")
  const [dailyMinutes, setDailyMinutes] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const endTimeRef = useRef<number | null>(null)

  const fetcher = useCallback((url: string) => fetch(url).then((r) => r.json()), [])
  const { data: tasks = [], mutate } = useSWR<Task[]>("/api/tasks", fetcher, { fallbackData: [] })
  const { data: totalTime, mutate: mutateTotalTime } = useSWR<TotalTime>("/api/totalTime", fetcher)

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

  // ✅ Format minutes into pseudo-hours for daily display
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

  const addTask = async () => {
    if (!newTaskTitle.trim()) return
    const targetMins = Math.max(0, Math.round((Number(newTaskHours) || 1) * 60))
    const optimistic: Task = {
      id: `temp-${Date.now()}`,
      title: newTaskTitle.trim(),
      isCompleted: false,
      targetMinutes: targetMins,
      remainingMinutes: 0,
      priority: newTaskPriority,
    }
    setNewTaskTitle("")
    setNewTaskHours(1)
    setNewTaskPriority("medium")
    setIsAddingTask(false)

    await mutate(
      async () => {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: optimistic.title,
            targetHours: newTaskHours,
            priority: newTaskPriority,
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

    // Update task remaining minutes
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

    // ✅ FIX: Always use POST to increment in MongoDB (send session minutes)
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
  }, [])

  useEffect(() => {
    if (!isRunning) return
    let raf = 0
    const tick = () => {
      const end = endTimeRef.current
      if (!end) return
      const msLeft = end - Date.now()
      const next = Math.max(0, Math.ceil(msLeft / 1000))
      setTimeLeft((prev) => (prev !== next ? next : prev))

      if (msLeft <= 0) {
        endTimeRef.current = null
        setIsRunning(false)
        playAlarm()
        if (mode === "pomodoro") {
          void addToRemainingMinutes()
          handleModeChange("shortBreak")
        } else {
          handleModeChange("pomodoro")
        }
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isRunning, mode, playAlarm, addToRemainingMinutes, handleModeChange])

  useEffect(() => {
    const formatted = formatTime(timeLeft)
    document.title = isRunning
      ? `${formatted} - ${mode.charAt(0).toUpperCase() + mode.slice(1)}`
      : `Pomodoro Timer`
  }, [timeLeft, isRunning, mode])

  const selectedTask = tasks.find((t) => t.id === selectedTaskId)

  return (
    <div className="min-h-screen hills text-foreground flex flex-col relative">
      {/* ✅ Daily pseudo-hours in top-left */}
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
            <div className="text-2xl text-primary font-bold text-center mb-6">@{selectedTask.title}</div>
          )}

          {/* Tasks List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-foreground text-lg font-semibold">Tasks</h2>
              <Button
                size="sm"
                onClick={() => setIsAddingTask(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Task
              </Button>
            </div>

            {isAddingTask && (
              <Card className="glass border border-border p-4 rounded-lg">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="What are you working on?"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addTask()
                      if (e.key === "Escape") setIsAddingTask(false)
                    }}
                    autoFocus
                  />
                  <Input
                    type="number"
                    min={0.25}
                    step={0.25}
                    value={newTaskHours}
                    onChange={(e) => setNewTaskHours(Number(e.target.value))}
                    className="w-20"
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

                  <Button onClick={addTask} size="sm">
                    Add
                  </Button>
                  <Button onClick={() => setIsAddingTask(false)} variant="ghost" size="sm">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            )}

            <div className="space-y-2">
              {tasks.map((task) => {
                const target = task.targetMinutes ?? 60
                const remaining = task.remainingMinutes ?? 0
                const isSelected = selectedTaskId === task.id
                const priority = task.priority ?? "medium"

                return (
                  <Card
                    key={task.id}
                    className={`glass border border-border p-4 rounded-lg cursor-pointer transition
                      ${isSelected ? "ring-2 ring-primary bg-primary/10" : "hover:ring-1 hover:ring-primary/20"}`}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={task.isCompleted}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => toggleTask(task.id)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <div
                          className={`w-3 h-3 rounded-full ${PRIORITY_COLOR[priority]}`}
                          title={`Priority: ${priority}`}
                        />
                        <span
                          className={
                            task.isCompleted ? "line-through opacity-60 text-foreground/70" : "text-foreground"
                          }
                        >
                          {task.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-foreground/80">
                          {formatHours(remaining)} / {formatHours(target)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/20"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm("Delete this task?")) deleteTask(task.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      <footer className="glass text-foreground text-center p-3 mt-3 rounded-t-xl">
        Made with ❤️ for Doyel
      </footer>
    </div>
  )
}
