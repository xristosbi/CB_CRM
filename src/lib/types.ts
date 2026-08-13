import type { ActivityType, PaymentStatus } from "@/lib/database.types";

export interface Pipeline {
  id: string;
  name: string;
}

export interface Stage {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
  is_won: boolean;
}

export interface OpportunityCard {
  id: string;
  contact_id: string;
  contact_name: string;
  source: string | null;
  value: number | null;
  campaign: string | null;
  pipeline_id: string;
  stage_id: string;
  created_at: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  source: string | null;
  tags: string[];
  created_at: string;
}

export interface ContactOpportunity {
  id: string;
  pipeline_id: string;
  pipeline_name: string;
  stage_id: string;
  stage_name: string;
  value: number | null;
  campaign: string | null;
}

export interface ActivityEntry {
  id: string;
  opportunity_id: string | null;
  type: ActivityType;
  content: string | null;
  created_at: string;
}

export interface FollowUpTask {
  id: string;
  title: string;
  due_at: string | null;
  done: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  contact_id: string;
  contact_name: string;
  amount: number;
  status: PaymentStatus;
  invoice_ref: string | null;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  date: string;
  notes: string | null;
  created_at: string;
}
