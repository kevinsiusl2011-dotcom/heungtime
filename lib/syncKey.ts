export function createSyncKey() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (b) => (b % 36).toString(36))
    .join("")
    .toUpperCase();
  return `HTS-${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function isSyncKey(value: string) {
  return /^HTS-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(value.trim());
}
