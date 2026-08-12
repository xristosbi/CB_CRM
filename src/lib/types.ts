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
}
