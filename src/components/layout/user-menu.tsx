"use client";

import { useRef, useState } from "react";
import { LogOut, User } from "lucide-react";

import { logout } from "@/app/login/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/users/user-avatar";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { EditProfileDialog } from "./edit-profile-dialog";

// Bottom-of-sidebar user menu: avatar + display_name only — never the
// email, never the role. "Προφίλ" lets the user rename themselves;
// "Αποσύνδεση" submits the existing server-action logout form.
export function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { currentUser, profiles, switchCurrentUser, usingMockData } = useCurrentUser();
  const [editOpen, setEditOpen] = useState(false);
  const logoutFormRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-sidebar-accent"
          >
            <UserAvatar user={currentUser} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-sidebar-foreground">
              {currentUser.display_name ?? "Χρήστης"}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onSelect={() => {
              setEditOpen(true);
              onNavigate?.();
            }}
          >
            <User className="size-4" />
            Προφίλ
          </DropdownMenuItem>
          {usingMockData && profiles.length > 1 && (
            <>
              <DropdownMenuSeparator />
              {profiles
                .filter((p) => p.id !== currentUser.id)
                .map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onSelect={() => {
                      switchCurrentUser(p.id);
                      onNavigate?.();
                    }}
                  >
                    Προβολή ως {p.display_name}
                  </DropdownMenuItem>
                ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              logoutFormRef.current?.requestSubmit();
            }}
          >
            <LogOut className="size-4" />
            Αποσύνδεση
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <form ref={logoutFormRef} action={logout} className="hidden" />

      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
