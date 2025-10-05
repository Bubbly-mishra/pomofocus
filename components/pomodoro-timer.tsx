"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { MoreHorizontal, Settings, BarChart3, Plus, X, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import useSWR from "swr"

type TimerMode = "pomodoro" | "shortBreak" | "longBreak"

interface Task {
  id: string
  title: string
  isCompleted: boolean
  targetMinutes?: number
  remainingMinutes?: number
}

const TIMER_DURATIONS = {
  pomodoro: 1 * 60, // 1 min for testing
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
}

export function PomodoroTimer() {
  const [mode, setMode] = useState<TimerMode>("pomodoro")
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.pomodoro)
  const [isRunning, setIsRunning] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [newTaskHours, setNewTaskHours] = useState<number>(1)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fetcher = useCallback((url: string) => fetch(url).then((r) => r.json()), [])
  const { data: tasks = [], mutate } = useSWR<Task[]>("/api/tasks", fetcher, {
    fallbackData: [],
  })

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const formatHours = (mins?: number) => {
    const m = Math.max(0, Math.round(mins ?? 0))
    const hours = Math.floor(m / 60)
    const minutesPart = m % 60
    // Display as decimal like 0.12 for 12 minutes
    return `${(hours + minutesPart / 100).toFixed(2)}h`
  }

  const handleModeChange = useCallback((newMode: TimerMode) => {
    setMode(newMode)
    setTimeLeft(TIMER_DURATIONS[newMode])
    setIsRunning(false)
  }, [])

  const toggleTimer = () => setIsRunning(!isRunning)

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
    }
    setNewTaskTitle("")
    setNewTaskHours(1)
    setIsAddingTask(false)

    await mutate(
      async () => {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: optimistic.title, targetHours: newTaskHours }),
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
          t.id === selectedTaskId ? { ...t, remainingMinutes: nextRemaining } : t
        )
      },
      {
        optimisticData: tasks.map((t) =>
          t.id === selectedTaskId ? { ...t, remainingMinutes: nextRemaining } : t
        ),
        revalidate: true,
      }
    )
  }, [selectedTaskId, tasks, mutate])

  const playAlarm = useCallback(() => {
    if (!soundOn) return
    const el = audioRef.current
    try {
      if (el) {
        el.currentTime = 0
        el.volume = 0.9
        void el.play().catch(() => {})
      }
      navigator.vibrate?.(200)
    } catch {}
  }, [soundOn])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000)
    } else if (timeLeft === 0) {
      playAlarm()
      setIsRunning(false)
      if (mode === "pomodoro") {
        void addToRemainingMinutes()
        handleModeChange("shortBreak")
      } else {
        handleModeChange("pomodoro")
      }
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeLeft, mode, handleModeChange, playAlarm, addToRemainingMinutes])

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <audio ref={audioRef} src="/sounds/alarm.mp3" preload="auto" aria-hidden="true" />

      {/* Timer Card */}
      <div className="max-w-md mx-auto">
        <Card className="bg-card border-border p-8 text-center mb-8">
          <div className="flex justify-center mb-8">
            {(["pomodoro", "shortBreak", "longBreak"] as TimerMode[]).map((m) => (
              <Button
                key={m}
                variant={mode === m ? "default" : "ghost"}
                size="sm"
                onClick={() => handleModeChange(m)}
                className={mode === m ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Button>
            ))}
          </div>
          <div className="text-8xl font-bold text-foreground mb-8 font-mono">{formatTime(timeLeft)}</div>
          <Button
            onClick={toggleTimer}
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-12 py-3 text-lg font-semibold"
          >
            {isRunning ? "PAUSE" : "START"}
          </Button>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="alarm-sound"
              checked={soundOn}
              onCheckedChange={() => setSoundOn((v) => !v)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <label htmlFor="alarm-sound" className="cursor-pointer">Alarm sound</label>
          </div>
        </Card>

        {/* Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-lg font-semibold">Tasks</h2>
            <Button size="sm" onClick={() => setIsAddingTask(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" /> Add Task
            </Button>
          </div>

          {isAddingTask && (
            <Card className="bg-card border-border p-4">
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
                  className="w-28"
                />
                <Button onClick={addTask} size="sm">Add</Button>
                <Button onClick={() => setIsAddingTask(false)} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
              </div>
            </Card>
          )}

          <div className="space-y-2">
            {tasks.map((task) => {
              const target = task.targetMinutes ?? 60
              const remaining = task.remainingMinutes ?? 0
              const isSelected = selectedTaskId === task.id

              return (
                <Card
                  key={task.id}
                  className={`bg-card border-border p-4 cursor-pointer ${isSelected ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={task.isCompleted}
                        onCheckedChange={(e) => {
                          e.stopPropagation()
                          toggleTask(task.id)
                        }}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className={task.isCompleted ? "line-through opacity-60" : ""}>{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-muted-foreground">{formatHours(remaining)} / {formatHours(target)}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
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
    </div>
  )
}
