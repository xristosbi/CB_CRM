"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

import type { Profile } from "@/lib/types";

interface CurrentUserContextValue {
  currentUser: Profile;
  profiles: Profile[];
  setProfiles: Dispatch<SetStateAction<Profile[]>>;
  updateCurrentUser: (patch: Partial<Profile>) => void;
  // Demo-mode-only convenience: fully swap which profile is "me" (e.g. to
  // preview the app as the setter account), never meaningful against a
  // real Supabase session.
  switchCurrentUser: (userId: string) => void;
  usingMockData: boolean;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

// Loaded once per page load from the server (real auth session + profiles
// table, or the mock admin in demo mode) and shared app-wide from here —
// every component that needs "who am I" or "who are all the users"
// reads this instead of re-fetching.
export function CurrentUserProvider({
  initialCurrentUser,
  initialProfiles,
  usingMockData,
  children,
}: {
  initialCurrentUser: Profile;
  initialProfiles: Profile[];
  usingMockData: boolean;
  children: ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState(initialCurrentUser);
  const [profiles, setProfiles] = useState(initialProfiles);

  function updateCurrentUser(patch: Partial<Profile>) {
    setCurrentUser((prev) => ({ ...prev, ...patch }));
    setProfiles((prev) => prev.map((p) => (p.id === currentUser.id ? { ...p, ...patch } : p)));
  }

  function switchCurrentUser(userId: string) {
    const match = profiles.find((p) => p.id === userId);
    if (match) setCurrentUser(match);
  }

  return (
    <CurrentUserContext.Provider
      value={{ currentUser, profiles, setProfiles, updateCurrentUser, switchCurrentUser, usingMockData }}
    >
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  return ctx;
}
