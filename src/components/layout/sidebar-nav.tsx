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
      <div className="flex h-14 items-center gap-2.5 px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cb-logo.png" alt="" className="h-8 w-auto shrink-0" />
        <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
          CB CRM
        </span>
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
                "flex items-center gap-3 rounded-r-md border-l-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-brand-gold bg-brand-gold/12 text-brand-gold"
                  : "border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-brand-gold"
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
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-brand-gold"
          >
            <LogOut className="size-4 shrink-0" />
            Αποσύνδεση
          </button>
        </form>
      </div>
    </div>
  );
}
