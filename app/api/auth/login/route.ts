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
  const user = await db.collection("users").findOne({ username: username.trim().toLowerCase() })
  if (!user)
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })

  const valid = await bcrypt.compare(password, user.password)
  if (!valid)
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })

  const token = await signToken({ userId: user._id.toString(), username: user.username })
  cookies().set("session", token, { httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: "/" })
  return NextResponse.json({ ok: true, username: user.username })
}
