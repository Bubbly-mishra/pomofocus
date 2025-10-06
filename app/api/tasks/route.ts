import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"

type Priority = "low" | "medium" | "high"

function toClient(doc: any) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    isCompleted: doc.isCompleted ?? false,
    createdAt: doc.createdAt ?? new Date(),
    targetMinutes: doc.targetMinutes ?? 60,
    remainingMinutes: doc.remainingMinutes ?? doc.targetMinutes ?? 60,
    priority: doc.priority ?? "medium",
  }
}

export async function GET() {
  const db = await getDb()

  const items = await db
    .collection("tasks")
    .aggregate([
      {
        $addFields: {
          priorityOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$priority", "high"] }, then: 1 },
                { case: { $eq: ["$priority", "medium"] }, then: 2 },
                { case: { $eq: ["$priority", "low"] }, then: 3 },
              ],
              default: 2, // default = medium
            },
          },
        },
      },
      {
        $sort: {
          priorityOrder: 1, // high first
          createdAt: 1,
        },
      },
    ])
    .toArray()

  return NextResponse.json(items.map(toClient))
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const title = String(body?.title || "").trim()
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 })

  const rawHours = Number(body?.targetHours)
  const targetMinutes = Number.isFinite(rawHours) ? Math.max(0, Math.round(rawHours * 60)) : 60

  // ✅ Validate priority
  const priority: Priority =
    body?.priority === "low" || body?.priority === "high" || body?.priority === "medium"
      ? body.priority
      : "medium"

  const db = await getDb()
  const doc = {
    title,
    isCompleted: false,
    createdAt: new Date(),
    targetMinutes,
    remainingMinutes: 0,
    priority,
  }

  const res = await db.collection("tasks").insertOne(doc)
  return NextResponse.json(toClient({ _id: res.insertedId, ...doc }), { status: 201 })
}
