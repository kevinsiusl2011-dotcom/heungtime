import type { NightPlan } from "@/lib/types";
import { formatDateTime } from "@/lib/calendar";

export function NightPlanCard({ plan }: { plan: NightPlan }) {
  return (
    <section className="rounded-2xl border border-line bg-gold-soft/60 p-4 text-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">夜歸計劃</p>
      <ul className="mt-3 space-y-2 text-muted">
        <li>{plan.commuteNote}</li>
        <li>{plan.diningWindow}</li>
        <li>{plan.lastTrain}</li>
        {plan.clash && <li className="text-gold">{plan.clash}</li>}
        {plan.relatedDrop && (
          <li>
            相關搶飛：{plan.relatedDrop.title} · {formatDateTime(plan.relatedDrop.startAt)}
          </li>
        )}
      </ul>
    </section>
  );
}
