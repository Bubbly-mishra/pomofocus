import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"

// GET — fetch today's total minutes
export async function GET() {
  const db = await getDb()
  const today = new Date().toISOString().split("T")[0]

  const doc = await db.collection("totalTime").findOne({ date: today })
  return NextResponse.json({ minutes: doc?.minutes ?? 0 })
}

// POST — increment today's total minutes
export async function POST(req: Request) {
  try {
    const { minutes } = await req.json()
    if (typeof minutes !== "number") {
      return NextResponse.json({ error: "Invalid minutes" }, { status: 400 })
    }

    const db = await getDb()
    const today = new Date().toISOString().split("T")[0]

    const result = await db.collection("totalTime").updateOne(
      { date: today },
      {
        $inc: { minutes },
        $setOnInsert: { date: today },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true, result })
  } catch (err) {
    console.error("POST /api/totalTime error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
