"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { calendarDescription } from "./agent";
import { hkSlotDateTime, itemFromEvent, seedCalendar } from "./calendar";
import { applyCatalog, EVENTS, RESTAURANTS } from "./data";
import { parseIcs } from "./icsParse";
import { DEFAULT_PROFILE } from "./labels";
import { recommendRestaurants } from "./rank";
import { createSyncKey, isSyncKey } from "./syncKey";
import type {
  Booking,
  CalendarItem,
  ChatMessage,
  FeedId,
  LocalEvent,
  MerchantLead,
  MerchantStat,
  RankedRestaurant,
  SyncPayload,
  ToastItem,
  UserPrefs,
  UserProfile,
} from "./types";

const STORAGE_KEY = "heungtime-v2";

interface PersistShape {
  feeds: FeedId[];
  calendar: CalendarItem[];
  bookings: Booking[];
  impressions: Record<string, number>;
  clicks: Record<string, number>;
  profile: UserProfile;
  leads: MerchantLead[];
  coords?: { lat: number; lng: number } | null;
}

interface StoreValue {
  ready: boolean;
  feeds: FeedId[];
  calendar: CalendarItem[];
  bookings: Booking[];
  profile: UserProfile;
  prefs: UserPrefs;
  leads: MerchantLead[];
  toasts: ToastItem[];
  inventory: Record<string, number>;
  coords: { lat: number; lng: number } | null;
  google: { configured: boolean; connected: boolean };
  catalogRev: number;
  toggleFeed: (id: FeedId) => void;
  pinEvent: (eventId: string, opts?: { withRelated?: boolean }) => CalendarItem | null;
  setPrefs: (patch: Partial<UserPrefs>) => void;
  removeItem: (id: string) => void;
  addBooking: (
    booking: Omit<Booking, "id" | "via" | "confirmationCode" | "createdAt">,
  ) => Promise<Booking | null>;
  cancelBooking: (confirmationCode: string) => Promise<boolean>;
  importIcs: (text: string) => number;
  requestGeo: () => void;
  enableDropAlerts: () => Promise<void>;
  impression: (restaurantId: string) => void;
  click: (restaurantId: string) => void;
  stats: MerchantStat[];
  messages: ChatMessage[];
  pushMessage: (msg: ChatMessage) => void;
  updateProfile: (patch: Omit<Partial<UserProfile>, "prefs"> & { prefs?: Partial<UserPrefs> }) => void;
  notify: (text: string) => void;
  dismissToast: (id: string) => void;
  addLead: (lead: Omit<MerchantLead, "id" | "createdAt">) => Promise<void>;
  pushSync: () => Promise<boolean>;
  restoreSync: (key: string) => Promise<boolean>;
}

const StoreContext = createContext<StoreValue | null>(null);

const DEFAULT_FEEDS: FeedId[] = ["concerts", "ticket-drops", "hk-sports", "movies", "festivals", "workshops", "nightlife"];

function bookingCalendarItem(created: Booking) {
  const restaurant = RESTAURANTS.find((r) => r.id === created.restaurantId);
  const event = created.eventId ? EVENTS.find((e) => e.id === created.eventId) : undefined;
  const date = created.date || event?.startAt;
  const startAt = hkSlotDateTime(date ?? new Date().toISOString(), created.slot);
  const endAt = new Date(new Date(startAt).getTime() + 90 * 60_000).toISOString();
  return {
    id: `cal-${created.id}`,
    title: `訂座：${restaurant?.name ?? "餐廳"}`,
    startAt,
    endAt,
    location: restaurant ? `${restaurant.name}・${restaurant.district}` : "",
    description: calendarDescription(
      event as LocalEvent,
      restaurant ? [restaurant as unknown as RankedRestaurant] : [],
      created,
    ),
    source: "agent" as const,
    restaurantIds: [created.restaurantId],
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [feeds, setFeeds] = useState<FeedId[]>(DEFAULT_FEEDS);
  const [calendar, setCalendar] = useState<CalendarItem[]>(seedCalendar());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [impressions, setImpressions] = useState<Record<string, number>>({});
  const [clicks, setClicks] = useState<Record<string, number>>({});
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [leads, setLeads] = useState<MerchantLead[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [google, setGoogle] = useState({ configured: false, connected: false });
  const [catalogRev, setCatalogRev] = useState(0);
  const dropNotified = useRef(new Set<string>());
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "agent",
      intent: "help",
      text: "我係享時 Agent。你用日曆管時間，我負責把香港即時活動接到行動：搶飛、入場、散場食飯、趕尾班車。試下：「陳奕迅演唱會之後食飯」。",
    },
  ]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistShape;
        setFeeds(parsed.feeds?.length ? parsed.feeds : DEFAULT_FEEDS);
        setCalendar(parsed.calendar?.length ? parsed.calendar : seedCalendar());
        setBookings(parsed.bookings ?? []);
        setImpressions(parsed.impressions ?? {});
        setClicks(parsed.clicks ?? {});
        setProfile(parsed.profile ?? DEFAULT_PROFILE);
        setLeads(parsed.leads ?? []);
        if (parsed.coords) setCoords(parsed.coords);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    void fetch("/api/catalog")
      .then((r) => r.json())
      .then((d: { catalog?: { venues?: typeof EVENTS; events?: typeof EVENTS; restaurants?: typeof RESTAURANTS } }) => {
        if (d.catalog) applyCatalog(d.catalog as Parameters<typeof applyCatalog>[0]);
        setCatalogRev((n) => n + 1);
      })
      .catch(() => setCatalogRev((n) => n + 1));
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    setProfile((prev) => (prev.syncKey ? prev : { ...prev, syncKey: createSyncKey() }));
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    setProfile((prev) => {
      if (prev.referralCode) return prev;
      const code = "HT-" + Math.random().toString(36).slice(2, 7).toUpperCase();
      return { ...prev, referralCode: code };
    });
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const payload: PersistShape = {
      feeds,
      calendar,
      bookings,
      impressions,
      clicks,
      profile,
      leads,
      coords,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [ready, feeds, calendar, bookings, impressions, clicks, profile, leads, coords]);

  const refreshInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory");
      const data = (await res.json()) as { seats?: Record<string, number> };
      if (data.seats) setInventory(data.seats);
    } catch {
      /* offline: keep last known */
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void refreshInventory();
    void fetch("/api/google/status")
      .then((r) => r.json())
      .then((d: { configured?: boolean; connected?: boolean }) =>
        setGoogle({ configured: Boolean(d.configured), connected: Boolean(d.connected) }),
      )
      .catch(() => undefined);
  }, [ready, refreshInventory, bookings]);

  const notify = useCallback((text: string) => {
    const id = `t-${Date.now()}`;
    setToasts((prev) => [...prev, { id, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      for (const item of calendar) {
        const event = EVENTS.find((e) => e.id === item.eventId);
        if (!event || event.category !== "ticket-drop") continue;
        const mins = (+new Date(event.startAt) - Date.now()) / 60_000;
        if (mins <= 0 || mins > 30 || dropNotified.current.has(event.id)) continue;
        dropNotified.current.add(event.id);
        const body = `${event.title} · 約 ${Math.max(1, Math.round(mins))} 分鐘後開售`;
        notify(`搶飛倒數：${event.title}`);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification("搶飛即將開始", { body, tag: event.id });
          } catch {
            /* ignore */
          }
        }
      }
    };
    tick();
    const t = window.setInterval(tick, 20_000);
    return () => window.clearInterval(t);
  }, [ready, calendar, notify]);

  const toggleFeed = useCallback((id: FeedId) => {
    setFeeds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }, []);

  const pinEvent = useCallback(
    (eventId: string, opts?: { withRelated?: boolean }) => {
      const pinOne = (id: string) => {
        const event = EVENTS.find((e) => e.id === id);
        if (!event) return null;
        const restaurants = recommendRestaurants(event, profile.prefs, bookings, 3, inventory);
        const description = calendarDescription(event, restaurants);
        const item = itemFromEvent(
          event,
          description,
          restaurants.map((r) => r.id),
        );
        restaurants.forEach((r) => {
          setImpressions((prev) => ({ ...prev, [r.id]: (prev[r.id] ?? 0) + 1 }));
        });
        return item;
      };

      const event = EVENTS.find((e) => e.id === eventId);
      if (!event) return null;
      const item = pinOne(eventId);
      if (!item) return null;
      const extra =
        opts?.withRelated && event.relatedEventId ? pinOne(event.relatedEventId) : null;

      setCalendar((prev) => {
        const next = [...prev];
        if (!prev.some((c) => c.eventId === eventId)) next.push(item);
        if (extra && event.relatedEventId && !prev.some((c) => c.eventId === event.relatedEventId)) {
          next.push(extra);
        }
        return next;
      });
      notify(
        extra ? `已加入日曆：${event.title}（含相關搶飛／演出檔）` : `已加入日曆：${event.title}`,
      );

      if (google.connected) {
        void fetch("/api/google/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: item.title,
            startAt: item.startAt,
            endAt: item.endAt,
            location: item.location,
            description: item.description,
          }),
        }).then((res) => {
          if (res.ok) notify("已同步到 Google 日曆");
        });
      }

      if (event.category === "ticket-drop" && typeof Notification !== "undefined") {
        if (Notification.permission === "granted") {
          try {
            new Notification("已加入搶飛檔", { body: event.title, tag: event.id });
          } catch {
            /* ignore */
          }
        }
      }
      return item;
    },
    [profile.prefs, bookings, inventory, notify, google.connected],
  );

  const removeItem = useCallback(
    (id: string) => {
      setCalendar((prev) => prev.filter((c) => c.id !== id));
      notify("已從日曆移除");
    },
    [notify],
  );

  const addBooking = useCallback(
    async (booking: Omit<Booking, "id" | "via" | "confirmationCode" | "createdAt">) => {
      const restaurant = RESTAURANTS.find((r) => r.id === booking.restaurantId);
      if (!restaurant) return null;
      const referralToken = profile.referralCode ? `${profile.referralCode}-${Date.now().toString(36)}` : "";
      const cpaAmount = restaurant.advertiserCpa + (restaurant.auctionBid?.bidPerBooking ?? 0);

      try {
        const res = await fetch("/api/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...booking,
            referralToken,
            cpaAmount,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          booking?: Booking;
          seatsRemaining?: number;
        };
        if (typeof data.seatsRemaining === "number") {
          setInventory((prev) => ({ ...prev, [booking.restaurantId]: data.seatsRemaining! }));
        }
        if (!res.ok || !data.ok || !data.booking) {
          notify(data.error ?? "訂座失敗");
          return null;
        }
        const created = data.booking;
        if (!created.referralToken) created.referralToken = referralToken;
        if (!created.cpaAmount) created.cpaAmount = cpaAmount;
        setBookings((prev) => [...prev.filter((b) => b.id !== created.id), created]);
        setCalendar((prev) => [...prev.filter((c) => c.id !== `cal-${created.id}`), bookingCalendarItem(created)]);
        notify(
          created.status === "confirmed"
            ? `訂座已確認 ${created.confirmationCode}`
            : `訂座已發送 ${created.confirmationCode}`,
        );
        return created;
      } catch {
        notify("未能連線伺服器，請稍後再試");
        return null;
      }
    },
    [notify, profile.referralCode],
  );

  const cancelBooking = useCallback(
    async (code: string) => {
      const local = bookings.find((b) => b.confirmationCode === code);
      if (local?.status === "cancelled") {
        notify("此訂座已取消");
        return false;
      }
      if (local?.status === "attended") {
        notify("已入座的訂座不能取消");
        return false;
      }
      try {
        const res = await fetch("/api/book/cancel", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmationCode: code }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          alreadyCancelled?: boolean;
          seatsRemaining?: number;
        };
        if (!res.ok || !data.ok) {
          notify(data.error ?? "取消失敗");
          return false;
        }
        if (typeof data.seatsRemaining === "number" && local) {
          setInventory((prev) => ({ ...prev, [local.restaurantId]: data.seatsRemaining! }));
        }
      } catch {
        notify("未能連線伺服器，無法取消");
        return false;
      }
      setBookings((prev) =>
        prev.map((b) => (b.confirmationCode === code ? { ...b, status: "cancelled" } : b)),
      );
      if (local) {
        setCalendar((prev) => prev.filter((c) => c.id !== `cal-${local.id}`));
      }
      notify(`已取消訂座 ${code}`);
      void refreshInventory();
      return true;
    },
    [bookings, notify, refreshInventory],
  );

  const importIcs = useCallback(
    (text: string) => {
      const items = parseIcs(text);
      if (!items.length) return 0;
      const titles = new Set(calendar.map((c) => `${c.title}|${c.startAt}`));
      const extra = items.filter((c) => !titles.has(`${c.title}|${c.startAt}`));
      if (!extra.length) return 0;
      setCalendar((prev) => [...prev, ...extra]);
      return extra.length;
    },
    [calendar],
  );

  const requestGeo = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      notify("此裝置不支援定位");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        notify("已用你而家位置計算通勤");
      },
      () => notify("未能取得定位，繼續用出發地區"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 },
    );
  }, [notify]);

  const enableDropAlerts = useCallback(async () => {
    if (typeof Notification === "undefined") {
      notify("此瀏覽器不支援通知");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") notify("已開啟搶飛通知：開售前 30 分鐘會提醒");
    else notify("未授權通知，仍可在本頁看到倒數提示");
  }, [notify]);

  const impression = useCallback((restaurantId: string) => {
    setImpressions((prev) => ({
      ...prev,
      [restaurantId]: (prev[restaurantId] ?? 0) + 1,
    }));
  }, []);

  const click = useCallback((restaurantId: string) => {
    setClicks((prev) => ({ ...prev, [restaurantId]: (prev[restaurantId] ?? 0) + 1 }));
  }, []);

  const updateProfile = useCallback(
    (patch: Omit<Partial<UserProfile>, "prefs"> & { prefs?: Partial<UserPrefs> }) => {
      setProfile((prev) => ({
        ...prev,
        ...patch,
        prefs: { ...prev.prefs, ...(patch.prefs ?? {}) },
      }));
    },
    [],
  );

  const setPrefs = useCallback(
    (patch: Partial<UserPrefs>) => {
      updateProfile({ prefs: patch });
    },
    [updateProfile],
  );

  const addLead = useCallback(
    async (lead: Omit<MerchantLead, "id" | "createdAt">) => {
      const created: MerchantLead = {
        ...lead,
        id: `lead-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setLeads((prev) => [...prev, created]);
      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lead),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          notify(data.error ?? "合作申請送出失敗");
          return;
        }
        notify("已收到合作申請，我們會以 WhatsApp 回覆");
      } catch {
        notify("已在本機記下申請，稍後再同步");
      }
    },
    [notify],
  );

  const syncPayload = useCallback((): SyncPayload => {
    return {
      feeds,
      calendar,
      bookings,
      impressions,
      clicks,
      profile,
      coords,
    };
  }, [feeds, calendar, bookings, impressions, clicks, profile, coords]);

  const pushSync = useCallback(async () => {
    const key = profile.syncKey;
    if (!key || !isSyncKey(key)) return false;
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, payload: syncPayload() }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [profile.syncKey, syncPayload]);

  const restoreSync = useCallback(
    async (key: string) => {
      const normalized = key.trim().toUpperCase();
      if (!isSyncKey(normalized)) {
        notify("同步碼格式無效");
        return false;
      }
      try {
        const res = await fetch(`/api/sync?key=${encodeURIComponent(normalized)}`);
        const data = (await res.json()) as { ok?: boolean; error?: string; payload?: SyncPayload };
        if (!res.ok || !data.ok || !data.payload) {
          notify(data.error ?? "找不到同步資料");
          return false;
        }
        const p = data.payload;
        setFeeds(p.feeds?.length ? p.feeds : DEFAULT_FEEDS);
        setCalendar(p.calendar ?? []);
        setBookings(p.bookings ?? []);
        setImpressions(p.impressions ?? {});
        setClicks(p.clicks ?? {});
        setProfile({ ...p.profile, syncKey: normalized });
        if (p.coords) setCoords(p.coords);
        notify("已用同步碼還原此裝置");
        return true;
      } catch {
        notify("同步失敗");
        return false;
      }
    },
    [notify],
  );

  useEffect(() => {
    if (!ready || !profile.syncKey) return;
    const t = window.setTimeout(() => {
      void pushSync();
    }, 2800);
    return () => window.clearTimeout(t);
  }, [ready, profile.syncKey, pushSync]);

  const stats = useMemo<MerchantStat[]>(() => {
    return RESTAURANTS.map((r) => {
      const bks = bookings.filter((b) => b.restaurantId === r.id && b.status !== "cancelled");
      const attendedBks = bks.filter((b) => b.status === "attended");
      const imps = impressions[r.id] ?? 0;
      const adImps = r.sponsored ? Math.round(imps * 0.6 + bks.length * 3) : 0;
      const adClicks = clicks[r.id] ?? 0 + (r.sponsored ? Math.round(imps * 0.08) : 0);
      const auctionSpend = attendedBks.reduce(
        (s) => s + (r.auctionBid?.bidPerBooking ?? 0),
        0,
      );
      const cpaSpend = attendedBks.length * r.advertiserCpa;
      return {
        restaurantId: r.id,
        impressions: imps,
        clicks: clicks[r.id] ?? 0,
        bookings: bks.length,
        spend: cpaSpend,
        conversion: imps ? bks.length / imps : 0,
        adImpressions: adImps,
        adClicks,
        auctionSpend,
        cpaBookings: attendedBks.length,
        totalSpend: cpaSpend + auctionSpend,
      };
    }).sort((a, b) => b.totalSpend - a.totalSpend || b.impressions - a.impressions);
  }, [bookings, clicks, impressions, catalogRev]);

  const pushMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      feeds,
      calendar,
      bookings,
      profile,
      prefs: profile.prefs,
      leads,
      toasts,
      inventory,
      coords,
      google,
      catalogRev,
      toggleFeed,
      pinEvent,
      setPrefs,
      removeItem,
      addBooking,
      cancelBooking,
      importIcs,
      requestGeo,
      enableDropAlerts,
      impression,
      click,
      stats,
      messages,
      pushMessage,
      updateProfile,
      notify,
      dismissToast,
      addLead,
      pushSync,
      restoreSync,
    }),
    [
      ready,
      feeds,
      calendar,
      bookings,
      profile,
      leads,
      toasts,
      inventory,
      coords,
      google,
      catalogRev,
      toggleFeed,
      pinEvent,
      setPrefs,
      removeItem,
      addBooking,
      cancelBooking,
      importIcs,
      requestGeo,
      enableDropAlerts,
      impression,
      click,
      stats,
      messages,
      pushMessage,
      updateProfile,
      notify,
      dismissToast,
      addLead,
      pushSync,
      restoreSync,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
