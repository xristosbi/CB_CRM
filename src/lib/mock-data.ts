import type {
  ActivityEntry,
  Contact,
  FollowUpTask,
  OpportunityCard,
  Pipeline,
  Stage,
} from "@/lib/types";

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
  {
    id: "opp-6",
    contact_id: "c-1",
    contact_name: "Γιώργος Παπαδόπουλος",
    source: "Facebook Ads",
    value: 1200,
    campaign: "Cross-sell Voice",
    pipeline_id: "pl-voice",
    stage_id: "pl-voice-stage-0",
  },
];

export const MOCK_CONTACTS: Contact[] = [
  {
    id: "c-1",
    name: "Γιώργος Παπαδόπουλος",
    phone: "+30 690 000 0001",
    email: "giorgos@example.gr",
    website: "https://example.gr",
    source: "Facebook Ads",
    tags: ["hot"],
    created_at: "2026-07-20T09:00:00.000Z",
  },
  {
    id: "c-2",
    name: "Μαρία Ιωάννου",
    phone: "+30 690 000 0002",
    email: "maria@example.gr",
    website: null,
    source: "Referral",
    tags: ["warm"],
    created_at: "2026-07-22T10:30:00.000Z",
  },
  {
    id: "c-3",
    name: "Νίκος Αντωνίου",
    phone: "+30 690 000 0003",
    email: "nikos@example.gr",
    website: "https://nikos-biz.gr",
    source: "Google Ads",
    tags: ["cold"],
    created_at: "2026-07-25T14:15:00.000Z",
  },
  {
    id: "c-4",
    name: "Ελένη Δημητρίου",
    phone: "+30 690 000 0004",
    email: "eleni@example.gr",
    website: null,
    source: "Instagram",
    tags: ["warm"],
    created_at: "2026-08-01T11:00:00.000Z",
  },
  {
    id: "c-5",
    name: "Κώστας Βασιλείου",
    phone: "+30 690 000 0005",
    email: "kostas@example.gr",
    website: "https://kostas-biz.gr",
    source: "Website",
    tags: ["hot"],
    created_at: "2026-08-05T16:45:00.000Z",
  },
];

export const MOCK_ACTIVITY: (ActivityEntry & { contact_id: string })[] = [
  {
    id: "act-1",
    contact_id: "c-1",
    opportunity_id: "opp-1",
    type: "note",
    content: "Πρώτη επικοινωνία, ενδιαφέρον για chatbot στο site.",
    created_at: "2026-08-06T09:10:00.000Z",
  },
  {
    id: "act-2",
    contact_id: "c-1",
    opportunity_id: "opp-1",
    type: "stage_change",
    content: "Νέο Lead → Επικοινωνία",
    created_at: "2026-08-06T09:11:00.000Z",
  },
  {
    id: "act-3",
    contact_id: "c-1",
    opportunity_id: "opp-1",
    type: "call",
    content: "Τηλεφωνική κλήση 12 λεπτά, θέλει demo την επόμενη εβδομάδα.",
    created_at: "2026-08-08T13:00:00.000Z",
  },
  {
    id: "act-4",
    contact_id: "c-1",
    opportunity_id: "opp-6",
    type: "fathom_summary",
    content: "Demo call: ενδιαφέρον για voice agent, follow-up σε 3 μέρες.",
    created_at: "2026-08-10T17:30:00.000Z",
  },
];

export const MOCK_TASKS: (FollowUpTask & { contact_id: string })[] = [
  {
    id: "task-1",
    contact_id: "c-1",
    title: "Follow-up κλήση",
    due_at: "2026-08-14T10:00:00.000Z",
    done: false,
    created_at: "2026-08-08T13:05:00.000Z",
  },
  {
    id: "task-2",
    contact_id: "c-1",
    title: "Αποστολή πρότασης τιμής",
    due_at: "2026-08-16T10:00:00.000Z",
    done: false,
    created_at: "2026-08-10T17:35:00.000Z",
  },
];
