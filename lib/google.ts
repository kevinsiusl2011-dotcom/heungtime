import { icalUid } from "./calendar";

const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const CAL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const CAL_IMPORT = "https://www.googleapis.com/calendar/v3/calendars/primary/events/import";

export type GoogleCalEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  description: string;
};

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3289"}/api/google/callback`
  );
}

export function googleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH}?${params.toString()}`;
}

export async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirect_uri: googleRedirectUri(),
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN, { method: "POST", body });
  if (!res.ok) throw new Error("Google token exchange failed");
  return (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
}

export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN, { method: "POST", body });
  if (!res.ok) throw new Error("Google refresh failed");
  return (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string };
}

function eventBody(event: GoogleCalEvent) {
  return {
    summary: event.title,
    location: event.location,
    description: event.description,
    start: { dateTime: event.startAt, timeZone: "Asia/Hong_Kong" },
    end: { dateTime: event.endAt, timeZone: "Asia/Hong_Kong" },
  };
}

async function googleJson(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.slice(0, 200));
  }
  return res.json();
}

export async function findCalendarEventId(accessToken: string, uid: string) {
  const params = new URLSearchParams({ iCalUID: uid, maxResults: "1" });
  const res = await fetch(`${CAL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await googleJson(res)) as { items?: { id?: string }[] };
  return data.items?.[0]?.id ?? null;
}

export async function upsertCalendarEvent(accessToken: string, event: GoogleCalEvent) {
  const uid = icalUid(event.id);
  const existingId = await findCalendarEventId(accessToken, uid);
  const body = eventBody(event);
  if (existingId) {
    const res = await fetch(`${CAL}/${encodeURIComponent(existingId)}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return googleJson(res);
  }
  const res = await fetch(CAL_IMPORT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, iCalUID: uid }),
  });
  return googleJson(res);
}

export async function upsertCalendarEvents(accessToken: string, events: GoogleCalEvent[]) {
  let updated = 0;
  let failed = 0;
  for (const event of events) {
    try {
      await upsertCalendarEvent(accessToken, event);
      updated += 1;
    } catch {
      failed += 1;
    }
  }
  return { updated, failed };
}

export async function insertCalendarEvent(accessToken: string, event: GoogleCalEvent) {
  return upsertCalendarEvent(accessToken, event);
}
