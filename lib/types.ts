export type EventCategory =
  | "concert"
  | "ticket-drop"
  | "sports"
  | "mall"
  | "exhibition";

export type FeedId =
  | "concerts"
  | "ticket-drops"
  | "hk-sports"
  | "global-sports"
  | "malls"
  | "arts";

export interface Venue {
  id: string;
  name: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  mtr: string;
  lastTrain: string;
  commuteFromCentralMin: number;
}

export interface LocalEvent {
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
}

export interface Restaurant {
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
}

export interface UserPrefs {
  partySize: number;
  maxPrice: 1 | 2 | 3 | 4;
  cuisines: string[];
  needLastTrain: boolean;
  homeDistrict: string;
}

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
  onboarded: boolean;
  prefs: UserPrefs;
}

export interface RankedRestaurant extends Restaurant {
  walkMinutes: number;
  score: number;
  reasons: string[];
  lastTrainRisk: "safe" | "tight" | "miss";
  seatsRemaining: number;
}

export interface CalendarItem {
  id: string;
  eventId?: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  description: string;
  source: "user" | "feed" | "agent";
  restaurantIds?: string[];
}

export interface Booking {
  id: string;
  restaurantId: string;
  eventId?: string;
  partySize: number;
  slot: string;
  date: string;
  status: "pending" | "confirmed" | "cancelled";
  via: "autochat";
  guestName: string;
  guestPhone: string;
  confirmationCode: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  eventIds?: string[];
  restaurantIds?: string[];
  intent?: AgentIntent;
}

export type AgentIntent = "search" | "pin" | "book" | "prefs" | "help";

export interface MerchantStat {
  restaurantId: string;
  impressions: number;
  clicks: number;
  bookings: number;
  spend: number;
  conversion: number;
}

export interface NightPlan {
  commuteMin: number;
  commuteNote: string;
  diningWindow: string;
  lastTrain: string;
  clash: string | null;
  relatedDrop?: LocalEvent;
}

export interface ToastItem {
  id: string;
  text: string;
}

export interface MerchantLead {
  id: string;
  name: string;
  restaurant: string;
  district: string;
  phone: string;
  note: string;
  createdAt: string;
}
