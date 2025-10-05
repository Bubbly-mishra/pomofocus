import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

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

  // Allow generic updates but constrain to our fields
  const update: any = {}
  if (typeof body.isCompleted === "boolean") update.isCompleted = body.isCompleted
  if (typeof body.completed === "number") update.completed = body.completed
  if (typeof body.total === "number") update.total = body.total
  if (typeof body.title === "string") update.title = body.title

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  await db.collection("tasks").updateOne({ _id }, { $set: update })
  const doc = await db.collection("tasks").findOne({ _id })
  return NextResponse.json({
    id: doc!._id.toString(),
    title: doc!.title,
    completed: doc!.completed ?? 0,
    total: doc!.total ?? 1,
    isCompleted: doc!.isCompleted ?? false,
    createdAt: doc!.createdAt ?? new Date(),
  })
}
