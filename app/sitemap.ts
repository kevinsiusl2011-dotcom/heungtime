import type { MetadataRoute } from "next";
import { EVENTS } from "@/lib/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://heungtime.hk";
  const staticRoutes = [
    "",
    "/live",
    "/discover",
    "/merchants",
    "/bookings",
    "/account",
    "/faq",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
  }));
  const events = EVENTS.map((e) => ({
    url: `${base}/events/${e.id}`,
    lastModified: new Date(e.startAt),
    changeFrequency: "weekly" as const,
  }));
  return [...staticRoutes, ...events];
}
