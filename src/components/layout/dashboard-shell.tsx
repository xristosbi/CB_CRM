"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";

export function DashboardShell({
  email,
  children,
}: {
  email: string | null;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-svh w-full">
      <aside className="dark hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:block">
        <div className="sticky top-0 h-svh">
          <SidebarNav email={email} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="dark sticky top-0 z-30 flex h-14 items-center gap-2.5 border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground md:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Άνοιγμα μενού"
            className="text-sidebar-foreground hover:bg-white/5 hover:text-brand-gold"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cb-logo.png" alt="" className="h-7 w-auto shrink-0" />
          <span className="text-base font-semibold">CB CRM</span>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="dark w-64 bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Πλοήγηση</SheetTitle>
          </SheetHeader>
          <SidebarNav email={email} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
