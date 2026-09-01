import { bookingMessage } from "@/lib/whatsapp";

export function whatsappCloudConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendWhatsAppText(to: string, text: string) {
  if (!whatsappCloudConfigured()) return { ok: false as const, skipped: true as const };
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
  const digits = to.replace(/\D/g, "");
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: digits,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false as const, skipped: false as const, error: err.slice(0, 200) };
  }
  return { ok: true as const, skipped: false as const };
}

export async function sendBookingToMerchant(
  restaurantWhatsapp: string,
  input: Parameters<typeof bookingMessage>[0],
) {
  return sendWhatsAppText(restaurantWhatsapp, bookingMessage(input));
}
