import { PomodoroTimer } from "@/components/pomodoro-timer"

export const metadata = {
  title: "Pomodoro Timer",
  icons: {
    icon: "/clock.png", // just the path from public/
  },
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <PomodoroTimer />
    </main>
  )
}
