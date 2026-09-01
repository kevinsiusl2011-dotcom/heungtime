import { NextResponse } from "next/server";
import { calendarDescription } from "@/lib/agent";
import { buildIcs } from "@/lib/calendar";
import { EVENTS } from "@/lib/data";
import { DEFAULT_PREFS } from "@/lib/labels";
import { recommendRestaurants } from "@/lib/rank";
import { ensurePersist, getInventory } from "@/lib/server/persist";
import type { FeedId } from "@/lib/types";

const FEED_IDS: FeedId[] = [
  "concerts",
  "ticket-drops",
  "hk-sports",
  "global-sports",
  "malls",
  "arts",
];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ feed: string }> },
) {
  const { feed } = await params;
  if (feed !== "all" && !FEED_IDS.includes(feed as FeedId)) {
    return NextResponse.json({ error: "未知的 Feed" }, { status: 404 });
  }
  await ensurePersist();
  const inventory = await getInventory();
  const events =
    feed === "all" ? EVENTS : EVENTS.filter((e) => e.feedId === (feed as FeedId));
  const descriptions: Record<string, string> = {};
  for (const event of events) {
    const recs = recommendRestaurants(event, DEFAULT_PREFS, [], 3, inventory);
    descriptions[event.id] = calendarDescription(event, recs);
  }
  const ics = buildIcs(events, descriptions);
  const download = new URL(req.url).searchParams.get("download");
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      ...(download
        ? { "Content-Disposition": `attachment; filename="ease-${feed}.ics"` }
        : {}),
      "Cache-Control": "public, max-age=300",
    },
  });
}
