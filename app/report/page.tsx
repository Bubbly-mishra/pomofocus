import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { AppHeader } from "@/components/app-header"
import { AppFooter } from "@/components/app-footer"
import { MonthlyReport } from "@/components/monthly-report"

export default async function ReportPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <div className="hills min-h-screen flex flex-col text-foreground">
      <AppHeader activePage="report" username={session.username} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <MonthlyReport />
      </main>

      <AppFooter />
    </div>
  )
}
