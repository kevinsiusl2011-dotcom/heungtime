import type { EventCategory, FeedId } from "./types";

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  concert: "演唱會",
  "ticket-drop": "搶飛",
  sports: "賽事",
  mall: "商場",
  exhibition: "演藝展覽",
  movie: "電影",
  festival: "節日嘉年華",
  workshop: "工作坊",
  nightlife: "夜蒲",
};

export const FEED_LABEL: Record<FeedId, string> = {
  concerts: "演唱會",
  "ticket-drops": "搶飛日子",
  "hk-sports": "港超／本地賽",
  "global-sports": "國際賽事",
  malls: "商場限時",
  arts: "演藝展覽",
  movies: "電影／午夜場",
  festivals: "節日嘉年華",
  workshops: "工作坊體驗",
  nightlife: "蘭桂坊／夜蒲",
};

export const HOME_DISTRICTS = [
  "中環",
  "灣仔",
  "銅鑼灣",
  "尖沙咀",
  "旺角",
  "紅磡",
  "西九",
  "啟德",
  "沙田",
  "東涌",
] as const;

export const CUISINE_OPTIONS = [
  "粵菜",
  "日本菜",
  "茶餐廳",
  "火鍋",
  "麵食",
  "酒吧",
  "海鮮酒吧",
  "燒肉",
  "融合菜",
  "西式 bistro",
  "點心",
  "咖啡輕食",
  "車仔麵",
  "中式私房菜",
  "西式 brunch",
] as const;

export const PRICE_LABEL = ["", "$", "$$", "$$$", "$$$$"] as const;

export const DEFAULT_PREFS = {
  partySize: 4,
  maxPrice: 3 as 1 | 2 | 3 | 4,
  cuisines: [] as string[],
  needLastTrain: true,
  homeDistrict: "中環",
  occasion: "post-event" as const,
};

export const DEFAULT_PROFILE = {
  name: "",
  phone: "",
  email: "",
  onboarded: false,
  prefs: DEFAULT_PREFS,
  syncKey: "",
  referralCode: "",
  referredCount: 0,
};
