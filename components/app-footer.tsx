export function AppFooter() {
  return (
    <footer className="relative border-t border-white/8 mt-auto">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xl" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
        <span className="text-xs text-foreground/45 tracking-wide">© {new Date().getFullYear()} DeepWork</span>
        <span className="text-xs text-foreground/40">Made with ❤️ for Doyel</span>
        <span className="text-xs text-foreground/45 tracking-widest uppercase">Stay focused.</span>
      </div>
    </footer>
  )
}
