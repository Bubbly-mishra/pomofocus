export function AppBrand({ subtitle = "Focus · Flow · Finish" }: { subtitle?: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-base sm:text-lg font-bold tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-primary/90 via-foreground to-primary/90">
        DeepWork
      </span>
      <span className="text-[10px] tracking-[0.2em] uppercase text-foreground/45 -mt-0.5 hidden sm:block">
        {subtitle}
      </span>
    </div>
  )
}
