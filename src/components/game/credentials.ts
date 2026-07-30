export function normalizeRoomName(roomName: string) {
  return roomName.trim().toLocaleLowerCase("en-US");
}

export function credentialStorageKey(roomName: string) {
  return `crew:credentials:${normalizeRoomName(roomName)}`;
}

export type StoredCredential = {
  roomName: string;
  key: string;
};

export function readCredential(roomName: string): StoredCredential | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(credentialStorageKey(roomName));
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<StoredCredential>;
    if (typeof value.roomName !== "string" || typeof value.key !== "string") return null;
    return { roomName: value.roomName, key: value.key };
  } catch {
    return null;
  }
}

export function forgetCredential(roomName: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(credentialStorageKey(roomName));
}
