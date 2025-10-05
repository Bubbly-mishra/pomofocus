import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"

function toClient(doc: any) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    completed: doc.completed ?? 0,
    total: doc.total ?? 1,
    isCompleted: doc.isCompleted ?? false,
    createdAt: doc.createdAt ?? new Date(),
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

  const db = await getDb()
  const doc = {
    title,
    completed: 0,
    total: 1,
    isCompleted: false,
    createdAt: new Date(),
  }
  const res = await db.collection("tasks").insertOne(doc)
  return NextResponse.json(toClient({ _id: res.insertedId, ...doc }), { status: 201 })
}
