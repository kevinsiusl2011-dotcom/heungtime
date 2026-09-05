export type EventCategory =
  | "concert"
  | "ticket-drop"
  | "sports"
  | "mall"
  | "exhibition"
  | "movie"
  | "festival"
  | "workshop"
  | "nightlife";

export type FeedId =
  | "concerts"
  | "ticket-drops"
  | "hk-sports"
  | "global-sports"
  | "malls"
  | "arts"
  | "movies"
  | "festivals"
  | "workshops"
  | "nightlife";

export type DiningOccasion =
  | "casual"
  | "date"
  | "celebration"
  | "business"
  | "family"
  | "post-event";

export type Venue = {
  id: string;
  name: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  mtr: string;
  lastTrain: string;
  commuteFromCentralMin: number;
  tags?: string[];
};

export type LocalEvent = {
  id: string;
  title: string;
  titleEn: string;
  category: EventCategory;
  feedId: FeedId;
  venueId: string;
  startAt: string;
  endAt: string;
  ticketDropAt?: string;
  relatedEventId?: string;
  description: string;
  tags: string[];
  ticketType?: "presale" | "public" | "free";
  mood?: string;
};

export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  district: string;
  address: string;
  priceLevel: 1 | 2 | 3 | 4;
  nearVenueIds: string[];
  walkMinutesByVenue: Record<string, number>;
  mtrStation: string;
  lastTrainSafe: boolean;
  dietary: string[];
  seatsLeft: number;
  openUntil: string;
  availableSlots: string[];
  partySizes: number[];
  sponsored: boolean;
  advertiserCpa: number;
  autoChatReady: boolean;
  whatsapp: string;
  pitch: string;
  ambiance?: DiningOccasion[];
  conversionRate30d?: number;
  auctionBid?: {
    eventId?: string;
    bidPerBooking?: number;
    boostedSlotStart?: string;
    boostedSlotEnd?: string;
  };
  adCreative?: {
    badgeLabel?: string;
    headline?: string;
  };
};

export type UserPrefs = {
  partySize: number;
  maxPrice: 1 | 2 | 3 | 4;
  cuisines: string[];
  needLastTrain: boolean;
  homeDistrict: string;
  occasion?: DiningOccasion;
};

export type UserProfile = {
  name: string;
  phone: string;
  email: string;
  onboarded: boolean;
  prefs: UserPrefs;
  syncKey?: string;
  referralCode?: string;
  referredCount?: number;
};

export type RankedRestaurant = Restaurant & {
  walkMinutes: number;
  score: number;
  reasons: string[];
  lastTrainRisk: "safe" | "tight" | "miss";
  seatsRemaining: number;
  boostApplied?: number;
  scenarioWeights?: Record<string, number>;
};

export type CalendarItem = {
  id: string;
  eventId?: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  description: string;
  source: "user" | "feed" | "agent";
  restaurantIds?: string[];
  allDay?: boolean;
  referralShareToken?: string;
};

export type Booking = {
  id: string;
  restaurantId: string;
  eventId?: string;
  partySize: number;
  slot: string;
  date: string;
  status: "pending" | "confirmed" | "cancelled" | "attended";
  via: "autochat";
  guestName: string;
  guestPhone: string;
  confirmationCode: string;
  createdAt: string;
  attendedAt?: string;
  whatsappDispatched?: boolean;
  referralToken?: string;
  cpaAmount?: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
  eventIds?: string[];
  restaurantIds?: string[];
  intent?: AgentIntent;
  quickReplies?: { label: string; action: string; payload?: unknown }[];
  promoBlock?: {
    label: string;
    text: string;
    url: string;
    emoji: string;
  };
};

export type AgentIntent = "search" | "pin" | "book" | "prefs" | "help" | "share";

export type MerchantStat = {
  restaurantId: string;
  impressions: number;
  clicks: number;
  bookings: number;
  spend: number;
  conversion: number;
  adImpressions?: number;
  adClicks?: number;
  auctionSpend?: number;
  cpaBookings?: number;
  totalSpend?: number;
  avgSeatFillBoost?: number;
};

export type NightPlan = {
  commuteMin: number;
  commuteNote: string;
  diningWindow: string;
  lastTrain: string;
  clash: string | null;
  relatedDrop?: LocalEvent;
  luckyHint?: string;
};

export type ToastItem = {
  id: string;
  text: string;
};

export type MerchantLead = {
  id: string;
  name: string;
  restaurant: string;
  district: string;
  phone: string;
  note: string;
  createdAt: string;
};

export type CatalogPayload = {
  venues?: Venue[];
  events?: LocalEvent[];
  restaurants?: Restaurant[];
  inventory?: Record<string, number>;
  adBanners?: AdBanner[];
};

export type CpaEntry = {
  id: string;
  bookingId: string;
  restaurantId: string;
  amount: number;
  status: "billed" | "void";
  createdAt: string;
};

export type SyncPayload = {
  feeds: FeedId[];
  calendar: CalendarItem[];
  bookings: Booking[];
  impressions: Record<string, number>;
  clicks: Record<string, number>;
  profile: UserProfile;
  coords?: { lat: number; lng: number } | null;
};

export type ShareCard = {
  id: string;
  type: "attended" | "plan" | "invite";
  eventTitle?: string;
  restaurantName?: string;
  walkMinutes?: number;
  lastTrainRisk?: "safe" | "tight" | "miss";
  priceLevel?: 1 | 2 | 3 | 4;
  perPerson?: number;
  summary: string;
  inviteLink?: string;
  referralCode?: string;
  luckyLine?: string;
};

export type AdBanner = {
  id: string;
  slot: "live-header" | "after-restaurant" | "booking-confirm";
  type: "daydream-referral" | "merchant-spotlight" | "cpa-hook";
  title: string;
  body: string;
  cta: string;
  url: string;
  emoji: string;
  frequencyCapPerDay?: number;
};

export type AuctionSlot = {
  id: string;
  eventId: string;
  windowStart: string;
  windowEnd: string;
  topBidAmount: number;
  topBidRestaurantId?: string;
  minBid: number;
  remainingSeatBoost: number;
};
