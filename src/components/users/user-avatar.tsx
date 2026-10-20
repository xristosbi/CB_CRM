import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { colorForUser, initialsForName } from "@/lib/user-color";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const SIZE_CLASSES: Record<"sm" | "md" | "lg", string> = {
  sm: "size-5 text-[10px]",
  md: "size-7 text-xs",
  lg: "size-9 text-sm",
};

export type UserAvatarUser = Pick<Profile, "id" | "display_name" | "color">;

// Unassigned/unknown state — a plain dashed circle, never rendered as text.
export function UserAvatar({
  user,
  size = "md",
  className,
}: {
  user: UserAvatarUser | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  if (!user) {
    return (
      <Avatar className={cn(SIZE_CLASSES[size], "border border-dashed border-muted-foreground/40", className)}>
        <AvatarFallback className="bg-transparent text-muted-foreground">—</AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Avatar className={cn(SIZE_CLASSES[size], className)}>
      <AvatarFallback
        style={{ backgroundColor: colorForUser(user), color: "white" }}
        className="font-semibold"
      >
        {initialsForName(user.display_name)}
      </AvatarFallback>
    </Avatar>
  );
}
