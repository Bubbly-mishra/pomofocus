import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = await getDb()

  // Build the last 7 dates (oldest -> newest), as YYYY-MM-DD strings
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split("T")[0])
  }

  const docs = await db.collection("totalTime")
    .find({ userId: session.userId, date: { $in: days } })
    .toArray()

  const byDate = new Map(docs.map(d => [d.date, d.minutes ?? 0]))

  const result = days.map(date => ({
    date,
    minutes: byDate.get(date) ?? 0,
  }))

  return NextResponse.json(result)
}
