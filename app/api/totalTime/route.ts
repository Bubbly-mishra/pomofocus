import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"

export async function GET() {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = (session.user as any).id

  const db = await getDb()
  const today = new Date().toISOString().split("T")[0]
  const doc = await db.collection("totalTime").findOne({ userId, date: today })
  return NextResponse.json({ minutes: doc?.minutes ?? 0 })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = (session.user as any).id

  const { minutes } = await req.json()
  if (typeof minutes !== "number") return NextResponse.json({ error: "Invalid minutes" }, { status: 400 })

  const db = await getDb()
  const today = new Date().toISOString().split("T")[0]
  await db.collection("totalTime").updateOne(
    { userId, date: today },
    { $inc: { minutes }, $setOnInsert: { userId, date: today } },
    { upsert: true }
  )
  return NextResponse.json({ success: true })
}
