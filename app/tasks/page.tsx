import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { TaskBoard } from "@/components/task-board"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"

export default async function TasksPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <div className="hills min-h-screen flex flex-col text-foreground">
      <AppHeader activePage="tasks" username={session.username} />

      {/* Main */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6">
        <TaskBoard />
      </main>

      <AppFooter />
    </div>
  )
}
