import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

type Priority = "low" | "medium" | "high"

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const db = await getDb()
  const _id = new ObjectId(params.id)
  await db.collection("tasks").deleteOne({ _id })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const db = await getDb()
  const _id = new ObjectId(params.id)
  const body = await req.json().catch(() => ({}))

  const update: any = {}

  // ✅ Update completion status
  if (typeof body.isCompleted === "boolean") update.isCompleted = body.isCompleted

  // ✅ Update title
  if (typeof body.title === "string") update.title = body.title

  // ✅ Update targetMinutes
  if (typeof body.targetMinutes === "number")
    update.targetMinutes = Math.max(0, Math.round(body.targetMinutes))

  // ✅ Update remainingMinutes (supports increment mode)
  if (typeof body.remainingMinutes === "number") {
    const doc = await db.collection("tasks").findOne({ _id })
    if (doc) {
      const prev = doc.remainingMinutes ?? doc.targetMinutes ?? 60
      update.remainingMinutes = body.increment
        ? prev + Math.round(body.remainingMinutes)
        : Math.max(0, Math.round(body.remainingMinutes))
    }
  }

  // ✅ Update priority (low / medium / high)
  if (body.priority === "low" || body.priority === "medium" || body.priority === "high") {
    update.priority = body.priority as Priority
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  await db.collection("tasks").updateOne({ _id }, { $set: update })
  const doc = await db.collection("tasks").findOne({ _id })

  return NextResponse.json({
    id: doc!._id.toString(),
    title: doc!.title,
    isCompleted: doc!.isCompleted ?? false,
    createdAt: doc!.createdAt ?? new Date(),
    targetMinutes: doc!.targetMinutes ?? 60,
    remainingMinutes: doc!.remainingMinutes ?? doc!.targetMinutes ?? 60,
    priority: doc!.priority ?? "medium", // ✅ include in response
  })
}
