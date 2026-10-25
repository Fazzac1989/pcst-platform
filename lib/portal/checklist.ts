import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/** The travel app behind a planning workspace, through its booking. */
export async function appTripForWorkspace(portalTripId: number): Promise<number | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('bookings')
    .select('app_trip_id')
    .eq('portal_trip_id', portalTripId)
    .not('app_trip_id', 'is', null)
    .limit(1)
    .maybeSingle();
  if (error) return null; // bookings not set up yet: no app to send to
  return data?.app_trip_id ?? null;
}

export type ChecklistSummary = {
  appTripId: number;
  items: string[];
  /** portal student id → when their parent was last emailed */
  sent: Record<number, string>;
  /** portal student id → items ticked */
  ticked: Record<number, number>;
};

/** What the portal shows about the pre-arrival checklist, or null without an app. */
export async function checklistForWorkspace(portalTripId: number): Promise<ChecklistSummary | null> {
  const appTripId = await appTripForWorkspace(portalTripId);
  if (!appTripId) return null;
  const db = createAdminClient();
  const [{ data: items }, { data: members }] = await Promise.all([
    db.from('app_checklist_items').select('id, title').eq('app_trip_id', appTripId).order('sort_order').order('id'),
    db.from('app_members').select('id, role, parent_of, portal_student_id, checklist_sent_at').eq('app_trip_id', appTripId),
  ]);
  const itemIds = (items ?? []).map((i: any) => i.id);
  const { data: ticks } = itemIds.length
    ? await db.from('app_checklist_ticks').select('student_id').in('item_id', itemIds)
    : { data: [] as any[] };

  const all = members ?? [];
  const sent: Record<number, string> = {};
  const ticked: Record<number, number> = {};
  for (const s of all.filter((m: any) => m.role === 'student' && m.portal_student_id)) {
    const parent = all.find((m: any) => m.role === 'parent' && m.parent_of === s.id && m.checklist_sent_at);
    if (parent) sent[s.portal_student_id] = parent.checklist_sent_at;
    ticked[s.portal_student_id] = (ticks ?? []).filter((t: any) => t.student_id === s.id).length;
  }
  return { appTripId, items: (items ?? []).map((i: any) => i.title), sent, ticked };
}
