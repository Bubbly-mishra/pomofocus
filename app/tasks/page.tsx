import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { TaskBoard } from "@/components/task-board"
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
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:block">Back to Timer</span>
          </Link>

          <div className="flex flex-col items-center">
            <span className="text-lg font-bold tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-primary/90 via-foreground to-primary/90">
              DeepWork
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-foreground/30 -mt-0.5 hidden sm:block">All Tasks</span>
          </div>

          <div className="w-24" />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6">
        <TaskBoard />
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/8 mt-auto">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <span className="text-xs text-foreground/25 tracking-wide">© {new Date().getFullYear()} DeepWork</span>
          <span className="text-xs text-foreground/20">Made with ❤️ for Doyel</span>
          <span className="text-xs text-foreground/25 tracking-widest uppercase">Stay focused.</span>
        </div>
      </footer>
    </div>
  )
}
