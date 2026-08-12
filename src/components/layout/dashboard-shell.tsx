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
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:block">
        <div className="sticky top-0 h-svh">
          <SidebarNav email={email} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Άνοιγμα μενού"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <span className="text-base font-semibold">CB CRM</span>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-64 bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground"
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
