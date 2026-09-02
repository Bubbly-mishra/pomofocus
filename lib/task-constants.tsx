import { Briefcase, BookOpen, Heart, Sun, Clock } from "lucide-react"

export type Priority = "low" | "medium" | "high"
export type Category = "work" | "study" | "personal"
export type Schedule = "today" | "later"
export type ActiveTab = "today" | Category

export interface Task {
  id: string
  title: string
  isCompleted: boolean
  targetMinutes?: number
  remainingMinutes?: number
  priority?: Priority
  category: Category
  schedule: Schedule
}

export const PRIORITY_DOT: Record<Priority, string> = {
  high:   "bg-red-400",
  medium: "bg-yellow-400",
  low:    "bg-green-400",
}

export const TAB_LABEL: Record<ActiveTab, string> = {
  today: "Today", work: "Work", study: "Study", personal: "Personal",
}

export const TAB_ICON: Record<ActiveTab, React.ReactNode> = {
  today:    <Sun       className="w-4 h-4" />,
  work:     <Briefcase className="w-4 h-4" />,
  study:    <BookOpen  className="w-4 h-4" />,
  personal: <Heart     className="w-4 h-4" />,
}

export const TAB_ACTIVE: Record<ActiveTab, string> = {
  today:    "bg-amber-500/20 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.12)]",
  work:     "bg-blue-500/20 text-blue-300 shadow-[0_0_20px_rgba(96,165,250,0.12)]",
  study:    "bg-purple-500/20 text-purple-300 shadow-[0_0_20px_rgba(192,132,252,0.12)]",
  personal: "bg-green-500/20 text-green-300 shadow-[0_0_20px_rgba(74,222,128,0.12)]",
}

export const CAT_CHIP: Record<Category, string> = {
  work:     "bg-blue-500/20 text-blue-300",
  study:    "bg-purple-500/20 text-purple-300",
  personal: "bg-green-500/20 text-green-300",
}

export const CAT_ICON: Record<Category, React.ReactNode> = {
  work:     <Briefcase className="w-3.5 h-3.5" />,
  study:    <BookOpen  className="w-3.5 h-3.5" />,
  personal: <Heart     className="w-3.5 h-3.5" />,
}

export const CAT_ACCENT: Record<Category, string> = {
  work:     "bg-blue-500/10 shadow-[inset_3px_0_0_rgba(96,165,250,0.65)]",
  study:    "bg-purple-500/10 shadow-[inset_3px_0_0_rgba(192,132,252,0.65)]",
  personal: "bg-green-500/10 shadow-[inset_3px_0_0_rgba(74,222,128,0.65)]",
}

// Matches CAT_ICON/CAT_CHIP so the task title itself carries the same
// category color instead of sitting in plain foreground gray.
export const CAT_TEXT: Record<Category, string> = {
  work:     "text-blue-300",
  study:    "text-purple-300",
  personal: "text-green-300",
}

export const fmtMins = (m = 0) => {
  const mm = Math.max(0, Math.round(m))
  const h = Math.floor(mm / 60), r = mm % 60
  if (h === 0) return `${r}m`
  if (r === 0) return `${h}h`
  return `${h}h ${r}m`
}
