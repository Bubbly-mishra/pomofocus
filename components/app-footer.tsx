export function AppFooter() {
  return (
    <footer className="relative mt-auto">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-xl shadow-[0_-16px_44px_rgba(0,0,0,0.22)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
        <span className="text-xs text-foreground/45 tracking-wide">© {new Date().getFullYear()} DeepWork</span>
        <span className="text-xs text-foreground/45 tracking-widest uppercase">Stay focused.</span>
      </div>
    </footer>
  )
}
