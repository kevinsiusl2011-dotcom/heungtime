import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "享時 Ease",
    short_name: "享時",
    description: "香港活動智能日曆：散場後按步行、空位與尾班車經 WhatsApp 訂座。",
    start_url: "/live",
    display: "standalone",
    background_color: "#0c0a08",
    theme_color: "#d6ff3a",
    lang: "zh-HK",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
