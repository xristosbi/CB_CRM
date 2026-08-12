-- Payments now also write to the activity feed, so activity_log needs a
-- 'payment' entry alongside call/note/stage_change/fathom_summary.

alter type activity_type add value 'payment';
