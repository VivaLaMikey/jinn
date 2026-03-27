"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import {
  Sun,
  Moon,
  Palette,
  ArrowLeftRight,
  Gauge,
  Shield,
} from "lucide-react"
import { useTheme } from "@/app/providers"
import { useSettings } from "@/app/settings-provider"
import { THEMES } from "@/lib/themes"
import { NAV_ITEMS } from "@/lib/nav"
import type { ThemeId } from "@/lib/themes"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

// ---------------------------------------------------------------------------
// Theme icon helper
// ---------------------------------------------------------------------------

function ThemeIcon({ theme }: { theme: ThemeId }) {
  switch (theme) {
    case "light":
      return <Sun size={18} />
    case "dark":
      return <Moon size={18} />
    default:
      return <Palette size={18} />
  }
}

// ---------------------------------------------------------------------------
// Usage indicator
// ---------------------------------------------------------------------------

interface UsageData {
  fiveHour: { utilization: number; resetsAt: string | null } | null
  sevenDay: { utilization: number; resetsAt: string | null } | null
}

function usageColor(pct: number): string {
  return pct < 50 ? 'var(--system-green)' : pct < 75 ? 'var(--system-orange, #f59e0b)' : 'var(--system-red, #ef4444)'
}

function formatReset(resetsAt: string | null): string {
  if (!resetsAt) return ''
  const diff = new Date(resetsAt).getTime() - Date.now()
  if (diff <= 0) return ''
  const mins = Math.round(diff / 60_000)
  if (mins >= 1440) return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`
  return `${mins}m`
}

function UsageIndicator({ hovered }: { hovered: boolean }) {
  const [usage, setUsage] = useState<UsageData | null>(null)

  useEffect(() => {
    let mounted = true
    const fetchUsage = async () => {
      try {
        const data = await api.getUsage()
        if (!mounted) return
        if (data.status === 'unavailable') { setUsage(null); return }
        const fiveHour = data.fiveHour
          ? { utilization: data.fiveHour.utilization, resetsAt: data.fiveHour.resetsAt ?? null }
          : data.utilization !== undefined
            ? { utilization: data.utilization, resetsAt: data.resetsAt ?? null }
            : null
        const sevenDay = data.sevenDay
          ? { utilization: data.sevenDay.utilization, resetsAt: data.sevenDay.resetsAt ?? null }
          : null
        if (!fiveHour) { setUsage(null); return }
        setUsage({ fiveHour, sevenDay })
      } catch {
        if (mounted) setUsage(null)
      }
    }
    fetchUsage()
    const interval = setInterval(fetchUsage, 60_000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  if (!usage?.fiveHour) return null

  const pct5h = Math.round(usage.fiveHour.utilization)
  const color5h = usageColor(pct5h)
  const reset5h = formatReset(usage.fiveHour.resetsAt)

  const pct7d = usage.sevenDay ? Math.round(usage.sevenDay.utilization) : null
  const color7d = pct7d !== null ? usageColor(pct7d) : undefined

  return (
    <div className="shrink-0 px-2 pt-1">
      <div className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted-foreground">
        <Gauge size={18} className="shrink-0" style={{ color: color5h }} />
        <div className={cn(
          "flex flex-col gap-0.5 whitespace-nowrap transition-opacity duration-200 min-w-0",
          hovered ? "opacity-100" : "opacity-0"
        )}>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--text-quaternary)] w-[18px]">5h</span>
            <div className="relative h-1.5 flex-1 min-w-[60px] overflow-hidden rounded-full bg-[var(--fill-tertiary)]">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(pct5h, 100)}%`, background: color5h }}
              />
            </div>
            <span className="text-[12px] font-medium w-[32px] text-right" style={{ color: color5h }}>{pct5h}%</span>
          </div>
          {pct7d !== null && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--text-quaternary)] w-[18px]">7d</span>
              <div className="relative h-1.5 flex-1 min-w-[60px] overflow-hidden rounded-full bg-[var(--fill-tertiary)]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(pct7d, 100)}%`, background: color7d }}
                />
              </div>
              <span className="text-[12px] font-medium w-[32px] text-right" style={{ color: color7d }}>{pct7d}%</span>
            </div>
          )}
          {reset5h && (
            <span className="text-[10px] text-[var(--text-quaternary)] pl-[24px]">
              resets {reset5h}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Model cap toggle
// ---------------------------------------------------------------------------

function ModelCapToggle({ hovered }: { hovered: boolean }) {
  const [modelCap, setModelCap] = useState<string>("")

  useEffect(() => {
    let mounted = true
    api.getConfig().then((cfg) => {
      if (!mounted) return
      const cap = (cfg as Record<string, unknown>)?.engines
        ? ((cfg as Record<string, unknown>).engines as Record<string, unknown>)?.modelCap as string ?? ""
        : (cfg as Record<string, unknown>)?.modelCap as string ?? ""
      setModelCap(cap ?? "")
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  async function toggle() {
    const next = modelCap ? "" : "sonnet"
    setModelCap(next)
    try {
      await api.updateConfig({ engines: { modelCap: next } })
    } catch {
      setModelCap(modelCap)
    }
  }

  const active = Boolean(modelCap)
  const label = active ? `${modelCap} cap` : "No cap"

  return (
    <div className="shrink-0 px-2 pt-1">
      <button
        onClick={toggle}
        aria-label={`Model cap: ${label}. Click to toggle.`}
        className="flex h-10 w-full items-center gap-2.5 rounded-md px-3 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Shield
          size={18}
          className="shrink-0 transition-colors"
          style={{ color: active ? "var(--system-green)" : undefined }}
        />
        <span className={cn("whitespace-nowrap transition-opacity duration-200", hovered ? "opacity-100" : "opacity-0")}>
          {label}
        </span>
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function Sidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { settings } = useSettings()
  const [hovered, setHovered] = useState(false)
  const [instances, setInstances] = useState<Array<{ name: string; port: number; running: boolean; current: boolean }>>([])
  const [showSwitcher, setShowSwitcher] = useState(false)

  const emoji = settings.portalEmoji ?? "\u{1F9DE}"
  const portalName = settings.portalName ?? "Jinn"

  // Fetch available instances
  useEffect(() => {
    fetch("/api/instances")
      .then(r => r.json())
      .then(setInstances)
      .catch(() => {})
  }, [])

  function cycleTheme() {
    const ids = THEMES.map((t) => t.id)
    const idx = ids.indexOf(theme)
    const next = ids[(idx + 1) % ids.length]
    setTheme(next)
  }

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "fixed inset-y-0 left-0 hidden overflow-hidden border-r border-border bg-[var(--bg-secondary)] transition-[width,z-index] duration-200 ease-out lg:flex lg:flex-col",
        hovered ? "z-[110] w-[200px]" : "z-[60] w-14"
      )}
    >
      <div className="flex min-h-14 shrink-0 items-center gap-2.5 px-3.5 pb-3 pt-4">
        <span className="w-7 shrink-0 text-center text-2xl leading-none">{emoji}</span>
        <span className={cn("whitespace-nowrap text-[17px] font-semibold text-foreground transition-opacity duration-200", hovered ? "opacity-100" : "opacity-0")}>
          {portalName}
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "group flex h-10 items-center gap-2.5 rounded-md px-3 text-[13px] whitespace-nowrap transition-colors",
                isActive
                  ? "bg-[var(--accent-fill)] font-semibold text-[var(--accent)]"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={18} className="shrink-0" />
              <span className={cn("transition-opacity duration-200", hovered ? "opacity-100" : "opacity-0")}>
                {item.label}
              </span>
            </a>
          )
        })}
      </nav>

      {instances.length > 1 && (
        <div className="relative shrink-0 px-2 pt-1">
          <button
            onClick={() => setShowSwitcher(v => !v)}
            aria-label="Switch instance"
            className="flex h-10 w-full items-center gap-2.5 rounded-md px-3 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeftRight size={18} className="shrink-0" />
            <span className={cn("transition-opacity duration-200", hovered ? "opacity-100" : "opacity-0")}>
              Switch
            </span>
          </button>
          {showSwitcher && hovered && (
            <div className="absolute bottom-full left-2 z-100 mb-1 min-w-[180px] rounded-xl border border-border bg-[var(--material-thick)] p-1 shadow-[var(--shadow-overlay)] backdrop-blur-xl">
              {instances.map(inst => (
                <button
                  key={inst.port}
                  onClick={() => {
                    if (!inst.current && inst.running) {
                      window.location.href = `http://localhost:${inst.port}/chat`
                    }
                    setShowSwitcher(false)
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                    inst.current
                      ? "bg-[var(--accent-fill)] font-semibold text-[var(--accent)]"
                      : inst.running
                        ? "text-foreground hover:bg-accent"
                        : "cursor-default text-[var(--text-quaternary)]"
                  )}
                >
                  <span>{inst.name}</span>
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: inst.running ? "var(--system-green)" : "var(--text-quaternary)" }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <UsageIndicator hovered={hovered} />

      <ModelCapToggle hovered={hovered} />

      <div className="shrink-0 px-2 pb-3 pt-2">
        <button
          onClick={cycleTheme}
          aria-label={`Theme: ${theme}. Click to cycle.`}
          className="flex h-10 w-full items-center gap-2.5 rounded-md px-3 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <span className="shrink-0">
            <ThemeIcon theme={theme} />
          </span>
          <span className={cn("capitalize transition-opacity duration-200", hovered ? "opacity-100" : "opacity-0")}>
            {theme}
          </span>
        </button>
      </div>
    </aside>
  )
}
