-- Local dev seed data: default pipelines/stages + a handful of sample
-- contacts and opportunities so the app has something to show against a
-- real Supabase instance. Not run in production — only via `supabase db reset`.

do $$
declare
  v_chatbot_id uuid;
  v_voice_id uuid;
  v_review_id uuid;
  v_stage_new uuid;
  v_stage_contacted uuid;
  v_stage_qualified uuid;
  v_stage_proposal uuid;
  v_stage_paid uuid;
  v_stage_lost uuid;
  v_contact_a uuid;
  v_contact_b uuid;
  v_contact_c uuid;
  v_opp_a uuid;
begin
  insert into public.pipelines (name) values ('Chatbot') returning id into v_chatbot_id;
  insert into public.pipelines (name) values ('Voice Agent') returning id into v_voice_id;
  insert into public.pipelines (name) values ('Review Domination') returning id into v_review_id;

  -- Chatbot pipeline stages
  insert into public.pipeline_stages (pipeline_id, name, position, is_won)
    values (v_chatbot_id, 'Νέο Lead', 0, false) returning id into v_stage_new;
  insert into public.pipeline_stages (pipeline_id, name, position, is_won)
    values (v_chatbot_id, 'Επικοινωνία', 1, false) returning id into v_stage_contacted;
  insert into public.pipeline_stages (pipeline_id, name, position, is_won)
    values (v_chatbot_id, 'Qualified', 2, false) returning id into v_stage_qualified;
  insert into public.pipeline_stages (pipeline_id, name, position, is_won)
    values (v_chatbot_id, 'Πρόταση', 3, false) returning id into v_stage_proposal;
  insert into public.pipeline_stages (pipeline_id, name, position, is_won)
    values (v_chatbot_id, 'Πληρωμή', 4, true) returning id into v_stage_paid;
  insert into public.pipeline_stages (pipeline_id, name, position, is_won)
    values (v_chatbot_id, 'Χαμένο', 5, false) returning id into v_stage_lost;

  -- Voice Agent pipeline — same default stage layout
  insert into public.pipeline_stages (pipeline_id, name, position, is_won) values
    (v_voice_id, 'Νέο Lead', 0, false),
    (v_voice_id, 'Επικοινωνία', 1, false),
    (v_voice_id, 'Qualified', 2, false),
    (v_voice_id, 'Πρόταση', 3, false),
    (v_voice_id, 'Πληρωμή', 4, true),
    (v_voice_id, 'Χαμένο', 5, false);

  -- Review Domination pipeline — same default stage layout
  insert into public.pipeline_stages (pipeline_id, name, position, is_won) values
    (v_review_id, 'Νέο Lead', 0, false),
    (v_review_id, 'Επικοινωνία', 1, false),
    (v_review_id, 'Qualified', 2, false),
    (v_review_id, 'Πρόταση', 3, false),
    (v_review_id, 'Πληρωμή', 4, true),
    (v_review_id, 'Χαμένο', 5, false);

  -- Sample contacts
  insert into public.contacts (name, phone, email, website, source, tags)
    values ('Γιώργος Παπαδόπουλος', '+30 690 000 0001', 'giorgos@example.gr', 'https://example.gr', 'Facebook Ads', array['hot'])
    returning id into v_contact_a;
  insert into public.contacts (name, phone, email, website, source, tags)
    values ('Μαρία Ιωάννου', '+30 690 000 0002', 'maria@example.gr', null, 'Referral', array['warm'])
    returning id into v_contact_b;
  insert into public.contacts (name, phone, email, website, source, tags)
    values ('Νίκος Αντωνίου', '+30 690 000 0003', 'nikos@example.gr', 'https://nikos-biz.gr', 'Google Ads', array['cold'])
    returning id into v_contact_c;

  -- Sample opportunities across pipeline stages
  insert into public.opportunities (contact_id, pipeline_id, stage_id, value, campaign)
    values (v_contact_a, v_chatbot_id, v_stage_contacted, 900, 'Q3 FB Leads')
    returning id into v_opp_a;
  insert into public.opportunities (contact_id, pipeline_id, stage_id, value, campaign)
    values (v_contact_b, v_chatbot_id, v_stage_new, 600, 'Referral Program');
  insert into public.opportunities (contact_id, pipeline_id, stage_id, value, campaign)
    values (v_contact_c, v_voice_id, v_stage_qualified, 1500, 'Google Ads - Voice');

  -- Sample activity log
  insert into public.activity_log (contact_id, opportunity_id, type, content)
    values (v_contact_a, v_opp_a, 'note', 'Πρώτη επικοινωνία, ενδιαφέρον για chatbot στο site.');
  insert into public.activity_log (contact_id, opportunity_id, type, content)
    values (v_contact_a, v_opp_a, 'stage_change', 'Νέο Lead → Επικοινωνία');

  -- Sample task
  insert into public.tasks (contact_id, title, due_at)
    values (v_contact_a, 'Follow-up κλήση', now() + interval '2 days');
end $$;
