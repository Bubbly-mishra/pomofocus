"use client"

import { useState, useCallback } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Plus, X, Trash2, Sun, Clock } from "lucide-react"
import useSWR from "swr"
import {
  Task, Priority, Category, Schedule, ActiveTab,
  PRIORITY_DOT, TAB_LABEL, TAB_ICON, TAB_ACTIVE, CAT_CHIP, CAT_ICON, CAT_ACCENT, CAT_TEXT, fmtMins,
} from "@/lib/task-constants"

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
}

export function TaskBoard() {
  const [activeTab,       setActiveTab]       = useState<ActiveTab>("today")
  const [isAddingTask,    setIsAddingTask]    = useState(false)
  const [newTitle,        setNewTitle]        = useState("")
  const [newHours,        setNewHours]        = useState(1)
  const [newPriority,     setNewPriority]     = useState<Priority>("medium")
  const [newSchedule,     setNewSchedule]     = useState<Schedule>("today")
  const [newCategory,     setNewCategory]     = useState<Category>("work")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showCompleted,   setShowCompleted]   = useState(false)

  const fetcher = useCallback((url: string) => fetch(url).then(r => r.json()), [])
  const { data: tasks = [], mutate } = useSWR<Task[]>("/api/tasks", fetcher, { fallbackData: [] })

  const tabTasks = useCallback((tab: ActiveTab) => {
    if (tab === "today") return tasks.filter(t => t.schedule === "today")
    return tasks.filter(t => t.category === (tab as Category))
  }, [tasks])

  const displayTasks = tabTasks(activeTab)
  const openTasks = displayTasks.filter(t => !t.isCompleted)
  const doneTasks = displayTasks.filter(t => t.isCompleted)
  const plannedMinutes = openTasks.reduce((sum, task) => sum + (task.targetMinutes ?? 60), 0)

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
    const next = tasks.filter(t => t.id !== id)
    await mutate(async () => { await fetch(`/api/tasks/${id}`, { method: "DELETE" }); return next }, { optimisticData: next, revalidate: true })
  }

  return (
    <div className="flex flex-col gap-4 w-full">

      <div className="rounded-[2rem] bg-black/30 backdrop-blur-sm px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_52px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/70 font-semibold">Task Board</p>
            <h1 className="text-2xl font-bold text-foreground mt-1">Plan the work. Keep it clean.</h1>
            <p className="text-sm text-foreground/55 mt-1">A calmer view of what needs your focus next.</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/6 px-4 py-3">
              <p className="text-lg font-bold text-primary">{openTasks.length}</p>
              <p className="text-[11px] text-foreground/50">open</p>
            </div>
            <div className="rounded-2xl bg-white/6 px-4 py-3">
              <p className="text-lg font-bold text-foreground">{doneTasks.length}</p>
              <p className="text-[11px] text-foreground/50">done</p>
            </div>
            <div className="rounded-2xl bg-white/6 px-4 py-3">
              <p className="text-lg font-bold text-foreground">{fmtMins(plannedMinutes)}</p>
              <p className="text-[11px] text-foreground/50">planned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto rounded-full bg-black/18 p-1 w-fit max-w-full" style={{ scrollbarWidth: "none" }}>
        {(["today", "work", "study", "personal"] as ActiveTab[]).map(tab => {
          const count    = tabTasks(tab).filter(t => !t.isCompleted).length
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setIsAddingTask(false); setShowCompleted(false) }}
              className={[
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap shrink-0 border border-transparent",
                isActive ? `${TAB_ACTIVE[tab]} border-primary/15` : "text-foreground/60 hover:text-foreground/85 hover:bg-white/8",
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
      <div className="rounded-[2rem] bg-white/[0.025] backdrop-blur-xl flex flex-col overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_18px_52px_rgba(0,0,0,0.26)]">

        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-3 gap-3">
          <div className="shrink-0">
            <h2 className="font-semibold text-foreground text-base">{TAB_LABEL[activeTab]}</h2>
            <p className="text-xs text-foreground/55 mt-0.5">
              {displayTasks.filter(t => !t.isCompleted).length === 0
                ? (displayTasks.length > 0 ? "All done" : "No tasks yet")
                : `${displayTasks.filter(t => !t.isCompleted).length} remaining`}
            </p>
          </div>

          <button
            onClick={() => { setIsAddingTask(true); setNewTitle(""); setNewHours(1); setNewPriority("medium"); setNewSchedule("today"); setNewCategory("work") }}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:brightness-110 rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>

        {/* Daily capacity bar — Today tab only */}
        {activeTab === "today" && (() => {
          const totalHours = tabTasks("today").filter(t => !t.isCompleted).reduce((sum: number, t: Task) => sum + (t.targetMinutes ?? 60) / 60, 0)
          const cap = 6
          const over = totalHours > cap
          const pct = Math.min(1, totalHours / cap)
          const display = totalHours % 1 === 0 ? totalHours.toString() : totalHours.toFixed(1)
          return (
            <div className="px-5 pb-3 -mt-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className={["text-xs font-medium", over ? "text-red-300" : "text-foreground/55"].join(" ")}>
                  {display} of {cap}h deep work occupied
                </span>
                {over && <span className="text-xs font-semibold text-red-300">Over capacity</span>}
              </div>
              <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                <div
                  className={["h-full rounded-full transition-all duration-500", over ? "bg-red-400" : "bg-primary/70"].join(" ")}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            </div>
          )
        })()}

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
              {activeTab === "today" ? (
                <select value={newCategory} onChange={e => setNewCategory(e.target.value as Category)} className="rounded-lg px-2 py-1.5 text-xs bg-black/25 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <option value="work">💼 Work</option>
                  <option value="study">📖 Study</option>
                  <option value="personal">🩷 Personal</option>
                </select>
              ) : (
                <select value={newSchedule} onChange={e => setNewSchedule(e.target.value as Schedule)} className="rounded-lg px-2 py-1.5 text-xs bg-black/25 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <option value="today">☀️ Today</option>
                  <option value="later">🕐 Later</option>
                </select>
              )}
              <div className="flex gap-1.5 ml-auto">
                <button onClick={addTask} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-semibold hover:brightness-110 transition">Add</button>
                <button onClick={() => setIsAddingTask(false)} className="text-foreground/50 hover:text-foreground hover:bg-white/8 p-1.5 rounded-lg transition"><X className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        )}

        {/* Task list */}
        <div className="px-3 py-2.5 space-y-1.5">
          {displayTasks.length === 0 && !isAddingTask && (
            <div className="flex flex-col items-center justify-center py-16 text-foreground/40">
              <p className="text-4xl mb-2">✓</p>
              <p className="text-sm">Nothing here yet</p>
            </div>
          )}

          {openTasks.map(task => {
            const isConfirm = confirmDeleteId === task.id
            const priority  = task.priority ?? "medium"
            const spent     = task.remainingMinutes ?? 0
            const target    = task.targetMinutes ?? 60

            return (
              <div
                key={task.id}
                className={[
                  "flex items-center gap-3 p-3.5 rounded-2xl transition-all",
                  "bg-black/18 hover:bg-black/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]",
                  activeTab === "today" ? CAT_ACCENT[task.category] : "",
                ].join(" ")}
              >
                <Checkbox
                  checked={task.isCompleted}
                  onCheckedChange={() => toggleTask(task.id)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary border-2 border-foreground/50 shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={["w-2 h-2 rounded-full shrink-0", PRIORITY_DOT[priority]].join(" ")} />
                    <span className={["text-sm min-w-0 truncate font-semibold", CAT_TEXT[task.category]].join(" ")}>
                    {task.title}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-foreground/40">
                      {fmtMins(spent)} focused / {fmtMins(target)} planned
                    </span>
                    <span className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-foreground/40">
                      {PRIORITY_LABEL[priority]} priority
                    </span>
                    {activeTab === "today" && (
                      <span className={["flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full", CAT_CHIP[task.category]].join(" ")}>
                        {CAT_ICON[task.category]}
                        {TAB_LABEL[task.category]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    title={task.schedule === "today" ? "Move to Later" : "Move to Today"}
                    onClick={() => toggleSchedule(task.id)}
                    className={[
                      "p-2 rounded-xl transition",
                      task.schedule === "today"
                        ? "text-amber-300 bg-amber-400/10 hover:bg-amber-400/20"
                        : "text-foreground/50 hover:text-foreground/75 hover:bg-white/8",
                    ].join(" ")}
                  >
                    {task.schedule === "today" ? <Sun className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </button>
                  {isConfirm ? (
                    <>
                      <button onClick={() => deleteTask(task.id)} className="text-xs px-2.5 py-1 rounded-lg bg-destructive text-white hover:brightness-110 font-semibold">Yes</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs px-2.5 py-1 rounded-lg bg-white/6 text-foreground/50 hover:text-foreground hover:bg-white/10">No</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(task.id)} className="p-2 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {doneTasks.length > 0 && (
            <div className="pt-1">
              <button
                onClick={() => setShowCompleted(p => !p)}
                className="flex items-center gap-2 px-1 py-2 text-xs font-semibold text-foreground/50 hover:text-foreground/80 transition-colors w-full"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" className={["transition-transform shrink-0", showCompleted ? "rotate-180" : ""].join(" ")}>
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {showCompleted ? "Hide" : "Show"} completed ({doneTasks.length})
              </button>

              {showCompleted && (
                <div className="space-y-1.5 mt-1">
                  {doneTasks.map(task => {
                    const isConfirm = confirmDeleteId === task.id
                    const priority  = task.priority ?? "medium"
                    const spent     = task.remainingMinutes ?? 0
                    const target    = task.targetMinutes ?? 60

                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3.5 rounded-2xl transition-all bg-black/18 hover:bg-black/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] opacity-40"
                      >
                        <Checkbox
                          checked={task.isCompleted}
                          onCheckedChange={() => toggleTask(task.id)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary border-2 border-foreground/50 shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={["w-2 h-2 rounded-full shrink-0", PRIORITY_DOT[priority]].join(" ")} />
                            <span className={["text-sm min-w-0 truncate font-semibold line-through", CAT_TEXT[task.category]].join(" ")}>
                            {task.title}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-foreground/40">
                              {fmtMins(spent)} focused / {fmtMins(target)} planned
                            </span>
                            <span className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] text-foreground/40">
                              {PRIORITY_LABEL[priority]} priority
                            </span>
                            {activeTab === "today" && (
                              <span className={["flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full", CAT_CHIP[task.category]].join(" ")}>
                                {CAT_ICON[task.category]}
                                {TAB_LABEL[task.category]}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            title={task.schedule === "today" ? "Move to Later" : "Move to Today"}
                            onClick={() => toggleSchedule(task.id)}
                            className={[
                              "p-2 rounded-xl transition",
                              task.schedule === "today"
                                ? "text-amber-300 bg-amber-400/10 hover:bg-amber-400/20"
                                : "text-foreground/50 hover:text-foreground/75 hover:bg-white/8",
                            ].join(" ")}
                          >
                            {task.schedule === "today" ? <Sun className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </button>
                          {isConfirm ? (
                            <>
                              <button onClick={() => deleteTask(task.id)} className="text-xs px-2.5 py-1 rounded-lg bg-destructive text-white hover:brightness-110 font-semibold">Yes</button>
                              <button onClick={() => setConfirmDeleteId(null)} className="text-xs px-2.5 py-1 rounded-lg bg-white/6 text-foreground/50 hover:text-foreground hover:bg-white/10">No</button>
                            </>
                          ) : (
                            <button onClick={() => setConfirmDeleteId(task.id)} className="p-2 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
