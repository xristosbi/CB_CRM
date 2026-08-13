import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ChartEmptyState({ message = "Δεν υπάρχουν αρκετά δεδομένα ακόμα." }: { message?: string }) {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
