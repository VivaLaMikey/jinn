import {
  Home,
  MessageSquare,
  Users,
  Clock,
  LayoutGrid,
  Activity,
  Zap,
  Settings,
  CalendarDays,
  Building2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/org", label: "Organization", icon: Users },
  { href: "/kanban", label: "Kanban", icon: LayoutGrid },
  { href: "/cron", label: "Cron", icon: Clock },
  { href: "/logs", label: "Activity", icon: Activity },
  { href: "/office", label: "Office", icon: Building2 },
  { href: "/skills", label: "Skills", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
]
