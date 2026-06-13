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
    <div className="hills min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-white/8 backdrop-blur-md bg-black/20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🍅</span>
            <span className="font-semibold text-foreground tracking-tight">Pomofocus</span>
          </div>
          <span className="text-xs font-medium text-foreground/40 uppercase tracking-widest hidden sm:block">
            Your Focus Companion
          </span>
          <div className="w-24" />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="glass border border-border rounded-2xl p-8 flex flex-col items-center gap-6 max-w-sm w-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-foreground/45 text-sm">
              {mode === "login" ? "Sign in to continue your sessions." : "Pick a username to get started."}
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
            <Button onClick={submit} disabled={loading} className="w-full font-semibold py-5 rounded-xl mt-1">
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </div>

          <p className="text-foreground/40 text-sm">
            {mode === "login" ? "New here? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError("") }}
              className="text-primary hover:underline font-medium"
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </Card>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/8 backdrop-blur-md bg-black/20">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="text-xs text-foreground/30">© {new Date().getFullYear()} Pomofocus</span>
          <span className="text-xs text-foreground/25">Made with ❤️ for Doyel</span>
          <span className="text-xs text-foreground/30">Stay focused.</span>
        </div>
      </footer>
    </div>
  )
}
