"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { AppBrand } from "@/components/app-brand"
import { AppFooter } from "@/components/app-footer"
import { Target } from "lucide-react"

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
    window.location.href = "/"
  }

  return (
    <div className="hills min-h-screen flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/8">
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/25 to-black/40 backdrop-blur-xl" />
        <div className="relative max-w-7xl mx-auto px-6 h-12 flex items-center justify-center">
          <AppBrand />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="glass rounded-3xl p-8 flex flex-col gap-6 w-full max-w-sm">

          {/* Icon + title */}
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/10 text-primary">
              <Target className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-1">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-foreground/55 text-sm">
              {mode === "login" ? "Sign in to your workspace." : "Choose a username to get started."}
            </p>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-3">
            <Input
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              autoFocus
              className="bg-black/20 border-white/12 placeholder:text-foreground/30 h-11"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              className="bg-black/20 border-white/12 placeholder:text-foreground/30 h-11"
            />
            {error && (
              <p className="text-red-400 text-xs text-center bg-red-400/10 border border-red-400/20 rounded-lg py-2 px-3">{error}</p>
            )}
            <button
              onClick={submit}
              disabled={loading}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-primary/20 mt-1"
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </div>

          {/* Toggle */}
          <p className="text-foreground/55 text-sm text-center">
            {mode === "login" ? "New here? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError("") }}
              className="text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </main>

      <AppFooter />
    </div>
  )
}
