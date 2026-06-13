"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError("")
    if (!username.trim() || !password.trim()) { setError("Fill in both fields"); return }
    setLoading(true)
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    router.push("/")
    router.refresh()
  }

  return (
    <div className="min-h-screen hills flex items-center justify-center px-4">
      <Card className="glass border border-border rounded-2xl p-8 flex flex-col items-center gap-5 max-w-sm w-full">
        <div className="text-5xl">🍅</div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-1">Pomodoro Timer</h1>
          <p className="text-foreground/50 text-sm">
            {mode === "login" ? "Welcome back! Sign in to continue." : "Create your account to get started."}
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <Button onClick={submit} disabled={loading} className="w-full font-semibold py-3 rounded-xl">
            {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </div>

        <p className="text-foreground/40 text-sm">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError("") }}
            className="text-primary hover:underline font-medium"
          >
            {mode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </Card>
    </div>
  )
}
