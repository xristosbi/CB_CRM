import {
  BarChart3,
  Calendar,
  CreditCard,
  KanbanSquare,
  Megaphone,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  // Hidden from the sidebar for anyone whose profile isn't full-access —
  // the word "admin" itself still never appears anywhere in the UI.
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/leads", label: "Leads", icon: KanbanSquare },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/contacts", label: "Πελάτες", icon: Users },
  { href: "/calendar", label: "Ημερολόγιο", icon: Calendar },
  { href: "/payments", label: "Πληρωμές", icon: CreditCard, adminOnly: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, adminOnly: true },
  { href: "/settings", label: "Ρυθμίσεις", icon: Settings },
];
