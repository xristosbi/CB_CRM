"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/types";

// A minimal searchable combobox — the app has no Popover/Command primitive
// yet, so this is a plain Input + an absolutely-positioned result list
// instead of pulling in cmdk for a single picker.
export function ContactPicker({
  contacts,
  value,
  onChange,
  placeholder = "Αναζήτηση επαφής...",
}: {
  contacts: Contact[];
  value: string | null;
  onChange: (contactId: string | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = contacts.find((c) => c.id === value) ?? null;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const base = term
      ? contacts.filter((c) =>
          [c.name, c.phone, c.email].filter(Boolean).some((f) => f!.toLowerCase().includes(term))
        )
      : contacts;
    return base.slice(0, 30);
  }, [contacts, query]);

  return (
    <div className="relative">
      <Input
        value={open ? query : (selected?.name ?? "")}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          // Let a click on a list item register before the list unmounts.
          window.setTimeout(() => setOpen(false), 150);
        }}
        placeholder={placeholder}
        className={cn(selected && !open && "pr-8")}
      />
      {selected && !open && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Καθαρισμός επαφής"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
      {open && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Καμία επαφή</p>
          )}
          {filtered.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(contact.id);
                setOpen(false);
              }}
              className={cn(
                "block w-full px-3 py-1.5 text-left text-sm hover:bg-accent",
                contact.id === value && "bg-accent"
              )}
            >
              <span className="block truncate font-medium">{contact.name}</span>
              {contact.phone && (
                <span className="block truncate text-xs text-muted-foreground">
                  {contact.phone}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
