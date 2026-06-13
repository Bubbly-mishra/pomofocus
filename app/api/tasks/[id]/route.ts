import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = (session.user as any).id

  const db = await getDb()
  const _id = new ObjectId(params.id)
  await db.collection("tasks").deleteOne({ _id, userId })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = (session.user as any).id

  const db = await getDb()
  const _id = new ObjectId(params.id)
  const body = await req.json().catch(() => ({}))
  const update: any = {}

  if (typeof body.isCompleted === "boolean") update.isCompleted = body.isCompleted
  if (typeof body.title === "string") update.title = body.title
  if (typeof body.targetMinutes === "number") update.targetMinutes = Math.max(0, Math.round(body.targetMinutes))
  if (typeof body.remainingMinutes === "number") update.remainingMinutes = Math.max(0, Math.round(body.remainingMinutes))
  if (["low","medium","high"].includes(body.priority)) update.priority = body.priority
  if (["work","study","personal"].includes(body.category)) update.category = body.category
  if (["today","later"].includes(body.schedule)) update.schedule = body.schedule

  if (!Object.keys(update).length) return NextResponse.json({ error: "No valid fields" }, { status: 400 })

  await db.collection("tasks").updateOne({ _id, userId }, { $set: update })
  const doc = await db.collection("tasks").findOne({ _id, userId })

  return NextResponse.json({
    id: doc!._id.toString(),
    title: doc!.title,
    isCompleted: doc!.isCompleted ?? false,
    createdAt: doc!.createdAt ?? new Date(),
    targetMinutes: doc!.targetMinutes ?? 60,
    remainingMinutes: doc!.remainingMinutes ?? 0,
    priority: doc!.priority ?? "medium",
    category: doc!.category ?? "work",
    schedule: doc!.schedule ?? "later",
  })
}
