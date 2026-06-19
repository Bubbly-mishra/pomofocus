import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"

const dateKey = (date: Date) => date.toISOString().split("T")[0]

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const days: string[] = []
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(dateKey(new Date(year, month, day)))
  }

  const db = await getDb()
  const docs = await db.collection("totalTime")
    .find({ userId: session.userId, date: { $gte: dateKey(firstDay), $lte: dateKey(lastDay) } })
    .toArray()

  const byDate = new Map(docs.map(doc => [doc.date, doc.minutes ?? 0]))

  return NextResponse.json({
    month: firstDay.toLocaleString("en", { month: "long", year: "numeric" }),
    dailyGoalMinutes: 50 * 6,
    days: days.map(date => ({
      date,
      minutes: byDate.get(date) ?? 0,
    })),
  })
}
