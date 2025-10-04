"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { MoreHorizontal, Settings, BarChart3, Plus, X } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type TimerMode = "pomodoro" | "shortBreak" | "longBreak"

interface Task {
  id: string
  title: string
  completed: number
  total: number
  isCompleted: boolean
}

const TIMER_DURATIONS = {
  pomodoro: 25 * 60, // 25 minutes
  shortBreak: 1 * 60, // 5 minutes
  longBreak: 15 * 60, // 15 minutes
}

export function PomodoroTimer() {
  const [mode, setMode] = useState<TimerMode>("pomodoro")
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.pomodoro)
  const [isRunning, setIsRunning] = useState(false)
  const [currentTask, setCurrentTask] = useState("#1")
  const [currentTaskTitle, setCurrentTaskTitle] = useState("Write Everything")
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", title: "Test Dowjones", completed: 0, total: 1, isCompleted: false },
    { id: "2", title: "Email Finish", completed: 7, total: 7, isCompleted: true },
  ])
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleModeChange = useCallback((newMode: TimerMode) => {
    setMode(newMode)
    setTimeLeft(TIMER_DURATIONS[newMode])
    setIsRunning(false)
  }, [])

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const toggleTask = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId
          ? { ...task, isCompleted: !task.isCompleted, completed: task.isCompleted ? 0 : task.total }
          : task,
      ),
    )
  }

  const addTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle.trim(),
        completed: 0,
        total: 1,
        isCompleted: false,
      }
      setTasks([...tasks, newTask])
      setNewTaskTitle("")
      setIsAddingTask(false)
    }
  }

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId))
  }

  const playAlarm = useCallback(() => {
    if (!soundOn) return
    const el = audioRef.current
    try {
      if (el) {
        el.currentTime = 0
        el.volume = 0.9
        // Attempt play; ignore user-gesture restrictions gracefully
        void el.play().catch(() => {})
      }
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        // brief vibration on supported devices
        navigator.vibrate?.(200)
      }
    } catch {}
  }, [soundOn])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      playAlarm()
      setIsRunning(false)
      // Auto switch to break mode or back to pomodoro
      if (mode === "pomodoro") {
        handleModeChange("shortBreak")
      } else {
        handleModeChange("pomodoro")
      }
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeLeft, mode, handleModeChange, playAlarm])

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <audio ref={audioRef} src="/sounds/alarm.mp3" preload="auto" aria-hidden="true" />
      <div className="sr-only" aria-live="assertive">
        {timeLeft === 0 ? "Time is up" : ""}
      </div>

      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-primary-foreground rounded-full" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Pomofocus</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-foreground hover:bg-accent">
            <BarChart3 className="w-4 h-4 mr-2" />
            Report
          </Button>
          <Button variant="ghost" size="sm" className="text-foreground hover:bg-accent">
            <Settings className="w-4 h-4 mr-2" />
            Setting
          </Button>
          <div className="w-8 h-8 bg-accent rounded-full overflow-hidden">
            <img src="/diverse-user-avatars.png" alt="User avatar" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      {/* Main Timer Card */}
      <div className="max-w-md mx-auto">
        <Card className="bg-card border-border p-8 text-center mb-8">
          {/* Timer Mode Tabs */}
          <div className="flex justify-center mb-8">
            <div className="flex bg-accent/50 rounded-lg p-1">
              <Button
                variant={mode === "pomodoro" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleModeChange("pomodoro")}
                className={
                  mode === "pomodoro" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                }
              >
                Pomodoro
              </Button>
              <Button
                variant={mode === "shortBreak" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleModeChange("shortBreak")}
                className={
                  mode === "shortBreak" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                }
              >
                Short Break
              </Button>
              <Button
                variant={mode === "longBreak" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleModeChange("longBreak")}
                className={
                  mode === "longBreak" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                }
              >
                Long Break
              </Button>
            </div>
          </div>

          {/* Timer Display */}
          <div className="text-8xl font-bold text-foreground mb-8 font-mono">{formatTime(timeLeft)}</div>

          {/* Start/Pause Button */}
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
            <label htmlFor="alarm-sound" className="cursor-pointer">
              Alarm sound
            </label>
          </div>
        </Card>

        {/* Current Task */}
        <div className="text-center mb-6">
          <div className="text-muted-foreground text-sm mb-1">{currentTask}</div>
          <div className="text-foreground text-lg">{currentTaskTitle}</div>
        </div>

        {/* Tasks Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-lg font-semibold">Tasks</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setIsAddingTask(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <hr className="border-border" />

          {/* Add Task Input */}
          {isAddingTask && (
            <Card className="bg-card border-border p-4">
              <div className="flex items-center gap-2">
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
                <Button onClick={addTask} size="sm">
                  Add
                </Button>
                <Button onClick={() => setIsAddingTask(false)} variant="ghost" size="sm">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* Task List */}
          <div className="space-y-2">
            {tasks.map((task) => (
              <Card key={task.id} className="bg-card border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={task.isCompleted}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className={`text-foreground ${task.isCompleted ? "line-through opacity-60" : ""}`}>
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-muted-foreground">
                      {task.completed}/{task.total}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => deleteTask(task.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
