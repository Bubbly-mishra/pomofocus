import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"

function toClient(doc: any) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    isCompleted: doc.isCompleted ?? false,
    createdAt: doc.createdAt ?? new Date(),
    targetMinutes: doc.targetMinutes ?? 60,
    remainingMinutes: doc.remainingMinutes ?? doc.targetMinutes ?? 60,
  }
}

export async function GET() {
  const db = await getDb()
  const items = await db.collection("tasks").find({}).sort({ createdAt: 1 }).toArray()
  return NextResponse.json(items.map(toClient))
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const title = String(body?.title || "").trim()
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 })

  const rawHours = Number(body?.targetHours)
  const targetMinutes = Number.isFinite(rawHours) ? Math.max(0, Math.round(rawHours * 60)) : 60

  const db = await getDb()
  const doc = {
    title,
    isCompleted: false,
    createdAt: new Date(),
    targetMinutes,
    remainingMinutes: 0,
  }

  const res = await db.collection("tasks").insertOne(doc)
  return NextResponse.json(toClient({ _id: res.insertedId, ...doc }), { status: 201 })
}
