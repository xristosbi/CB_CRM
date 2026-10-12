import { CalendarView } from "@/components/calendar/calendar-view";
import {
  MOCK_CALENDAR_EVENTS,
  MOCK_CONTACTS,
  MOCK_OPPORTUNITIES,
  MOCK_PIPELINES,
  MOCK_STAGES,
  MOCK_TASKS,
} from "@/lib/mock-data";
import { fetchUpcomingTasks, fetchContacts } from "@/lib/queries/contacts";
import { fetchCalendarEvents } from "@/lib/queries/calendar";
import { fetchLeadsData } from "@/lib/queries/leads";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { CalendarTaskEntry } from "@/lib/types";

export default async function CalendarPage() {
  const usingMockData = !hasSupabaseEnv();

  const { events, tasks, contacts, pipelines, stages, opportunities } = usingMockData
    ? {
        events: MOCK_CALENDAR_EVENTS,
        tasks: MOCK_TASKS.filter((t) => t.due_at).map(
          (t): CalendarTaskEntry => ({
            id: t.id,
            contact_id: t.contact_id,
            contact_name: MOCK_CONTACTS.find((c) => c.id === t.contact_id)?.name ?? "—",
            title: t.title,
            due_at: t.due_at!,
            done: t.done,
          })
        ),
        contacts: MOCK_CONTACTS,
        pipelines: MOCK_PIPELINES,
        stages: MOCK_STAGES,
        opportunities: MOCK_OPPORTUNITIES,
      }
    : await (async () => {
        const supabase = await createClient();
        const [events, tasks, contacts, leadsData] = await Promise.all([
          fetchCalendarEvents(supabase),
          fetchUpcomingTasks(supabase),
          fetchContacts(supabase),
          fetchLeadsData(supabase),
        ]);
        return {
          events,
          tasks,
          contacts,
          pipelines: leadsData.pipelines,
          stages: leadsData.stages,
          opportunities: leadsData.opportunities,
        };
      })();

  return (
    <div className="flex h-full flex-col">
      <CalendarView
        initialEvents={events}
        initialTasks={tasks}
        contacts={contacts}
        pipelines={pipelines}
        stages={stages}
        opportunities={opportunities}
        usingMockData={usingMockData}
      />
    </div>
  );
}
