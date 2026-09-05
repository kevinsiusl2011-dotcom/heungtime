import type { NightPlan } from "@/lib/types";
import { formatDateTime } from "@/lib/calendar";
import { ShareCard } from "./ShareCard";

export function NightPlanCard({ plan, eventId }: { plan: NightPlan; eventId?: string }) {
  return (
    <section className="rounded-2xl border border-line bg-gold-soft/60 p-4 text-sm space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">夜歸計劃</p>
        {eventId && <ShareCard eventId={eventId} title={plan.relatedDrop?.title} subtitle="我喺享時幫你預留咗散場位，同埋今晚嘅幸運方位 🍀" />}
      </div>
      <ul className="space-y-2 text-muted">
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
      {plan.luckyHint && (
        <div className="flex items-start gap-2 rounded-xl border border-line/60 bg-surface/50 p-2.5 opacity-95">
          <span className="text-base leading-none">🍀</span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">幸運提示</p>
            <p className="mt-0.5 text-xs leading-snug text-ink">{plan.luckyHint}</p>
          </div>
        </div>
      )}
    </section>
  );
}
