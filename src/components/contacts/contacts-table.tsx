"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Contact } from "@/lib/types";

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((c) =>
      [c.name, c.phone, c.email, c.website, c.source, ...c.tags]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term))
    );
  }, [contacts, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Αναζήτηση ονόματος, email, τηλεφώνου..."
          className="pl-8"
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Όνομα</TableHead>
              <TableHead className="hidden sm:table-cell">Τηλέφωνο</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Πηγή</TableHead>
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((contact) => (
              <TableRow key={contact.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">
                    {contact.name}
                  </Link>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {contact.phone ?? "—"}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {contact.email ?? "—"}
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {contact.source ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[11px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Δεν βρέθηκαν επαφές.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
