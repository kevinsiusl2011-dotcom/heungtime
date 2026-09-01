import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Toasts } from "@/components/Toasts";
import { Onboarding } from "@/components/Onboarding";
import { PwaRegister } from "@/components/PwaRegister";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://heungtime.hk";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "享時 Ease｜香港活動智能日曆",
    template: "%s｜享時 Ease",
  },
  description:
    "把演唱會搶飛、商場限時、演藝展覽與球賽接到你的日曆。散場後按步行、空位與尾班車，經 WhatsApp 一鍵訂座。",
  keywords: ["香港", "日曆", "演唱會", "訂座", "WhatsApp", "搶飛", "港超", "尾班車"],
  openGraph: {
    title: "享時 Ease｜香港活動智能日曆",
    description: "本地即時活動 × 個人日程。散場後一鍵訂座，C 端免費。",
    locale: "zh_HK",
    type: "website",
    siteName: "享時 Ease",
  },
  twitter: {
    card: "summary_large_image",
    title: "享時 Ease",
    description: "香港活動寫進你的日曆，散場後一鍵訂座。",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  appleWebApp: { capable: true, title: "享時", statusBarStyle: "default" },
};

const themeBoot = `(function(){try{var t=localStorage.getItem("heungtime-theme");document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light");}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export const viewport: Viewport = {
  themeColor: "#f3eee4",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-HK" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="antialiased">
        <StoreProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:text-bg">
            跳到內容
          </a>
          <PwaRegister />
          <Onboarding />
          {children}
          <Toasts />
        </StoreProvider>
      </body>
    </html>
  );
}
