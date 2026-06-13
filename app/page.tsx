import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { PomodoroTimer } from "@/components/pomodoro-timer"

export default async function Home() {
  const session = await getSession()
  if (!session) redirect("/login")
  return <PomodoroTimer />
}
