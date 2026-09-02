"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, Camera, ImageIcon, ListTodo, LogOut, Target, Type } from "lucide-react"
import useSWR from "swr"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type ActivePage = "focus" | "tasks" | "report"
type FontStyle = "clean" | "serif" | "mono" | "rounded"

interface TotalTime {
  minutes: number
}

const PROFILE_IMAGE_KEY = "deepwork.profileImage"
const FONT_STYLE_KEY = "deepwork.fontStyle"
const BACKGROUND_IMAGE_KEY = "deepwork.backgroundImage"

const FONT_OPTIONS: { value: FontStyle; label: string }[] = [
  { value: "clean", label: "Clean" },
  { value: "serif", label: "Editorial" },
  { value: "mono", label: "Mono" },
  { value: "rounded", label: "Rounded" },
]

const fmtFocus = (m = 0) => {
  const mm = Math.max(0, Math.round(m))
  return Math.floor(mm / 60) + "." + String(mm % 60).padStart(2, "0") + "h"
}

const applyFontStyle = (fontStyle: FontStyle) => {
  document.body.dataset.fontStyle = fontStyle
}

const applyBackgroundImage = (image: string | null) => {
  if (image) document.documentElement.style.setProperty("--deepwork-bg-image", "url(" + image + ")")
  else document.documentElement.style.removeProperty("--deepwork-bg-image")
}

// Reads an image file, downsizes it, and re-encodes it as JPEG on a canvas.
// This keeps the resulting data URL small enough to reliably fit in
// localStorage (raw iPhone camera photos can be several MB, which is enough
// to blow past the ~5MB per-origin quota and silently fail to save).
const compressImage = (file: File, maxDimension: number, quality: number) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"))
    reader.onload = () => {
      const img = new window.Image()
      img.onerror = () => reject(new Error("Could not decode image"))
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
        const width = Math.max(1, Math.round(img.width * scale))
        const height = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Canvas is not supported in this browser"))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })

export function AppHeader({ activePage, focusMinutes, username }: { activePage: ActivePage; focusMinutes?: number; username: string }) {
  const router = useRouter()
  const [showProfile, setShowProfile] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [fontStyle, setFontStyle] = useState<FontStyle>("clean")
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [backgroundError, setBackgroundError] = useState<string | null>(null)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)

  const fetcher = useCallback((url: string) => fetch(url).then(r => r.json()), [])
  const { data: totalTime } = useSWR<TotalTime>(focusMinutes === undefined ? "/api/totalTime" : null, fetcher)
  const displayedFocus = focusMinutes ?? totalTime?.minutes ?? 0

  useEffect(() => {
    const savedProfileImage = localStorage.getItem(PROFILE_IMAGE_KEY)
    const savedBackgroundImage = localStorage.getItem(BACKGROUND_IMAGE_KEY)
    const savedFontStyle = localStorage.getItem(FONT_STYLE_KEY) as FontStyle | null
    const nextFontStyle = savedFontStyle && FONT_OPTIONS.some(option => option.value === savedFontStyle) ? savedFontStyle : "clean"

    setProfileImage(savedProfileImage)
    setBackgroundImage(savedBackgroundImage)
    setFontStyle(nextFontStyle)
    applyFontStyle(nextFontStyle)
    applyBackgroundImage(savedBackgroundImage)
  }, [])

  const changeFontStyle = (nextFontStyle: FontStyle) => {
    setFontStyle(nextFontStyle)
    localStorage.setItem(FONT_STYLE_KEY, nextFontStyle)
    applyFontStyle(nextFontStyle)
  }

  const changeProfileImage = async (file: File | undefined) => {
    if (!file) return
    setAvatarError(null)
    try {
      const image = await compressImage(file, 320, 0.85)
      setProfileImage(image)
      localStorage.setItem(PROFILE_IMAGE_KEY, image)
    } catch (error) {
      console.error("Failed to save avatar", error)
      setAvatarError("Couldn't save that photo. Try a different one.")
    }
  }

  const changeBackgroundImage = async (file: File | undefined) => {
    if (!file) return
    setBackgroundError(null)
    try {
      const image = await compressImage(file, 1600, 0.75)
      setBackgroundImage(image)
      localStorage.setItem(BACKGROUND_IMAGE_KEY, image)
      applyBackgroundImage(image)
    } catch (error) {
      console.error("Failed to save background", error)
      setBackgroundError("Couldn't save that photo. Try a different one.")
    }
  }

  const resetProfileImage = () => {
    setProfileImage(null)
    setAvatarError(null)
    localStorage.removeItem(PROFILE_IMAGE_KEY)
  }

  const resetBackgroundImage = () => {
    setBackgroundImage(null)
    setBackgroundError(null)
    localStorage.removeItem(BACKGROUND_IMAGE_KEY)
    applyBackgroundImage(null)
  }

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  const navItem = (active: boolean) => [
    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm border border-transparent transition-all",
    active
      ? "border-primary/20 bg-primary/10 text-primary font-semibold shadow-[0_0_18px_rgba(207,236,245,0.12)]"
      : "text-foreground/60 hover:text-foreground/90 hover:bg-white/6 font-medium",
  ].join(" ")

  const avatar = (size: "sm" | "lg") => (
    <div className={[size === "sm" ? "w-6 h-6 text-xs" : "w-16 h-16 text-xl", "rounded-full bg-primary/90 flex items-center justify-center font-bold text-primary-foreground shrink-0 overflow-hidden shadow-lg shadow-primary/15"].join(" ")}>
      {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" /> : username[0].toUpperCase()}
    </div>
  )

  return (
    <header className="sticky top-0 z-30 shadow-[0_14px_38px_rgba(0,0,0,0.2)]">
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/25 to-black/40 backdrop-blur-xl" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center">
        <div className="flex items-center gap-1 rounded-full bg-black/12 p-1">
          <button type="button" onClick={() => router.push("/")} className={navItem(activePage === "focus")}>
            <Target className="w-4 h-4" />
            <span className="hidden sm:block">DeepWork</span>
          </button>

          <button type="button" onClick={() => router.push("/tasks")} className={navItem(activePage === "tasks")}>
            <ListTodo className="w-4 h-4" />
            <span className="hidden sm:block">Tasks</span>
          </button>

          <button type="button" onClick={() => router.push("/report")} className={navItem(activePage === "report")}>
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:block">Report</span>
          </button>

          <Popover open={showProfile} onOpenChange={setShowProfile}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={[
                  "flex items-center gap-2 rounded-full border border-transparent pl-1.5 pr-3 py-1 transition-all",
                  showProfile
                    ? "border-primary/20 bg-primary/10 text-primary shadow-[0_0_18px_rgba(207,236,245,0.12)]"
                    : "text-foreground/60 hover:text-foreground/90 hover:bg-white/6",
                ].join(" ")}
              >
                {avatar("sm")}
                <span className="text-sm font-medium hidden sm:block">{username}</span>
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              sideOffset={10}
              // iOS's native photo picker briefly steals focus/pointer events,
              // which Radix reads as an "outside interaction" and uses to close
              // the popover mid-upload. Ignore those so the panel (and the file
              // inputs it triggers) stay mounted until the user actually picks.
              onInteractOutside={event => {
                const target = event.target as HTMLElement | null
                if (target?.closest('input[type="file"]')) event.preventDefault()
              }}
              className="w-80 max-w-[calc(100vw-2rem)] glass rounded-2xl p-5 flex flex-col gap-4 border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  {avatar("lg")}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label="Change avatar photo"
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md ring-2 ring-black/40 hover:scale-105 active:scale-95 transition-transform"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-foreground truncate">{username}</p>
                  <p className="text-xs text-foreground/50 mt-0.5">DeepWork profile</p>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="text-[11px] font-semibold text-primary hover:text-primary/80 transition mt-1.5"
                  >
                    Change photo
                  </button>
                </div>
              </div>
              {avatarError && <p className="text-[11px] text-destructive -mt-2">{avatarError}</p>}

              <div className="rounded-xl bg-white/5 px-3 py-2.5 flex items-center justify-between">
                <p className="text-xs text-foreground/50">Today&apos;s focus</p>
                <p className="text-lg font-bold text-primary">{fmtFocus(displayedFocus)}</p>
              </div>

              <div className="rounded-2xl bg-white/5 p-3 space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-foreground/45 font-semibold">Customize</p>

                <button
                  type="button"
                  onClick={() => backgroundInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-xl bg-black/20 px-3 py-2 text-xs font-semibold text-foreground/65 hover:text-foreground hover:bg-white/8 cursor-pointer transition w-full"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Change background
                </button>
                {backgroundError && <p className="text-[11px] text-destructive">{backgroundError}</p>}

                <div>
                  <div className="flex items-center gap-2 text-xs text-foreground/45 mb-2">
                    <Type className="w-3.5 h-3.5" /> Font style
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {FONT_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => changeFontStyle(option.value)}
                        className={[
                          "rounded-lg px-2 py-1.5 text-[11px] font-semibold transition",
                          fontStyle === option.value ? "bg-primary/18 text-primary" : "bg-black/20 text-foreground/50 hover:text-foreground hover:bg-white/8",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 mt-1">
                  <button type="button" onClick={resetProfileImage} className="text-[11px] text-foreground/40 hover:text-foreground/70 transition">Reset avatar</button>
                  <button type="button" onClick={resetBackgroundImage} className="text-[11px] text-foreground/40 hover:text-foreground/70 transition">Reset background</button>
                </div>
              </div>

              <button onClick={signOut} className="flex items-center gap-2 text-sm text-foreground/55 hover:text-destructive transition-colors group">
                <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                Sign out
              </button>
            </PopoverContent>
          </Popover>

          {/* Kept outside the Popover on purpose: iOS's native photo picker can
              cause the popover to close, which would unmount inputs nested inside it. */}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={event => {
              void changeProfileImage(event.target.files?.[0])
              event.currentTarget.value = ""
            }}
          />
          <input
            ref={backgroundInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={event => {
              void changeBackgroundImage(event.target.files?.[0])
              event.currentTarget.value = ""
            }}
          />
        </div>
      </div>
    </header>
  )
}
