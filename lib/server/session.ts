import { createHmac, timingSafeEqual } from "crypto";

export function sessionSecret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    process.env.GOOGLE_CLIENT_SECRET ||
    "heungtime-dev-only"
  );
}

export function signValue(value: string) {
  const sig = createHmac("sha256", sessionSecret()).update(value).digest("hex").slice(0, 24);
  return `${value}.${sig}`;
}

export function verifySigned(raw: string | undefined | null) {
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i < 0) return null;
  const value = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const expected = createHmac("sha256", sessionSecret()).update(value).digest("hex").slice(0, 24);
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return value;
}

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function adminPasswordOk(password: string) {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function merchantPinFor(restaurantId: string) {
  const pins = process.env.MERCHANT_PINS ?? "";
  for (const part of pins.split(",")) {
    const [id, pin] = part.split(":").map((s) => s.trim());
    if (id === restaurantId && pin) return pin;
  }
  return process.env.MERCHANT_DEFAULT_PIN || "4821";
}

export function webhookSecretOk(header: string | null, rawBody: string) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return false;
  if (!header) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const given = header.replace(/^sha256=/i, "").trim();
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
