import { UserAvatar, type UserAvatarUser } from "./user-avatar";
import { cn } from "@/lib/utils";

// Avatar + display_name, used everywhere a user needs to be shown
// (assignment dropdowns, activity feed, calendar). Never renders role.
export function UserLabel({
  user,
  size = "md",
  className,
  unassignedLabel = "Μη ανατεθειμένο",
}: {
  user: UserAvatarUser | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  unassignedLabel?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <UserAvatar user={user} size={size} />
      <span className="min-w-0 truncate">{user?.display_name ?? unassignedLabel}</span>
    </span>
  );
}
