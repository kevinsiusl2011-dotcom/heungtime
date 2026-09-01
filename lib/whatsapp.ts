export function whatsappUrl(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function bookingMessage(input: {
  restaurantName: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  slot: string;
  dateLabel: string;
  eventTitle?: string;
  confirmationCode: string;
}) {
  const eventLine = input.eventTitle ? `\n活動：${input.eventTitle}` : "";
  return `【享時訂座】${input.confirmationCode}
餐廳：${input.restaurantName}
日期：${input.dateLabel}
時間：${input.slot}
人數：${input.partySize} 位
姓名：${input.guestName}
電話：${input.guestPhone}${eventLine}

請商戶回覆確認或留位。`;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function confirmationCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `HT-${out}`;
}
