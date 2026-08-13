"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createLead } from "@/lib/queries/contacts";
import { createClient } from "@/lib/supabase/client";
import type { Contact, Pipeline, Stage } from "@/lib/types";
import { ContactDialog, type ContactFormValues, type OpportunitySelection } from "./contact-dialog";
import { ContactsTable } from "./contacts-table";

export function ContactsPageView({
  initialContacts,
  pipelines,
  stages,
  usingMockData,
}: {
  initialContacts: Contact[];
  pipelines: Pipeline[];
  stages: Stage[];
  usingMockData: boolean;
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [newLeadOpen, setNewLeadOpen] = useState(false);

  async function handleCreateLead(
    values: ContactFormValues,
    opportunity: OpportunitySelection | null
  ) {
    if (usingMockData) {
      const newContact: Contact = {
        id: `mock-${crypto.randomUUID()}`,
        name: values.name,
        phone: values.phone,
        email: values.email,
        website: values.website,
        source: values.source,
        tags: values.tags,
        created_at: new Date().toISOString(),
      };
      setContacts((prev) => [newContact, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success("Το lead δημιουργήθηκε (demo δεδομένα).");
      return;
    }

    try {
      const supabase = createClient();
      const { contact } = await createLead(supabase, values, opportunity);
      setContacts((prev) => [contact, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success("Το lead δημιουργήθηκε.");
    } catch {
      toast.error("Δεν ήταν δυνατή η δημιουργία του lead.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{contacts.length} επαφές</p>
        <Button size="sm" onClick={() => setNewLeadOpen(true)}>
          Νέο lead
        </Button>
      </div>

      <ContactsTable contacts={contacts} />

      <ContactDialog
        open={newLeadOpen}
        onOpenChange={setNewLeadOpen}
        mode="create"
        pipelines={pipelines}
        stages={stages}
        defaultPipelineId={null}
        onSubmit={handleCreateLead}
      />
    </div>
  );
}
