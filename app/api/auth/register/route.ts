import { NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import { signToken } from "@/lib/auth"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}))
  if (!username?.trim() || !password?.trim())
    return NextResponse.json({ error: "Username and password required" }, { status: 400 })

  const db = await getDb()
  const existing = await db.collection("users").findOne({ username: username.trim().toLowerCase() })
  if (existing)
    return NextResponse.json({ error: "Username already taken" }, { status: 409 })

  const hash = await bcrypt.hash(password, 10)
  const res = await db.collection("users").insertOne({
    username: username.trim().toLowerCase(),
    password: hash,
    createdAt: new Date(),
  })

  const token = await signToken({ userId: res.insertedId.toString(), username: username.trim().toLowerCase() })
  cookies().set("session", token, { httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: "/" })
  return NextResponse.json({ ok: true, username: username.trim().toLowerCase() })
}
