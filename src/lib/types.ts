import type { ActivityType, CalendarEventType, PaymentStatus } from "@/lib/database.types";

export interface Pipeline {
  id: string;
  name: string;
}

export interface Campaign {
  id: string;
  pipeline_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
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
  campaign_id: string | null;
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
  campaign_entity_name: string | null;
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

export interface CalendarTaskEntry {
  id: string;
  contact_id: string;
  contact_name: string;
  title: string;
  due_at: string;
  done: boolean;
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

export interface CalendarEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  type: CalendarEventType;
  contact_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  opportunity_id: string | null;
  notes: string | null;
  google_event_id: string | null;
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
