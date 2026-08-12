"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { logout } from "@/app/login/actions";
import { NAV_ITEMS } from "./nav-items";

export function SidebarNav({
  email,
  onNavigate,
}: {
  email: string | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <span className="text-lg font-semibold tracking-tight">CB CRM</span>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-2 py-3">
        {email && (
          <p className="truncate px-3 pb-2 text-xs text-sidebar-foreground/60">{email}</p>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4 shrink-0" />
            Αποσύνδεση
          </button>
        </form>
      </div>
    </div>
  );
}
