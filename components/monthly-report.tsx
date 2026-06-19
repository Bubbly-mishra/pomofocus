"use client"

import { useState } from "react"
import useSWR from "swr"

interface DayStat {
  date: string
  minutes: number
}

interface MonthlyTime {
  month: string
  dailyGoalMinutes: number
  days: DayStat[]
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

const fmtHours = (minutes = 0) => {
  const hours = minutes / 60
  if (hours === 0) return "0h"
  return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)}h`
}

const dayLabel = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`)
  return parsed.toLocaleDateString("en", { weekday: "short", day: "numeric" })
}

const localDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const todayKey = () => localDateKey(new Date())

const weekStartKey = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`)
  const mondayOffset = (parsed.getDay() + 6) % 7
  parsed.setDate(parsed.getDate() - mondayOffset)
  return localDateKey(parsed)
}

const weekRangeLabel = (week: DayStat[]) => {
  const first = week[0]?.date
  const last = week[week.length - 1]?.date
  if (!first || !last) return ""

  const start = new Date(`${first}T00:00:00`)
  const end = new Date(`${last}T00:00:00`)
  return `${start.toLocaleDateString("en", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en", { month: "short", day: "numeric" })}`
}

export function MonthlyReport() {
  const [showFullMonth, setShowFullMonth] = useState(false)
  const { data, isLoading } = useSWR<MonthlyTime>("/api/monthlyTime", fetcher)
  const days = data?.days ?? []
  const today = todayKey()
  const todayStat = days.find(day => day.date === today)
  const totalMinutes = days.reduce((sum, day) => sum + day.minutes, 0)
  const workedDays = days.filter(day => day.minutes > 0).length
  const bestDay = days.reduce<DayStat | null>((best, day) => !best || day.minutes > best.minutes ? day : best, null)
  const weeks = Array.from(days.reduce<Map<string, DayStat[]>>((groups, day) => {
    const key = weekStartKey(day.date)
    groups.set(key, [...(groups.get(key) ?? []), day])
    return groups
  }, new Map()).entries()).map(([weekStart, weekDays]) => ({ weekStart, days: weekDays }))
  const currentWeekStart = weekStartKey(today)
  const currentWeek = weeks.find(week => week.weekStart === currentWeekStart) ?? weeks[0]
  const visibleWeeks = showFullMonth ? weeks : currentWeek ? [currentWeek] : []
  const visibleMinutes = visibleWeeks.reduce((sum, week) => sum + week.days.reduce((weekSum, day) => weekSum + day.minutes, 0), 0)

  return (
    <div className="w-full rounded-[2.5rem] bg-black/30 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_70px_rgba(0,0,0,0.35)] overflow-hidden">
      <div className="px-6 sm:px-8 py-5 flex items-center justify-between flex-wrap gap-4 bg-white/[0.025]">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary/70 font-semibold">Focus Report</p>
          <h1 className="text-2xl font-bold text-foreground mt-1">{showFullMonth ? data?.month ?? "This Month" : "Current Week"}</h1>
          <p className="text-sm text-foreground/55 mt-1">
            Today: <span className="text-primary font-semibold">{fmtHours(todayStat?.minutes ?? 0)}</span> tracked against a 5h daily goal.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/6 px-4 py-3">
            <p className="text-lg font-bold text-primary">{fmtHours(totalMinutes)}</p>
            <p className="text-[11px] text-foreground/50">total</p>
          </div>
          <div className="rounded-2xl bg-white/6 px-4 py-3">
            <p className="text-lg font-bold text-foreground">{workedDays}</p>
            <p className="text-[11px] text-foreground/50">active days</p>
          </div>
          <div className="rounded-2xl bg-white/6 px-4 py-3">
            <p className="text-lg font-bold text-foreground">{bestDay ? fmtHours(bestDay.minutes) : "0h"}</p>
            <p className="text-[11px] text-foreground/50">best day</p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7 space-y-4">
        {isLoading && <div className="rounded-3xl bg-white/[0.025] px-5 py-12 text-center text-foreground/45">Loading report...</div>}

        {!isLoading && (
          <div className="rounded-3xl bg-primary/8 px-5 py-4 flex items-center justify-between gap-4 flex-wrap shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-primary/70 font-semibold">
                {showFullMonth ? "Full month view" : "Showing this week"}
              </p>
              <p className="text-sm text-foreground/60 mt-1">
                {showFullMonth
                  ? "Expand view is on, so every week in this month is visible."
                  : "Default view keeps the report focused on the current week."}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary">{fmtHours(visibleMinutes)}</p>
              <p className="text-xs text-foreground/45">{showFullMonth ? "visible month total" : "this week total"}</p>
            </div>
          </div>
        )}

        {!isLoading && visibleWeeks.map((week, index) => (
          <section key={week.weekStart} className="rounded-3xl bg-white/[0.025] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {showFullMonth ? `Week ${weeks.findIndex(item => item.weekStart === week.weekStart) + 1}` : "This Week"}
                </h2>
                <p className="text-xs text-foreground/45 mt-0.5">{weekRangeLabel(week.days)}</p>
              </div>
              <span className="text-xs text-foreground/45">{fmtHours(week.days.reduce((sum, day) => sum + day.minutes, 0))}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {week.days.map(day => {
                const dailyGoal = data?.dailyGoalMinutes ?? 300
                const pct = Math.min(100, Math.round((day.minutes / dailyGoal) * 100))
                const isToday = day.date === today
                const goalMet = day.minutes >= dailyGoal
                const minutesLeft = Math.max(0, dailyGoal - day.minutes)

                return (
                  <div
                    key={day.date}
                    className={[
                      "rounded-2xl px-3 py-3 min-h-32 flex flex-col justify-between transition-all",
                      isToday
                        ? "bg-primary/12 shadow-[inset_0_0_0_1px_rgba(207,236,245,0.32),0_0_34px_rgba(207,236,245,0.16)]"
                        : goalMet
                          ? "bg-emerald-400/8 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.12)]"
                          : "bg-black/18",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className={["text-xs font-medium", isToday ? "text-primary" : "text-foreground/65"].join(" ")}>
                          {dayLabel(day.date)}
                        </p>
                        {isToday && (
                          <span className="mt-1 inline-flex rounded-full bg-primary/18 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-primary">{fmtHours(day.minutes)}</p>
                    </div>
                    <div className="h-16 flex items-end">
                      <div className="w-full rounded-full bg-primary/10 overflow-hidden">
                        <div
                          className="rounded-full bg-primary shadow-[0_0_18px_rgba(207,236,245,0.22)] transition-all"
                          style={{ height: 8, width: `${Math.max(4, pct)}%`, opacity: day.minutes > 0 ? 1 : 0.25 }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-foreground/40">{pct}% of goal</p>
                      <p className={["text-[11px] font-medium", goalMet ? "text-emerald-300" : "text-foreground/45"].join(" ")}>
                        {goalMet ? "goal met" : `${fmtHours(minutesLeft)} left`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {!isLoading && weeks.length > 1 && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setShowFullMonth(value => !value)}
              className="rounded-full bg-primary/12 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/18 transition-all shadow-[0_0_24px_rgba(207,236,245,0.12)]"
            >
              {showFullMonth ? "Hide full month" : "Show full month report"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
