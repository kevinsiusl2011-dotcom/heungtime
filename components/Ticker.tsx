const ITEMS = [
  "陳奕迅 FEAR AND DREAMS · 紅館散場 22:30",
  "搶飛：張學友 60+ 會員預購",
  "港超 傑志 vs 東方 · 旺角大球場",
  "海港城 Fashion Week 會員夜",
  "K11 Super Night 滿 $400 送 $80",
  "M+ 草間彌生 · 西九下午場",
  "英超 阿仙奴 vs 車路士 · 開波前訂枱",
  "戲曲中心《牡丹亭》散場宵夜",
];

export function Ticker() {
  const loop = [...ITEMS, ...ITEMS];
  return (
    <div className="marquee border-y border-line bg-pink/10 py-3">
      <div className="marquee-track gap-8 pr-8 text-sm font-bold tracking-wide">
        {loop.map((item, i) => (
          <span key={`${item}-${i}`} className="flex items-center gap-8 whitespace-nowrap">
            <span className="text-gold">●</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
