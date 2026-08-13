"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Contact, Pipeline, Stage } from "@/lib/types";

const PRESET_SOURCES = ["Facebook", "Instagram", "Referral", "Google Ads", "Website"];
const NO_PIPELINE = "none";

export interface ContactFormValues {
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  source: string | null;
  tags: string[];
}

export interface OpportunitySelection {
  pipeline_id: string;
  stage_id: string;
}

export function ContactDialog({
  open,
  onOpenChange,
  mode,
  contact,
  pipelines,
  stages,
  defaultPipelineId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  contact?: Contact | null;
  pipelines?: Pipeline[];
  stages?: Stage[];
  defaultPipelineId?: string | null;
  onSubmit: (
    values: ContactFormValues,
    opportunity: OpportunitySelection | null
  ) => Promise<void> | void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <ContactForm
            mode={mode}
            contact={contact ?? null}
            pipelines={pipelines ?? []}
            stages={stages ?? []}
            defaultPipelineId={defaultPipelineId ?? null}
            onSubmit={onSubmit}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function sourceIsPreset(source: string | null) {
  return source != null && PRESET_SOURCES.includes(source);
}

function ContactForm({
  mode,
  contact,
  pipelines,
  stages,
  defaultPipelineId,
  onSubmit,
  onClose,
}: {
  mode: "create" | "edit";
  contact: Contact | null;
  pipelines: Pipeline[];
  stages: Stage[];
  defaultPipelineId: string | null;
  onSubmit: (
    values: ContactFormValues,
    opportunity: OpportunitySelection | null
  ) => Promise<void> | void;
  onClose: () => void;
}) {
  const initialPipelineId = mode === "create" && defaultPipelineId ? defaultPipelineId : NO_PIPELINE;
  const initialStageId =
    initialPipelineId === NO_PIPELINE
      ? ""
      : (stages
          .filter((s) => s.pipeline_id === initialPipelineId)
          .sort((a, b) => a.position - b.position)[0]?.id ?? "");

  const [name, setName] = useState(contact?.name ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [website, setWebsite] = useState(contact?.website ?? "");
  const [sourceSelect, setSourceSelect] = useState(
    contact?.source == null ? "" : sourceIsPreset(contact.source) ? contact.source : "other"
  );
  const [sourceCustom, setSourceCustom] = useState(
    contact?.source != null && !sourceIsPreset(contact.source) ? contact.source : ""
  );
  const [tags, setTags] = useState<string[]>(contact?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [pipelineId, setPipelineId] = useState(initialPipelineId);
  const [stageId, setStageId] = useState(initialStageId);
  const [submitting, setSubmitting] = useState(false);

  const stagesForPipeline = stages
    .filter((s) => s.pipeline_id === pipelineId)
    .sort((a, b) => a.position - b.position);

  function addTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput("");
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  function handlePipelineChange(value: string) {
    setPipelineId(value);
    if (value === NO_PIPELINE) {
      setStageId("");
    } else {
      const firstStage = stages
        .filter((s) => s.pipeline_id === value)
        .sort((a, b) => a.position - b.position)[0];
      setStageId(firstStage?.id ?? "");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const source =
      sourceSelect === "" ? null : sourceSelect === "other" ? sourceCustom.trim() || null : sourceSelect;

    const values: ContactFormValues = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      website: website.trim() || null,
      source,
      tags,
    };

    const opportunity: OpportunitySelection | null =
      mode === "create" && pipelineId !== NO_PIPELINE && stageId
        ? { pipeline_id: pipelineId, stage_id: stageId }
        : null;

    setSubmitting(true);
    try {
      await onSubmit(values, opportunity);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{mode === "create" ? "Νέο lead" : "Επεξεργασία επαφής"}</DialogTitle>
        {mode === "create" && (
          <DialogDescription>
            Δημιουργεί μια νέα επαφή, προαιρετικά με ένα πρώτο opportunity.
          </DialogDescription>
        )}
      </DialogHeader>

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lead-name">Όνομα</Label>
          <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-phone">Τηλέφωνο</Label>
            <Input id="lead-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-email">Email</Label>
            <Input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lead-website">Website</Label>
          <Input id="lead-website" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Source</Label>
            <Select value={sourceSelect} onValueChange={setSourceSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Επίλεξε πηγή" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
                <SelectItem value="other">Άλλο...</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {sourceSelect === "other" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-source-custom">Πηγή (custom)</Label>
              <Input
                id="lead-source-custom"
                value={sourceCustom}
                onChange={(e) => setSourceCustom(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lead-tags">Tags</Label>
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  aria-label={`Αφαίρεση tag ${tag}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            <input
              id="lead-tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addTag}
              placeholder={tags.length === 0 ? "π.χ. hot, warm..." : ""}
              className="min-w-[80px] flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {mode === "create" && (
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="flex flex-col gap-1.5">
              <Label>Pipeline (προαιρετικό)</Label>
              <Select value={pipelineId} onValueChange={handlePipelineChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PIPELINE}>— Χωρίς opportunity —</SelectItem>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Στάδιο</Label>
              <Select
                value={stageId}
                onValueChange={setStageId}
                disabled={pipelineId === NO_PIPELINE}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {stagesForPipeline.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="mt-6">
        <Button type="submit" disabled={submitting || !name.trim()}>
          {submitting ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
      </DialogFooter>
    </form>
  );
}
