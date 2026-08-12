import {
  BarChart3,
  Calendar,
  CreditCard,
  KanbanSquare,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/leads", label: "Leads", icon: KanbanSquare },
  { href: "/contacts", label: "Πελάτες", icon: Users },
  { href: "/calendar", label: "Ημερολόγιο", icon: Calendar },
  { href: "/payments", label: "Πληρωμές", icon: CreditCard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Ρυθμίσεις", icon: Settings },
];
