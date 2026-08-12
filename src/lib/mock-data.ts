import type { OpportunityCard, Pipeline, Stage } from "@/lib/types";

export const MOCK_PIPELINES: Pipeline[] = [
  { id: "pl-chatbot", name: "Chatbot" },
  { id: "pl-voice", name: "Voice Agent" },
  { id: "pl-reviews", name: "Review Domination" },
];

const DEFAULT_STAGE_NAMES: Array<{ name: string; is_won: boolean }> = [
  { name: "Νέο Lead", is_won: false },
  { name: "Επικοινωνία", is_won: false },
  { name: "Qualified", is_won: false },
  { name: "Πρόταση", is_won: false },
  { name: "Πληρωμή", is_won: true },
  { name: "Χαμένο", is_won: false },
];

export const MOCK_STAGES: Stage[] = MOCK_PIPELINES.flatMap((pipeline) =>
  DEFAULT_STAGE_NAMES.map((stage, index) => ({
    id: `${pipeline.id}-stage-${index}`,
    pipeline_id: pipeline.id,
    name: stage.name,
    position: index,
    is_won: stage.is_won,
  }))
);

export const MOCK_OPPORTUNITIES: OpportunityCard[] = [
  {
    id: "opp-1",
    contact_id: "c-1",
    contact_name: "Γιώργος Παπαδόπουλος",
    source: "Facebook Ads",
    value: 900,
    campaign: "Q3 FB Leads",
    pipeline_id: "pl-chatbot",
    stage_id: "pl-chatbot-stage-1",
  },
  {
    id: "opp-2",
    contact_id: "c-2",
    contact_name: "Μαρία Ιωάννου",
    source: "Referral",
    value: 600,
    campaign: "Referral Program",
    pipeline_id: "pl-chatbot",
    stage_id: "pl-chatbot-stage-0",
  },
  {
    id: "opp-3",
    contact_id: "c-3",
    contact_name: "Νίκος Αντωνίου",
    source: "Google Ads",
    value: 1500,
    campaign: "Google Ads - Voice",
    pipeline_id: "pl-voice",
    stage_id: "pl-voice-stage-2",
  },
  {
    id: "opp-4",
    contact_id: "c-4",
    contact_name: "Ελένη Δημητρίου",
    source: "Instagram",
    value: 450,
    campaign: null,
    pipeline_id: "pl-chatbot",
    stage_id: "pl-chatbot-stage-3",
  },
  {
    id: "opp-5",
    contact_id: "c-5",
    contact_name: "Κώστας Βασιλείου",
    source: "Website",
    value: 2200,
    campaign: "SEO Organic",
    pipeline_id: "pl-reviews",
    stage_id: "pl-reviews-stage-0",
  },
];
