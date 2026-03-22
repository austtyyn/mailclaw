import { requireAuth } from "@/lib/auth";
import { unwrapRelation } from "@/lib/utils";
import { getOrCreateDefaultWorkspace } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GenerateButton } from "./generate-button";

export default async function WarmupPage() {
  const user = await requireAuth();
  const workspace = await getOrCreateDefaultWorkspace(user.id);
  const supabase = await createClient();

  const { data: schedules } = await supabase
    .from("warmup_schedules")
    .select(`
      *,
      mailboxes (
        id,
        email
      )
    `)
    .order("schedule_date", { ascending: false })
    .limit(100);

  const byMailbox = new Map<
    string,
    Array<{
      id: string;
      schedule_date: string;
      target_send_count: number;
      actual_send_count: number;
      stage: string;
      status: string;
    }>
  >();

  for (const s of schedules ?? []) {
    const mb = unwrapRelation(s.mailboxes);
    const email = mb?.email ?? "unknown";
    if (!byMailbox.has(email)) {
      byMailbox.set(email, []);
    }
    byMailbox.get(email)!.push({
      id: s.id,
      schedule_date: s.schedule_date,
      target_send_count: s.target_send_count,
      actual_send_count: s.actual_send_count,
      stage: s.stage,
      status: s.status,
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Warmup</h1>
        <GenerateButton />
      </div>

      <p className="text-slate-400 text-sm">
        Warmup schedules determine how many emails each mailbox should send per
        day. Generate today&apos;s schedules to get started.
      </p>

      <div className="space-y-6">
        {byMailbox.size > 0 ? (
          Array.from(byMailbox.entries()).map(([email, scheds]) => (
            <div
              key={email}
              className="rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden"
            >
              <h2 className="px-4 py-3 border-b border-slate-700 font-medium">
                {email}
              </h2>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-4 py-2 text-xs text-slate-500">
                      Date
                    </th>
                    <th className="text-left px-4 py-2 text-xs text-slate-500">
                      Target
                    </th>
                    <th className="text-left px-4 py-2 text-xs text-slate-500">
                      Actual
                    </th>
                    <th className="text-left px-4 py-2 text-xs text-slate-500">
                      Stage
                    </th>
                    <th className="text-left px-4 py-2 text-xs text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scheds.map((s) => (
                    <tr key={s.id} className="border-b border-slate-700/30">
                      <td className="px-4 py-2">{s.schedule_date}</td>
                      <td className="px-4 py-2">{s.target_send_count}</td>
                      <td className="px-4 py-2">{s.actual_send_count}</td>
                      <td className="px-4 py-2 text-slate-400">{s.stage}</td>
                      <td className="px-4 py-2 text-slate-400">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        ) : (
          <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-8 text-center text-slate-500">
            No warmup schedules. Add mailboxes and generate schedules.
          </div>
        )}
      </div>
    </div>
  );
}
