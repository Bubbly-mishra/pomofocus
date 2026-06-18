import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { TaskBoard } from "@/components/task-board"
import { AppBrand } from "@/components/app-brand"
import { AppFooter } from "@/components/app-footer"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function TasksPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <div className="hills min-h-screen flex flex-col text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/8">
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/25 to-black/40 backdrop-blur-xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium border border-white/10 bg-white/6 text-foreground/60 hover:text-foreground/90 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:block">Back to Timer</span>
          </Link>

          <AppBrand subtitle="All Tasks" />

          <div className="w-24" />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6">
        <TaskBoard />
      </main>

      <AppFooter />
    </div>
  )
}
