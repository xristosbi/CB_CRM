"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SidebarNav } from "./sidebar-nav";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-svh w-full overflow-hidden">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:block">
        <div className="sticky top-0 h-svh">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground md:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Άνοιγμα μενού"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-brand-gold"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cb-logo.png" alt="" className="h-7 w-auto shrink-0" />
          <span className="flex-1 text-base font-semibold">CB CRM</span>
          <ThemeToggle className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-brand-gold" />
        </header>

        <div className="sticky top-0 z-20 hidden h-12 shrink-0 items-center justify-end border-b border-border bg-background px-4 md:flex">
          <ThemeToggle />
        </div>

        {/* min-h-0 lets this scroll internally (instead of growing the
            now-viewport-fixed shell taller than the screen) — the Leads
            kanban board relies on this to pin its own horizontal
            scrollbar to the bottom of the viewport instead of the end of
            a tall page. */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-64 bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Πλοήγηση</SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
